/**
 * Authentication Fixtures for Playwright E2E Tests
 *
 * Provides reusable authentication setup for tests that require
 * authenticated user sessions.
 */

import { test as base, expect, Page } from '@playwright/test';

// Test user credentials (these should be test accounts)
export const TEST_USER = {
  email: 'test@nexus-test.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

export const TEST_ORG = {
  name: 'Test Organization',
  id: 'test-org-id', // Will be populated during setup
};

/**
 * Extended test fixture with authenticated page
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Use the authenticated page
    await use(page);

    // Cleanup: logout
    try {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
    } catch {
      // Ignore errors during cleanup
    }
  },
});

/**
 * Helper to login programmatically via API
 */
export async function loginViaAPI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  // Fill and submit login form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful login
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for dashboard elements that indicate auth
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to get current user info from page
 */
export async function getCurrentUser(page: Page): Promise<{ email: string; name: string } | null> {
  try {
    await page.click('[data-testid="user-menu"]');
    const email = await page.textContent('[data-testid="user-email"]');
    const name = await page.textContent('[data-testid="user-name"]');
    await page.keyboard.press('Escape'); // Close menu
    return { email: email || '', name: name || '' };
  } catch {
    return null;
  }
}

export { expect };
