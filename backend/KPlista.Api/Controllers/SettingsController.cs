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
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(
        KPlistaDbContext context,
        IApiKeyService apiKeyService,
        ILogger<SettingsController> logger)
    {
        _context = context;
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in claims");
        }
        return userId;
    }

    // GET: api/settings/api-keys
    [HttpGet("api-keys")]
    public async Task<ActionResult<IEnumerable<ApiKeyDto>>> GetApiKeys()
    {
        var userId = GetCurrentUserId();

        var apiKeys = await _context.ApiKeys
            .Where(ak => ak.UserId == userId)
            .OrderByDescending(ak => ak.CreatedAt)
            .Select(ak => new ApiKeyDto(
                ak.Id,
                ak.Name,
                ak.CreatedAt,
                ak.LastUsedAt
            ))
            .ToListAsync();

        return Ok(apiKeys);
    }

    // POST: api/settings/api-keys
    [HttpPost("api-keys")]
    public async Task<ActionResult<CreateApiKeyResponseDto>> CreateApiKey(CreateApiKeyDto dto)
    {
        var userId = GetCurrentUserId();

        // Generate a new API key
        var rawKey = _apiKeyService.GenerateApiKey();
        var keyHash = _apiKeyService.HashApiKey(rawKey);

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            KeyHash = keyHash,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();

        // Return the raw key only once
        var response = new CreateApiKeyResponseDto(
            apiKey.Id,
            apiKey.Name,
            rawKey,
            apiKey.CreatedAt
        );

        _logger.LogInformation("User {UserId} created API key {ApiKeyId} with name {Name}", userId, apiKey.Id, apiKey.Name);

        return CreatedAtAction(nameof(GetApiKeys), response);
    }

    // DELETE: api/settings/api-keys/{id}
    [HttpDelete("api-keys/{id}")]
    public async Task<IActionResult> DeleteApiKey(Guid id)
    {
        var userId = GetCurrentUserId();

        var apiKey = await _context.ApiKeys
            .FirstOrDefaultAsync(ak => ak.Id == id && ak.UserId == userId);

        if (apiKey == null)
        {
            return NotFound();
        }

        _context.ApiKeys.Remove(apiKey);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deleted API key {ApiKeyId}", userId, apiKey.Id);

        return NoContent();
    }

    // GET: api/settings/default-list
    [HttpGet("default-list")]
    public async Task<ActionResult<DefaultListDto>> GetDefaultList()
    {
        var userId = GetCurrentUserId();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new DefaultListDto(user.DefaultListId));
    }

    // PUT: api/settings/default-list
    [HttpPut("default-list")]
    public async Task<IActionResult> SetDefaultList(DefaultListDto dto)
    {
        var userId = GetCurrentUserId();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        // Validate that the list exists and user has access to it
        if (dto.ListId.HasValue)
        {
            var list = await _context.GroceryLists
                .Include(gl => gl.Shares)
                .FirstOrDefaultAsync(gl => gl.Id == dto.ListId.Value);

            if (list == null)
            {
                return BadRequest("List not found");
            }

            var hasAccess = list.OwnerId == userId || 
                          list.Shares.Any(s => s.SharedWithUserId == userId);

            if (!hasAccess)
            {
                return Forbid();
            }
        }

        user.DefaultListId = dto.ListId;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} set default list to {ListId}", userId, dto.ListId);

        return NoContent();
    }
}
