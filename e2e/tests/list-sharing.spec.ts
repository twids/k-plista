import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('List Sharing API', () => {
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let user1Token: string;
  let user2Token: string;
  let user2Email: string;
  let testListId: string;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    apiHelper = new ApiHelper();
    await authHelper.init();
    await apiHelper.init();
    
    const user1 = await authHelper.createAuthenticatedUser('user1');
    user1Token = user1.token;
    
    const user2 = await authHelper.createAuthenticatedUser('user2');
    user2Token = user2.token;
    user2Email = user2.email;
    
    // Create a test list for user1
    const list = await apiHelper.createGroceryList(user1Token, 'Shared Test List');
    testListId = list.id;
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should share a list with another user (view only)', async () => {
    const share = await apiHelper.shareList(user1Token, testListId, user2Email, false);
    
    expect(share).toBeDefined();
  });

  test('should share a list with edit permissions', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'Editable Shared List');
    const share = await apiHelper.shareList(user1Token, list.id, user2Email, true);
    
    expect(share).toBeDefined();
  });

  test('should get all shares for a list', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'List with Shares');
    await apiHelper.shareList(user1Token, list.id, user2Email, false);
    
    const shares = await apiHelper.getListShares(user1Token, list.id);
    
    expect(shares.length).toBeGreaterThanOrEqual(1);
  });

  test('shared user should see the list in their lists', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'Visible to User2');
    await apiHelper.shareList(user1Token, list.id, user2Email, false);
    
    const user2Lists = await apiHelper.getGroceryLists(user2Token);
    expect(user2Lists.some(l => l.id === list.id)).toBe(true);
  });

  test('shared user with view-only should see items', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'View Only List');
    await apiHelper.addGroceryItem(user1Token, list.id, 'Test Item', 1);
    await apiHelper.shareList(user1Token, list.id, user2Email, false);
    
    const items = await apiHelper.getGroceryItems(user2Token, list.id);
    expect(items.some(i => i.name === 'Test Item')).toBe(true);
  });

  test('shared user with edit permission should be able to add items', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'Editable List');
    await apiHelper.shareList(user1Token, list.id, user2Email, true);
    
    const item = await apiHelper.addGroceryItem(user2Token, list.id, 'Added by User2', 1);
    expect(item.name).toBe('Added by User2');
    
    // Verify user1 can see the item added by user2
    const items = await apiHelper.getGroceryItems(user1Token, list.id);
    expect(items.some(i => i.name === 'Added by User2')).toBe(true);
  });

  test('owner should be able to delete their own list', async () => {
    const list = await apiHelper.createGroceryList(user1Token, 'List to Delete');
    await apiHelper.shareList(user1Token, list.id, user2Email, false);
    
    await apiHelper.deleteGroceryList(user1Token, list.id);
    
    // Verify user2 also can't access it anymore
    const user2Lists = await apiHelper.getGroceryLists(user2Token);
    expect(user2Lists.some(l => l.id === list.id)).toBe(false);
  });
});
