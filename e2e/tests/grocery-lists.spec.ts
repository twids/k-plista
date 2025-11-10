import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('Grocery List Management API', () => {
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let userToken: string;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    apiHelper = new ApiHelper();
    await authHelper.init();
    await apiHelper.init();
    
    const user = await authHelper.createAuthenticatedUser('user1');
    userToken = user.token;
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should create a new grocery list', async () => {
    const list = await apiHelper.createGroceryList(userToken, 'Test List', 'Test Description');
    
    expect(list.id).toBeDefined();
    expect(list.name).toBe('Test List');
    expect(list.description).toBe('Test Description');
  });

  test('should get all grocery lists', async () => {
    // Create a couple of lists
    await apiHelper.createGroceryList(userToken, 'List 1');
    await apiHelper.createGroceryList(userToken, 'List 2');
    
    const lists = await apiHelper.getGroceryLists(userToken);
    
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists.some(l => l.name === 'List 1')).toBe(true);
    expect(lists.some(l => l.name === 'List 2')).toBe(true);
  });

  test('should get a specific grocery list by ID', async () => {
    const createdList = await apiHelper.createGroceryList(userToken, 'Specific List');
    const fetchedList = await apiHelper.getGroceryList(userToken, createdList.id);
    
    expect(fetchedList.id).toBe(createdList.id);
    expect(fetchedList.name).toBe('Specific List');
  });

  test('should update a grocery list', async () => {
    const list = await apiHelper.createGroceryList(userToken, 'Original Name');
    const updatedList = await apiHelper.updateGroceryList(
      userToken,
      list.id,
      'Updated Name',
      'Updated Description'
    );
    
    expect(updatedList.id).toBe(list.id);
    expect(updatedList.name).toBe('Updated Name');
    expect(updatedList.description).toBe('Updated Description');
  });

  test('should delete a grocery list', async () => {
    const list = await apiHelper.createGroceryList(userToken, 'List to Delete');
    await apiHelper.deleteGroceryList(userToken, list.id);
    
    // Verify it's deleted by trying to fetch it
    await expect(
      apiHelper.getGroceryList(userToken, list.id)
    ).rejects.toThrow();
  });

  test('should not allow access to lists without authentication', async () => {
    await expect(
      apiHelper.getGroceryLists('invalid-token')
    ).rejects.toThrow();
  });

  test('should isolate lists between different users', async () => {
    // Create a list for user1
    const user1List = await apiHelper.createGroceryList(userToken, 'User 1 List');
    
    // Create user2 and their list
    const user2 = await authHelper.createAuthenticatedUser('user2');
    const user2Lists = await apiHelper.getGroceryLists(user2.token);
    
    // User2 should not see user1's list
    expect(user2Lists.some(l => l.id === user1List.id)).toBe(false);
  });
});
