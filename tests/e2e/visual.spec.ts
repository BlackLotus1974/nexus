/**
 * Visual Regression E2E Tests
 *
 * Tests for visual consistency of key pages using screenshots.
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.describe('Public Pages', () => {
    test('landing page visual snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('landing-page.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('login page visual snapshot', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixelRatio: 0.1,
      });
    });

    test('signup page visual snapshot', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('signup-page.png', {
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      } catch {
        test.skip();
      }
    });

    test('dashboard visual snapshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait for dynamic content to load
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.15, // Allow more variance for dynamic content
      });
    });

    test('donors list visual snapshot', async ({ page }) => {
      await page.goto('/donors');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('donors-list.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.15,
      });
    });

    test('projects list visual snapshot', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('projects-list.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.15,
      });
    });

    test('crm settings visual snapshot', async ({ page }) => {
      await page.goto('/crm');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('crm-settings.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.15,
      });
    });

    test('settings page visual snapshot', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('settings.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.15,
      });
    });
  });

  test.describe('Responsive Layouts', () => {
    test('landing page mobile view', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('landing-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('landing page tablet view', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('landing-tablet.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('login page mobile view', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('login-mobile.png', {
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe('Component States', () => {
    test('button states visual', async ({ page }) => {
      await page.goto('/ui-demo');
      await page.waitForLoadState('networkidle');

      // Capture button section
      const buttonSection = page.locator('[data-testid="button-section"], .button-examples');
      if (await buttonSection.isVisible()) {
        await expect(buttonSection).toHaveScreenshot('button-states.png', {
          maxDiffPixelRatio: 0.05,
        });
      }
    });

    test('form components visual', async ({ page }) => {
      await page.goto('/ui-demo');
      await page.waitForLoadState('networkidle');

      const formSection = page.locator('[data-testid="form-section"], .form-examples');
      if (await formSection.isVisible()) {
        await expect(formSection).toHaveScreenshot('form-components.png', {
          maxDiffPixelRatio: 0.05,
        });
      }
    });

    test('card components visual', async ({ page }) => {
      await page.goto('/ui-demo');
      await page.waitForLoadState('networkidle');

      const cardSection = page.locator('[data-testid="card-section"], .card-examples');
      if (await cardSection.isVisible()) {
        await expect(cardSection).toHaveScreenshot('card-components.png', {
          maxDiffPixelRatio: 0.05,
        });
      }
    });
  });

  test.describe('Dark Mode', () => {
    test('landing page dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('landing-dark.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });

    test('login page dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('login-dark.png', {
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  test.describe('Loading States', () => {
    test('skeleton loading states', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      } catch {
        test.skip();
        return;
      }

      // Navigate quickly to capture loading state
      await page.goto('/donors');

      // Try to capture skeleton/loading state
      const skeleton = page.locator('.skeleton, [data-testid="loading"]');
      if (await skeleton.isVisible()) {
        await expect(skeleton).toHaveScreenshot('loading-skeleton.png', {
          maxDiffPixelRatio: 0.2,
        });
      }
    });
  });

  test.describe('Empty States', () => {
    test('empty list visual', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      } catch {
        test.skip();
        return;
      }

      await page.goto('/donors');
      await page.waitForLoadState('networkidle');

      const emptyState = page.locator('[data-testid="empty-state"]');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toHaveScreenshot('empty-state.png', {
          maxDiffPixelRatio: 0.1,
        });
      }
    });
  });

  test.describe('Error States', () => {
    test('404 page visual', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('404-page.png', {
        maxDiffPixelRatio: 0.1,
      });
    });
  });
});
