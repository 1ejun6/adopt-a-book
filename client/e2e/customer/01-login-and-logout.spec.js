import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test.describe('Customer authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login successful with correct credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');

    await expect(page.getByText('login successful')).toBeVisible();
    await expect(page.getByText('invalid email or password')).not.toBeVisible();
  });

  test('login fails with incorrect password', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill('the-wrong-password');
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');

    await expect(page.getByText('login successful')).not.toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('invalid email or password');
  });

  test('login fails with non-existent email', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(`nosuchperson-${Date.now()}@example.com`);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');

    await expect(page.getByText('login successful')).not.toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('invalid email or password');
  });

  test('customer logs out', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/login/);
  });
});
