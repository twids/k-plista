# Manual Testing Guide for Voice Assistant API

## Overview

This document provides instructions for manually testing the new voice assistant API endpoints.

## Prerequisites

1. Backend running (see main README)
2. PostgreSQL database running
3. A user account in Koplista
4. At least one grocery list created

## Test Scenarios

### 1. API Key Management

#### Test: Create API Key

**Endpoint:** `POST /api/settings/api-keys`

**Authentication:** JWT Bearer token (cookie or header)

**Request:**
```bash
curl -X POST http://localhost:5000/api/settings/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{"name": "Test Key"}'
```

**Expected Response:** 201 Created
```json
{
  "id": "guid-here",
  "name": "Test Key",
  "key": "base64-encoded-key-here",
  "createdAt": "2026-01-04T19:00:00Z"
}
```

**Note:** Save the `key` value - you won't see it again!

#### Test: List API Keys

**Endpoint:** `GET /api/settings/api-keys`

**Request:**
```bash
curl http://localhost:5000/api/settings/api-keys \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

**Expected Response:** 200 OK
```json
[
  {
    "id": "guid-here",
    "name": "Test Key",
    "createdAt": "2026-01-04T19:00:00Z",
    "lastUsedAt": null
  }
]
```

#### Test: Delete API Key

**Endpoint:** `DELETE /api/settings/api-keys/{id}`

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/settings/api-keys/YOUR_KEY_ID \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

**Expected Response:** 204 No Content

### 2. Default List Management

#### Test: Get Default List

**Endpoint:** `GET /api/settings/default-list`

**Request:**
```bash
curl http://localhost:5000/api/settings/default-list \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

**Expected Response:** 200 OK
```json
{
  "listId": null
}
```
or
```json
{
  "listId": "list-guid-here"
}
```

#### Test: Set Default List

**Endpoint:** `PUT /api/settings/default-list`

**Request:**
```bash
curl -X PUT http://localhost:5000/api/settings/default-list \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{"listId": "YOUR_LIST_ID"}'
```

**Expected Response:** 204 No Content

#### Test: Clear Default List

**Request:**
```bash
curl -X PUT http://localhost:5000/api/settings/default-list \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{"listId": null}'
```

**Expected Response:** 204 No Content

### 3. External Add Item Endpoint

#### Test: Add Item with API Key (using default list)

**Endpoint:** `POST /api/external/add-item`

**Authentication:** X-API-Key header

**Prerequisites:**
- Set a default list (see above)
- Have a valid API key

**Request:**
```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"itemName": "mjölk"}'
```

**Expected Response:** 200 OK
```json
{
  "success": true,
  "item": {
    "id": "item-guid",
    "name": "mjölk",
    "description": null,
    "quantity": 1,
    "unit": null,
    "isBought": false,
    "groceryListId": "list-guid",
    "groupId": null,
    "groupName": null,
    "createdAt": "2026-01-04T19:00:00Z",
    "updatedAt": "2026-01-04T19:00:00Z",
    "boughtAt": null
  }
}
```

#### Test: Add Item to Specific List

**Request:**
```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"itemName": "bröd", "listId": "SPECIFIC_LIST_ID"}'
```

**Expected Response:** 200 OK (same structure as above)

#### Test: Error Cases

**Test 1: Missing API Key**
```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -d '{"itemName": "test"}'
```
**Expected:** 401 Unauthorized

**Test 2: Invalid API Key**
```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid-key" \
  -d '{"itemName": "test"}'
```
**Expected:** 401 Unauthorized

**Test 3: No Default List and No ListId**
```bash
# First, clear default list, then:
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"itemName": "test"}'
```
**Expected:** 400 Bad Request
```json
{
  "error": "No list specified and no default list set"
}
```

**Test 4: Invalid List ID**
```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"itemName": "test", "listId": "00000000-0000-0000-0000-000000000000"}'
```
**Expected:** 404 Not Found

### 4. Real-Time Updates (SignalR)

#### Test: Verify SignalR Notifications

