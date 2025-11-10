# End-to-End Testing Guide

## Overview

This directory contains comprehensive end-to-end (E2E) tests for the K-Plista application using [Playwright](https://playwright.dev/). These tests validate the entire application flow, from authentication to grocery list management and sharing.

## Test Structure

```
e2e/
├── tests/
│   ├── helpers/          # Helper utilities for tests
│   │   ├── auth.helper.ts    # Authentication utilities
│   │   └── api.helper.ts     # API interaction utilities
│   ├── pages/            # Page Object Models
│   │   ├── login.page.ts
│   │   ├── lists.page.ts
│   │   └── list-detail.page.ts
│   ├── auth.spec.ts      # Authentication tests
│   ├── grocery-lists.spec.ts  # Grocery list CRUD tests
│   ├── grocery-items.spec.ts  # Item management tests
│   ├── item-groups.spec.ts    # Group management tests
│   ├── list-sharing.spec.ts   # Sharing functionality tests
│   └── integration.spec.ts    # Complete user flow tests
├── playwright.config.ts  # Playwright configuration
├── package.json
└── tsconfig.json
```

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- User login via API
- Protected route access control
- Token persistence
- Multi-user authentication

### Grocery List Tests (`grocery-lists.spec.ts`)
- Create, read, update, delete (CRUD) operations
- User isolation
- Authorization checks

### Grocery Item Tests (`grocery-items.spec.ts`)
- Add items to lists
- Mark items as bought/not bought
- Update and delete items
- Special character handling
- Long text handling

### Item Group Tests (`item-groups.spec.ts`)
- Create and manage groups
- Assign items to groups
- Sort order management
- Color customization

### List Sharing Tests (`list-sharing.spec.ts`)
- Share lists with view-only access
- Share lists with edit permissions
- Verify shared list visibility
- Test collaborative editing

### Integration Tests (`integration.spec.ts`)
- Complete shopping workflow
- Collaborative shopping scenario
- Multiple lists management

## Prerequisites

- Docker and Docker Compose (for running the full application stack)
- Node.js 20+ (for running tests locally)

## Installation

```bash
cd e2e
npm install
npm run playwright:install
```

## Running Tests

### With Docker Compose (Recommended for CI)

1. Start the application stack:
```bash
docker-compose up --build -d
```

2. Wait for services to be ready (check logs):
```bash
docker-compose logs -f
```

3. Run the tests:
```bash
cd e2e
npm test
```

4. Stop the application:
```bash
docker-compose down
```

### Locally (Development Mode)

1. Ensure the application is running:
   - Application (backend + frontend) on http://localhost

2. Run the tests:
```bash
cd e2e
npm test
```

### Test Commands

- `npm test` - Run all tests in headless mode
- `npm run test:headed` - Run tests with browser UI visible
- `npm run test:debug` - Run tests in debug mode with Playwright Inspector
- `npm run test:ui` - Run tests in Playwright UI mode (interactive)
- `npm run test:report` - View the last test report

## Configuration

The tests can be configured via environment variables:

- `BASE_URL` - Base URL of the application (default: `http://localhost`)
- `CI` - Set to `true` in CI environments (enables retries and other CI-specific settings)

Example:
```bash
BASE_URL=http://localhost:8080 npm test
```

## CI/CD Integration

The E2E tests are integrated into the PR build workflow. They run automatically on every pull request and must pass before merging.

The tests are configured to:
- Run in headless mode on CI
- Retry failed tests up to 2 times
- Generate HTML and JUnit reports
- Capture screenshots and videos on failure

## Writing New Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

test.describe('Feature Name', () => {
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

  test('should do something', async () => {
    // Your test code here
  });
});
```

### Best Practices

1. **Use helpers**: Leverage `AuthHelper` and `ApiHelper` for common operations
2. **Page Objects**: Use Page Object Models for UI interactions
3. **Clean up**: Always clean up test data in `afterAll` or `afterEach`
4. **Descriptive names**: Use clear, descriptive test names
5. **Independent tests**: Each test should be independent and not rely on others
6. **Assertions**: Use meaningful assertions with clear failure messages
7. **Wait strategies**: Use Playwright's auto-waiting instead of hardcoded sleeps

### Adding API Helpers

When adding new API endpoints, extend the `ApiHelper` class:

```typescript
// In tests/helpers/api.helper.ts
async newOperation(token: string, param: string): Promise<Result> {
  if (!this.apiContext) await this.init();

  const response = await this.apiContext!.post('/api/endpoint', {
    headers: { Authorization: `Bearer ${token}` },
    data: { param }
  });

  if (!response.ok()) {
    throw new Error(`Operation failed: ${response.status()}`);
  }

  return await response.json();
}
```

### Adding Page Objects

When adding new pages, create a new Page Object Model:

```typescript
// In tests/pages/new-page.page.ts
import { Page, Locator } from '@playwright/test';

export class NewPage {
  readonly page: Page;
  readonly someButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someButton = page.getByRole('button', { name: /button text/i });
  }

  async goto() {
    await this.page.goto('/path');
  }

  async performAction() {
    await this.someButton.click();
  }
}
```

## Debugging Tests

### Using Playwright Inspector

```bash
npm run test:debug
```

This opens the Playwright Inspector, allowing you to:
- Step through tests
- Inspect the DOM
- View console logs
- See network requests

### Using UI Mode

```bash
npm run test:ui
```

This opens an interactive UI where you can:
- Run individual tests
- Watch tests in real-time
- View test traces
- Inspect screenshots

### View Test Reports

After a test run:

```bash
npm run test:report
```

This opens an HTML report with:
- Test results
- Screenshots on failure
- Videos on failure
- Detailed traces

## Troubleshooting

### Tests Fail to Connect

- Ensure Docker Compose services are running
- Check that ports are not already in use
- Verify network connectivity

### Flaky Tests

- Check for race conditions
- Ensure proper wait strategies
- Verify test isolation
- Review test cleanup

### Slow Tests

- Use API helpers instead of UI interactions where possible
- Parallelize independent tests
- Optimize setup/teardown

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
