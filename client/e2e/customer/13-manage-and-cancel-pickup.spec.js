import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer opens a pickup, starts editing and cancelling, then keeps it', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await page.getByRole('tab', { name: /^All/ }).click()

  await page.locator('button.adoption-row').filter({ hasText: 'View pickup request' }).first().click()
  await expect(page.getByRole('heading', { name: 'Your pickup request' })).toBeVisible()

  // tries to send an edit without changing anything
  await page.getByRole('button', { name: 'Edit pickup request' }).click()
  await expect(page.getByRole('heading', { name: 'Edit pickup request' })).toBeVisible()
  await page.getByRole('button', { name: 'Review pickup request' }).click()
  await expect(page.getByText('Check your pickup details')).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()

  // starts to cancel it, then keeps it
  await page.getByRole('button', { name: 'Cancel pickup' }).click()
  await expect(page.getByRole('heading', { name: 'Cancel this pickup?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep pickup' }).click()
  await expect(page.getByRole('heading', { name: 'Cancel this pickup?' })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Your pickup request' })).toBeVisible()
})
