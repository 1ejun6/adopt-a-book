import { test, expect } from '@playwright/test'

// fake a broken server for one request
const serverDown = route => route.fulfill({ status: 503, json: { error: 'server unavailable > please try again' } })

test('guest sees an error on the homepage and retries', async ({ page }) => {
  await page.route(url => url.pathname.endsWith('/books'), serverDown)
  await page.goto('/')

  await expect(page.getByText('server unavailable')).toBeVisible()
  await expect(page.locator('.book-spine')).toHaveCount(0)

  await page.unrouteAll()
  await page.getByRole('button', { name: 'retry', exact: true }).click()

  await expect(page.locator('.book-spine')).toHaveCount(5)
})

test('guest sees an error on the drives page and tries again', async ({ page }) => {
  await page.goto('/')
  await page.route(url => url.pathname.endsWith('/drives'), serverDown)
  await page.getByRole('link', { name: 'Adoption Drives' }).click()

  await expect(page.getByRole('alert').getByText('server unavailable')).toBeVisible()

  await page.unrouteAll()
  await page.getByRole('button', { name: 'try again' }).click()

  await expect(page.getByText(/adoption drives found/)).toBeVisible()
})
