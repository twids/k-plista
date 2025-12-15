using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using System.Security.Claims;

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
            .Include(gl => gl.Shares)
            .Where(gl => gl.OwnerId == userId || gl.Shares.Any(s => s.SharedWithUserId == userId))
            .Select(gl => new GroceryListDto(
                gl.Id,
                gl.Name,
                gl.Description,
                gl.OwnerId,
                gl.Owner.Name,
                gl.CreatedAt,
                gl.UpdatedAt,
                gl.Items.Count,
                gl.Items.Count(i => i.IsBought),
                gl.Shares.Any()
            ))
            .ToListAsync();

        return Ok(lists);
    }

    // GET: api/grocerylists/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<GroceryListDto>> GetGroceryList(Guid id)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists
            .Include(gl => gl.Owner)
            .Include(gl => gl.Items)
            .Include(gl => gl.Shares)
            .FirstOrDefaultAsync(gl => gl.Id == id);

        if (list == null)
        {
            return NotFound();
        }

        // Check if user has access to this list
        if (list.OwnerId != userId && !list.Shares.Any(s => s.SharedWithUserId == userId))
        {
            return Forbid();
        }

        var dto = new GroceryListDto(
            list.Id,
            list.Name,
            list.Description,
            list.OwnerId,
            list.Owner.Name,
            list.CreatedAt,
            list.UpdatedAt,
            list.Items.Count,
            list.Items.Count(i => i.IsBought),
            list.Shares.Any()
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

        var list = new GroceryList
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
            false
        );

        return CreatedAtAction(nameof(GetGroceryList), new { id = list.Id }, resultDto);
    }

    // PUT: api/grocerylists/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroceryList(Guid id, UpdateGroceryListDto dto)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists
            .Include(gl => gl.Shares)
            .FirstOrDefaultAsync(gl => gl.Id == id);

        if (list == null)
        {
            return NotFound();
        }

        // Check if user is owner or has edit permission
        var canEdit = list.OwnerId == userId || 
                     list.Shares.Any(s => s.SharedWithUserId == userId && s.CanEdit);

        if (!canEdit)
        {
            return Forbid();
        }

        list.Name = dto.Name;
        list.Description = dto.Description;
        list.UpdatedAt = DateTime.UtcNow;

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

        var list = await _context.GroceryLists
            .Include(gl => gl.Owner)
            .Include(gl => gl.Shares)
            .FirstOrDefaultAsync(gl => gl.ShareToken == token);

        if (list == null)
        {
            return NotFound(new { message = "Invalid or expired share link" });
        }

        // Check if user is already owner
        if (list.OwnerId == userId)
        {
            return Ok(new AcceptShareDto(list.Id, list.Name, list.Owner.Name));
        }

        // Check if user already has access
        var existingShare = list.Shares.FirstOrDefault(s => s.SharedWithUserId == userId);
        if (existingShare != null)
        {
            return Ok(new AcceptShareDto(list.Id, list.Name, list.Owner.Name));
        }

        // Create a new share for this user with the permission level set by the owner
        var share = new ListShare
        {
            Id = Guid.NewGuid(),
            GroceryListId = list.Id,
            SharedWithUserId = userId,
            CanEdit = list.ShareTokenCanEdit,
            SharedAt = DateTime.UtcNow
        };

        _context.ListShares.Add(share);
        await _context.SaveChangesAsync();

        return Ok(new AcceptShareDto(list.Id, list.Name, list.Owner.Name));
    }

    private static string GenerateSecureToken()
    {
        // Generate a cryptographically secure random token
        var bytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
