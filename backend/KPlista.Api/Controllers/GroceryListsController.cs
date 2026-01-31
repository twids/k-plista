using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using System.Security.Claims;
using Hangfire;

namespace KPlista.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroceryListsController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<GroceryListsController> _logger;

    public GroceryListsController(KPlistaDbContext context, ILogger<GroceryListsController> logger)
    {
        _context = context;
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

    // GET: api/grocerylists
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroceryListDto>>> GetGroceryLists()
    {
        var userId = GetCurrentUserId();

        var lists = await _context.GroceryLists
            .Include(gl => gl.Owner)
            .Include(gl => gl.Items)
            .GroupJoin(
                _context.ListShares.Where(s => s.SharedWithUserId == userId),
                gl => gl.Id,
                s => s.GroceryListId,
                (gl, shares) => new { List = gl, Shares = shares })
            .Where(x => x.List.OwnerId == userId || x.Shares.Any())
            .Select(x => new GroceryListDto(
                x.List.Id,
                x.List.Name,
                x.List.Description,
                x.List.OwnerId,
                x.List.Owner.Name,
                x.List.CreatedAt,
                x.List.UpdatedAt,
                x.List.Items.Count,
                x.List.Items.Count(i => i.IsBought),
                x.Shares.Any(),
                x.List.AutoRemoveBoughtItemsEnabled,
                x.List.AutoRemoveBoughtItemsDelayMinutes
            ))
            .ToListAsync();

        return Ok(lists);
    }

    // GET: api/grocerylists/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<GroceryListDto>> GetGroceryList(Guid id)
    {
        var userId = GetCurrentUserId();

        var result = await _context.GroceryLists
            .Include(gl => gl.Owner)
            .Include(gl => gl.Items)
            .Where(gl => gl.Id == id)
            .GroupJoin(
                _context.ListShares.Where(s => s.SharedWithUserId == userId),
                gl => gl.Id,
                s => s.GroceryListId,
                (gl, shares) => new { List = gl, Shares = shares })
            .FirstOrDefaultAsync();

        if (result == null)
        {
            return NotFound();
        }

        // Check if user has access to this list
        if (result.List.OwnerId != userId && !result.Shares.Any())
        {
            return Forbid();
        }

        var dto = new GroceryListDto(
            result.List.Id,
            result.List.Name,
            result.List.Description,
            result.List.OwnerId,
            result.List.Owner.Name,
            result.List.CreatedAt,
            result.List.UpdatedAt,
            result.List.Items.Count,
            result.List.Items.Count(i => i.IsBought),
            result.Shares.Any(),
            result.List.AutoRemoveBoughtItemsEnabled,
            result.List.AutoRemoveBoughtItemsDelayMinutes
        );

        return Ok(dto);
    }

    // POST: api/grocerylists
    [HttpPost]
    public async Task<ActionResult<GroceryListDto>> CreateGroceryList(CreateGroceryListDto dto)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return Unauthorized();
        }

        // Validate auto-remove delay minutes
        if (dto.AutoRemoveBoughtItemsDelayMinutes <= 0)
        {
            return BadRequest("AutoRemoveBoughtItemsDelayMinutes must be a positive number of minutes.");
        }

        var list = new GroceryList
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            AutoRemoveBoughtItemsEnabled = dto.AutoRemoveBoughtItemsEnabled,
            AutoRemoveBoughtItemsDelayMinutes = dto.AutoRemoveBoughtItemsDelayMinutes
        };

        _context.GroceryLists.Add(list);
        await _context.SaveChangesAsync();

        var resultDto = new GroceryListDto(
            list.Id,
            list.Name,
            list.Description,
            list.OwnerId,
            user.Name,
            list.CreatedAt,
            list.UpdatedAt,
            0,
            0,
            false,
            list.AutoRemoveBoughtItemsEnabled,
            list.AutoRemoveBoughtItemsDelayMinutes
        );

        return CreatedAtAction(nameof(GetGroceryList), new { id = list.Id }, resultDto);
    }

    // PUT: api/grocerylists/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroceryList(Guid id, UpdateGroceryListDto dto)
    {
        var userId = GetCurrentUserId();

        var result = await _context.GroceryLists
            .Where(gl => gl.Id == id)
            .GroupJoin(
                _context.ListShares.Where(s => s.SharedWithUserId == userId && s.CanEdit),
                gl => gl.Id,
                s => s.GroceryListId,
                (gl, shares) => new
                {
                    List = gl,
                    CanEdit = gl.OwnerId == userId || shares.Any()
                })
            .FirstOrDefaultAsync();

        if (result == null)
        {
            return NotFound();
        }

        // Check if user is owner or has edit permission
        if (!result.CanEdit)
        {
            return Forbid();
        }

        result.List.Name = dto.Name;
        result.List.Description = dto.Description;
        result.List.UpdatedAt = DateTime.UtcNow;

        // Validate auto-remove delay minutes if provided
        if (dto.AutoRemoveBoughtItemsDelayMinutes.HasValue && dto.AutoRemoveBoughtItemsDelayMinutes.Value <= 0)
        {
            return BadRequest("AutoRemoveBoughtItemsDelayMinutes must be a positive number of minutes.");
        }

        // Track if auto-remove is being disabled
        bool wasEnabled = result.List.AutoRemoveBoughtItemsEnabled;

        // Update auto-remove settings if provided
        if (dto.AutoRemoveBoughtItemsEnabled.HasValue)
        {
            result.List.AutoRemoveBoughtItemsEnabled = dto.AutoRemoveBoughtItemsEnabled.Value;
        }
        if (dto.AutoRemoveBoughtItemsDelayMinutes.HasValue)
        {
            result.List.AutoRemoveBoughtItemsDelayMinutes = dto.AutoRemoveBoughtItemsDelayMinutes.Value;
        }

        // If auto-remove was just disabled, cancel all pending auto-removal jobs for this list
        if (wasEnabled && !result.List.AutoRemoveBoughtItemsEnabled)
        {
            var itemsWithJobs = await _context.GroceryItems
                .Where(gi => gi.GroceryListId == id && gi.AutoRemoveJobId != null)
                .ToListAsync();

            foreach (var item in itemsWithJobs)
            {
                BackgroundJob.Delete(item.AutoRemoveJobId!);
                item.AutoRemoveJobId = null;
            }

            _logger.LogInformation("Cancelled {Count} pending auto-removal jobs for list {ListId}",
                itemsWithJobs.Count, id);
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/grocerylists/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroceryList(Guid id)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(id);

        if (list == null)
        {
            return NotFound();
        }

        // Only owner can delete
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        _context.GroceryLists.Remove(list);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/grocerylists/{id}/magiclink
    [HttpPost("{id}/magiclink")]
    public async Task<ActionResult<MagicLinkDto>> GenerateMagicLink(Guid id, [FromBody] GenerateMagicLinkDto dto)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(id);

        if (list == null)
        {
            return NotFound();
        }

        // Only owner can generate magic link
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        // Generate a unique share token
        list.ShareToken = GenerateSecureToken();
        list.ShareTokenCanEdit = dto.CanEdit;
        list.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Construct the share URL
        var shareUrl = $"{Request.Scheme}://{Request.Host}/share/{list.ShareToken}";

        var result = new MagicLinkDto(list.ShareToken, shareUrl, list.ShareTokenCanEdit);

        return Ok(result);
    }

    // GET: api/grocerylists/accept-share/{token}
    [HttpGet("accept-share/{token}")]
    public async Task<ActionResult<AcceptShareDto>> AcceptMagicLink(string token)
    {
        var userId = GetCurrentUserId();

        var result = await _context.GroceryLists
            .Include(gl => gl.Owner)
            .Where(gl => gl.ShareToken == token)
            .GroupJoin(
                _context.ListShares.Where(s => s.SharedWithUserId == userId),
                gl => gl.Id,
                s => s.GroceryListId,
                (gl, shares) => new { List = gl, ExistingShare = shares.FirstOrDefault() })
            .FirstOrDefaultAsync();

        if (result == null)
        {
            return NotFound(new { message = "Invalid or expired share link" });
        }

        // Check if user is already owner
        if (result.List.OwnerId == userId)
        {
            return Ok(new AcceptShareDto(result.List.Id, result.List.Name, result.List.Owner.Name));
        }

        // Check if user already has access
        if (result.ExistingShare != null)
        {
            return Ok(new AcceptShareDto(result.List.Id, result.List.Name, result.List.Owner.Name));
        }

        // Create a new share for this user with the permission level set by the owner
        var share = new ListShare
        {
            Id = Guid.NewGuid(),
            GroceryListId = result.List.Id,
            SharedWithUserId = userId,
            CanEdit = result.List.ShareTokenCanEdit,
            SharedAt = DateTime.UtcNow
        };

        _context.ListShares.Add(share);
        await _context.SaveChangesAsync();

        return Ok(new AcceptShareDto(result.List.Id, result.List.Name, result.List.Owner.Name));
    }

    private static string GenerateSecureToken()
    {
        // Generate a cryptographically secure random token
        var bytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        // Convert to base64url encoding: replace '+' with '-', '/' with '_', and trim '=' padding to make the token safe for use in URLs
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
