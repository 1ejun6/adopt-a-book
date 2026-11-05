import { test as setup, expect } from '@playwright/test';
import { demoCustomer } from '../support/env.js';

// runs before the customer tests > puts the shared .env customer back to how the tests expect it
// (a test that fails halfway never gets to clean up after itself)

// the books the customer has saved on purpose > everything else was saved by a test
const keepSaved = ['The Dragonet Prophecy', 'Thank You for Leaving', 'The Myth of Sisyphus and Other Essays'];

// a date 5 days from now, as YYYY-MM-DD
const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

setup('reset the test customer', async ({ page }) => {
  setup.setTimeout(120 * 1000);

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password);
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await expect(page.getByText('login successful')).toBeVisible();

  // 1. unsave books a test left behind
  await page.goto('/customer/watchlist');
  await expect(page.getByRole('heading', { name: 'Watchlist', level: 1 })).toBeVisible();
  await page.waitForTimeout(2000);
  const cards = page.getByRole('button', { name: /^View details for / });
  for (const label of await cards.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')))) {
    const title = label.replace('View details for ', '');
    if (keepSaved.includes(title)) continue;
    await page.getByRole('button', { name: `Remove ${title} from saved books` }).first().click();
    // books with a note ask first
    if (await page.getByRole('button', { name: 'Remove saved book' }).isVisible()) {
      await page.getByRole('button', { name: 'Remove saved book' }).click();
    }
    await expect(page.getByText('Removed from saved books').first()).toBeVisible();
  }

  // 2. withdraw the request a test left behind > Born a Crime is the only book the tests request
  for (let i = 0; i < 10; i++) {
    await page.goto('/customer/adoptions');
    await expect(page.getByRole('main').getByRole('button', { name: /^View request for / }).first()).toBeVisible();
    const request = page.getByRole('button', { name: 'View request for Born a Crime. Under review' }).first();
    if (!(await request.count())) break;
    await request.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
    await page.getByRole('region', { name: 'Confirm withdrawal' }).getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible();
  }

  // 3. re-arrange pickups a test cancelled > those books offer "Arrange another pickup" (never-arranged ones are left alone)
  await page.goto('/customer/adoptions');
  await expect(page.getByRole('main').getByRole('button', { name: /^View request for / }).first()).toBeVisible();
  const approved = await page.getByRole('main').getByRole('button', { name: /^View request for .+\. Approved$/ })
    .evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
  for (const label of approved) {
    await page.goto('/customer/adoptions');
    await page.getByRole('main').getByRole('button', { name: label, exact: true }).first().click();
    const again = page.getByRole('dialog').getByRole('button', { name: 'Arrange another pickup' });
    await expect(page.getByRole('dialog').getByRole('button', { name: /^(Arrange|Close)/ }).first()).toBeVisible();
    if (!(await again.count())) continue;
    await again.click();
    await page.getByLabel('Preferred date').fill(in5Days);
    await page.getByRole('combobox', { name: 'Time 1' }).click();
    await page.getByRole('option').nth(0).click();
    await page.getByRole('combobox', { name: 'Time 2' }).click();
    await page.getByRole('option').nth(1).click();
    await page.getByRole('button', { name: 'Review pickup request' }).click();
    await page.getByRole('button', { name: 'Send pickup request' }).click();
    await expect(page.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible();
  }

  // 4. withdraw from the drive the rsvp test uses, if a test left the customer registered
  await page.goto('/customer/drives');
  await expect(page.getByRole('tab', { name: /^my drives/ })).toBeVisible();
  await page.waitForTimeout(2000);
  const testDrive = page.getByRole('main').getByRole('button', { name: 'Library Friends Meetup', exact: true });
  if (await testDrive.count()) {
    await testDrive.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByText('registration withdrawn')).toBeVisible();
  }
});
