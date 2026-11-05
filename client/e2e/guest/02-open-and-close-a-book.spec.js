import { test, expect } from '@playwright/test';

test('guest can open and close a book from Browse Books', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.getByRole('link', { name: 'Browse Books' }).click();
  //hovering over the book doesn't register it
  await page.getByRole('button', { name: 'Born a Crime by Trevor Noah' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
});