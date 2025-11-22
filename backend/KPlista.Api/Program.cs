using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using KPlista.Api.Data;
using KPlista.Api.Hubs;
using KPlista.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;
using Serilog.Context;

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
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            
            return Task.CompletedTask;
        }
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "";
    // Explicit callback path (override default /signin-google)
    options.CallbackPath = "/api/auth/google-callback";
})
.AddFacebook(options =>
{
    options.AppId = builder.Configuration["Authentication:Facebook:AppId"] ?? "";
    options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"] ?? "";
    // Explicit callback path (override default /signin-facebook)
    options.CallbackPath = "/api/auth/facebook-callback";
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Security Headers Middleware (placed early)
// Apply forwarded headers BEFORE generating security headers or auth redirects
app.UseForwardedHeaders(); // Processes X-Forwarded-Proto/Host (and only first value)
if (builder.Configuration.GetValue<bool>("Logging:DebugForwardedHeaders"))
{
    app.Use(async (ctx, next) =>
    {
        var remoteIp = ctx.Connection.RemoteIpAddress?.ToString();
        var xfp = ctx.Request.Headers["X-Forwarded-Proto"].ToString();
        var xfh = ctx.Request.Headers["X-Forwarded-Host"].ToString();
        Log.Information("ForwardedHeadersCheck RemoteIp={RemoteIp} XForwardedProto={XForwardedProto} XForwardedHost={XForwardedHost} EffectiveScheme={Scheme} EffectiveHost={Host}",
            remoteIp, xfp, xfh, ctx.Request.Scheme, ctx.Request.Host.ToString());
        await next();
    });
}
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

// SPA fallback - serve index.html for non-API routes (public)
// This should come after MapControllers to not interfere with API routes
app.MapFallbackToFile("index.html");

// Apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KPlistaDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        db.Database.Migrate();
    }
    catch (Npgsql.NpgsqlException ex)
    {
        logger.LogError(ex, "A database error occurred while migrating the database.");
    }
    catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
    {
        logger.LogError(ex, "An error occurred while applying database migrations.");
    }
}

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
