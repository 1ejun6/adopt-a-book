import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer follows their adoptions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer looks through their adoptions', async ({ page }) => {
    await page.getByRole('link', { name: 'My Adoptions' }).click();

    await expect(page.getByRole('tab', { name: /^Active/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^History/ })).toBeVisible();

    // open the first adoption and close it
    await page.getByRole('main').getByRole('button', { name: /^(View|Arrange|Complete|Check) .+ for / }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // switch to History
    await page.getByRole('tab', { name: /^History/ }).click();
    await expect(page.getByRole('tab', { name: /^History/ })).toHaveAttribute('data-state', 'active');
  });
});
