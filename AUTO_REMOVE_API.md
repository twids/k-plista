# Auto-Remove Bought Items API Documentation

## Overview
This document describes the new API endpoints and fields for the auto-remove bought items feature.

## Feature Description
Lists can now be configured to automatically remove items after they are marked as bought. This is useful for keeping lists clean and reducing clutter from completed shopping trips.

## Configuration

### List-Level Settings

Each grocery list now supports the following configuration options:

#### `autoRemoveBoughtItemsEnabled` (boolean)
- **Default**: `false`
- **Description**: When `true`, bought items will be automatically deleted after the configured delay. When `false`, bought items remain in the list indefinitely.

#### `autoRemoveBoughtItemsDelayMinutes` (integer, nullable)
- **Default**: `360` (6 hours)
- **Description**: The delay in minutes before a bought item is automatically deleted. Only applies when `autoRemoveBoughtItemsEnabled` is `true`.

## API Changes

### Get Lists (GET /api/grocerylists)

**Response** (Updated):
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Weekly Groceries",
    "description": "Shopping list for the week",
    "ownerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ownerName": "John Doe",
    "createdAt": "2024-01-31T10:00:00Z",
    "updatedAt": "2024-01-31T10:00:00Z",
    "itemCount": 10,
    "boughtItemCount": 3,
    "isShared": false,
    "autoRemoveBoughtItemsEnabled": true,    // NEW
    "autoRemoveBoughtItemsDelayMinutes": 360 // NEW
  }
]
```

### Get List Details (GET /api/grocerylists/{id})

**Response** (Updated):
Same as above - includes the two new fields.

### Create List (POST /api/grocerylists)

**Request** (Updated):
```json
{
  "name": "Weekly Groceries",
  "description": "Shopping list for the week",
  "autoRemoveBoughtItemsEnabled": true,    // OPTIONAL, defaults to false
  "autoRemoveBoughtItemsDelayMinutes": 360 // OPTIONAL, defaults to 360
}
```

**Notes**:
- Both new fields are optional
- If omitted, defaults to `enabled=false` and `delayMinutes=360`
- Delay only matters when enabled is true

### Update List (PUT /api/grocerylists/{id})

**Request** (Updated):
```json
{
  "name": "Weekly Groceries",
  "description": "Shopping list for the week",
  "autoRemoveBoughtItemsEnabled": false,    // OPTIONAL
  "autoRemoveBoughtItemsDelayMinutes": 720  // OPTIONAL
}
```

**Notes**:
- Both new fields are optional
- Only include the fields you want to update
- Partial updates are supported

## Behavior

### When Auto-Remove is Enabled

1. User marks an item as bought (PATCH /api/grocerylists/{listId}/items/{id}/bought with `isBought: true`)
2. Backend schedules a background job to delete the item after the configured delay
3. If the delay is 360 minutes (default), the item will be deleted 6 hours later
4. All connected clients will receive a SignalR notification when the item is deleted

### When Item is Unmarked as Bought

1. User marks a bought item as not bought (PATCH /api/grocerylists/{listId}/items/{id}/bought with `isBought: false`)
2. Backend cancels any pending auto-delete job for that item
3. Item remains in the list

### When Auto-Remove is Disabled

- Items marked as bought remain in the list indefinitely
- No background jobs are scheduled
- Normal behavior (same as before this feature)

## SignalR Events

### New Event: `ItemDeleted`

Sent when an item is automatically deleted:

```javascript
hubConnection.on("ItemDeleted", (data) => {
  // data.id: ID of the deleted item
  // data.reason: "auto-removed"
  console.log(`Item ${data.id} was auto-removed`);
});
```

**Handling in UI**:
- Remove the item from the local state/cache
- Update the item count for the list
- Optionally show a notification to the user

## Frontend Integration Examples

### TypeScript Interface

```typescript
interface GroceryListDto {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  boughtItemCount: number;
  isShared: boolean;
  autoRemoveBoughtItemsEnabled: boolean;
  autoRemoveBoughtItemsDelayMinutes?: number;
}

