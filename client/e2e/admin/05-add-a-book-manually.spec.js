import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin manual book entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page).toHaveURL(/admin\/books/);
  });

  test('validates required fields on manual entry', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Book' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add book' });
    await dialog.getByRole('tab', { name: 'Manual entry' }).click();

    await expect(dialog.locator('#edit-title')).toBeVisible();
    await expect(dialog.locator('#edit-station')).toBeVisible();

    await dialog.getByRole('button', { name: 'Add book' }).click();
    await expect(page.getByText('Please check the highlighted fields').last()).toBeVisible();
    await expect(dialog.locator('#edit-title')).toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('admin creates a manual book and confirms discard prompt', async ({ page }) => {
    const title = `E2E Manual Book ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Book' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add book' });
    await dialog.getByRole('tab', { name: 'Manual entry' }).click();

    await dialog.locator('#edit-title').fill(title);
    const stationInput = dialog.locator('#edit-station');
    const listId = await stationInput.getAttribute('list');
    const stationOption = await dialog.locator(`datalist#${listId} option`).first().getAttribute('value');
    await stationInput.fill(stationOption);
    await dialog.locator('#edit-subject').selectOption({ index: 1 });

    // Cancel with dirty form shows discard confirmation
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const discardToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Discard changes?' });
    await expect(discardToast).toBeVisible();

    // Keep editing retains dialog
    await discardToast.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#edit-title')).toHaveValue(title);

    // Now submit
    await dialog.getByRole('button', { name: 'Add book' }).click();
    await expect(page.getByText(/you have created book .* successfully!|Book added/i)).toBeVisible();
    await expect(dialog).toBeHidden();

    // Verify created book appears in inventory
    const search = page.getByRole('searchbox');
    await search.fill(title);
    const row = page.locator('tbody tr').filter({ hasText: title });
    await expect(row).toBeVisible();

    // Cleanup: delete the test book
    await row.locator('input[type="checkbox"], button[role="checkbox"]').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const deleteToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Delete book?' });
    await deleteToast.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/1 book deleted/i)).toBeVisible();
  });
});
