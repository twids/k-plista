using Microsoft.AspNetCore.Authentication.OAuth;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using KPlista.Api.Data;
using KPlista.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace KPlista.Api.Services;

/// <summary>
/// Handles OAuth ticket reception for external providers (Google, Facebook, etc.).
/// Provisions users, generates JWT, sets secure cookies, and handles errors with retry logic
/// for race conditions during concurrent user creation.
/// </summary>
public class OAuthTicketHandler
{
    private readonly ILogger<OAuthTicketHandler> _logger;
    private const int MaxRetries = 3;
    private const int InitialDelayMs = 100;

    public OAuthTicketHandler(ILogger<OAuthTicketHandler> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Processes an OAuth ticket received from an external provider.
    /// Implements retry logic for handling race conditions during concurrent user creation.
    /// </summary>
    public async Task HandleAsync(TicketReceivedContext context, string provider)
    {
        if (context.Principal == null)
        {
            _logger.LogWarning("{Provider}: Missing principal on OAuth ticket", provider);
            context.Response.Redirect($"/?error=invalid_user_data&provider={Uri.EscapeDataString(provider)}");
            context.HandleResponse();
            return;
        }

        var email = context.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var name = context.Principal?.FindFirst(ClaimTypes.Name)?.Value;
        var externalUserId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var pictureUrl = context.Principal?.FindFirst("picture")?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(externalUserId))
        {
            _logger.LogWarning("{Provider}: Missing required claims for OAuth ticket", provider);
            context.Response.Redirect($"/?error=invalid_user_data&provider={Uri.EscapeDataString(provider)}");
            context.HandleResponse();
            return;
        }

        try
        {
            var userService = context.HttpContext.RequestServices.GetRequiredService<IExternalUserService>();
            var jwtService = context.HttpContext.RequestServices.GetRequiredService<IJwtTokenService>();
            var db = context.HttpContext.RequestServices.GetRequiredService<KPlistaDbContext>();
            
            // Use retry logic to handle race conditions during concurrent user creation
            var user = await GetOrCreateUserWithRetryAsync(userService, db, provider, externalUserId, email, name ?? email, pictureUrl, _logger);
            
            var token = jwtService.GenerateToken(user.Id, user.Email, user.Name);
            _logger.LogInformation("{Provider}: Authenticated {Email} (extId {ExternalId})", provider, LogMasking.MaskEmail(email), LogMasking.MaskExternalId(externalUserId));
            
            // Set secure HTTP-only cookie
            context.Response.Cookies.Append(
                "auth_token",
                token,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = context.Request.IsHttps,
                    // Lax allows cookie on top-level OAuth redirects while still mitigating CSRF
                    SameSite = SameSiteMode.Lax,
                    Path = "/",
                    Expires = DateTimeOffset.UtcNow.AddDays(30)
                }
            );
            
            context.Response.Redirect("/?login_success=true");
            context.HandleResponse();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "{Provider}: Invalid operation during authentication", provider);
            context.Response.Redirect($"/?error=email_exists&provider={Uri.EscapeDataString(provider)}");
            context.HandleResponse();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "{Provider}: Database error after {MaxRetries} retry attempts during user provisioning", provider, MaxRetries);
            context.Response.Redirect($"/?error=database_error&provider={Uri.EscapeDataString(provider)}");
            context.HandleResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Provider}: Unexpected error during OAuth ticket reception", provider);
            context.Response.Redirect($"/?error=authentication_error&provider={Uri.EscapeDataString(provider)}");
            context.HandleResponse();
        }
    }

    /// <summary>
    /// Attempts to get or create a user with exponential backoff retry logic.
    /// Handles DbUpdateException that can occur when multiple concurrent requests attempt to create
    /// the same user (unique constraint violations on email or externalUserId).
    /// 
    /// Race condition scenario:
    /// 1. Two concurrent requests for user with same email/provider
    /// 2. Both pass initial lookups, both attempt to insert
    /// 3. First succeeds, second gets DbUpdateException
    /// 4. This method retries the lookup to fetch the user created by the first request
    /// </summary>
    private async Task<Models.User> GetOrCreateUserWithRetryAsync(
        IExternalUserService userService, 
        KPlistaDbContext db, 
        string provider, 
        string externalUserId, 
        string email, 
        string name, 
        string? pictureUrl,
        ILogger logger)
    {
        for (int attempt = 0; attempt < MaxRetries; attempt++)
        {
            try
            {
                var user = await userService.GetOrCreateUserAsync(provider, externalUserId, email, name, pictureUrl);
                await db.SaveChangesAsync();
                return user;
            }
            catch (DbUpdateException ex) when (attempt < MaxRetries - 1)
            {
                // Exponential backoff: 100ms, 200ms, 400ms, etc.
                var delayMs = InitialDelayMs * (int)Math.Pow(2, attempt);
                logger.LogWarning(
                    ex, 
                    "{Provider}: DbUpdateException on attempt {Attempt}/{MaxRetries}, retrying after {DelayMs}ms. " +
                    "Race condition detected (extId: {ExternalId})", 
                    provider, 
                    attempt + 1, 
                    MaxRetries, 
                    delayMs,
                    LogMasking.MaskExternalId(externalUserId)
                );

                // Wait before retry
                await Task.Delay(delayMs);

                // Dispose of failed DbContext changes
                db.ChangeTracker.Clear();
            }
            catch (DbUpdateException) when (attempt == MaxRetries - 1)
            {
                // Last attempt failed, give up
                logger.LogWarning(
                    "{Provider}: Max retries ({MaxRetries}) exceeded for user provisioning (extId: {ExternalId}), " +
                    "possible persistent unique constraint violation",
                    provider,
                    MaxRetries,
                    LogMasking.MaskExternalId(externalUserId)
                );
                throw;
            }
        }

        throw new InvalidOperationException("Should not reach here");
    }
}
