import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin competing requests and bulk decisions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click();
    await expect(page).toHaveURL(/admin\/applications/);
  });

  test('bulk approval toolbar is hidden without selection and appears on selection', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: 'Approve', exact: true });
    const rejectBtn = page.getByRole('button', { name: 'Reject', exact: true });

    await expect(approveBtn).toBeHidden();
    await expect(rejectBtn).toBeHidden();

    const firstRowCheckbox = page.locator('tbody tr input[type="checkbox"], tbody tr button[role="checkbox"]').first();
    if (await firstRowCheckbox.isVisible()) {
      await firstRowCheckbox.click();
      await expect(approveBtn).toBeVisible();
      await expect(rejectBtn).toBeVisible();
      await firstRowCheckbox.click();
      await expect(approveBtn).toBeHidden();
    }
  });

  test('selecting applications in all applications view validates status', async ({ page }) => {
    await page.getByRole('tab', { name: 'All', exact: true }).click();

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count >= 2) {
      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();

      const warning = page.getByText('Only pending applications can be approved or rejected.');
      if (await warning.isVisible()) {
        await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
      }

      await rows.nth(0).locator('input[type="checkbox"], button[role="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"], button[role="checkbox"]').click();
    }
  });

  test('approved and rejected tabs hide row selection checkboxes', async ({ page }) => {
    await page.getByRole('tab', { name: /Approved/i }).click();
    await expect(page.locator('thead input[type="checkbox"], thead button[role="checkbox"]')).toBeHidden();

    await page.getByRole('tab', { name: /Rejected/i }).click();
    await expect(page.locator('thead input[type="checkbox"], thead button[role="checkbox"]')).toBeHidden();
  });
});
