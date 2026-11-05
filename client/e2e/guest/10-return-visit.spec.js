import { test, expect } from '@playwright/test'

test('guest comes back and the books and drives still load', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.book-spine')).toHaveCount(5)

  await page.goto('/drives')
  await expect(page.getByText(/adoption drives found/)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/adoption drives found/)).toBeVisible()

  await page.goto('/')
  await expect(page.locator('.book-spine')).toHaveCount(5)
})

test('guest with broken saved data still gets the books and drives', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guest-bookshelf', '{this is not json')
    localStorage.setItem('guest-adoption-drive', '[{ "id": 1 }]')
  })

  await page.goto('/')
  await expect(page.locator('.book-spine')).toHaveCount(5)

  await page.goto('/drives')
  await expect(page.getByText(/adoption drives found/)).toBeVisible()
})
