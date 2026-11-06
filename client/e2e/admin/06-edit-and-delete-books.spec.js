import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin edit and delete books', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page).toHaveURL(/admin\/books/);
  });

  test('admin edits book details and saves changes', async ({ page }) => {
    const title = `E2E Edit Book ${Date.now()}`;
    await page.getByRole('button', { name: 'Add Book' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add book' });
    await addDialog.getByRole('tab', { name: 'Manual entry' }).click();
    await addDialog.locator('#edit-title').fill(title);
    const stationInput = addDialog.locator('#edit-station');
    const listId = await stationInput.getAttribute('list');
    const stationOption = await addDialog.locator(`datalist#${listId} option`).first().getAttribute('value');
    await stationInput.fill(stationOption);
    await addDialog.locator('#edit-subject').selectOption({ index: 1 });
    await addDialog.getByRole('button', { name: 'Add book' }).click();
    await expect(page.getByText(/you have created book .* successfully!|Book added/i)).toBeVisible();

    // Find and select the book
    const search = page.getByRole('searchbox');
    await search.fill(title);
    const row = page.locator('tbody tr').filter({ hasText: title });
    await expect(row).toBeVisible();

    await row.locator('input[type="checkbox"], button[role="checkbox"]').click();
    const editBtn = page.getByRole('button', { name: 'Edit', exact: true });
    await expect(editBtn).toBeEnabled();

    await editBtn.click();
    const editDialog = page.getByRole('dialog', { name: 'Edit book' });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.locator('#edit-title')).toHaveValue(title);

    await editDialog.locator('#edit-condition').selectOption('like new');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(/you have updated book .* successfully!|Book updated/i)).toBeVisible();
    await expect(editDialog).toBeHidden();

    // Verify updated condition in details dialog
    await row.click();
    const details = page.getByRole('dialog', { name: 'Book details' });
    await expect(details).toBeVisible();
    await expect(details.getByText('like new')).toBeVisible();
    await page.keyboard.press('Escape');

    // Cleanup: delete the book
    const rowCheckbox = row.locator('input[type="checkbox"], button[role="checkbox"]');
    if (!(await rowCheckbox.isChecked())) {
      await rowCheckbox.click();
    }
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const deleteToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Delete book?' });
    await deleteToast.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/1 book deleted/i)).toBeVisible();
  });

  test('multi-selection disables edit and shows bulk actions', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count >= 2) {
      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();

      await expect(page.locator('[role="status"]').filter({ hasText: '2 selected' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();

      // Untick to clean selection state
      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();
    }
  });

  test('reserved books cannot be deleted', async ({ page }) => {
    await page.getByRole('tab', { name: /Reserved/i }).click();
    const reservedRows = page.locator('tbody tr');
    if (await reservedRows.count() > 0) {
      await expect(page.locator('thead input[type="checkbox"], thead button[role="checkbox"]')).toBeHidden();
    }
  });
});
