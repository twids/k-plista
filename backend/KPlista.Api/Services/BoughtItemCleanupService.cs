using KPlista.Api.Data;
using KPlista.Api.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace KPlista.Api.Services;

/// <summary>
/// Service for handling automatic cleanup of bought grocery items.
/// Scheduled via Hangfire to delete items after a configured delay.
/// </summary>
public class BoughtItemCleanupService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BoughtItemCleanupService> _logger;

    public BoughtItemCleanupService(
        IServiceProvider serviceProvider,
        ILogger<BoughtItemCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Deletes a bought item if the list has auto-remove enabled and the item is still marked as bought.
    /// This method is called by Hangfire after the configured delay.
    /// </summary>
    /// <param name="itemId">The ID of the item to potentially delete</param>
    /// <param name="listId">The ID of the list containing the item</param>
    public async Task DeleteBoughtItemAsync(Guid itemId, Guid listId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<KPlistaDbContext>();
        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ListHub>>();

        try
        {
            var list = await context.GroceryLists
                .AsNoTracking()
                .FirstOrDefaultAsync(gl => gl.Id == listId);

            if (list == null)
            {
                _logger.LogWarning("List {ListId} not found during bought item cleanup", listId);
                return;
            }

            // Check if auto-remove is still enabled for this list
            if (!list.AutoRemoveBoughtItemsEnabled)
            {
                _logger.LogInformation("Auto-remove disabled for list {ListId}, skipping item {ItemId} deletion", listId, itemId);
                return;
            }

            var item = await context.GroceryItems
                .FirstOrDefaultAsync(gi => gi.Id == itemId && gi.GroceryListId == listId);

            if (item == null)
            {
                _logger.LogInformation("Item {ItemId} not found, may have been manually deleted", itemId);
                return;
            }

            // Only delete if item is still marked as bought
            if (!item.IsBought)
            {
                _logger.LogInformation("Item {ItemId} is no longer marked as bought, skipping deletion", itemId);
                return;
            }

            // Delete the item
            context.GroceryItems.Remove(item);
            await context.SaveChangesAsync();

            _logger.LogInformation("Auto-deleted bought item {ItemId} from list {ListId}", itemId, listId);

            // Broadcast deletion to SignalR clients
            await hubContext.Clients.Group(listId.ToString()).SendAsync("ItemRemoved", new
            {
                id = itemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during auto-deletion of item {ItemId} from list {ListId}", itemId, listId);
            throw;
        }
    }
}