interface CreateGroceryListDto {
  name: string;
  description?: string;
  autoRemoveBoughtItemsEnabled?: boolean;
  autoRemoveBoughtItemsDelayMinutes?: number;
}

interface UpdateGroceryListDto {
  name: string;
  description?: string;
  autoRemoveBoughtItemsEnabled?: boolean;
  autoRemoveBoughtItemsDelayMinutes?: number;
}
```

### Example: Creating a List with Auto-Remove

```typescript
const createList = async () => {
  const response = await fetch('/api/grocerylists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Weekly Groceries',
      description: 'Shopping for the week',
      autoRemoveBoughtItemsEnabled: true,
      autoRemoveBoughtItemsDelayMinutes: 360 // 6 hours
    })
  });
  return await response.json();
};
```

### Example: Updating Auto-Remove Settings

```typescript
const updateAutoRemoveSettings = async (listId: string, enabled: boolean, delayMinutes: number) => {
  const list = await getCurrentList(listId);
  
  const response = await fetch(`/api/grocerylists/${listId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: list.name,
      description: list.description,
      autoRemoveBoughtItemsEnabled: enabled,
      autoRemoveBoughtItemsDelayMinutes: delayMinutes
    })
  });
  
  if (response.ok) {
    console.log('Auto-remove settings updated');
  }
};
```

### Example: Listening for Auto-Deleted Items

```typescript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("/hubs/list")
  .build();

// Subscribe to the list group
connection.invoke("JoinList", listId);

// Handle auto-deleted items
connection.on("ItemDeleted", (data) => {
  if (data.reason === "auto-removed") {
    // Remove item from state
    setItems(items => items.filter(item => item.id !== data.id));
    
    // Optionally show a toast notification
    showNotification(`Item was automatically removed`);
  }
});
```

## UI/UX Recommendations

### Settings UI
Consider adding a settings panel for each list with:
- Toggle for "Auto-remove bought items"
- Time picker/dropdown for delay (e.g., "6 hours", "12 hours", "1 day")
- Help text explaining the feature

### Visual Indicators
- Show an icon or badge on lists that have auto-remove enabled
- Display the configured delay time (e.g., "Auto-removes after 6 hours")
- Show a countdown or timestamp on bought items indicating when they'll be deleted

### Notifications
- When an item is auto-deleted, show a brief notification
- Consider allowing users to undo if they see the notification quickly
- Batch notifications if multiple items are deleted simultaneously

## Testing

### Manual Testing Scenarios

1. **Enable auto-remove on a list**
   - Create or update a list with `autoRemoveBoughtItemsEnabled: true`
   - Verify the setting is saved
   - Mark an item as bought
   - Wait for the configured delay
   - Verify the item is deleted

2. **Disable auto-remove on a list**
   - Update a list with `autoRemoveBoughtItemsEnabled: false`
   - Mark items as bought
   - Verify items are NOT deleted after the delay

3. **Cancel deletion by unmarking**
   - Enable auto-remove on a list
   - Mark an item as bought
   - Before the delay expires, mark it as not bought
   - Verify the item is NOT deleted

4. **Change delay setting**
   - Create a list with different delay values
   - Verify jobs are scheduled with correct delays

## Monitoring

In development, you can access the Hangfire Dashboard at:
- URL: `http://localhost:5157/hangfire` (when running locally)
- Shows all scheduled jobs, completed jobs, and failed jobs
- Useful for debugging and monitoring auto-remove functionality

## Troubleshooting

### Items not being deleted
- Check that `autoRemoveBoughtItemsEnabled` is `true` on the list
- Verify the backend Hangfire server is running
- Check the Hangfire dashboard for failed jobs
- Review backend logs for errors

### Wrong delay
- Verify `autoRemoveBoughtItemsDelayMinutes` is set correctly
- Check the job details in Hangfire dashboard to see scheduled time
- Ensure the client and server clocks are synchronized

### Missing SignalR notifications
- Verify SignalR connection is established
- Check that the client is subscribed to the list group
- Review browser console for connection errors