1. Open Koplista in a browser
2. View a grocery list
3. Use the external API to add an item to that list:
   ```bash
   curl -X POST http://localhost:5000/api/external/add-item \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{"itemName": "real-time test", "listId": "YOUR_LIST_ID"}'
   ```
4. Verify the item appears in the browser immediately without refresh

**Expected:** The new item should appear in the list in real-time

### 5. API Key Usage Tracking

1. Create an API key
2. Use it to add an item
3. List API keys again
4. Verify `lastUsedAt` timestamp is updated

### 6. Security Tests

#### Test: API Key Cannot Access JWT Endpoints

Try to use an API key to access a JWT-only endpoint:

```bash
curl http://localhost:5000/api/grocerylists \
  -H "X-API-Key: YOUR_API_KEY"
```

**Expected:** Should not work (API key auth only works for external endpoints)

#### Test: JWT Cannot Access External Endpoint

Try to use JWT token to access external endpoint:

```bash
curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{"itemName": "test"}'
```

**Expected:** 401 Unauthorized (external endpoint requires X-API-Key)

## Frontend Testing

### Settings Page

1. Log into Koplista
2. Click the settings icon (⚙️) in the top navigation
3. Verify you can:
   - See the "Default List for Voice Commands" dropdown
   - Select a list from the dropdown
   - See "API Keys" section
   - Click "Create Key" button
   - Enter a key name
   - See the newly created key displayed (once)
   - Copy the key to clipboard
   - See the key in the list (without the actual key value)
   - Delete a key

### Expected UI Behavior

- After creating a key, a dialog should show the key with a warning
- The key should be copiable
- The key list should show creation date and last used date
- Deleting a key should remove it from the list
- Changing default list should save immediately

## Integration Testing

### Home Assistant Simulation

Create a shell script that mimics Home Assistant calling the API:

```bash
#!/bin/bash

API_KEY="your-api-key-here"
ITEM_NAME="$1"

if [ -z "$ITEM_NAME" ]; then
  echo "Usage: $0 <item-name>"
  exit 1
fi

curl -X POST http://localhost:5000/api/external/add-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"itemName\": \"$ITEM_NAME\"}"
```

Usage:
```bash
./add-item.sh "mjölk"
./add-item.sh "ägg"
./add-item.sh "bröd"
```

## Performance Testing

Test rate limiting and concurrent requests:

```bash
# Send 10 requests simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/external/add-item \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_API_KEY" \
    -d "{\"itemName\": \"item-$i\"}" &
done
wait
```

All requests should succeed (no rate limiting implemented yet).

## Database Verification

Check that data is properly stored:

```sql
-- Check API keys table
SELECT * FROM "ApiKeys";

-- Check users with default lists
SELECT "Id", "Email", "DefaultListId" FROM "Users";

-- Check items added via API
SELECT * FROM "GroceryItems" ORDER BY "CreatedAt" DESC LIMIT 10;
```

## Troubleshooting

### "Invalid API key" errors
- Verify the key hasn't been deleted
- Check you're using the full key value
- Ensure X-API-Key header is set correctly

### "No default list" errors
- Set a default list in settings
- Or specify listId in the request

### Items not appearing
- Check you have edit permissions for the list
- Verify SignalR connection is established
- Check browser console for errors
- Verify backend logs

### Database migration errors
- Ensure PostgreSQL is running
- Check connection string
- Run migrations manually: `dotnet ef database update`

## Success Criteria

All tests should pass with expected responses. The implementation should:

1. ✅ Allow creating and managing API keys
2. ✅ Allow setting a default grocery list
3. ✅ Accept external API requests with X-API-Key authentication
4. ✅ Add items to lists via external API
5. ✅ Trigger SignalR notifications for real-time updates
6. ✅ Track API key usage (lastUsedAt)
7. ✅ Properly validate permissions
8. ✅ Return appropriate error messages
9. ✅ Work with the frontend settings page
10. ✅ Support both default list and explicit list ID
