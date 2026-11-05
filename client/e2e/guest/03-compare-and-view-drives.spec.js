import { test, expect } from '@playwright/test'

test('guest filters drives and opens one', async ({ page }) => {
  await page.goto('/drives')
  await expect(page.getByText(/adoption drives found/)).toBeVisible()

  const firstTitle = (await page.getByRole('main').getByRole('heading', { level: 3 }).first().textContent()).trim()

  await page.getByRole('searchbox', { name: 'search', exact: true }).fill(firstTitle)
  await expect(page.getByRole('heading', { name: firstTitle })).toBeVisible()
  await page.getByRole('searchbox', { name: 'search', exact: true }).fill('')

  await page.locator('select[title="sort adoption drives by date"]').selectOption('desc')

  await page.getByRole('button', { name: 'open', exact: true }).click()
  await expect(page.getByRole('button', { name: 'open', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'open', exact: true }).click()
  await expect(page.getByRole('button', { name: 'open', exact: true })).toHaveAttribute('aria-pressed', 'false')

  await page.locator('select[title="adoption drive status"]').selectOption('all')

  await page.getByRole('main').getByRole('heading', { level: 3 }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'book list' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.getByRole('tab', { name: /Past \/ cancelled/ }).click()
  await expect(page.getByRole('tab', { name: /Past \/ cancelled/ })).toHaveAttribute('aria-selected', 'true')
})
