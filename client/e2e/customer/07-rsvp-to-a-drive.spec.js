import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer rsvps to a drive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer rsvps to a drive and withdraws again', async ({ page }) => {
    await page.getByRole('link', { name: 'Adoption Drives' }).click();
    await expect(page.getByRole('tab', { name: /^my drives/ })).toHaveAttribute('aria-selected', 'true');

    // find the drive under upcoming and rsvp
    await page.getByRole('tab', { name: /^upcoming/ }).click();
    await page.getByRole('button', { name: 'Library Friends Meetup', exact: true }).click();
    // the page ignores clicks until it has reloaded the drives after an rsvp > wait for that
    const drivesReloaded = page.waitForResponse(response => response.url().includes('/customer/drives'));
    await page.getByRole('dialog').getByRole('button', { name: 'rsvp', exact: true }).click();
    await expect(page.getByText('registered for adoption drive')).toBeVisible();
    await drivesReloaded;
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Withdraw' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // it is now under my drives
    await page.getByRole('tab', { name: /^my drives/ }).click();
    await expect(page.getByRole('button', { name: 'Library Friends Meetup', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Library Friends Meetup', exact: true }).click();

    // withdraw so the slot is free again
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByText('registration withdrawn')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'rsvp', exact: true })).toBeVisible();
  });
});
