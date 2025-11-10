import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('End-to-End User Flow', () => {
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

  test('complete shopping workflow', async () => {
    // Step 1: Create a grocery list
    const list = await apiHelper.createGroceryList(
      userToken,
      'Weekly Groceries',
      'Shopping list for the week'
    );
    expect(list.name).toBe('Weekly Groceries');

    // Step 2: Create groups for organization
    const produceGroup = await apiHelper.createItemGroup(userToken, list.id, 'Produce', '#4CAF50', 1);
    const dairyGroup = await apiHelper.createItemGroup(userToken, list.id, 'Dairy', '#2196F3', 2);
    const meatGroup = await apiHelper.createItemGroup(userToken, list.id, 'Meat', '#F44336', 3);

    // Step 3: Add items to different groups
    const apple = await apiHelper.addGroceryItem(
      userToken,
      list.id,
      'Apples',
      5,
      'lbs',
      'Get organic',
      produceGroup.id
    );
    expect(apple.groupId).toBe(produceGroup.id);

    const banana = await apiHelper.addGroceryItem(
      userToken,
      list.id,
      'Bananas',
      1,
      'bunch',
      undefined,
      produceGroup.id
    );

    const milk = await apiHelper.addGroceryItem(
      userToken,
      list.id,
      'Milk',
      2,
      'gallons',
      undefined,
      dairyGroup.id
    );

    const chicken = await apiHelper.addGroceryItem(
      userToken,
      list.id,
      'Chicken Breast',
      2,
      'lbs',
      undefined,
      meatGroup.id
    );

    // Step 4: Verify all items are in the list
    const items = await apiHelper.getGroceryItems(userToken, list.id);
    expect(items.length).toBe(4);

    // Step 5: Mark some items as bought
    await apiHelper.markItemBought(userToken, list.id, apple.id, true);
    await apiHelper.markItemBought(userToken, list.id, milk.id, true);

    // Step 6: Verify bought status
    const updatedItems = await apiHelper.getGroceryItems(userToken, list.id);
    const appleItem = updatedItems.find(i => i.id === apple.id);
    const milkItem = updatedItems.find(i => i.id === milk.id);
    const bananaItem = updatedItems.find(i => i.id === banana.id);

    expect(appleItem?.isBought).toBe(true);
    expect(milkItem?.isBought).toBe(true);
    expect(bananaItem?.isBought).toBe(false);

    // Step 7: Update an item
    await apiHelper.updateGroceryItem(userToken, list.id, chicken.id, {
      quantity: 3,
      notes: 'Changed mind, need more'
    });

    const updatedChicken = (await apiHelper.getGroceryItems(userToken, list.id))
      .find(i => i.id === chicken.id);
    expect(updatedChicken?.quantity).toBe(3);
    expect(updatedChicken?.notes).toBe('Changed mind, need more');

    // Step 8: Delete a bought item
    await apiHelper.deleteGroceryItem(userToken, list.id, apple.id);
    const finalItems = await apiHelper.getGroceryItems(userToken, list.id);
    expect(finalItems.length).toBe(3);
    expect(finalItems.some(i => i.id === apple.id)).toBe(false);

    // Step 9: Verify list still exists with correct data
    const finalList = await apiHelper.getGroceryList(userToken, list.id);
    expect(finalList.name).toBe('Weekly Groceries');

    // Step 10: Clean up - delete the list
    await apiHelper.deleteGroceryList(userToken, list.id);
    await expect(
      apiHelper.getGroceryList(userToken, list.id)
    ).rejects.toThrow();
  });

  test('collaborative shopping workflow', async () => {
    // Create second user
    const user2 = await authHelper.createAuthenticatedUser('user2');

    // User1 creates a list
    const list = await apiHelper.createGroceryList(
      userToken,
      'Party Supplies',
      'List for Saturday party'
    );

    // User1 adds some items
    await apiHelper.addGroceryItem(userToken, list.id, 'Chips', 3, 'bags');
    await apiHelper.addGroceryItem(userToken, list.id, 'Soda', 2, 'bottles');

    // User1 shares list with User2 with edit permissions
    await apiHelper.shareList(userToken, list.id, user2.email, true);

    // User2 can see the list
    const user2Lists = await apiHelper.getGroceryLists(user2.token);
    expect(user2Lists.some(l => l.id === list.id)).toBe(true);

    // User2 adds items
    await apiHelper.addGroceryItem(user2.token, list.id, 'Cups', 50, 'pieces');
    await apiHelper.addGroceryItem(user2.token, list.id, 'Plates', 50, 'pieces');

    // User1 can see User2's additions
    const allItems = await apiHelper.getGroceryItems(userToken, list.id);
    expect(allItems.length).toBe(4);
    expect(allItems.some(i => i.name === 'Cups')).toBe(true);
    expect(allItems.some(i => i.name === 'Plates')).toBe(true);

    // User2 marks items as bought
    const chips = allItems.find(i => i.name === 'Chips');
    if (chips) {
      await apiHelper.markItemBought(user2.token, list.id, chips.id, true);
    }

    // User1 can see the bought status
    const updatedItems = await apiHelper.getGroceryItems(userToken, list.id);
    const updatedChips = updatedItems.find(i => i.name === 'Chips');
    expect(updatedChips?.isBought).toBe(true);

    // Clean up
    await apiHelper.deleteGroceryList(userToken, list.id);
  });

  test('multiple lists management', async () => {
    // Create multiple lists
    const weeklyList = await apiHelper.createGroceryList(userToken, 'Weekly Groceries');
    const monthlyList = await apiHelper.createGroceryList(userToken, 'Monthly Stock Up');
    const specialList = await apiHelper.createGroceryList(userToken, 'Holiday Dinner');

    // Add items to each list
    await apiHelper.addGroceryItem(userToken, weeklyList.id, 'Milk', 1);
    await apiHelper.addGroceryItem(userToken, monthlyList.id, 'Paper Towels', 12);
    await apiHelper.addGroceryItem(userToken, specialList.id, 'Turkey', 1);

    // Verify all lists exist
    const allLists = await apiHelper.getGroceryLists(userToken);
    expect(allLists.length).toBeGreaterThanOrEqual(3);

    // Verify items are in correct lists
    const weeklyItems = await apiHelper.getGroceryItems(userToken, weeklyList.id);
    const monthlyItems = await apiHelper.getGroceryItems(userToken, monthlyList.id);
    const specialItems = await apiHelper.getGroceryItems(userToken, specialList.id);

    expect(weeklyItems.some(i => i.name === 'Milk')).toBe(true);
    expect(monthlyItems.some(i => i.name === 'Paper Towels')).toBe(true);
    expect(specialItems.some(i => i.name === 'Turkey')).toBe(true);

    // Delete lists
    await apiHelper.deleteGroceryList(userToken, weeklyList.id);
    await apiHelper.deleteGroceryList(userToken, monthlyList.id);
    await apiHelper.deleteGroceryList(userToken, specialList.id);
  });
});
