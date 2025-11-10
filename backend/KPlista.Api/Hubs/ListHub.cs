using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using System.Security.Claims;

namespace KPlista.Api.Hubs;

[Authorize]
public class ListHub : Hub
{
    private readonly KPlistaDbContext _context;
    private readonly ILogger<ListHub> _logger;
    private static readonly Dictionary<string, HashSet<string>> _listConnections = new();
    private static readonly Dictionary<string, ListUserInfo> _connectionUsers = new();
    private static readonly object _lock = new();

    public ListHub(KPlistaDbContext context, ILogger<ListHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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

    public async Task JoinList(string listId)
    {
        if (!Guid.TryParse(listId, out var listGuid))
        {
            _logger.LogWarning("Invalid list ID format: {ListId}", listId);
            return;
        }

        var userId = GetCurrentUserId();
        
        if (!await UserHasAccessToList(listGuid, userId))
        {
            _logger.LogWarning("User {UserId} attempted to join list {ListId} without access", userId, listId);
            return;
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("User {UserId} not found", userId);
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, listId);

        lock (_lock)
        {
            if (!_listConnections.ContainsKey(listId))
            {
                _listConnections[listId] = new HashSet<string>();
            }
            _listConnections[listId].Add(Context.ConnectionId);

            _connectionUsers[Context.ConnectionId] = new ListUserInfo
            {
                UserId = userId.ToString(),
                UserName = user.Name,
                ListId = listId
            };
        }

        // Notify others in the group that a new user joined
        await Clients.OthersInGroup(listId).SendAsync("UserJoined", new
        {
            userId = userId.ToString(),
            userName = user.Name
        });

        // Send current active users to the joining user
        var activeUsers = GetActiveUsersForList(listId);
        await Clients.Caller.SendAsync("ActiveUsers", activeUsers);

        _logger.LogInformation("User {UserName} ({UserId}) joined list {ListId}", user.Name, userId, listId);
    }

    public async Task LeaveList(string listId)
    {
        await RemoveFromList(listId);
    }

    private async Task RemoveFromList(string listId)
    {
        ListUserInfo? userInfo;
        lock (_lock)
        {
            if (!_connectionUsers.TryGetValue(Context.ConnectionId, out userInfo))
            {
                return;
            }

            if (_listConnections.ContainsKey(listId))
            {
                _listConnections[listId].Remove(Context.ConnectionId);
                if (_listConnections[listId].Count == 0)
                {
                    _listConnections.Remove(listId);
                }
            }

            _connectionUsers.Remove(Context.ConnectionId);
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, listId);

        // Notify others that user left
        await Clients.OthersInGroup(listId).SendAsync("UserLeft", new
        {
            userId = userInfo.UserId,
            userName = userInfo.UserName
        });

        _logger.LogInformation("User {UserName} ({UserId}) left list {ListId}", userInfo.UserName, userInfo.UserId, listId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string? listId;
        lock (_lock)
        {
            if (_connectionUsers.TryGetValue(Context.ConnectionId, out var userInfo))
            {
                listId = userInfo.ListId;
            }
            else
            {
                listId = null;
            }
        }

        if (listId != null)
        {
            await RemoveFromList(listId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private List<object> GetActiveUsersForList(string listId)
    {
        lock (_lock)
        {
            if (!_listConnections.ContainsKey(listId))
            {
                return new List<object>();
            }

            var activeUsers = _listConnections[listId]
                .Select(connectionId =>
                {
                    if (_connectionUsers.TryGetValue(connectionId, out var userInfo))
                    {
                        return new
                        {
                            userId = userInfo.UserId,
                            userName = userInfo.UserName
                        };
                    }
                    return null;
                })
                .Where(u => u != null)
                .DistinctBy(u => u!.userId)
                .Cast<object>()
                .ToList();

            return activeUsers;
        }
    }

    private class ListUserInfo
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string ListId { get; set; } = string.Empty;
    }
}
