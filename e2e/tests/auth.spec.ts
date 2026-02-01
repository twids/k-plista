import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth.helper';
import { LoginPage } from './pages/login.page';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeAll(async () => {
    authHelper = new AuthHelper();
    await authHelper.init();
  });

  test.afterAll(async () => {
    await authHelper.dispose();
  });

  test('should login successfully via API', async () => {
    const user = await authHelper.createAuthenticatedUser('user1');
    
    expect(user.token).toBeDefined();
    expect(user.token).not.toBe('');
    expect(user.email).toBe(TEST_USERS.user1.email);
    expect(user.name).toBe(TEST_USERS.user1.name);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/lists');
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });

  test('should access protected routes after login', async ({ page }) => {
    const user = await authHelper.createAuthenticatedUser('user1');
    const loginPage = new LoginPage(page);
    
    await loginPage.loginWithToken(user.token);
    
    expect(page.url()).toContain('/lists');
  });

  test('should redirect to login after logout', async ({ page }) => {
    const user = await authHelper.createAuthenticatedUser('user1');
    const loginPage = new LoginPage(page);
    
    await loginPage.loginWithToken(user.token);
    await page.waitForURL('/lists');
    
    // Logout by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    
    // Try to access protected route
    await page.goto('/lists');
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    const user = await authHelper.createAuthenticatedUser('user1');
    const loginPage = new LoginPage(page);
    
    await loginPage.loginWithToken(user.token);
    await page.waitForURL('/lists');
    
    // Reload the page
    await page.reload();
    
    // Should still be on lists page
    expect(page.url()).toContain('/lists');
  });

  test('should get current user info with valid token', async () => {
    const user = await authHelper.createAuthenticatedUser('user1');
    const currentUser = await authHelper.getCurrentUser(user.token);
    
    expect(currentUser.email).toBe(user.email);
    expect(currentUser.name).toBe(user.name);
  });

  test('should handle multiple users independently', async () => {
    const user1 = await authHelper.createAuthenticatedUser('user1');
    const user2 = await authHelper.createAuthenticatedUser('user2');
    
    expect(user1.token).not.toBe(user2.token);
    expect(user1.email).not.toBe(user2.email);
    
    const currentUser1 = await authHelper.getCurrentUser(user1.token);
    const currentUser2 = await authHelper.getCurrentUser(user2.token);
    
    expect(currentUser1.email).toBe(TEST_USERS.user1.email);
    expect(currentUser2.email).toBe(TEST_USERS.user2.email);
  });
});
