import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer looks at a pending request and withdraws it', async ({ page }) => {
  // request a book first
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()
  const title = (await page.getByRole('main').locator('article strong').nth(1).textContent()).trim()
  await page.getByRole('button', { name: `View details for ${title}` }).first().click()
  await page.getByRole('button', { name: 'Request this book' }).click()
  await page.getByRole('button', { name: 'Send adoption request' }).click()
  await expect(page.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue browsing' }).click()

  // open it in My Adoptions
  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await page.getByRole('tab', { name: /^All/ }).click()
  await page.locator('button.adoption-row').filter({ hasText: title }).first().click()
  await expect(page.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Under review', { exact: true })).toBeVisible()

  // changes their mind once
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await expect(page.getByRole('heading', { name: 'Withdraw this request?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep request' }).click()
  await expect(page.getByRole('heading', { name: 'Adoption details' })).toBeVisible()

  // then withdraws for real
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await page.getByRole('button', { name: 'Withdraw request' }).click()
  await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible()

  await page.getByRole('button', { name: 'View in History' }).click()
  await expect(page.locator('button.adoption-row').filter({ hasText: title }).first()).toContainText('Withdrawn')
})
