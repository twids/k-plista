import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('Settings API', () => {
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let userToken: string;
  let testListId: string;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    apiHelper = new ApiHelper();
    const user = await authHelper.createAuthenticatedUser('user1');
    userToken = user.token;

    // Create a test list
    const list = await apiHelper.createGroceryList(userToken, 'Test List for Settings');
    testListId = list.id;
  });

  test.afterAll(async () => {
    await authHelper.dispose();
    await apiHelper.dispose();
  });

  test('should create an API key', async () => {
    const response = await apiHelper.request(userToken, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'Test API Key' }
    });

    expect(response.ok()).toBe(true);
    const apiKey = await response.json();
    expect(apiKey.name).toBe('Test API Key');
    expect(apiKey.key).toBeDefined(); // The raw key is only returned once
    expect(apiKey.key.length).toBeGreaterThan(30); // API keys should be reasonably long
  });

  test('should list API keys', async () => {
    // Create a test API key first
    await apiHelper.request(userToken, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'List Test Key' }
    });

    const response = await apiHelper.request(userToken, '/api/settings/api-keys');
    expect(response.ok()).toBe(true);
    const apiKeys = await response.json();
    expect(Array.isArray(apiKeys)).toBe(true);
    expect(apiKeys.length).toBeGreaterThan(0);
    
    // Keys in the list should NOT include the raw key
    const listKey = apiKeys.find((k: any) => k.name === 'List Test Key');
    expect(listKey).toBeDefined();
    expect(listKey.key).toBeUndefined(); // Raw key not returned in list
  });

  test('should delete an API key', async () => {
    // Create a key to delete
    const createResponse = await apiHelper.request(userToken, '/api/settings/api-keys', {
      method: 'POST',
      data: { name: 'Key to Delete' }
    });
    const createdKey = await createResponse.json();

    // Delete it
    const deleteResponse = await apiHelper.request(
      userToken,
      `/api/settings/api-keys/${createdKey.id}`,
      { method: 'DELETE' }
    );
    expect(deleteResponse.status()).toBe(204);

    // Verify it's gone
    const listResponse = await apiHelper.request(userToken, '/api/settings/api-keys');
    const apiKeys = await listResponse.json();
    const deletedKey = apiKeys.find((k: any) => k.id === createdKey.id);
    expect(deletedKey).toBeUndefined();
  });

  test('should get default list', async () => {
    const response = await apiHelper.request(userToken, '/api/settings/default-list');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('listId');
  });

  test('should set default list', async () => {
    const setResponse = await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: testListId }
    });
    expect(setResponse.status()).toBe(204);

    // Verify it was set
    const getResponse = await apiHelper.request(userToken, '/api/settings/default-list');
    const data = await getResponse.json();
    expect(data.listId).toBe(testListId);
  });

  test('should clear default list', async () => {
    // Set a default list first
    await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: testListId }
    });

    // Clear it
    const clearResponse = await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: null }
    });
    expect(clearResponse.status()).toBe(204);

    // Verify it was cleared
    const getResponse = await apiHelper.request(userToken, '/api/settings/default-list');
    const data = await getResponse.json();
    expect(data.listId).toBeNull();
  });

  test('should not allow setting default list for non-existent list', async () => {
    const response = await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: '00000000-0000-0000-0000-000000000000' }
    });
    expect(response.status()).toBe(400);
  });

  test('should not allow setting default list user does not have access to', async () => {
    // Create another user
    const user2 = await authHelper.createAuthenticatedUser('user2');
    
    // Create a list owned by user2
    const user2List = await apiHelper.createGroceryList(user2.token, 'User 2 List');

    // Try to set user1's default to user2's list
    const response = await apiHelper.request(userToken, '/api/settings/default-list', {
      method: 'PUT',
      data: { listId: user2List.id }
    });
    expect(response.status()).toBe(403);
  });
});
