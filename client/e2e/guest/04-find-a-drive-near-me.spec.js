import { test, expect } from '@playwright/test'

test.describe('guest allows location access', () => {
  // pretend the guest is standing at Bugis MRT
  test.use({ geolocation: { latitude: 1.3009, longitude: 103.8559 }, permissions: ['geolocation'] })

  test('guest finds drives near their current location', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Adoption Drives' }).click()

    await expect(page).toHaveURL(/drives/)
    await expect(page.getByText(/of [0-9]+ adoption drives/)).toBeVisible()

    await page.getByRole('button', { name: 'use current location' }).click()
    // the location box fills in with their address
    await expect(page.getByRole('searchbox', { name: 'Location' })).toHaveValue(/BUGIS/)
    await expect(page.getByText(/Distance: \d+ km/)).toBeVisible()

    await page.getByRole('slider').focus()
    await page.keyboard.press('End')
    await expect(page.getByText('Distance: 20 km')).toBeVisible()

    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText(/of [0-9]+ adoption drives/)).toBeVisible()
  })
})

test.describe('guest blocks location access', () => {
  test.use({ permissions: [] })

  test('guest is told location is blocked', async ({ page }) => {
    await page.goto('/drives')

    await page.getByRole('button', { name: 'use current location' }).click()
    await expect(page.getByText('Location permission was denied.')).toBeVisible()
  })
})
