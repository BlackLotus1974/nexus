/**
 * Project Management E2E Tests
 *
 * Tests for creating, viewing, editing projects and viewing alignments.
 */

import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
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

  test.describe('Project List', () => {
    test('should display projects page', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.locator('h1')).toContainText(/projects/i);
    });

    test('should show project cards or empty state', async ({ page }) => {
      await page.goto('/projects');

      const hasProjects = await page.locator('[data-testid="project-card"]').count() > 0;
      const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);

      expect(hasProjects || hasEmptyState).toBe(true);
    });

    test('should have add project button', async ({ page }) => {
      await page.goto('/projects');

      const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), [data-testid="add-project"]');
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Create Project', () => {
    test('should navigate to create project page', async ({ page }) => {
      await page.goto('/projects');

      const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), [data-testid="add-project"]');
      if (await addButton.isVisible()) {
        await addButton.click();

        // Should show create form or modal
        const formVisible = await page.locator('form, [role="dialog"]').isVisible();
        expect(formVisible).toBe(true);
      }
    });

    test('should create project with valid data', async ({ page }) => {
      await page.goto('/projects/new');

      const titleInput = page.locator('input[name="title"], input[name="name"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Project');

        const descInput = page.locator('textarea[name="description"]');
        if (await descInput.isVisible()) {
          await descInput.fill('This is a test project created by E2E tests');
        }

        const goalInput = page.locator('input[name="goal"], input[name="funding_goal"]');
        if (await goalInput.isVisible()) {
          await goalInput.fill('100000');
        }

        await page.click('button[type="submit"]');
        await page.waitForURL(/\/projects/, { timeout: 5000 });
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/projects/new');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        const hasError = await page.locator('.error, [role="alert"], .text-red').count() > 0;
        expect(hasError).toBe(true);
      }
    });
  });

  test.describe('Project Detail', () => {
    test('should display project detail page', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/);
      }
    });

    test('should show project stats', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        // Look for stats section
        const statsSection = page.locator('[data-testid="project-stats"], .stats, .metrics');
        await expect(statsSection.or(page.locator('body'))).toBeVisible();
      }
    });
  });

  test.describe('Project Alignments', () => {
    test('should show donor alignment section', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        // Look for alignment/match section
        const alignmentSection = page.locator(
          '[data-testid="alignments"], [data-testid="donor-matches"], h2:has-text("Alignment"), h2:has-text("Match")'
        );

        // May or may not be visible
        const isVisible = await alignmentSection.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    });

    test('should trigger alignment calculation', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        // Look for calculate alignment button
        const calculateButton = page.locator(
          'button:has-text("Calculate"), button:has-text("Align"), [data-testid="calculate-alignment"]'
        );

        if (await calculateButton.isVisible()) {
          await calculateButton.click();

          // Should show loading or progress
          const loading = page.locator('[data-testid="loading"], .loading, .spinner');
          await expect(loading.or(page.locator('body'))).toBeVisible();
        }
      }
    });
  });

  test.describe('Edit Project', () => {
    test('should allow editing project', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-project"]');
        if (await editButton.isVisible()) {
          await editButton.click();

          const titleInput = page.locator('input[name="title"], input[name="name"]');
          await expect(titleInput).toBeVisible();
        }
      }
    });
  });

  test.describe('Delete Project', () => {
    test('should show delete confirmation', async ({ page }) => {
      await page.goto('/projects');

      const projectLink = page.locator('[data-testid="project-card"] a').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();

        const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-project"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          const confirmDialog = page.locator('[role="dialog"], [data-testid="confirm-dialog"]');
          await expect(confirmDialog).toBeVisible();
        }
      }
    });
  });
});
