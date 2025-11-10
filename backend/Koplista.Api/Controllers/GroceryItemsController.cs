using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Koplista.Api.Data;
using Koplista.Api.DTOs;
using Koplista.Api.Models;
using Koplista.Api.Hubs;
using System.Security.Claims;

namespace Koplista.Api.Controllers;

[ApiController]
[Route("api/grocerylists/{listId}/items")]
[Authorize]
public class GroceryItemsController : ControllerBase
{
    private readonly KoplistaDbContext _context;
    private readonly ILogger<GroceryItemsController> _logger;
    private readonly IHubContext<ListHub> _hubContext;

    public GroceryItemsController(KoplistaDbContext context, ILogger<GroceryItemsController> logger, IHubContext<ListHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
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

    private async Task<bool> UserHasAccessToList(Guid listId, Guid userId)
    {
        var list = await _context.GroceryLists
            .Include(gl => gl.Shares)
            .FirstOrDefaultAsync(gl => gl.Id == listId);

        if (list == null) return false;

        return list.OwnerId == userId || list.Shares.Any(s => s.SharedWithUserId == userId);
    }

    private async Task<bool> UserCanEditList(Guid listId, Guid userId)
    {
        var list = await _context.GroceryLists
            .Include(gl => gl.Shares)
            .FirstOrDefaultAsync(gl => gl.Id == listId);

        if (list == null) return false;

        return list.OwnerId == userId || 
               list.Shares.Any(s => s.SharedWithUserId == userId && s.CanEdit);
    }

    // GET: api/grocerylists/{listId}/items
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroceryItemDto>>> GetGroceryItems(Guid listId)
    {
        var userId = GetCurrentUserId();

        if (!await UserHasAccessToList(listId, userId))
        {
            return Forbid();
        }

        var items = await _context.GroceryItems
            .Include(gi => gi.Group)
            .Where(gi => gi.GroceryListId == listId)
            .OrderBy(gi => gi.IsBought)
            .ThenBy(gi => gi.CreatedAt)
            .Select(gi => new GroceryItemDto(
                gi.Id,
                gi.Name,
                gi.Description,
                gi.Quantity,
                gi.Unit,
                gi.IsBought,
                gi.GroceryListId,
                gi.GroupId,
                gi.Group != null ? gi.Group.Name : null,
                gi.CreatedAt,
                gi.UpdatedAt,
                gi.BoughtAt
            ))
            .ToListAsync();

        return Ok(items);
    }

    // GET: api/grocerylists/{listId}/items/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<GroceryItemDto>> GetGroceryItem(Guid listId, Guid id)
    {
        var userId = GetCurrentUserId();

        if (!await UserHasAccessToList(listId, userId))
        {
            return Forbid();
        }

        var item = await _context.GroceryItems
            .Include(gi => gi.Group)
            .FirstOrDefaultAsync(gi => gi.Id == id && gi.GroceryListId == listId);

        if (item == null)
        {
            return NotFound();
        }

        var dto = new GroceryItemDto(
            item.Id,
            item.Name,
            item.Description,
            item.Quantity,
            item.Unit,
            item.IsBought,
            item.GroceryListId,
            item.GroupId,
            item.Group?.Name,
            item.CreatedAt,
            item.UpdatedAt,
            item.BoughtAt
        );

        return Ok(dto);
    }

    // POST: api/grocerylists/{listId}/items
    [HttpPost]
    public async Task<ActionResult<GroceryItemDto>> CreateGroceryItem(Guid listId, CreateGroceryItemDto dto)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        // Validate group belongs to the same list if specified
        if (dto.GroupId.HasValue)
        {
            var groupExists = await _context.ItemGroups
                .AnyAsync(g => g.Id == dto.GroupId && g.GroceryListId == listId);

            if (!groupExists)
            {
                return BadRequest("Invalid group ID");
            }
        }

        var item = new GroceryItem
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Quantity = dto.Quantity,
            Unit = dto.Unit,
            GroupId = dto.GroupId,
            GroceryListId = listId,
            IsBought = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.GroceryItems.Add(item);
        await _context.SaveChangesAsync();

        var group = dto.GroupId.HasValue 
            ? await _context.ItemGroups.FindAsync(dto.GroupId.Value)
            : null;

        var resultDto = new GroceryItemDto(
            item.Id,
            item.Name,
            item.Description,
            item.Quantity,
            item.Unit,
            item.IsBought,
            item.GroceryListId,
            item.GroupId,
            group?.Name,
            item.CreatedAt,
            item.UpdatedAt,
            item.BoughtAt
        );

        // Broadcast to SignalR clients
        await _hubContext.Clients.Group(listId.ToString()).SendAsync("ItemAdded", resultDto);

        return CreatedAtAction(nameof(GetGroceryItem), new { listId, id = item.Id }, resultDto);
    }

