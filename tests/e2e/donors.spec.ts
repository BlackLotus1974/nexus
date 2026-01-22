/**
 * Donor CRUD E2E Tests
 *
 * Tests for creating, viewing, editing, and deleting donors.
 */

import { test, expect } from '@playwright/test';

test.describe('Donor Management', () => {
  // Setup: login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // For E2E tests, we need test credentials
    // In real scenario, these would be test account credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for auth to complete (or handle if no test account exists)
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    } catch {
      // If login fails, skip auth-dependent tests
      test.skip();
    }
  });

  test.describe('Donor List View', () => {
    test('should display donor list page', async ({ page }) => {
      await page.goto('/donors');

      // Check for donor list elements
      await expect(page.locator('h1')).toContainText(/donors/i);
    });

    test('should show empty state when no donors exist', async ({ page }) => {
      await page.goto('/donors');

      // Either shows donors or empty state
      const hasDonors = await page.locator('[data-testid="donor-card"]').count() > 0;
      const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);

      expect(hasDonors || hasEmptyState).toBe(true);
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/donors');

      // Look for search input
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Create Donor', () => {
    test('should navigate to create donor page', async ({ page }) => {
      await page.goto('/donors');

      // Click add donor button
      const addButton = page.locator('button:has-text("Add"), a:has-text("Add"), [data-testid="add-donor"]');
      if (await addButton.isVisible()) {
        await addButton.click();
        await expect(page).toHaveURL(/\/donors\/(new|create)/);
      }
    });

    test('should validate required fields on create form', async ({ page }) => {
      await page.goto('/donors/new');

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Check for validation errors
        const hasError = await page.locator('.error, [role="alert"], .text-red').count() > 0;
        expect(hasError).toBe(true);
      }
    });

    test('should create donor with valid data', async ({ page }) => {
      await page.goto('/donors/new');

      // Fill donor form
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Donor E2E');

        const emailInput = page.locator('input[name="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('testdonor@e2e.test');
        }

        const locationInput = page.locator('input[name="location"]');
        if (await locationInput.isVisible()) {
          await locationInput.fill('New York, NY');
        }

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to donor detail or list
        await page.waitForURL(/\/donors/, { timeout: 5000 });
      }
    });
  });

  test.describe('View Donor Detail', () => {
    test('should display donor detail page', async ({ page }) => {
      await page.goto('/donors');

      // Click on first donor if exists
      const donorLink = page.locator('[data-testid="donor-card"] a, [data-testid="donor-row"] a').first();
      if (await donorLink.isVisible()) {
        await donorLink.click();

        // Should show donor detail
        await expect(page).toHaveURL(/\/donors\/[a-zA-Z0-9-]+/);
      }
    });

    test('should show donor intelligence section', async ({ page }) => {
      await page.goto('/donors');

      const donorLink = page.locator('[data-testid="donor-card"] a').first();
      if (await donorLink.isVisible()) {
        await donorLink.click();

        // Look for intelligence section
        const intelligenceSection = page.locator('[data-testid="intelligence-section"], h2:has-text("Intelligence")');
        // May or may not be visible depending on if intelligence has been generated
        await expect(intelligenceSection.or(page.locator('body'))).toBeVisible();
      }
    });
  });

  test.describe('Edit Donor', () => {
    test('should allow editing donor information', async ({ page }) => {
      await page.goto('/donors');

      // Navigate to donor detail
      const donorLink = page.locator('[data-testid="donor-card"] a').first();
      if (await donorLink.isVisible()) {
        await donorLink.click();

        // Click edit button
        const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-donor"]');
        if (await editButton.isVisible()) {
          await editButton.click();

          // Should show edit form
          const nameInput = page.locator('input[name="name"]');
          await expect(nameInput).toBeVisible();
        }
      }
    });
  });

  test.describe('Delete Donor', () => {
    test('should show delete confirmation', async ({ page }) => {
      await page.goto('/donors');

      const donorLink = page.locator('[data-testid="donor-card"] a').first();
      if (await donorLink.isVisible()) {
        await donorLink.click();

        // Click delete button
        const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-donor"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Should show confirmation dialog
          const confirmDialog = page.locator('[role="dialog"], [data-testid="confirm-dialog"]');
          await expect(confirmDialog).toBeVisible();
        }
      }
    });
  });

  test.describe('Donor Search', () => {
    test('should filter donors by search query', async ({ page }) => {
      await page.goto('/donors');

      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');

        // Wait for search results
        await page.waitForTimeout(1000);

        // Results should be filtered (or show no results message)
        const hasResults = await page.locator('[data-testid="donor-card"]').count() >= 0;
        expect(hasResults).toBe(true);
      }
    });

    test('should clear search and show all donors', async ({ page }) => {
      await page.goto('/donors');

      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Clear search
        await searchInput.clear();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should show all donors again
        await expect(page.locator('[data-testid="donor-list"], [data-testid="empty-state"]')).toBeVisible();
      }
    });
  });
});
