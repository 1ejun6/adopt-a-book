import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer updates their account', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
  });

  test('customer changes their name and changes it back', async ({ page }) => {
    await page.getByRole('link', { name: 'Account' }).click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();

    // an earlier failed run may have left "(edited)" on the name > drop it
    const oldName = (await page.getByRole('textbox', { name: 'Full name' }).inputValue()).replaceAll(' (edited)', '');

    // a bad email shows an error
    await page.getByRole('textbox', { name: 'Email address' }).fill('invalid-email-format');
    await page.getByRole('textbox', { name: 'Email address' }).blur();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await page.getByRole('textbox', { name: 'Email address' }).fill(demoCustomer.email);

    // change the name
    await page.getByRole('textbox', { name: 'Full name' }).fill(`${oldName} (edited)`);
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved').first()).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Account navigation' })).toContainText(`${oldName} (edited)`);

    // put the old name back
    await page.getByRole('textbox', { name: 'Full name' }).fill(oldName);
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('complementary', { name: 'Account navigation' })).not.toContainText('(edited)');
  });

  test('customer types two different new passwords', async ({ page }) => {
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('tab', { name: 'Password' }).click();

    await page.getByLabel('New password', { exact: true }).fill('e2e-New-Password-456');
    await page.getByLabel('Confirm new password').fill('something-else-789');
    await page.getByLabel('Confirm new password').blur();
    await expect(page.getByText('Passwords don’t match.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save password' })).toBeDisabled();

    // fixed, but not saved, so the .env password keeps working
    await page.getByLabel('Confirm new password').fill('e2e-New-Password-456');
    await expect(page.getByText('Passwords match.')).toBeVisible();
  });
});
