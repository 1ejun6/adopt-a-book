import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer withdraws a request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer looks at a pending request and withdraws it', async ({ page }) => {
    // request a book first
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await page.getByRole('button', { name: 'request', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm adoption request' }).click();
    await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // open it in My Adoptions
    await page.getByRole('link', { name: 'My Adoptions' }).click();
    await page.getByRole('button', { name: 'View request for Born a Crime. Under review' }).click();
    await expect(page.getByRole('heading', { name: 'Adoption details' })).toBeVisible();

    // changes their mind once
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Withdraw this request?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep request' }).click();
    await expect(page.getByRole('heading', { name: 'Adoption details' })).toBeVisible();

    // then withdraws for real
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
    await page.getByRole('region', { name: 'Confirm withdrawal' }).getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // it is now in History
    await expect(page.getByRole('tab', { name: /^History/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'View request for Born a Crime. Withdrawn' }).first()).toBeVisible();
  });
});
