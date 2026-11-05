import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer searches their adoptions and clears the search', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()

  const title = (await page.locator('button.adoption-row strong').first().textContent()).trim()

  await page.getByRole('searchbox', { name: 'Search all adoptions' }).fill(title)
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
  await expect(page.locator('button.adoption-row').filter({ hasText: title }).first()).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search all adoptions' }).fill('NonExistentTitleXYZ')
  await expect(page.getByText('No matching results')).toBeVisible()

  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(page).not.toHaveURL(/search=/)
})

test('customer opens a link to an adoption that does not exist', async ({ page }) => {
  await page.goto('/customer/adoptions?request=non-existent-id-000')
  await expect(page.getByText('That adoption or pickup could not be found')).toBeVisible()
})
