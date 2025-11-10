import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;
  readonly appleLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.googleLoginButton = page.getByRole('button', { name: /sign in with google/i });
    this.facebookLoginButton = page.getByRole('button', { name: /sign in with facebook/i });
    this.appleLoginButton = page.getByRole('button', { name: /sign in with apple/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /**
   * Login with a test token by setting it in localStorage
   * This bypasses the OAuth flow for testing
   */
  async loginWithToken(token: string) {
    await this.page.goto('/login');
    await this.page.evaluate((tkn) => {
      localStorage.setItem('token', tkn);
    }, token);
    await this.page.goto('/lists');
    // Wait for navigation to complete
    await this.page.waitForURL('/lists');
  }
}
