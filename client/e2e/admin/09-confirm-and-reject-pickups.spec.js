import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin confirm and reject pickups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click();
    await expect(page).toHaveURL(/admin\/appointments/);
    await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible();
  });

  test('displays appointment tabs and filter controls according to view', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Action Needed/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('tab', { name: /Today's pickup/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Upcoming/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Overdue/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /History/i })).toBeVisible();

    // In awaiting confirmation (Action Needed) view, status dropdown is disabled and date picker is enabled
    await expect(page.getByLabel('Collection date')).toBeEnabled();
    await expect(page.getByLabel('Appointment status')).toBeDisabled();

    // In today's pickup view, both filters are disabled
    await page.getByRole('tab', { name: /Today's pickup/i }).click();
    await expect(page.getByLabel('Appointment status')).toBeDisabled();
    await expect(page.getByLabel('Collection date')).toBeDisabled();

    // In history view, status dropdown is enabled with expected options
    await page.getByRole('tab', { name: /History/i }).click();
    const historyStatusSelect = page.getByLabel('Appointment status');
    await expect(historyStatusSelect).toBeVisible();
    await expect(historyStatusSelect.locator('option')).toContainText(['All', 'Collected', 'Cancelled', 'Rejected']);
  });

  test('admin inspects appointment details and confirmation dialog', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      const details = page.getByRole('dialog', { name: 'Appointment details' });
      await expect(details).toBeVisible();

      const confirmBtn = details.getByRole('button', { name: 'Confirm appointment' });

      if (await confirmBtn.isVisible() && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        const confirmToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Confirm appointment?' });
        await expect(confirmToast).toBeVisible();
        await confirmToast.getByRole('button', { name: 'Cancel' }).click();
        await expect(confirmToast).toBeHidden();
      }

      await page.keyboard.press('Escape');
    }
  });

  test('upcoming view guides bulk selection by status', async ({ page }) => {
    await page.getByRole('tab', { name: /Upcoming/i }).click();

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count >= 2) {
      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();

      const filterGuidance = page.getByText('Filter by Pending to confirm appointments, or Confirmed to mark them collected.');
      if (await filterGuidance.isVisible()) {
        await expect(page.getByRole('button', { name: 'Confirm appointments' })).toBeDisabled();
      }

      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();
    }
  });
});
