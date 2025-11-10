using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.DTOs;
using KPlista.Api.Models;
using System.Security.Claims;

namespace KPlista.Api.Controllers;

[ApiController]
[Route("api/grocerylists/{listId}/shares")]
[Authorize]
public class ListSharesController : ControllerBase
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<ListSharesController> _logger;

    public ListSharesController(KPlistaDbContext context, ILogger<ListSharesController> logger)
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

    // GET: api/grocerylists/{listId}/shares
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListShareDto>>> GetListShares(Guid listId)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(listId);
        if (list == null)
        {
            return NotFound();
        }

        // Only owner can view shares
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        var shares = await _context.ListShares
            .Include(ls => ls.SharedWithUser)
            .Include(ls => ls.GroceryList)
            .Where(ls => ls.GroceryListId == listId)
            .Select(ls => new ListShareDto(
                ls.Id,
                ls.GroceryListId,
                ls.GroceryList.Name,
                ls.SharedWithUserId,
                ls.SharedWithUser.Email,
                ls.SharedWithUser.Name,
                ls.CanEdit,
                ls.SharedAt
            ))
            .ToListAsync();

        return Ok(shares);
    }

    // POST: api/grocerylists/{listId}/shares
    [HttpPost]
    public async Task<ActionResult<ListShareDto>> CreateListShare(Guid listId, CreateListShareDto dto)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(listId);
        if (list == null)
        {
            return NotFound();
        }

        // Only owner can share
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        // Find user by email
        var userToShare = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.SharedWithUserEmail);

        if (userToShare == null)
        {
            return BadRequest("User not found");
        }

        // Check if already shared
        var existingShare = await _context.ListShares
            .FirstOrDefaultAsync(ls => ls.GroceryListId == listId && ls.SharedWithUserId == userToShare.Id);

        if (existingShare != null)
        {
            return BadRequest("List already shared with this user");
        }

        var share = new ListShare
        {
            Id = Guid.NewGuid(),
            GroceryListId = listId,
            SharedWithUserId = userToShare.Id,
            CanEdit = dto.CanEdit,
            SharedAt = DateTime.UtcNow
        };

        _context.ListShares.Add(share);
        await _context.SaveChangesAsync();

        var resultDto = new ListShareDto(
            share.Id,
            listId,
            list.Name,
            userToShare.Id,
            userToShare.Email,
            userToShare.Name,
            share.CanEdit,
            share.SharedAt
        );

        return CreatedAtAction(nameof(GetListShares), new { listId }, resultDto);
    }

    // PUT: api/grocerylists/{listId}/shares/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateListShare(Guid listId, Guid id, UpdateListShareDto dto)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(listId);
        if (list == null)
        {
            return NotFound();
        }

        // Only owner can update shares
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        var share = await _context.ListShares
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.GroceryListId == listId);

        if (share == null)
        {
            return NotFound();
        }

        share.CanEdit = dto.CanEdit;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/grocerylists/{listId}/shares/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteListShare(Guid listId, Guid id)
    {
        var userId = GetCurrentUserId();

        var list = await _context.GroceryLists.FindAsync(listId);
        if (list == null)
        {
            return NotFound();
        }

        // Only owner can remove shares
        if (list.OwnerId != userId)
        {
            return Forbid();
        }

        var share = await _context.ListShares
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.GroceryListId == listId);

        if (share == null)
        {
            return NotFound();
        }

        _context.ListShares.Remove(share);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
