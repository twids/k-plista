using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using System.Security.Claims;

namespace KPlista.Api.Controllers;

[ApiController]
[Route("api/grocerylists/{listId}/groups")]
[Authorize]
public class ItemGroupsController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<ItemGroupsController> _logger;

    public ItemGroupsController(KPlistaDbContext context, ILogger<ItemGroupsController> logger)
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

    private async Task<bool> UserCanEditList(Guid listId, Guid userId)
    {
        var list = await _context.GroceryLists
            .Where(gl => gl.Id == listId)
            .GroupJoin(
                _context.ListShares.Where(s => s.SharedWithUserId == userId && s.CanEdit),
                gl => gl.Id,
                s => s.GroceryListId,
                (gl, shares) => new
                {
                    gl.OwnerId,
                    HasEditAccess = gl.OwnerId == userId || shares.Any()
                })
            .FirstOrDefaultAsync();

        if (list == null) return false;

        return list.HasEditAccess;
    }

    // GET: api/grocerylists/{listId}/groups
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ItemGroupDto>>> GetItemGroups(Guid listId)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var groups = await _context.ItemGroups
            .Include(g => g.Items)
            .Where(g => g.GroceryListId == listId)
            .OrderBy(g => g.SortOrder)
            .Select(g => new ItemGroupDto(
                g.Id,
                g.Name,
                g.Icon,
                g.Color,
                g.SortOrder,
                g.GroceryListId,
                g.Items.Count,
                g.CreatedAt,
                g.UpdatedAt
            ))
            .ToListAsync();

        return Ok(groups);
    }

    // GET: api/grocerylists/{listId}/groups/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ItemGroupDto>> GetItemGroup(Guid listId, Guid id)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var group = await _context.ItemGroups
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g => g.Id == id && g.GroceryListId == listId);

        if (group == null)
        {
            return NotFound();
        }

        var dto = new ItemGroupDto(
            group.Id,
            group.Name,
            group.Icon,
            group.Color,
            group.SortOrder,
            group.GroceryListId,
            group.Items.Count,
            group.CreatedAt,
            group.UpdatedAt
        );

        return Ok(dto);
    }

    // POST: api/grocerylists/{listId}/groups
    [HttpPost]
    public async Task<ActionResult<ItemGroupDto>> CreateItemGroup(Guid listId, CreateItemGroupDto dto)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var group = new ItemGroup
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Icon = dto.Icon,
            Color = dto.Color,
            SortOrder = dto.SortOrder,
            GroceryListId = listId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ItemGroups.Add(group);
        await _context.SaveChangesAsync();

        var resultDto = new ItemGroupDto(
            group.Id,
            group.Name,
            group.Icon,
            group.Color,
            group.SortOrder,
            group.GroceryListId,
            0,
            group.CreatedAt,
            group.UpdatedAt
        );

        return CreatedAtAction(nameof(GetItemGroup), new { listId, id = group.Id }, resultDto);
    }

    // PUT: api/grocerylists/{listId}/groups/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateItemGroup(Guid listId, Guid id, UpdateItemGroupDto dto)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var group = await _context.ItemGroups
            .FirstOrDefaultAsync(g => g.Id == id && g.GroceryListId == listId);

        if (group == null)
        {
            return NotFound();
        }

        group.Name = dto.Name;
        group.Icon = dto.Icon;
        group.Color = dto.Color;
        group.SortOrder = dto.SortOrder;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/grocerylists/{listId}/groups/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteItemGroup(Guid listId, Guid id)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var group = await _context.ItemGroups
            .FirstOrDefaultAsync(g => g.Id == id && g.GroceryListId == listId);

        if (group == null)
        {
            return NotFound();
        }

        _context.ItemGroups.Remove(group);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
