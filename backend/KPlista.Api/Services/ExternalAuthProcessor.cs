using KPlista.Api.Data;
using KPlista.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace KPlista.Api.Services;

/// <summary>
/// Service for provisioning and updating external OAuth users in the database.
/// Handles find-or-create logic for OAuth flows with proper error handling for race conditions.
/// 
/// RACE CONDITION HANDLING:
/// When multiple concurrent requests attempt to authenticate the same user (by provider + externalUserId),
/// both may pass the initial database lookups and attempt to insert a new user. The second insert
/// will fail with DbUpdateException due to unique constraints on email or external user ID.
/// 
/// The caller (OAuthTicketHandler) is responsible for catching DbUpdateException and implementing
/// retry logic with exponential backoff. This design separates concerns:
/// - Service: Business logic for user provisioning
/// - Handler: Retry/resilience logic and error recovery
/// 
/// See OAuthTicketHandler.GetOrCreateUserWithRetryAsync() for the retry implementation.
/// </summary>
public interface IExternalUserService
{
    Task<User> GetOrCreateUserAsync(string provider, string externalUserId, string email, string name, string? profilePictureUrl = null, CancellationToken ct = default);
}

public class ExternalUserService : IExternalUserService
{
    private readonly KPlistaDbContext _db;
    private readonly ILogger<ExternalUserService> _logger;

    public ExternalUserService(KPlistaDbContext db, ILogger<ExternalUserService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Gets an existing user or creates a new one for the external OAuth provider.
    /// 
    /// NOTE ON SAVECHANGESASYNC:
    /// Caller is responsible for calling SaveChangesAsync() AFTER this method returns.
    /// This is intentional to support retry logic in OAuthTicketHandler for handling
    /// DbUpdateException race conditions. The handler catches failures and retries
    /// with exponential backoff after clearing the DbContext change tracker.
    /// </summary>
    public async Task<User> GetOrCreateUserAsync(string provider, string externalUserId, string email, string name, string? profilePictureUrl = null, CancellationToken ct = default)
    {
        var maskedEmail = LogMasking.MaskEmail(email);
        var maskedExtId = LogMasking.MaskExternalId(externalUserId);

        // Try exact match: provider + externalUserId
        var user = await _db.Users.FirstOrDefaultAsync(u => u.ExternalProvider == provider && u.ExternalUserId == externalUserId, ct);
        if (user != null)
        {
            // Update existing user
            user.Email = email;
            user.Name = name;
            user.ProfilePictureUrl = profilePictureUrl;
            user.UpdatedAt = DateTime.UtcNow;
            return user;
        }

        // Check if email exists (account linking scenario or provider switch)
        var existingEmailUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existingEmailUser != null)
        {
            if (existingEmailUser.ExternalProvider != provider)
            {
                // Email exists with different provider - linking not allowed in this flow
                _logger.LogWarning("ExternalAuth: Email {Email} already exists with provider {Existing} (new: {New}, extId: {ExternalId})", 
                    maskedEmail, existingEmailUser.ExternalProvider, provider, maskedExtId);
                throw new InvalidOperationException($"Account exists with {existingEmailUser.ExternalProvider}. Please sign in with that provider.");
            }

            // Same provider, different external ID (shouldn't happen often)
            _logger.LogInformation("ExternalAuth: Updating ExternalUserId for {Email} (old: {OldId}, new: {NewId})", 
                maskedEmail, LogMasking.MaskExternalId(existingEmailUser.ExternalUserId), maskedExtId);
            existingEmailUser.ExternalUserId = externalUserId;
            existingEmailUser.Name = name;
            existingEmailUser.ProfilePictureUrl = profilePictureUrl;
            existingEmailUser.UpdatedAt = DateTime.UtcNow;
            return existingEmailUser;
        }

        // New user - create
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = name,
            ProfilePictureUrl = profilePictureUrl,
            ExternalProvider = provider,
            ExternalUserId = externalUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Users.Add(newUser);
        _logger.LogInformation("ExternalAuth: New user created for {Email} via {Provider} (extId: {ExternalId})", 
            maskedEmail, provider, maskedExtId);
        return newUser;
    }
}
