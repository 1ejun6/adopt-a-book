import { test, expect } from '@playwright/test'

// See here how to get started:
// https://playwright.dev/docs/intro
test('loads the home page and supports navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('You did it!')

  await page.getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { name: 'This is an about page' })).toBeVisible()
})
