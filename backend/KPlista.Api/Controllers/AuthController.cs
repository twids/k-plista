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
    private readonly IJwtService _jwtService;

    public AuthController(KPlistaDbContext context, ILogger<AuthController> logger, IJwtService jwtService)
    {
        _context = context;
        _logger = logger;
        _jwtService = jwtService;
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

        try
        {
            await _context.SaveChangesAsync();
            return newUser;
        }
        catch (DbUpdateException ex) when (ex.InnerException is NpgsqlException pgEx && pgEx.SqlState == "23505")
        {
            // Unique constraint violation - retry once to handle race condition
            _logger.LogWarning("Duplicate key error when creating user. Retrying...");
            
            // Reload the user that was created by another thread/request
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.ExternalProvider == provider && u.ExternalUserId == externalUserId);
            
            if (existingUser != null)
            {
                return existingUser;
            }
            
            throw; // If still not found, re-throw the original exception
        }
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
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        // This is a simplified version - in a real app, you would validate the token
        // with the external provider (Google, Facebook, Apple)
        
        // For now, we'll create or update the user based on the provided information
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ExternalProvider == request.Provider && 
                                     u.ExternalUserId == request.ExternalUserId);

        if (user == null)
        {
            // Create new user
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                Name = request.Name,
                ProfilePictureUrl = request.ProfilePictureUrl,
                ExternalProvider = request.Provider,
                ExternalUserId = request.ExternalUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
        }
        else
        {
            // Update existing user
            user.Email = request.Email;
            user.Name = request.Name;
            user.ProfilePictureUrl = request.ProfilePictureUrl;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Generate JWT token
        var token = _jwtService.GenerateToken(user.Id, user.Email, user.Name);

        var response = new LoginResponse(
            user.Id,
            user.Email,
            user.Name,
            user.ProfilePictureUrl,
            token
        );

        return Ok(response);
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

        // Create or update user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ExternalProvider == "Google" && u.ExternalUserId == externalUserId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = name ?? email,
                ExternalProvider = "Google",
                ExternalUserId = externalUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
        }
        else
        {
            user.Email = email;
            user.Name = name ?? user.Name;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // In a real app, you would create a JWT token here
        return Ok(new { userId = user.Id, email = user.Email, name = user.Name });
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

        // Create or update user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ExternalProvider == "Facebook" && u.ExternalUserId == externalUserId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = name ?? email,
                ExternalProvider = "Facebook",
                ExternalUserId = externalUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
        }
        else
        {
            user.Email = email;
            user.Name = name ?? user.Name;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // In a real app, you would create a JWT token here
        return Ok(new { userId = user.Id, email = user.Email, name = user.Name });
    }
}

public record LoginRequest(
    string Provider,
    string ExternalUserId,
    string Email,
    string Name,
    string? ProfilePictureUrl
);
