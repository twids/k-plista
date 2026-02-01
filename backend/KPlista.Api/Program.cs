using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using KPlista.Api.Data;
using KPlista.Api.Hubs;
using KPlista.Api.Models;
using KPlista.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;
using Serilog.Context;
using Hangfire;
using Hangfire.PostgreSql;

var builder = WebApplication.CreateBuilder(args);

// Serilog bootstrap (early)
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.WithProperty("AppStartTimestamp", DateTimeOffset.UtcNow)
    .CreateLogger();
builder.Host.UseSerilog();

// Remove Server header (Kestrel) for security information disclosure hardening
builder.WebHost.UseKestrel(options =>
{
    options.AddServerHeader = false;
});

// Add services to the container.
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IExternalUserService, ExternalUserService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<OAuthTicketHandler>();
builder.Services.AddScoped<BoughtItemCleanupService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Add SignalR
builder.Services.AddSignalR();

// Configure CORS for frontend
// Configure CORS for local development only
// In production, frontend is served from same origin so CORS is not needed

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173", // Vite default port
            "http://localhost:3000"  // Alternative port
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=kplista;Username=postgres;Password=postgres";
builder.Services.AddDbContext<KPlistaDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Hangfire with PostgreSQL storage
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(connectionString)));

// Add Hangfire server
builder.Services.AddHangfireServer();

// Forwarded headers (reverse proxy TLS termination); DO NOT trust all proxies blindly.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    // Include XForwardedFor to capture real client IP when behind a proxy
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedFor;
    // Limit how many entries are processed to mitigate header injection chains.
    options.ForwardLimit = 1;
    // Optional single trusted proxy IP from configuration (ReverseProxy:TrustedProxyIp)
    var proxyIp = builder.Configuration["ReverseProxy:TrustedProxyIp"]; // e.g. 172.18.0.1 (Docker gateway) or load balancer IP
    if (!string.IsNullOrWhiteSpace(proxyIp) && System.Net.IPAddress.TryParse(proxyIp, out var ipAddress))
    {
        options.KnownProxies.Add(ipAddress);
    }
    // For container networks you could alternatively add KnownNetworks.
});

// Configure Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "your-secret-key-min-32-characters-long-for-security";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "kplista-api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "kplista-app";

builder.Services.AddAuthentication(options =>
{
    // JWT for API auth
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
    
    // Support authentication for SignalR
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Extract token from secure HTTP-only cookie for all endpoints
            var cookieToken = context.HttpContext.Request.Cookies["auth_token"];
            if (!string.IsNullOrEmpty(cookieToken))
            {
                context.Token = cookieToken;
            }
            // Fall back to Authorization header if no cookie
            else
            {
                var authHeader = context.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    context.Token = token;
                }
            }
            
            return Task.CompletedTask;
        }
    };
})
.AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
    ApiKeyAuthenticationOptions.DefaultScheme,
    options => { }
);

// Add Google authentication only if configured
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    builder.Services.AddAuthentication().AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = "/signin-google"; // Standard OAuth callback path
        options.SaveTokens = false; // We're issuing our own JWT
        options.Events = new Microsoft.AspNetCore.Authentication.OAuth.OAuthEvents
        {
            OnCreatingTicket = ctx =>
            {
                var email = ctx.Identity?.FindFirst(ClaimTypes.Email)?.Value;
                var externalId = ctx.Identity?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (email != null || externalId != null)
                {
                    var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("OAuth");
                    if (email != null)
                    {
                        logger.LogInformation("Google: CreatingTicket for {Email} (extId {ExternalId})", LogMasking.MaskEmail(email), LogMasking.MaskExternalId(externalId));
                    }
                }
                return Task.CompletedTask;
            },
            OnTicketReceived = async context =>
            {
                var handler = context.HttpContext.RequestServices.GetRequiredService<OAuthTicketHandler>();
                await handler.HandleAsync(context, "Google");
            },
            OnRemoteFailure = context =>
            {
                Log.Error(context.Failure, "OAuth Google: Remote failure during external login");
                context.Response.Redirect("/?error=google_remote_failure");
                context.HandleResponse();
                return Task.CompletedTask;
            }
        };
    });
}

// Add Facebook authentication only if configured
var facebookAppId = builder.Configuration["Authentication:Facebook:AppId"];
var facebookAppSecret = builder.Configuration["Authentication:Facebook:AppSecret"];
if (!string.IsNullOrWhiteSpace(facebookAppId) && !string.IsNullOrWhiteSpace(facebookAppSecret))
{
    builder.Services.AddAuthentication().AddFacebook(options =>
    {
        options.AppId = facebookAppId;
        options.AppSecret = facebookAppSecret;
        options.CallbackPath = "/signin-facebook"; // Standard OAuth callback path
        options.SaveTokens = false;
        options.Events = new Microsoft.AspNetCore.Authentication.OAuth.OAuthEvents
        {
            OnCreatingTicket = ctx =>
            {
                var email = ctx.Identity?.FindFirst(ClaimTypes.Email)?.Value;
                var externalId = ctx.Identity?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (email != null || externalId != null)
                {
                    var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("OAuth");
                    if (email != null)
                    {
                        logger.LogInformation("Facebook: CreatingTicket for {Email} (extId {ExternalId})", LogMasking.MaskEmail(email), LogMasking.MaskExternalId(externalId));
                    }
                }
                return Task.CompletedTask;
            },
            OnTicketReceived = async context =>
            {
                var handler = context.HttpContext.RequestServices.GetRequiredService<OAuthTicketHandler>();
                await handler.HandleAsync(context, "Facebook");
            },
            OnRemoteFailure = context =>
            {
                Log.Error(context.Failure, "OAuth Facebook: Remote failure during external login");
                context.Response.Redirect("/?error=facebook_remote_failure");
                context.HandleResponse();
                return Task.CompletedTask;
            }
        };
    });
}

