import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('Grocery Items Management API', () => {
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
    
    // Create a test list to use for all item tests
    const list = await apiHelper.createGroceryList(userToken, 'Items Test List');
    testListId = list.id;
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should add an item to a grocery list', async () => {
    const item = await apiHelper.addGroceryItem(userToken, testListId, 'Milk', 2, 'gallons');
    
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Milk');
    expect(item.quantity).toBe(2);
    expect(item.unit).toBe('gallons');
    expect(item.isBought).toBe(false);
  });

  test('should get all items in a grocery list', async () => {
    // Add multiple items
    await apiHelper.addGroceryItem(userToken, testListId, 'Bread', 1);
    await apiHelper.addGroceryItem(userToken, testListId, 'Eggs', 12);
    
    const items = await apiHelper.getGroceryItems(userToken, testListId);
    
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some(i => i.name === 'Bread')).toBe(true);
    expect(items.some(i => i.name === 'Eggs')).toBe(true);
  });

  test('should update a grocery item', async () => {
    const item = await apiHelper.addGroceryItem(userToken, testListId, 'Cheese', 1);
    const updatedItem = await apiHelper.updateGroceryItem(userToken, testListId, item.id, {
      name: 'Cheddar Cheese',
      quantity: 2,
      unit: 'blocks'
    });
    
    expect(updatedItem.id).toBe(item.id);
    expect(updatedItem.name).toBe('Cheddar Cheese');
    expect(updatedItem.quantity).toBe(2);
    expect(updatedItem.unit).toBe('blocks');
  });

  test('should mark item as bought', async () => {
    const item = await apiHelper.addGroceryItem(userToken, testListId, 'Butter', 1);
    const boughtItem = await apiHelper.markItemBought(userToken, testListId, item.id, true);
    
    expect(boughtItem.id).toBe(item.id);
    expect(boughtItem.isBought).toBe(true);
  });

  test('should mark item as not bought', async () => {
    const item = await apiHelper.addGroceryItem(userToken, testListId, 'Sugar', 1);
    await apiHelper.markItemBought(userToken, testListId, item.id, true);
    const unboughtItem = await apiHelper.markItemBought(userToken, testListId, item.id, false);
    
    expect(unboughtItem.isBought).toBe(false);
  });

  test('should delete a grocery item', async () => {
    const item = await apiHelper.addGroceryItem(userToken, testListId, 'Item to Delete', 1);
    await apiHelper.deleteGroceryItem(userToken, testListId, item.id);
    
    const items = await apiHelper.getGroceryItems(userToken, testListId);
    expect(items.some(i => i.id === item.id)).toBe(false);
  });

  test('should add item with notes', async () => {
    const item = await apiHelper.addGroceryItem(
      userToken,
      testListId,
      'Tomatoes',
      5,
      'lbs',
      'Get ripe ones'
    );
    
    expect(item.notes).toBe('Get ripe ones');
  });

  test('should handle items with special characters', async () => {
    const item = await apiHelper.addGroceryItem(
      userToken,
      testListId,
      'Jalapeño Peppers',
      10
    );
    
    expect(item.name).toBe('Jalapeño Peppers');
  });

  test('should handle items with very long names', async () => {
    const longName = 'Very Long Item Name '.repeat(10);
    const item = await apiHelper.addGroceryItem(
      userToken,
      testListId,
      longName,
      1
    );
    
    expect(item.name).toBe(longName);
  });
});
