import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin collection day handover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('admin views overdue and today pickup queues', async ({ page }) => {
    await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click();
    await expect(page).toHaveURL(/admin\/appointments/);

    await page.getByRole('tab', { name: /Today's pickup/i }).click();
    await expect(page.locator('table').or(page.getByText('No pickups today', { exact: true }))).toBeVisible();

    await page.getByRole('tab', { name: /Overdue/i }).click();
    await expect(page.locator('table').or(page.getByText('No overdue appointments', { exact: true }))).toBeVisible();
  });

  test('appointment details dialog explains handover completion rules', async ({ page }) => {
    await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click();

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      const details = page.getByRole('dialog', { name: 'Appointment details' });
      await expect(details).toBeVisible();

      const collectBtn = details.getByRole('button', { name: 'Mark collected' });
      if (await collectBtn.isVisible()) {
        await expect(details.getByText('Mark collected only after the customer has physically received the book.')).toBeVisible();
        await collectBtn.click();

        const collectModal = page.locator('[data-sonner-toast]').filter({ hasText: 'Mark appointment collected?' });
        await expect(collectModal).toBeVisible();
        await expect(collectModal).toContainText('The copy will become adopted.');
        await collectModal.getByRole('button', { name: 'Cancel' }).click();
      }

      await page.keyboard.press('Escape');
    }
  });

  test('adopted books in inventory cannot be edited', async ({ page }) => {
    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await page.getByRole('tab', { name: /Adopted/i }).click();

    const adoptedRows = page.locator('tbody tr');
    if (await adoptedRows.count() > 0) {
      await adoptedRows.first().click();
      const details = page.getByRole('dialog', { name: 'Book details' });
      await expect(details).toBeVisible();
      await expect(details.getByRole('button', { name: 'Edit' })).toBeDisabled();
      await page.keyboard.press('Escape');
    }
  });
});