builder.Services.AddAuthorization();

// Register JWT service
builder.Services.AddSingleton<IJwtService, JwtService>();

var app = builder.Build();

// Apply forwarded headers BEFORE generating security headers or auth redirects
app.UseForwardedHeaders(); // Processes X-Forwarded-Proto/Host (and only first value)

// Security Headers Middleware (placed early)
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;

    // Prevent MIME type sniffing
    headers["X-Content-Type-Options"] = "nosniff";
    // Clickjacking protection (allow same-origin if SPA might iframe internally; adjust if not needed)
    headers["X-Frame-Options"] = "SAMEORIGIN";
    // Basic XSS protection header (legacy, still adds defense in some older browsers)
    headers["X-XSS-Protection"] = "0"; // Modern guidance: disable buggy legacy filter
    // Referrer policy
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    // Permissions Policy (limit powerful APIs)
    headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()";
    // Cross-Origin Resource Policy (protect resources from being used by other origins)
    headers["Cross-Origin-Resource-Policy"] = "same-origin";
    // Cross-Origin Opener Policy & Embedder Policy for isolation (consider if using SharedArrayBuffer/web workers)
    headers["Cross-Origin-Opener-Policy"] = "same-origin";
    headers["Cross-Origin-Embedder-Policy"] = "require-corp"; // Ensure all cross-origin resources set CORP/CORS
    // Content Security Policy (adjust as needed; current allows self assets, inline styles from bundlers, data images, websockets)
    // If inline scripts/styles cause violation remove 'unsafe-inline' once hashes/nonces are implemented.
    var csp = string.Join("; ", new[]
    {
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // remove 'unsafe-inline' when possible
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:", // SignalR/WebSocket
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    });
    headers["Content-Security-Policy"] = csp;

    // Strict Transport Security (only if running behind HTTPS and not in development)
    if (!context.Request.IsHttps && app.Environment.IsProduction())
    {
        // If reverse proxy terminates SSL, adjust to add this there instead.
    }
    else if (context.Request.IsHttps && app.Environment.IsProduction())
    {
        headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"; // 2 years
    }

    await next();
});

// Correlation/context logging
app.Use(async (ctx, next) =>
{
    var correlationId = ctx.Request.Headers["X-Correlation-ID"].FirstOrDefault() ?? Guid.NewGuid().ToString();
    ctx.Response.Headers["X-Correlation-ID"] = correlationId;
    using (LogContext.PushProperty("CorrelationId", correlationId))
    using (LogContext.PushProperty("RemoteIp", ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"))
    using (LogContext.PushProperty("RequestPath", ctx.Request.Path.ToString()))
    using (LogContext.PushProperty("RequestMethod", ctx.Request.Method))
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            await next();
            sw.Stop();
            // Filter out successful static file requests from info-level logs
            var path = ctx.Request.Path;
            var isStaticFile = path.StartsWithSegments("/css") ||
                               path.StartsWithSegments("/js") ||
                               path.StartsWithSegments("/images") ||
                               path.StartsWithSegments("/lib") ||
                               path.StartsWithSegments("/static") ||
                               path.StartsWithSegments("/favicon.ico");
            if (!isStaticFile || ctx.Response.StatusCode >= 400)
            {
                Log.Information("HTTP request responded {StatusCode} in {ElapsedMs} ms", ctx.Response.StatusCode, sw.ElapsedMilliseconds);
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            Log.Error(ex, "HTTP request failed after {ElapsedMs} ms", sw.ElapsedMilliseconds);
            throw;
        }
    }
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Only use CORS in development for local dev servers
    app.UseCors("AllowFrontend");
    
    // Hangfire Dashboard (development only for security)
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    });
}

// HTTPS redirection only in development; Docker container runs on HTTP behind a reverse proxy
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Serve static files from wwwroot (public frontend assets - CSS, JS, images)
// Static files are served before authentication as they should be publicly accessible
app.UseStaticFiles();

// Authentication and authorization apply to subsequent middleware (API controllers)
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ListHub>("/hubs/list");

// Add health check endpoint (before SPA fallback to avoid being caught by it)
// Allow anonymous access to ensure it's always accessible for health checks
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

// SPA fallback - serve index.html for non-API routes (public)
// This should come after MapControllers and health endpoint to not interfere with API routes
app.MapFallbackToFile("index.html");

// Apply database migrations on startup (in background to not block app startup)
_ = Task.Run(async () =>
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<KPlistaDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        await db.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");
    }
    catch (Npgsql.NpgsqlException ex)
    {
        logger.LogError(ex, "A database error occurred while migrating the database.");
    }
    catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
    {
        logger.LogError(ex, "An error occurred while applying database migrations.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An unexpected error occurred while applying database migrations.");
    }
});

try
{
    Log.Information("Starting KPlista.Api host");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
