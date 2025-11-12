using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using KPlista.Api.Services;
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
        
        // For now, we'll create or update the user based on the provided information
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ExternalProvider == request.Provider && 
                                     u.ExternalUserId == request.ExternalUserId);

        if (user == null)
        {
            // Check if a user with this email already exists with a different provider
            var existingUserWithEmail = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);
            
            if (existingUserWithEmail != null)
            {
                // User already exists with a different provider
                return BadRequest(new 
                { 
                    error = "EmailAlreadyExists",
                    message = $"An account with this email already exists. Please sign in with {existingUserWithEmail.ExternalProvider}."
                });
            }

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
            // Check if a user with this email already exists with a different provider
            var existingUserWithEmail = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);
            
            if (existingUserWithEmail != null)
            {
                // User already exists with a different provider
                return BadRequest(new 
                { 
                    error = "EmailAlreadyExists",
                    message = $"An account with this email already exists. Please sign in with {existingUserWithEmail.ExternalProvider}."
                });
            }

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
            // Check if a user with this email already exists with a different provider
            var existingUserWithEmail = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);
            
            if (existingUserWithEmail != null)
            {
                // User already exists with a different provider
                return BadRequest(new 
                { 
                    error = "EmailAlreadyExists",
                    message = $"An account with this email already exists. Please sign in with {existingUserWithEmail.ExternalProvider}."
                });
            }

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
