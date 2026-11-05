import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin book inventory browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page).toHaveURL(/admin\/books/);
    await expect(page.getByRole('heading', { name: 'Book Inventory', level: 1 })).toBeVisible();
  });

  test('displays status tabs and inventory table', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Available/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Reserved/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Adopted/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin selects rows using header and row checkboxes', async ({ page }) => {
    const headerCheckbox = page.locator('thead input[type="checkbox"], thead button[role="checkbox"]');
    if (await headerCheckbox.isVisible()) {
      await headerCheckbox.click();
      await expect(page.locator('[role="status"]').filter({ hasText: 'selected' })).toBeVisible();
      await headerCheckbox.click();
      await expect(page.locator('[role="status"]').filter({ hasText: 'selected' })).toBeHidden();
    }

    const firstRowCheckbox = page.locator('tbody tr input[type="checkbox"], tbody tr button[role="checkbox"]').first();
    if (await firstRowCheckbox.isVisible()) {
      await firstRowCheckbox.click();
      await expect(page.locator('[role="status"]').filter({ hasText: '1 selected' })).toBeVisible();
      await firstRowCheckbox.click();
      await expect(page.locator('[role="status"]').filter({ hasText: '1 selected' })).toBeHidden();
    }
  });

  test('admin views book details by clicking row', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    const details = page.getByRole('dialog', { name: 'Book details' });
    await expect(details).toBeVisible();
    await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible();
    await expect(details.getByText('Collection area')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();
  });

  test('admin filters inventory by search and genre', async ({ page }) => {
    const search = page.getByRole('searchbox');
    await search.fill('a');
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await search.fill('');

    const genreSelect = page.locator('select').first();
    if (await genreSelect.isVisible()) {
      await genreSelect.selectOption({ index: 1 });
      await expect(page.locator('table')).toBeVisible();
      await genreSelect.selectOption('all');
    }

    await search.fill('zzzz-no-such-book-query');
    await expect(page.getByText('No books in this view', { exact: true })).toBeVisible();
    await expect(page.getByText('Try another Status Tab, Genre, Search term', { exact: true })).toBeVisible();
  });
});
