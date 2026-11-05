import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer requests a book', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer requests a book and sees it in my adoptions', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Books' }).click();
    await page.getByRole('tab', { name: /^Other genres/ }).click();
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();

    // opens the request form, then goes back without sending
    await page.getByRole('button', { name: 'request', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Request this book' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Requesting as' })).toContainText(demoCustomer.email);
    await page.getByRole('button', { name: 'Back to details' }).click();
    await expect(page.getByRole('dialog', { name: 'Book details' })).toBeVisible();

    // now sends it
    await page.getByRole('button', { name: 'request', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm adoption request' }).click();
    await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // the book now points to the existing request
    await page.getByRole('button', { name: 'View details for Born a Crime' }).click();
    await expect(page.getByRole('button', { name: 'view request' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // and it waits for approval in My Adoptions
    await page.getByRole('link', { name: 'My Adoptions' }).click();
    const request = page.getByRole('button', { name: 'View request for Born a Crime. Under review' });
    await expect(request).toBeVisible();

    // clean up so the book is free again
    await request.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
    await page.getByRole('region', { name: 'Confirm withdrawal' }).getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible();
  });
});
