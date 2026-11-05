import { test, expect } from '@playwright/test';
import { demoAdmin } from '../support/env.js';

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await expect(page.getByText('login successful')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('dashboard displays summary metrics and Singapore time', async ({ page }) => {
    await expect(page.getByText('Singapore time')).toBeVisible();
    await expect(page.locator('dl div').filter({ hasText: 'Requests awaiting review' })).toBeVisible();
    await expect(page.locator('dl div').filter({ hasText: 'Pickups awaiting confirmation' })).toBeVisible();
    await expect(page.locator('dl div').filter({ hasText: 'Pickups today' })).toBeVisible();
    await expect(page.locator('dl div').filter({ hasText: 'Overdue pickups' })).toBeVisible();
  });

  test('admin switches between attention queue tabs', async ({ page }) => {
    const overdueTab = page.getByRole('tab', { name: /Overdue/i });
    const awaitingTab = page.getByRole('tab', { name: /Confirm pickups/i });
    const requestsTab = page.getByRole('tab', { name: /Requests/i });

    await expect(overdueTab).toBeVisible();
    await expect(awaitingTab).toBeVisible();
    await expect(requestsTab).toBeVisible();

    await awaitingTab.click();
    await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();

    await requestsTab.click();
    await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();

    await overdueTab.click();
    await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();
  });

  test('admin inspects today pickups sidebar and follows links', async ({ page }) => {
    const collectionsSection = page.getByRole('region', { name: "Today's pickups" });
    await expect(collectionsSection).toBeVisible();

    await collectionsSection.getByRole('link', { name: 'View all' }).click();
    await expect(page).toHaveURL(/admin\/appointments/);
    await expect(page.getByRole('tab', { name: "Today's pickup" })).toHaveAttribute('data-state', 'active');
  });

  test('clicking requests metric card deep links to adoption applications', async ({ page }) => {
    const requestsCard = page.locator('dl div').filter({ hasText: 'Requests awaiting review' });
    await requestsCard.click();
    await expect(page).toHaveURL(/admin\/applications/);
    await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('data-state', 'active');
  });
});
