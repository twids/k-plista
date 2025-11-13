using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using KPlista.Api.Services;
using Npgsql;
using System.Security.Claims;

namespace KPlista.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(KPlistaDbContext context, ILogger<AuthController> logger, IJwtTokenService jwtTokenService)
    {
        _context = context;
        _logger = logger;
        _jwtTokenService = jwtTokenService;
    }

    /// <summary>
    /// Finds or creates a user based on provider and email, handling sign in and sign up scenarios.
    /// </summary>
    private async Task<User> GetOrCreateUserAsync(string provider, string externalUserId, string email, string name, string? profilePictureUrl = null)
    {
        // First, try to find by provider + externalUserId (exact match)
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ExternalProvider == provider && u.ExternalUserId == externalUserId);

        if (user != null)
        {
            // Existing user found - update their info
            user.Email = email;
            user.Name = name;
            if (profilePictureUrl != null)
            {
                user.ProfilePictureUrl = profilePictureUrl;
            }
            user.UpdatedAt = DateTime.UtcNow;
            return user;
        }

        // Not found by provider+externalUserId, check if email exists
        var existingUserWithEmail = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email);

        if (existingUserWithEmail != null)
        {
            // Email exists - check if it's the same provider
            if (existingUserWithEmail.ExternalProvider != provider)
            {
                // Different provider - this is an error condition
                var providerName = string.IsNullOrWhiteSpace(existingUserWithEmail.ExternalProvider) 
                    ? "the original provider" 
                    : existingUserWithEmail.ExternalProvider;
                throw new InvalidOperationException($"An account with this email already exists. Please sign in with {providerName}.");
            }

            // Same provider - update their externalUserId (supports sign in with same button)
            existingUserWithEmail.ExternalUserId = externalUserId;
            existingUserWithEmail.Name = name;
            if (profilePictureUrl != null)
            {
                existingUserWithEmail.ProfilePictureUrl = profilePictureUrl;
            }
            existingUserWithEmail.UpdatedAt = DateTime.UtcNow;
            return existingUserWithEmail;
        }

        // New user - create and add to context
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

        _context.Users.Add(newUser);
        return newUser;
    }

    // GET: api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        var dto = new UserDto(
            user.Id,
            user.Email,
            user.Name,
            user.ProfilePictureUrl
        );

        return Ok(dto);
    }

    // POST: api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequest request)
    {
        // This is a simplified version - in a real app, you would validate the token
        // with the external provider (Google, Facebook, Apple)
        
        try
        {
            var user = await GetOrCreateUserAsync(
                request.Provider,
                request.ExternalUserId,
                request.Email,
                request.Name,
                request.ProfilePictureUrl
            );

            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = _jwtTokenService.GenerateToken(user.Id, user.Email, user.Name);

            var response = new LoginResponseDto(
                user.Id,
                user.Email,
                user.Name,
                user.ProfilePictureUrl,
                token
            );

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // Handle email already exists with different provider
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = ex.Message
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Handle race condition where unique constraint is violated
            _logger.LogWarning(ex, "Unique constraint violation during user creation for email {Email}", request.Email);
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = "An account with this email already exists. Please try signing in again."
            });
        }
    }

    /// <summary>
    /// Checks if a DbUpdateException is caused by a unique constraint violation.
    /// </summary>
    private bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        // Check if the inner exception is a PostgreSQL unique constraint violation
        return ex.InnerException is PostgresException postgresException 
            && postgresException.SqlState == "23505"; // Unique violation
    }

    // GET: api/auth/google
    [HttpGet("google")]
    public IActionResult LoginGoogle()
    {
        var properties = new AuthenticationProperties { RedirectUri = "/api/auth/google-callback" };
        return Challenge(properties, "Google");
    }

    // GET: api/auth/google-callback
    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var result = await HttpContext.AuthenticateAsync("Google");
        if (!result.Succeeded)
        {
            return Unauthorized();
        }

        var claims = result.Principal?.Claims;
        var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
        var name = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
        var externalUserId = claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(externalUserId))
        {
            return BadRequest("Invalid user information");
        }

        try
        {
            var user = await GetOrCreateUserAsync(
                "Google",
                externalUserId,
                email,
                name ?? email
            );

            await _context.SaveChangesAsync();

            // In a real app, you would create a JWT token here
            return Ok(new { userId = user.Id, email = user.Email, name = user.Name });
        }
        catch (InvalidOperationException ex)
        {
            // Handle email already exists with different provider
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = ex.Message
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Handle race condition where unique constraint is violated
            _logger.LogWarning(ex, "Unique constraint violation during user creation for email {Email}", email);
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = "An account with this email already exists. Please try signing in again."
            });
        }
    }

    // GET: api/auth/facebook
    [HttpGet("facebook")]
    public IActionResult LoginFacebook()
    {
        var properties = new AuthenticationProperties { RedirectUri = "/api/auth/facebook-callback" };
        return Challenge(properties, "Facebook");
    }

    // GET: api/auth/facebook-callback
    [HttpGet("facebook-callback")]
    public async Task<IActionResult> FacebookCallback()
    {
        var result = await HttpContext.AuthenticateAsync("Facebook");
        if (!result.Succeeded)
        {
            return Unauthorized();
        }

        var claims = result.Principal?.Claims;
        var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
        var name = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
        var externalUserId = claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(externalUserId))
        {
            return BadRequest("Invalid user information");
        }

        try
        {
            var user = await GetOrCreateUserAsync(
                "Facebook",
                externalUserId,
                email,
                name ?? email
            );

            await _context.SaveChangesAsync();

            // In a real app, you would create a JWT token here
            return Ok(new { userId = user.Id, email = user.Email, name = user.Name });
        }
        catch (InvalidOperationException ex)
        {
            // Handle email already exists with different provider
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = ex.Message
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Handle race condition where unique constraint is violated
            _logger.LogWarning(ex, "Unique constraint violation during user creation for email {Email}", email);
            return BadRequest(new 
            { 
                error = "EmailAlreadyExists",
                message = "An account with this email already exists. Please try signing in again."
            });
        }
    }
}

public record LoginRequest(
    string Provider,
    string ExternalUserId,
    string Email,
    string Name,
    string? ProfilePictureUrl
);
