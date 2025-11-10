# SignalR Testing Guide

This document provides guidance for testing the real-time SignalR features in K-Plista.

## Prerequisites
- Two or more browser windows/devices
- At least two user accounts
- A shared grocery list between users

## Test Scenarios

### 1. Real-Time Item Updates

#### Test: Add Item
1. User A opens a shared list
2. User B opens the same list
3. User A adds a new item
4. **Expected**: User B sees the new item appear instantly without refresh

#### Test: Update Item
1. Both users viewing the same list
2. User A edits an item's quantity or name
3. **Expected**: User B sees the updated item instantly

#### Test: Mark as Bought
1. Both users viewing the same list
2. User A checks an item as bought
3. **Expected**: User B sees the item marked with strikethrough instantly

#### Test: Delete Item
1. Both users viewing the same list
2. User A deletes an item
3. **Expected**: User B sees the item removed instantly

### 2. Presence Indicators

#### Test: User Joins
1. User A is viewing a list
2. User B opens the same list
3. **Expected**: User A sees User B's avatar appear in the app bar

#### Test: User Leaves
1. Both users viewing the same list
2. User B navigates away or closes the page
3. **Expected**: User A sees User B's avatar disappear

#### Test: Multiple Users
1. User A, B, and C all open the same list
2. **Expected**: Each user sees avatars of all other users
3. Hover over avatars to see user names

### 3. Connection Reliability

#### Test: Automatic Reconnection
1. User A is viewing a list
2. Disable network connection for User A (airplane mode or disable WiFi)
3. Wait a few seconds
4. Re-enable network connection
5. **Expected**: Connection automatically reestablishes, user rejoins the list

#### Test: Offline Changes
1. User A disconnects from network
2. User B makes changes to the list
3. User A reconnects
4. User A refreshes the page
5. **Expected**: User A sees all changes made by User B

### 4. Authorization

#### Test: List Access
1. User A creates a private list (not shared)
2. User B tries to connect to the list using the listId
3. **Expected**: User B should not receive updates (backend should reject join)

#### Test: Edit Permissions
1. User A shares list with User B (view-only)
2. User B attempts to add/edit/delete items
3. **Expected**: API returns 403 Forbidden, no SignalR broadcast

### 5. Concurrent Updates

#### Test: Rapid Changes
1. Both users viewing the same list
2. Both users rapidly add multiple items
3. **Expected**: All items from both users appear correctly
4. No items are lost or duplicated

#### Test: Same Item Edit
1. Both users viewing the same list
2. Both users edit the same item simultaneously
3. **Expected**: Last edit wins, both users see the final state

### 6. Performance

#### Test: Many Active Users
1. Open the same list with 5+ browser windows (simulating users)
2. Make changes from different windows
3. **Expected**: All updates propagate quickly (< 1 second)
4. No significant lag or performance degradation

#### Test: Large Lists
1. Create a list with 50+ items
2. Open in two browsers
3. Make changes from one browser
4. **Expected**: Updates still propagate instantly

## Known Limitations

### Scaling Considerations
- Current implementation uses in-memory storage for presence tracking
- For horizontal scaling (multiple server instances), consider:
  - Redis backplane for SignalR
  - Distributed cache for presence data
  - Sticky sessions or scale-out SignalR

### Browser Support
- Requires WebSocket support (all modern browsers)
- Fallback to Server-Sent Events and Long Polling if needed

## Debugging

### Check Connection Status
Open browser console and look for:
- "SignalR connected" - Connection established
- "User joined list: {listId}" - Successfully joined list room
- "SignalR reconnecting..." - Connection lost, attempting reconnect
- "SignalR reconnected" - Connection restored

### Common Issues

**Issue**: Updates not appearing
- Check browser console for errors
- Verify JWT token is valid
- Ensure user has access to the list
- Check network connectivity

**Issue**: Presence indicators not showing
- Verify SignalR connection is established
- Check that `JoinList` was called successfully
- Look for `UserJoined` events in console

**Issue**: Reconnection not working
- Check browser console for retry attempts
- Verify backend is accessible
- Check JWT token hasn't expired

## Automated Testing (Future)

Consider implementing:
1. Integration tests with multiple SignalR clients
2. Load testing with many concurrent connections
3. Network failure simulation tests
4. E2E tests using Playwright or Selenium with multiple browser instances

## Monitoring in Production

Recommended metrics to track:
- Active SignalR connections count
- Connection/disconnection rate
- Average message latency
- Failed authentication attempts
- Hub method invocation errors
