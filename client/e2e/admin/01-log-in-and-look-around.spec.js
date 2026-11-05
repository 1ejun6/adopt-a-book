import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test('admin logs in and looks around', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()

  await expect(page).toHaveURL(/admin/)
  await expect(page.getByText('login successful')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Book Inventory' }).click()
  await expect(page).toHaveURL(/admin\/books/)
  await expect(page.getByRole('heading', { name: 'Book Inventory', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Adoption Applications' }).click()
  await expect(page).toHaveURL(/admin\/applications/)
  await expect(page.getByRole('heading', { name: 'Adoption applications', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Appointments' }).click()
  await expect(page).toHaveURL(/admin\/appointments/)
  await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Drives' }).click()
  await expect(page).toHaveURL(/admin\/drives/)
  await expect(page.getByRole('heading', { name: 'Drives', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

  // a logged in admin can't open the guest or customer pages
  await page.goto('/login')
  await expect(page).toHaveURL(/admin/)
  await page.goto('/customer/books')
  await expect(page).toHaveURL(/admin/)

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible()
})
