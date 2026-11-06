import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin cancel and delete drives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click();
    await expect(page).toHaveURL(/admin\/drives/);
  });

  test('admin creates a drive, cancels it and then checks history', async ({ page }) => {
    test.setTimeout(60000);
    const title = `E2E Cancel Drive ${Date.now()}`;

    // Create a drive to work on
    await page.getByRole('button', { name: 'Add drive' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create drive' });
    await expect(dialog).toBeVisible();

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

    await dialog.getByRole('button', { name: 'Save drive' }).click();
    await expect(page.getByText('adoption drive created successfully')).toBeVisible();

    // Select the drive
    const search = page.getByRole('main').getByRole('searchbox').first();
    await search.fill(title);
    const row = page.locator('tbody tr').filter({ hasText: title });
    await expect(row).toBeVisible();

    await row.locator('input[type="checkbox"], button[role="checkbox"]').click();
    const cancelBtn = page.getByRole('main').getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancelBtn).toBeEnabled();

    // Cancel the drive
    await cancelBtn.click();
    const cancelToast = page.locator('[data-sonner-toast]').filter({ hasText: /Cancel drive\?/ });
    await expect(cancelToast).toBeVisible();
    await cancelToast.locator('button[data-action]').click();

    await expect(page.getByText(/1 drive cancelled/i)).toBeVisible();

    // Check drive in History/Cancelled tab
    await page.getByRole('tab', { name: /History\/Cancelled/i }).click();
    await search.fill(title);
    const cancelledRow = page.locator('tbody tr').filter({ hasText: title });
    await expect(cancelledRow).toBeVisible();
    await expect(cancelledRow).toContainText('cancelled');
  });

  test('history tab hides selection checkboxes', async ({ page }) => {
    await page.getByRole('tab', { name: /History\/Cancelled/i }).click();
    await expect(page.locator('thead input[type="checkbox"], thead button[role="checkbox"]')).toBeHidden();
  });

  test('admin filters drives by a search term with no matches', async ({ page }) => {
    await page.getByRole('main').getByRole('searchbox').first().fill('zzzz-no-such-drive');
    await expect(page.getByText('No matching drives').first()).toBeVisible();
  });
});
