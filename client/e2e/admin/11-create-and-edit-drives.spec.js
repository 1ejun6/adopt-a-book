import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin create and edit adoption drives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click();
    await expect(page).toHaveURL(/admin\/drives/);
    await expect(page.getByRole('heading', { name: 'Drives', level: 1 })).toBeVisible();
  });

  test('validates drive creation form required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add drive' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create drive' });
    await expect(dialog).toBeVisible();

    // Presses submit with empty form
    await dialog.getByRole('button', { name: 'Save drive' }).click();
    await expect(dialog.getByLabel('Drive title')).toHaveAttribute('aria-invalid', 'true');

    // Clears date and enters 0 capacity
    await dialog.getByLabel('Drive title').fill('Test Title');
    const clearDate = dialog.getByRole('button', { name: 'Clear event date' });
    if (await clearDate.isVisible()) {
      await clearDate.click();
    }
    await dialog.getByLabel('Maximum capacity').fill('0');
    await dialog.getByRole('button', { name: 'Save drive' }).click();
    await expect(dialog.locator('#drive-date')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByLabel('Maximum capacity')).toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.press('Escape');
    const discardToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Discard changes?' });
    if (await discardToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardToast.getByRole('button', { name: 'Discard' }).click();
    }
    await expect(dialog).toBeHidden();
  });

  test('admin creates a drive, edits it and cancels it', async ({ page }) => {
    test.setTimeout(60000);
    const title = `E2E Drive ${Date.now()}`;
    const renamed = `${title} renamed`;

    await page.getByRole('button', { name: 'Add drive' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create drive' });
    await expect(dialog).toBeVisible();

    // Fills in details properly
    await dialog.getByLabel('Drive title').fill(title);

    // Find MRT stations that have available books
    const stationNames = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/books?status=available');
        const data = await res.json();
        const names = [];
        for (const b of (data.books || [])) {
          const raw = b.mrtstation?.name || b.collectionarea;
          if (raw) {
            const clean = raw.endsWith('MRT') ? raw : `${raw} MRT`;
            if (!names.includes(clean)) names.push(clean);
          }
        }
        return names;
      } catch {
        return ['Bugis MRT'];
      }
    });

    const locationInput = dialog.locator('#drive-location');
    const bookRow = dialog.locator('section[aria-labelledby="drive-book-selection-title"] tbody tr').first();

    for (const stationName of stationNames) {
      await locationInput.fill(stationName);
      await dialog.getByRole('button', { name: 'Search', exact: true }).click();
      if (await bookRow.isVisible({ timeout: 4000 }).catch(() => false)) {
        break;
      }
    }

    await expect(bookRow).toBeVisible({ timeout: 10000 });
    await bookRow.click();
    await expect(dialog.getByText(/1 selected/)).toBeVisible();

    // Set start time to 10:00
    await dialog.locator('#drive-starttime').click();
    await page.getByRole('option', { name: '10', exact: true }).click();
    await dialog.locator('#drive-starttime-minute').click();
    await page.getByRole('option', { name: '00', exact: true }).click();

    // Set end time to 13:00
    await dialog.locator('#drive-endtime').click();
    await page.getByRole('option', { name: '13', exact: true }).click();
    await dialog.locator('#drive-endtime-minute').click();
    await page.getByRole('option', { name: '00', exact: true }).click();

    await dialog.getByLabel('Maximum capacity').fill('30');
    await dialog.getByLabel('Description').fill('Bring a book, take a book.');
    await dialog.getByRole('button', { name: 'Save drive' }).click();
    await expect(page.getByText('adoption drive created successfully')).toBeVisible();

    // Opens details dialog
    await page.getByRole('main').getByRole('searchbox').first().fill(title);
    await page.getByRole('main').locator('tbody tr').filter({ hasText: title }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Drive details' })).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Bring a book, take a book.')).toBeVisible();

    // Edits the drive
    await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit drive' })).toBeVisible();
    await page.getByLabel('Drive title').fill(renamed);
    await page.getByLabel('Maximum capacity').fill('25');
    await page.getByRole('dialog').getByRole('button', { name: 'Save drive' }).click();
    await expect(page.getByText('adoption drive updated successfully')).toBeVisible();

    await page.getByRole('main').getByRole('searchbox').first().fill(renamed);
    await expect(page.getByRole('main').locator('tbody tr').filter({ hasText: renamed })).toContainText('0 / 25');

    // Cancel it to clean up
    await page.getByRole('main').locator('tbody tr').filter({ hasText: renamed }).locator('input[type="checkbox"], button[role="checkbox"]').click();
    await page.getByRole('main').getByRole('button', { name: 'Cancel', exact: true }).click();
    const cancelToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Cancel drive?' });
    await cancelToast.locator('button[data-action]').click();
    await expect(page.getByText(/1 drive cancelled/i)).toBeVisible();
  });
});
