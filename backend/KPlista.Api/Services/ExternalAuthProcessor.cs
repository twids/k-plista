using KPlista.Api.Data;
using KPlista.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace KPlista.Api.Services;

public interface IExternalAuthProcessor
{
    Task<string> ProcessAsync(string provider, ClaimsPrincipal principal, CancellationToken ct = default);
}

public class ExternalAuthProcessor : IExternalAuthProcessor
{
    private readonly KPlistaDbContext _db;
    private readonly IJwtTokenService _jwt;
    private readonly ILogger<ExternalAuthProcessor> _logger;

    public ExternalAuthProcessor(KPlistaDbContext db, IJwtTokenService jwt, ILogger<ExternalAuthProcessor> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    public async Task<string> ProcessAsync(string provider, ClaimsPrincipal principal, CancellationToken ct = default)
    {
        var email = principal.FindFirst(ClaimTypes.Email)?.Value;
        var name = principal.FindFirst(ClaimTypes.Name)?.Value;
        var externalUserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var maskedExternalId = LogMasking.MaskExternalId(externalUserId);
        var pictureUrl = principal.FindFirst("picture")?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(externalUserId))
        {
            _logger.LogWarning("ExternalAuth: Missing required claims for provider {Provider}", provider);
            return "/?error=invalid_user_data";
        }

        try
        {
            var masked = LogMasking.MaskEmail(email);
            var user = await _db.Users.FirstOrDefaultAsync(u => u.ExternalProvider == provider && u.ExternalUserId == externalUserId, ct);
            if (user == null)
            {
                var existingEmailUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
                if (existingEmailUser != null && existingEmailUser.ExternalProvider != provider)
                {
                    _logger.LogWarning("ExternalAuth: Email {Email} already exists with different provider {Existing} (extId {ExternalId})", masked, existingEmailUser.ExternalProvider, maskedExternalId);
                    return $"/?error=email_exists&message={Uri.EscapeDataString($"Account exists with {existingEmailUser.ExternalProvider}")}";
                }

                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    Name = name ?? email,
                    ProfilePictureUrl = pictureUrl,
                    ExternalProvider = provider,
                    ExternalUserId = externalUserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Users.Add(user);
            }
            else
            {
                user.Email = email;
                user.Name = name ?? email;
                user.ProfilePictureUrl = pictureUrl;
                user.UpdatedAt = DateTime.UtcNow;
            }

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException dbEx)
            {
                // Possible unique constraint violation due to race condition
                _logger.LogWarning(dbEx, "ExternalAuth: DbUpdateException, possible race condition for provider {Provider} (extId {ExternalId})", provider, maskedExternalId);
                // Try to fetch the user again
                user = await _db.Users.FirstOrDefaultAsync(u => u.ExternalProvider == provider && u.ExternalUserId == externalUserId, ct);
                if (user == null)
                {
                    // Still not found, rethrow
                    throw;
                }
                // else: user now exists, proceed
            }
            var token = _jwt.GenerateToken(user.Id, user.Email, user.Name);
            _logger.LogInformation("ExternalAuth: Provider {Provider} authenticated {Email} (extId {ExternalId})", provider, masked, maskedExternalId);
            return $"/?token={token}&login_success=true";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExternalAuth: Error authenticating provider {Provider} (extId {ExternalId})", provider, maskedExternalId);
            return "/?error=authentication_error";
        }
    }
}
