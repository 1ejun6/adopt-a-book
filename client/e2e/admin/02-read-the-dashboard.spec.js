import { test, expect } from '@playwright/test'
import { demoAdmin } from '../support/env.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(demoAdmin.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(demoAdmin.password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin/)
})

test('admin reads the dashboard and jumps to the waiting work', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expect(page.getByText('Singapore time')).toBeVisible()

  await expect(page.getByRole('link', { name: /^Requests awaiting review: \d+$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Pickups awaiting confirmation: \d+$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Pickups today: \d+$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Overdue pickups: \d+$/ })).toBeVisible()

  // clicks through the Needs attention tabs
  await page.getByRole('tab', { name: /^Overdue/ }).click()
  await page.getByRole('tab', { name: /^Confirm pickups/ }).click()
  await page.getByRole('tab', { name: /^Requests/ }).click()
  await page.getByRole('tab', { name: /^Next drive/ }).click()
  await expect(page.getByRole('tab', { name: /^Next drive/ })).toHaveAttribute('aria-selected', 'true')

  // the cards open the right page and tab
  await page.getByRole('link', { name: /^Requests awaiting review: \d+$/ }).click()
  await expect(page).toHaveURL(/admin\/applications/)
  await expect(page.getByRole('tab', { name: /^Pending/ })).toHaveAttribute('aria-selected', 'true')

  await page.goBack()
  await page.getByRole('link', { name: /^Pickups today: \d+$/ }).click()
  await expect(page).toHaveURL(/admin\/appointments/)
  await expect(page.getByRole('tab', { name: /^Today's pickup/ })).toHaveAttribute('aria-selected', 'true')
})
