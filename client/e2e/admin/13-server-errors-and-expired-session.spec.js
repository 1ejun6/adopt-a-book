import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

// Fake a broken server for one request
const serverDown = route => {
  if (route.request().resourceType() === 'document') {
    return route.continue();
  }
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }
  return route.fulfill({
    status: 503,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    json: { error: 'server unavailable > please try again' }
  });
};

test.describe('Admin server errors and session expiry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
    await expect(page).toHaveURL(/admin/);
  });

  test('book inventory recovers after the server is down', async ({ page }) => {
    await page.route(/\/admin\/books/, serverDown);
    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page).toHaveURL(/admin\/books/);
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 15000 });

    await page.unrouteAll();
    await page.getByRole('button', { name: /retry/i }).first().click();
    await expect(page.getByRole('main').locator('tbody tr').first()).toBeVisible({ timeout: 15000 });
  });

  test('adoption applications recovers after the server is down', async ({ page }) => {
    await page.route(/\/admin\/applications/, serverDown);
    await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click();
    await expect(page).toHaveURL(/admin\/applications/);
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 15000 });

    await page.unrouteAll();
    await page.getByRole('button', { name: /retry/i }).first().click();
    await expect(page.locator('role=alert')).toBeHidden({ timeout: 15000 });
  });

  test('appointments recovers after the server is down', async ({ page }) => {
    await page.route(/\/admin\/appointments/, serverDown);
    await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click();
    await expect(page).toHaveURL(/admin\/appointments/);
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 15000 });

    await page.unrouteAll();
    await page.getByRole('button', { name: /retry/i }).first().click();
    await expect(page.locator('role=alert')).toBeHidden({ timeout: 15000 });
  });

  test('drives recovers after the server is down', async ({ page }) => {
    await page.route(/\/admin\/drives/, serverDown);
    await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click();
    await expect(page).toHaveURL(/admin\/drives/);
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 15000 });

    await page.unrouteAll();
    await page.getByRole('button', { name: /retry/i }).first().click();
    await expect(page.locator('role=alert')).toBeHidden({ timeout: 15000 });
  });

  test('admin whose session expires is sent to login', async ({ page, context }) => {
    await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click();
    await expect(page.getByRole('heading', { name: 'Book Inventory', level: 1 })).toBeVisible();

    // Throw away the login cookies
    await context.clearCookies();
    await page.goto('/admin/drives');
    await expect(page).toHaveURL(/login/);
  });
});
