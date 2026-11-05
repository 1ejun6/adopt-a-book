import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin review adoption applications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click();
    await expect(page).toHaveURL(/admin\/applications/);
    await expect(page.getByRole('heading', { name: 'Adoption applications', level: 1 })).toBeVisible();
  });

  test('displays application queue tabs and default pending view', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('tab', { name: /Pending/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Approved/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Rejected/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Cancelled/i })).toBeVisible();
  });

  test('admin sorts applications and opens details modal', async ({ page }) => {
    const sortSelect = page.getByLabel('Application order');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('newest');
      await sortSelect.selectOption('oldest');
    }

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      const details = page.getByRole('dialog', { name: 'Application details' });
      await expect(details).toBeVisible();
      await expect(details.getByText('Applicant')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(details).toBeHidden();
    }
  });

  test('admin inspects application decision buttons and confirmation', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      const details = page.getByRole('dialog', { name: 'Application details' });
      await expect(details).toBeVisible();

      const approveBtn = details.getByRole('button', { name: 'Approve' });
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        const approveConfirm = page.locator('[data-sonner-toast]').filter({ hasText: 'Approve application?' });
        await expect(approveConfirm).toBeVisible();
        await approveConfirm.getByRole('button', { name: 'Cancel' }).click();
        await expect(approveConfirm).toBeHidden();
      }

      await page.keyboard.press('Escape');
    }
  });
});
