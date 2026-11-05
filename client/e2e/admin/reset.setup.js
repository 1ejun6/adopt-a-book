import { test as setup, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

// runs before the admin tests > deletes books and drives a test created but never got to delete
const testRecord = /E2E (Manual Book|Edit Book|Drive|Closing Drive) \d+/

setup('reset the test admin', async ({ page }) => {
  setup.setTimeout(120 * 1000)

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)

  for (const path of ['/admin/books', '/admin/drives']) {
    await page.goto(path)
    await page.getByRole('main').getByRole('searchbox').first().fill('E2E ')
    await page.waitForTimeout(2500)

    const leftovers = page.getByRole('main').locator('tbody tr').filter({ hasText: testRecord })
    const count = await leftovers.count()
    if (!count) continue

    for (let i = 0; i < count; i++) {
      await leftovers.nth(i).getByRole('checkbox').check()
    }
    await page.getByRole('main').getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('region', { name: /Notifications/ }).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(leftovers).toHaveCount(0)
  }
})
