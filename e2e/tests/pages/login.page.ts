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
   * Login with a test token by setting the auth_token cookie.
   * This bypasses the OAuth flow for testing.
   * The backend reads JWT from this HttpOnly cookie for authentication.
   */
  async loginWithToken(token: string) {
    // Navigate first to establish the origin for cookie scope
    await this.page.goto('/login');

    // Set the auth_token cookie (matches what the OAuth callback sets)
    const url = new URL(this.page.url());
    await this.page.context().addCookies([{
      name: 'auth_token',
      value: token,
      domain: url.hostname,
      path: '/',
    }]);

    // Navigate to the protected route - the cookie will be sent automatically
    await this.page.goto('/lists');
    await this.page.waitForURL('/lists');
  }
}
