import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('Item Groups Management API', () => {
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let userToken: string;
  let testListId: string;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    apiHelper = new ApiHelper();
    await authHelper.init();
    await apiHelper.init();
    
    const user = await authHelper.createAuthenticatedUser('user1');
    userToken = user.token;
    
    // Create a test list
    const list = await apiHelper.createGroceryList(userToken, 'Groups Test List');
    testListId = list.id;
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should create an item group', async () => {
    const group = await apiHelper.createItemGroup(userToken, testListId, 'Produce', '#4CAF50');
    
    expect(group.id).toBeDefined();
    expect(group.name).toBe('Produce');
    expect(group.color).toBe('#4CAF50');
  });

  test('should get all groups in a list', async () => {
    await apiHelper.createItemGroup(userToken, testListId, 'Dairy', '#2196F3');
    await apiHelper.createItemGroup(userToken, testListId, 'Meat', '#F44336');
    
    const groups = await apiHelper.getItemGroups(userToken, testListId);
    
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groups.some(g => g.name === 'Dairy')).toBe(true);
    expect(groups.some(g => g.name === 'Meat')).toBe(true);
  });

  test('should delete an item group', async () => {
    const group = await apiHelper.createItemGroup(userToken, testListId, 'Group to Delete');
    await apiHelper.deleteItemGroup(userToken, testListId, group.id);
    
    const groups = await apiHelper.getItemGroups(userToken, testListId);
    expect(groups.some(g => g.id === group.id)).toBe(false);
  });

  test('should assign items to groups', async () => {
    const group = await apiHelper.createItemGroup(userToken, testListId, 'Vegetables', '#8BC34A');
    const item = await apiHelper.addGroceryItem(
      userToken,
      testListId,
      'Carrots',
      1,
      'bunch',
      undefined,
      group.id
    );
    
    expect(item.groupId).toBe(group.id);
  });

  test('should handle groups with different sort orders', async () => {
    await apiHelper.createItemGroup(userToken, testListId, 'First', undefined, 1);
    await apiHelper.createItemGroup(userToken, testListId, 'Second', undefined, 2);
    await apiHelper.createItemGroup(userToken, testListId, 'Third', undefined, 3);
    
    const groups = await apiHelper.getItemGroups(userToken, testListId);
    const sortedGroups = groups.sort((a, b) => a.sortOrder - b.sortOrder);
    
    const firstIndex = sortedGroups.findIndex(g => g.name === 'First');
    const secondIndex = sortedGroups.findIndex(g => g.name === 'Second');
    const thirdIndex = sortedGroups.findIndex(g => g.name === 'Third');
    
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  test('should create group without color', async () => {
    const group = await apiHelper.createItemGroup(userToken, testListId, 'No Color Group');
    
    expect(group.name).toBe('No Color Group');
    expect(group.color).toBeUndefined();
  });
});
