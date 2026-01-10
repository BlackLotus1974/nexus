import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
  });

  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Nexus/);
    console.log('✓ Landing page loaded');
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');

    // Try to find signup link/button
    const signupLink = page.getByRole('link', { name: /sign up|get started/i }).first();
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForURL('**/signup');
      console.log('✓ Navigated to signup page');
    } else {
      // Direct navigation if no link found
      await page.goto('/signup');
    }

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('should show email signup form', async ({ page }) => {
    await page.goto('/signup');

    // Check form elements - use exact matches to avoid ambiguity
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    console.log('✓ Email signup form is visible');
  });

  test('should successfully complete email signup', async ({ page }) => {
    await page.goto('/signup');

    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log('Testing signup with:', testEmail);

    // Fill form - use exact matches to avoid ambiguity
    await page.getByLabel('Email address').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByLabel('Confirm password').fill(testPassword);

    // Click signup button and wait for navigation
    const signupButton = page.getByRole('button', { name: /create account/i });

    // Wait for navigation after signup - it will redirect (either to /login or /dashboard)
    await Promise.all([
      page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 }),
      signupButton.click()
    ]);

    // Check current URL - should be dashboard or login page
    const currentUrl = page.url();
    console.log('Current URL after signup:', currentUrl);

    // Verify we navigated away from signup page (signup was successful)
    expect(currentUrl).not.toContain('/signup');

    // Should be on dashboard or login page (login redirects to dashboard if authenticated)
    expect(currentUrl).toMatch(/\/(login|dashboard)/);

    console.log('✓ Signup completed successfully, user redirected');
  });

  test('should check Google OAuth button', async ({ page }) => {
    await page.goto('/signup');

    // Look for Google OAuth button
    const googleButton = page.getByRole('button', { name: /google/i });

    if (await googleButton.isVisible()) {
      console.log('✓ Google OAuth button found');

      // Try clicking and capture error
      const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes('authorize'), { timeout: 5000 }).catch(() => null),
        googleButton.click().catch(err => console.log('Click error:', err))
      ]);

      await page.waitForTimeout(2000);

      // Check for error messages
      const pageContent = await page.content();
      if (pageContent.includes('not enabled') || pageContent.includes('Unsupported provider')) {
        console.log('✗ OAuth error: Provider not enabled');
      }
    } else {
      console.log('✗ Google OAuth button not found');
    }
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/signup');

    // Find login link
    const loginLink = page.getByRole('link', { name: /log in|sign in/i });
    await loginLink.click();
    await page.waitForURL('**/login');

    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible();
    console.log('✓ Navigated to login page');
  });

  test('should check Supabase connection', async ({ page }) => {
    await page.goto('/');

    // Check for environment variable errors in console
    let hasEnvError = false;
    page.on('console', msg => {
      if (msg.text().includes('Missing Supabase')) {
        hasEnvError = true;
        console.log('✗ Supabase env error detected');
      }
    });

    await page.waitForTimeout(2000);

    if (!hasEnvError) {
      console.log('✓ No Supabase environment errors');
    }
  });

  test('should test form validation', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    const signupButton = page.getByRole('button', { name: /create account/i });
    await signupButton.click();

    // Check for validation messages
    await page.waitForTimeout(1000);

    const validationMessages = await page.locator('[role="alert"], .error, [aria-invalid="true"]').count();
    console.log('Validation messages found:', validationMessages);
  });

  test('should check authentication state persistence', async ({ page }) => {
    await page.goto('/');

    // Check if there's a way to detect auth state
    const authStateElement = page.locator('[data-auth-state], [data-user]');

    if (await authStateElement.count() > 0) {
      const authState = await authStateElement.first().getAttribute('data-auth-state');
      console.log('Auth state:', authState);
    }

    // Check for user profile data in the page
    const hasUserData = await page.locator('text=/sign out|logout|profile/i').isVisible();
    console.log('User authenticated:', hasUserData);
  });
});

test.describe('Network Requests', () => {
  test('should monitor Supabase API calls', async ({ page }) => {
    const apiCalls: string[] = [];
    const errors: string[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('64321')) { // Supabase local port
        apiCalls.push(`${response.status()} ${url}`);
        if (response.status() >= 400) {
          errors.push(`${response.status()} ${url}`);
        }
      }
    });

    await page.goto('/signup');
    await page.waitForTimeout(2000);

    console.log('Supabase API calls:', apiCalls);
    if (errors.length > 0) {
      console.log('API errors:', errors);
    }
  });
});
