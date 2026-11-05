import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/customer/)
})

test('customer searches, filters and sorts the books', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  const firstTitle = (await page.getByRole('main').locator('article strong').first().textContent()).trim()

  await page.getByRole('searchbox', { name: /Search by title/ }).fill(firstTitle)
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByRole('main').getByText(firstTitle).first()).toBeVisible()

  await page.getByRole('searchbox', { name: /Search by title/ }).fill('')
  await expect(page).not.toHaveURL(/search=/)

  await page.locator('select').filter({ hasText: 'All genres' }).selectOption({ index: 1 })
  await expect(page).toHaveURL(/subject=/)

  await page.locator('select').filter({ hasText: 'Title A–Z' }).selectOption('author')
  await expect(page).toHaveURL(/sort=author/)

  await page.reload()
  await expect(page).toHaveURL(/sort=author/)
  await expect(page.getByText(/books found/)).toBeVisible()

  await page.getByRole('searchbox', { name: /Search by title/ }).fill('zzzz-no-such-book')
  await expect(page.getByText('0 books found', { exact: true })).toBeVisible()
})

test('customer goes to the next page of books', async ({ page }) => {
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page.getByText(/books found/)).toBeVisible()

  await page.getByRole('button', { name: 'Next Page' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible()
})
