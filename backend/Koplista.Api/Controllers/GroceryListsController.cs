using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Koplista.Api.Data;
using Koplista.Api.DTOs;
using Koplista.Api.Models;
using System.Security.Claims;

namespace Koplista.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroceryListsController : ControllerBase
{
    private readonly KoplistaDbContext _context;
    private readonly ILogger<GroceryListsController> _logger;

    public GroceryListsController(KoplistaDbContext context, ILogger<GroceryListsController> logger)
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
}
