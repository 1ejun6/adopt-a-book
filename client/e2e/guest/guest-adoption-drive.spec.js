import { test, expect } from '@playwright/test';

test('guest can browse, search and filter adoption drives', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.getByRole('link', { name: 'Adoption Drives' }).click();
  await page.getByRole('list').filter({ hasText: '20NovCommunity Book SwapDhoby' }).click();

  // click into a drive
  await page.getByRole('button', { name: '20 Nov Community Book Swap' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  //search for a drive
  await page.getByRole('searchbox', { name: 'search' }).click();
  await page.getByRole('searchbox', { name: 'search' }).fill('Serangoon');
  await page.getByRole('searchbox', { name: 'search' }).press('Enter');

  await page.getByRole('button', { name: 'clear search' }).click();
  await page.getByRole('main').click();
  //display only open drives
  await page.getByRole('combobox').first().selectOption('open');
  await page.getByRole('main').click();
  // trying out the sort filter
  await page.getByRole('combobox').nth(1).selectOption('desc');
  await page.getByRole('combobox').nth(1).selectOption('asc');
  await page.getByRole('main').click();
  //display all drives
  await page.getByRole('combobox').first().selectOption('all');

  //adjust slider
  await page.getByRole('slider').click();
  await page.getByRole('button', { name: 'search', exact: true }).click();
  //get current location
  await page.getByRole('button', { name: 'use current location' }).click();
  await page.getByText('Select Search to find nearby').click();

  //current location displayed
  await page.getByText('103.8952').click();
  await page.getByRole('button', { name: '20 Nov Community Book Swap' }).click();
  await page.getByRole('button', { name: 'rsvp' }).click(); 
});