import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin book import from Open Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page).toHaveURL(/admin\/books/);
  });

  test('search button is disabled until query is entered', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Book' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add book' });
    await expect(dialog).toBeVisible();

    const searchInput = dialog.locator('#book-search');
    const searchBtn = dialog.getByRole('button', { name: 'Search', exact: true });
    await expect(searchBtn).toBeDisabled();

    await searchInput.fill('The Hobbit');
    await expect(searchBtn).toBeEnabled();

    await page.keyboard.press('Escape');
    const discardToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Discard changes?' });
    if (await discardToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardToast.getByRole('button', { name: 'Discard' }).click();
    }
    await expect(dialog).toBeHidden();
  });

  test('searching open library displays results and allows selection', async ({ page }) => {
    test.setTimeout(60000);
    await page.getByRole('button', { name: 'Add Book' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add book' });

    const searchInput = dialog.locator('#book-search');
    const searchBtn = dialog.getByRole('button', { name: 'Search', exact: true });

    await searchInput.fill('Harry Potter');
    await searchBtn.click();

    await expect(dialog.locator('table')).toBeVisible({ timeout: 30000 });

    const nextBtn = dialog.getByRole('button', { name: 'Next' });
    await expect(nextBtn).toBeDisabled();

    const firstRow = dialog.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(nextBtn).toBeEnabled();

      await nextBtn.click();
      await expect(dialog.getByRole('heading', { name: 'Choose collection locations' })).toBeVisible();

      const addBtn = dialog.getByRole('button', { name: /Add \d+ book/ });
      await expect(addBtn).toBeDisabled();

      await dialog.getByRole('button', { name: 'Back to results' }).click();
    }

    await page.keyboard.press('Escape');
    const discardToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Discard changes?' });
    if (await discardToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardToast.getByRole('button', { name: 'Discard' }).click();
    }
    await expect(dialog).toBeHidden();
  });

  test('searching with non-matching query displays empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Book' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add book' });

    const searchInput = dialog.locator('#book-search');
    await searchInput.fill('xyznonexistentquery99999');
    await dialog.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(dialog.getByText(/0 results/i)).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(/Try another title, author or ISBN/i)).toBeVisible();

    await page.keyboard.press('Escape');
    const discardToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Discard changes?' });
    if (await discardToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardToast.getByRole('button', { name: 'Discard' }).click();
    }
    await expect(dialog).toBeHidden();
  });
});
