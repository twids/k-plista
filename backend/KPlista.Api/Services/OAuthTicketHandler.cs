using Microsoft.AspNetCore.Authentication.OAuth;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using KPlista.Api.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace KPlista.Api.Services;

/// <summary>
/// Handles OAuth ticket reception for external providers (Google, Facebook, etc.).
/// Provisions users, generates JWT, sets secure cookies, and handles errors.
/// </summary>
public class OAuthTicketHandler
{
    private readonly ILogger<OAuthTicketHandler> _logger;

    public OAuthTicketHandler(ILogger<OAuthTicketHandler> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Processes an OAuth ticket received from an external provider.
    /// </summary>
    public async Task HandleAsync(OAuthTicketReceivedContext context, string provider)
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("OAuth");
        
        var email = context.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var name = context.Principal?.FindFirst(ClaimTypes.Name)?.Value;
        var externalUserId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var pictureUrl = context.Principal?.FindFirst("picture")?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(externalUserId))
        {
            logger.LogWarning("{Provider}: Missing required claims for OAuth ticket", provider);
            context.Response.Redirect("/?error=invalid_user_data");
            context.HandleResponse();
            return;
        }

        try
        {
            var userService = context.HttpContext.RequestServices.GetRequiredService<IExternalUserService>();
            var jwtService = context.HttpContext.RequestServices.GetRequiredService<IJwtTokenService>();
            var db = context.HttpContext.RequestServices.GetRequiredService<KPlistaDbContext>();
            
            var user = await userService.GetOrCreateUserAsync(provider, externalUserId, email, name ?? email, pictureUrl);
            await db.SaveChangesAsync();
            
            var token = jwtService.GenerateToken(user.Id, user.Email, user.Name);
            logger.LogInformation("{Provider}: Authenticated {Email} (extId {ExternalId})", provider, LogMasking.MaskEmail(email), LogMasking.MaskExternalId(externalUserId));
            
            // Set secure HTTP-only cookie
            context.Response.Cookies.Append(
                "auth_token",
                token,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = context.Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddDays(30)
                }
            );
            
            context.Response.Redirect("/?login_success=true");
            context.HandleResponse();
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "{Provider}: Invalid operation during authentication", provider);
            context.Response.Redirect($"/?error=email_exists&message={Uri.EscapeDataString(ex.Message)}");
            context.HandleResponse();
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            logger.LogError(ex, "{Provider}: Database error during user provisioning", provider);
            context.Response.Redirect("/?error=database_error");
            context.HandleResponse();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{Provider}: Unexpected error during OAuth ticket reception", provider);
            context.Response.Redirect("/?error=authentication_error");
            context.HandleResponse();
        }
    }
}
