import { test, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

test('guest forgets parts of the register form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Create Account' }).click();

  // an empty form doesn't go anywhere
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/register/);

  // no genre picked
  await page.getByRole('textbox', { name: 'Name' }).fill('E2E Mistakes');
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Choose at least one favourite genre')).toBeVisible();
  await expect(page).toHaveURL(/register/);
});

test('guest registers with an email that is already used', async ({ page }) => {
  await page.goto('/register');

  const email = page.getByRole('textbox', { name: 'Email' });
  await page.getByRole('textbox', { name: 'Name' }).fill('E2E Mistakes');
  await email.fill(demoCustomer.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
  await page.getByRole('checkbox', { name: 'Adventure' }).check();
  await page.getByRole('button', { name: 'Register' }).click();

  // stays on the form with the email kept
  await expect(page).toHaveURL(/register/);
  await expect(email).toHaveValue(demoCustomer.email);
});

test('guest logs in with the wrong password', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login', exact: true }).click();

  const password = page.getByRole('textbox', { name: 'Password' });
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
  await password.fill('the-wrong-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/login/);

  // show the password to check what was typed
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveValue('the-wrong-password');
});
