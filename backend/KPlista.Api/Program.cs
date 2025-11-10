using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using KPlista.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // In production, frontend is served from same origin, so less restrictive CORS is fine
        // In development, allow local dev servers
        if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins(
                "http://localhost:5173", // Vite default port
                "http://localhost:3000"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        }
        else
        {
            // Production: Allow same-origin requests
            policy.AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
    });
});

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=kplista;Username=postgres;Password=postgres";
builder.Services.AddDbContext<KPlistaDbContext>(options =>
    options.UseNpgsql(connectionString));

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
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "";
})
.AddFacebook(options =>
{
    options.AppId = builder.Configuration["Authentication:Facebook:AppId"] ?? "";
    options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"] ?? "";
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();

// Serve static files from wwwroot
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback - serve index.html for non-API routes
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

app.Run();
