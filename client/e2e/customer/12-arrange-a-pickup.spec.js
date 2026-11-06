import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

// a date 5 days from now, as YYYY-MM-DD
const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

test.describe('Customer arranges a pickup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer cancels a pickup and arranges a new one', async ({ page }) => {
    await page.getByRole('link', { name: 'My Adoptions' }).click();

    // cancel one of their pickups so the book needs a new pickup
    const pickup = page.getByRole('button', { name: /^View request for .+\. Waiting for pickup confirmation$/ }).first();
    const title = (await pickup.getAttribute('aria-label')).replace(/^View request for (.+)\. Waiting for pickup confirmation$/, '$1');
    await pickup.click();
    await page.getByRole('dialog').getByRole('button', { name: 'View pickup request' }).click();
    await expect(page.getByRole('heading', { name: 'Your pickup request' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel pickup' }).click();
    await page.getByLabel('Confirm pickup cancellation').getByRole('button', { name: 'Cancel pickup' }).click();
    await expect(page.getByRole('dialog')).toContainText('this pickup was cancelled');
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // the book is now under Needs action, still approved
    await page.getByRole('tab', { name: /^Needs action/ }).click();
    await page.getByRole('main').getByRole('button', { name: `View request for ${title}. Approved` }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Arrange another pickup' }).click();
    await expect(page.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible();

    // picks a date, then tries to leave halfway
    await page.getByLabel('Preferred date').fill(in5Days);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Leave without sending?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing' }).click();

    // picks two times and reviews
    await page.getByRole('combobox', { name: 'Time 1' }).click();
    await page.getByRole('option').nth(0).click();
    await page.getByRole('combobox', { name: 'Time 2' }).click();
    await page.getByRole('option').nth(1).click();
    await page.getByRole('button', { name: 'Review pickup request' }).click();
    await expect(page.getByRole('heading', { name: 'Review pickup request' })).toBeVisible();

    await page.getByRole('button', { name: 'Send pickup request' }).click();
    await expect(page.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible();
  });
});
