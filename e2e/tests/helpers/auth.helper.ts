import { APIRequestContext, request } from '@playwright/test';

/**
 * Test data for authentication
 */
export interface TestUser {
  email: string;
  name: string;
  provider: string;
  externalUserId: string;
  token?: string;
}

export const TEST_USERS = {
  user1: {
    email: 'test.user1@example.com',
    name: 'Test User 1',
    provider: 'test',
    externalUserId: 'test-user-1'
  },
  user2: {
    email: 'test.user2@example.com',
    name: 'Test User 2',
    provider: 'test',
    externalUserId: 'test-user-2'
  },
  admin: {
    email: 'admin@example.com',
    name: 'Admin User',
    provider: 'test',
    externalUserId: 'test-admin'
  }
} as const;

/**
 * API helper for authentication operations
 */
export class AuthHelper {
  private baseURL: string;
  private apiContext: APIRequestContext | null = null;

  constructor(baseURL: string = 'http://localhost:5000') {
    this.baseURL = baseURL;
  }

  async init() {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
    });
  }

  async dispose() {
    await this.apiContext?.dispose();
  }

  /**
   * Login a test user and get authentication token
   */
  async loginUser(user: TestUser): Promise<string> {
    if (!this.apiContext) {
      await this.init();
    }

    const response = await this.apiContext!.post('/api/auth/login', {
      data: {
        provider: user.provider,
        externalUserId: user.externalUserId,
        email: user.email,
        name: user.name,
        profilePictureUrl: null
      }
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    const data = await response.json();
    
    // For now, we'll use a simple token format since JWT isn't fully implemented
    // In a real scenario, the API would return a JWT token
    return data.token || `test-token-${user.externalUserId}`;
  }

  /**
   * Create a test user and return with token
   */
  async createAuthenticatedUser(userKey: keyof typeof TEST_USERS): Promise<TestUser & { token: string }> {
    const user = TEST_USERS[userKey];
    const token = await this.loginUser(user);
    return { ...user, token };
  }

  /**
   * Get current user info using token
   */
  async getCurrentUser(token: string) {
    if (!this.apiContext) {
      await this.init();
    }

    const response = await this.apiContext!.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok()) {
      throw new Error(`Get current user failed: ${response.status()}`);
    }

    return await response.json();
  }
}
