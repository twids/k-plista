using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using KPlista.Api.Hubs;
using System.Security.Claims;

namespace KPlista.Api.Controllers;

[ApiController]
[Route("api/external")]
public class ExternalController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<ExternalController> _logger;
    private readonly IHubContext<ListHub> _hubContext;

    public ExternalController(
        KPlistaDbContext context,
        ILogger<ExternalController> logger,
        IHubContext<ListHub> hubContext)
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

    // POST: api/external/add-item
    [HttpPost("add-item")]
    [Authorize(AuthenticationSchemes = "ApiKey")]
    public async Task<ActionResult<AddItemExternalResponseDto>> AddItem(AddItemExternalDto dto)
    {
        var userId = GetCurrentUserId();

        // Determine which list to add to
        Guid targetListId;
        if (dto.ListId.HasValue)
        {
            targetListId = dto.ListId.Value;
        }
        else
        {
            // Use default list
            var user = await _context.Users.FindAsync(userId);
            if (user?.DefaultListId == null)
            {
                return BadRequest(new { error = "No list specified and no default list set" });
            }
            targetListId = user.DefaultListId.Value;
        }

        // Verify user has access to the list (optimized single query with includes)
        var list = await _context.GroceryLists
            .Where(l => l.Id == targetListId)
            .Select(l => new
            {
                l.Id,
                l.OwnerId,
                HasEditAccess = l.OwnerId == userId ||
                    _context.ListShares.Any(s => s.GroceryListId == targetListId && s.SharedWithUserId == userId && s.CanEdit)
            })
            .FirstOrDefaultAsync();

        if (list == null)
        {
            return NotFound(new { error = "List not found" });
        }

        if (!list.HasEditAccess)
        {
            return Forbid();
        }

        // Create the item
        var item = new GroceryItem
        {
            Id = Guid.NewGuid(),
            Name = dto.ItemName,
            Quantity = 1,
            GroceryListId = targetListId,
            IsBought = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.GroceryItems.Add(item);
        await _context.SaveChangesAsync();

        var resultDto = new GroceryItemDto(
            item.Id,
            item.Name,
            item.Description,
            item.Quantity,
            item.Unit,
            item.IsBought,
            item.GroceryListId,
            item.GroupId,
            null,
            item.CreatedAt,
            item.UpdatedAt,
            item.BoughtAt
        );

        // Broadcast to SignalR clients
        await _hubContext.Clients.Group(targetListId.ToString()).SendAsync("ItemAdded", resultDto);

        _logger.LogInformation("External API: User {UserId} added item {ItemName} to list {ListId}", userId, dto.ItemName, targetListId);

        var response = new AddItemExternalResponseDto(
            true,
            resultDto
        );

        return Ok(response);
    }
}
