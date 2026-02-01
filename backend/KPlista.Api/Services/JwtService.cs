using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace KPlista.Api.Services;

public interface IJwtService
{
    string GenerateToken(Guid userId, string email, string name);
}

public class JwtService : IJwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationMinutes;
    private readonly ILogger<JwtService> _logger;
    private const string DefaultSecret = "your-secret-key-min-32-characters-long-for-security";

    public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
    {
        _logger = logger;
        _secret = configuration["Jwt:Secret"] ?? DefaultSecret;
        _issuer = configuration["Jwt:Issuer"] ?? "kplista-api";
        _audience = configuration["Jwt:Audience"] ?? "kplista-app";
        _expirationMinutes = configuration.GetValue<int>("Jwt:ExpirationMinutes", 1440); // Default 24 hours

        // Validate and warn about insecure configuration
        if (_secret == DefaultSecret)
        {
            _logger.LogWarning(
                "Using default JWT secret. This is insecure and should not be used in production. " +
                "Please configure Jwt:Secret in appsettings.json or environment variables.");
        }

        if (_secret.Length < 32)
        {
            throw new InvalidOperationException(
                "JWT secret must be at least 32 characters long for security. " +
                "Please configure a longer secret in Jwt:Secret.");
        }
    }

    public string GenerateToken(Guid userId, string email, string name)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secret);
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Name, name),
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            }),
            Expires = DateTime.UtcNow.AddMinutes(_expirationMinutes),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
