import { test, expect } from '@playwright/test'
import { demoCustomer } from '../support/env.js'

test('customer logs in and looks around', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoCustomer.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoCustomer.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()

  await expect(page).toHaveURL(/customer/)
  await expect(page.getByText('login successful')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(page).toHaveURL(/customer\/books/)
  await expect(page.getByRole('heading', { name: 'Find your next read' })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Saved books' }).click()
  await expect(page).toHaveURL(/customer\/watchlist/)
  await expect(page.getByRole('heading', { name: 'Saved books', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'My Adoptions' }).click()
  await expect(page).toHaveURL(/customer\/adoptions/)
  await expect(page.getByRole('heading', { name: 'My Adoptions', level: 1 })).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Adoption Drives' }).click()
  await expect(page).toHaveURL(/customer\/drives/)

  await page.getByRole('banner').getByRole('link', { name: 'Account' }).click()
  await expect(page).toHaveURL(/customer\/account/)
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()

  // a logged in customer can't open the guest or admin pages
  await page.goto('/login')
  await expect(page).toHaveURL(/customer/)
  await page.goto('/admin/books')
  await expect(page).toHaveURL(/customer/)

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible()
})
