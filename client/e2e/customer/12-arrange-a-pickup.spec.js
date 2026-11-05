import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

// a date 5 days from now, as YYYY-MM-DD
const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer cancels a pickup and arranges a new one', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await page.getByRole('tab', { name: /^All/ }).click()
await page.goto('http://localhost:5174/');
await page.getByRole('link', { name: 'Login' }).click();
await page.getByRole('textbox', { name: 'Email' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('customer@gmail.com');
await page.getByRole('textbox', { name: 'Password' }).click();
await page.getByRole('textbox', { name: 'Password' }).fill('1234567890');
await page.getByRole('textbox', { name: 'Password' }).press('Enter');
await page.getByRole('link', { name: 'Browse Books' }).click();
await page.getByRole('link', { name: 'Saved books' }).click();
await page.getByRole('link', { name: 'My Adoptions' }).click();
await page.getByRole('link', { name: 'Adoption Drives' }).click();
await page.getByRole('button', { name: 'Logout' }).click();
await page.getByRole('button', { name: 'Logout' }).click();
  // cancel one of their pickups so the book needs a new pickup
  const row = page.locator('button.adoption-row').filter({ hasText: 'View pickup request' }).first()
  const title = (await row.locator('strong').textContent()).trim()
  await row.click()
  await expect(page.getByRole('heading', { name: 'Your pickup request' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel pickup' }).click()
  await page.getByLabel('Confirm pickup cancellation').getByRole('button', { name: 'Cancel pickup' }).click()
  await expect(page.getByRole('heading', { name: 'Pickup cancelled' })).toBeVisible()
  await page.getByRole('button', { name: 'Back to my adoptions' }).click()

  // the book is now under Needs action
  await page.getByRole('tab', { name: /^Needs action/ }).click()
  await page.locator('button.adoption-row').filter({ hasText: title }).first().click()
  await expect(page.getByRole('heading', { name: 'Arrange pickup' })).toBeVisible()

  // picks a date, then tries to leave halfway
  await page.getByLabel('Preferred date').fill(in5Days)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Leave without sending?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()

  // picks two times and reviews
  await page.getByLabel('Time 1').selectOption({ index: 1 })
  await page.getByLabel('Time 2').selectOption({ index: 2 })
  await page.getByRole('button', { name: 'Review pickup request' }).click()
  await expect(page.getByRole('heading', { name: 'Review pickup request' })).toBeVisible()

  await page.getByRole('button', { name: 'Send pickup request' }).click()
  await expect(page.getByRole('heading', { name: 'Pickup request sent' })).toBeVisible()
})