    // PUT: api/grocerylists/{listId}/items/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroceryItem(Guid listId, Guid id, UpdateGroceryItemDto dto)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var item = await _context.GroceryItems
            .FirstOrDefaultAsync(gi => gi.Id == id && gi.GroceryListId == listId);

        if (item == null)
        {
            return NotFound();
        }

        // Validate group belongs to the same list if specified
        if (dto.GroupId.HasValue)
        {
            var groupExists = await _context.ItemGroups
                .AnyAsync(g => g.Id == dto.GroupId && g.GroceryListId == listId);

            if (!groupExists)
            {
                return BadRequest("Invalid group ID");
            }
        }

        item.Name = dto.Name;
        item.Description = dto.Description;
        item.Quantity = dto.Quantity;
        item.Unit = dto.Unit;
        item.GroupId = dto.GroupId;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Broadcast to SignalR clients
        var group = dto.GroupId.HasValue 
            ? await _context.ItemGroups.FindAsync(dto.GroupId.Value)
            : null;

        var updatedDto = new GroceryItemDto(
            item.Id,
            item.Name,
            item.Description,
            item.Quantity,
            item.Unit,
            item.IsBought,
            item.GroceryListId,
            item.GroupId,
            group?.Name,
            item.CreatedAt,
            item.UpdatedAt,
            item.BoughtAt
        );
        await _hubContext.Clients.Group(listId.ToString()).SendAsync("ItemUpdated", updatedDto);

        return NoContent();
    }

    // PATCH: api/grocerylists/{listId}/items/{id}/bought
    [HttpPatch("{id}/bought")]
    public async Task<IActionResult> MarkItemBought(Guid listId, Guid id, MarkItemBoughtDto dto)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var item = await _context.GroceryItems
            .FirstOrDefaultAsync(gi => gi.Id == id && gi.GroceryListId == listId);

        if (item == null)
        {
            return NotFound();
        }

        item.IsBought = dto.IsBought;
        item.BoughtAt = dto.IsBought ? DateTime.UtcNow : null;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Broadcast to SignalR clients
        await _hubContext.Clients.Group(listId.ToString()).SendAsync("ItemBoughtStatusChanged", new
        {
            id = item.Id,
            isBought = item.IsBought,
            boughtAt = item.BoughtAt,
            updatedAt = item.UpdatedAt
        });

        return NoContent();
    }

    // DELETE: api/grocerylists/{listId}/items/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroceryItem(Guid listId, Guid id)
    {
        var userId = GetCurrentUserId();

        if (!await UserCanEditList(listId, userId))
        {
            return Forbid();
        }

        var item = await _context.GroceryItems
            .FirstOrDefaultAsync(gi => gi.Id == id && gi.GroceryListId == listId);

        if (item == null)
        {
            return NotFound();
        }

        _context.GroceryItems.Remove(item);
        await _context.SaveChangesAsync();

        // Broadcast to SignalR clients
        await _hubContext.Clients.Group(listId.ToString()).SendAsync("ItemRemoved", new
        {
            id = item.Id
        });

        return NoContent();
    }
}
