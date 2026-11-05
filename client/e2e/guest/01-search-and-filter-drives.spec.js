import { test, expect } from '@playwright/test';

// pretend the guest is standing at Bugis MRT so "use current location" gives the same result on every machine
test.use({ geolocation: { latitude: 1.3009, longitude: 103.8559 }, permissions: ['geolocation'] });

test('guest can browse, search and filter adoption drives', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Adoption Drives' }).click();
  await expect(page).toHaveURL(/drives/);

  const drive = page.getByRole('button', { name: 'Community Book Swap' });
  await expect(drive).toBeVisible();

  // click into a drive
  await drive.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  // search for a drive
  const search = page.getByRole('searchbox', { name: 'search' });
  await search.fill('Serangoon');
  await search.press('Enter');
  await expect(search).toHaveValue('Serangoon');

  await page.getByRole('button', { name: 'clear search' }).click();
  await expect(search).toHaveValue('');
  await expect(drive).toBeVisible();

  // display only open drives
  const status = page.getByRole('combobox', { name: 'Adoption drive status' });
  await status.selectOption('open');
  await expect(status).toHaveValue('open');

  // trying out the sort filter
  const sort = page.getByRole('combobox', { name: 'sort adoption drives by date' });
  await sort.selectOption('desc');
  await expect(sort).toHaveValue('desc');
  await sort.selectOption('asc');
  await expect(sort).toHaveValue('asc');

  // display all drives
  await status.selectOption('all');
  await expect(status).toHaveValue('all');

  // get current location
  await page.getByRole('button', { name: 'use current location' }).click();
  await expect(page.getByRole('searchbox', { name: 'Location' })).toHaveValue(/BUGIS/);

  // adjust slider to the max distance &&& search
  await page.getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect(page.getByText('Distance: 20 km')).toBeVisible();
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  // a guest who tries to rsvp is asked to log in
  await drive.click();
  await page.getByRole('dialog').getByRole('button', { name: 'rsvp' }).click();
  await expect(page.getByText('log in to rsvp')).toBeVisible();
});
