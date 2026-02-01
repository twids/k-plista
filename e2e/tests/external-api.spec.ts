import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('External API (Webhook/Voice Assistant)', () => {
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let userToken: string;
  let apiKey: string;
  let testListId: string;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    apiHelper = new ApiHelper();
    const user = await authHelper.createAuthenticatedUser('user1');
    userToken = user.token;

    // Create a test list
    const list = await apiHelper.createGroceryList(userToken, 'Test List for External API');
    testListId = list.id;

    // Create an API key for external requests
    const apiKeyResponse = await apiHelper.request(userToken, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'Test External API Key' }
    });
    const apiKeyData = await apiKeyResponse.json();
    apiKey = apiKeyData.key;

    // Set the test list as default
    await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: testListId }
    });
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should add item via external API with default list', async () => {
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': apiKey },
      data: { itemName: 'Milk from API' }
    });

    expect(response.ok()).toBe(true);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.item).toBeDefined();
    expect(result.item.name).toBe('Milk from API');
    expect(result.item.groceryListId).toBe(testListId);
  });

  test('should add item via external API with specific list', async () => {
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': apiKey },
      data: { 
        itemName: 'Bread from API',
        listId: testListId 
      }
    });

    expect(response.ok()).toBe(true);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.item.name).toBe('Bread from API');
    expect(result.item.groceryListId).toBe(testListId);
  });

  test('should fail without API key', async () => {
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      data: { itemName: 'Should Fail' }
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(401);
  });

  test('should fail with invalid API key', async () => {
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': 'invalid-key-12345' },
      data: { itemName: 'Should Fail' }
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(401);
  });

  test('should fail when no default list and no listId provided', async () => {
    // Create a new user without a default list
    const user2 = await authHelper.createAuthenticatedUser('user2');
    
    // Create an API key for user2
    const apiKeyResponse = await apiHelper.request(user2.token, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'User2 API Key' }
    });
    const apiKeyData = await apiKeyResponse.json();
    const user2ApiKey = apiKeyData.key;

    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': user2ApiKey },
      data: { itemName: 'Should Fail' }
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test('should fail when listId does not exist', async () => {
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': apiKey },
      data: { 
        itemName: 'Should Fail',
        listId: '00000000-0000-0000-0000-000000000000'
      }
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(404);
  });

  test('should fail when user does not have edit access to list', async () => {
    // Create admin user (different from user1)
    const adminUser = await authHelper.createAuthenticatedUser('admin');
    
    // Create an API key for admin user
    const apiKeyResponse = await apiHelper.request(adminUser.token, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'Admin API Key' }
    });
    const apiKeyData = await apiKeyResponse.json();
    const adminApiKey = apiKeyData.key;

    // Try to add to user1's list with admin's API key (should fail - no access)
    if (!apiHelper['apiContext']) await apiHelper['init']();

    const response = await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': adminApiKey },
      data: { 
        itemName: 'Should Fail',
        listId: testListId
      }
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(403);
  });

  test('should verify item was added via external API', async () => {
    // Add an item via external API
    if (!apiHelper['apiContext']) await apiHelper['init']();

    await apiHelper['apiContext']!.post('/api/external/add-item', {
      headers: { 'X-API-Key': apiKey },
      data: { itemName: 'Verification Item' }
    });

    // Verify via normal API
    const items = await apiHelper.getGroceryItems(userToken, testListId);
    const addedItem = items.find(item => item.name === 'Verification Item');
    expect(addedItem).toBeDefined();
    expect(addedItem?.quantity).toBe(1); // Default quantity
    expect(addedItem?.isBought).toBe(false);
  });
});
