import { test, expect } from '@playwright/test'

test('guest browses the bookshelf and opens a book', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Different shelves')
  await expect(page.locator('.book-spine')).toHaveCount(5)

  await page.locator('.book-spine').first().hover()
  await expect(page.locator('.book-spine').first().locator('.book-preview')).toBeVisible()

  await page.locator('.book-spine').nth(1).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Book details' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.locator('.book-spine').nth(2).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
