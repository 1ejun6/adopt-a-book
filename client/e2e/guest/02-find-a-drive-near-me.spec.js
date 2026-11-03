import { test, expect } from '@playwright/test'
import {
  bugisLocation, driveCard, driveCards, foundCount, isApi, json, locationBox, openDrivesPage, seededDrives, toast,
} from '../support/guest.js'

//@ChitanyaBharathi > journey 1.2 > a guest looks for an upcoming drive close to where they are
test.describe('guest finds a drive near them', () => {
  test.use({ geolocation: bugisLocation, permissions: ['geolocation'] })

  test('using their current location, a postcode, then clearing it', async ({ page }) => {
    // 1. clicks Adoption Drives in the navbar
    await page.goto('/')
    const drivesResponse = page.waitForResponse(response => isApi('/drives')(new URL(response.url())))
    await page.getByRole('link', { name: 'Adoption Drives' }).click()
    const { drives } = await (await drivesResponse).json()
    await expect(page).toHaveURL('/drives')
    await expect(foundCount(page, 5)).toBeVisible()
    await expect(driveCards(page)).toHaveCount(5)
    const firstCard = driveCard(page, seededDrives.dhobyGhaut.title)
    await expect(firstCard).toContainText(seededDrives.dhobyGhaut.venue)
    await expect(firstCard).toContainText(/slots? left/)
    await expect(firstCard).toContainText(/books?/)

    // 2. taps "use current location" &&& allows it
    await page.getByRole('button', { name: 'use current location' }).click()
    await expect(toast(page, 'current location ready')).toBeVisible()
    await expect(page.getByText(/Distance: \d+ km/)).toBeVisible()

    // 3. sets the distance (2 km around Bugis) &&& presses search
    const slider = page.getByRole('slider')
    await slider.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Distance: 2 km')).toBeVisible()
    await page.getByRole('button', { name: 'search', exact: true }).click()
    await expect(toast(page, 'location filter applied')).toBeVisible()
    await expect(driveCard(page, seededDrives.bugis.title)).toBeVisible()
    await expect(driveCard(page, seededDrives.bishan.title)).toBeHidden()
    await expect(driveCard(page, seededDrives.tampines.title)).toBeHidden()
    const nearbyCount = await driveCards(page).count()
    expect(nearbyCount).toBeLessThan(5)
    await expect(foundCount(page, nearbyCount)).toBeVisible()

    // 4. widens the distance &&& searches again
    await slider.focus()
    await page.keyboard.press('End')
    await expect(page.getByText('Distance: 20 km')).toBeVisible()
    await page.getByRole('button', { name: 'search', exact: true }).click()
    await expect(driveCards(page)).toHaveCount(5)

    // 5. 🔌 types a postcode instead &&& presses search
    const bugisDrive = drives.find(drive => drive.title === seededDrives.bugis.title)
    await page.route(isApi('/locations/nearby'), json({
      location: { name: 'Bugis Junction', lat: 1.2999, lng: 103.8556 },
      stations: [{ id: bugisDrive.mrtstationid, name: 'Bugis MRT' }],
      radiusKm: 2,
    }))
    await locationBox(page).fill('188021')
    await page.getByRole('button', { name: 'search', exact: true }).click()
    await expect(driveCards(page)).toHaveCount(1)
    await expect(driveCard(page, seededDrives.bugis.title)).toBeVisible()

    // 6. 🔌 searches a place with no drives nearby
    await page.unroute(isApi('/locations/nearby'))
    await page.route(isApi('/locations/nearby'), json({
      location: { name: 'Jurong Island', lat: 1.266, lng: 103.699 }, stations: [], radiusKm: 2,
    }))
    await locationBox(page).fill('jurong island')
    await page.getByRole('button', { name: 'search', exact: true }).click()
    await expect(page.getByText('no adoption drives near this location > try a wider distance')).toBeVisible()

    // 7. clears the location box
    await locationBox(page).fill('')
    await expect(driveCards(page)).toHaveCount(5)
    await expect(page.getByText(/Distance:/)).toBeHidden()
  })
})

test.describe('guest blocks location access', () => {
  test.use({ permissions: [] })

  // 8. taps "use current location" but blocks it
  test('sees a message suggesting a postcode instead', async ({ page }) => {
    await openDrivesPage(page)
    await page.getByRole('button', { name: 'use current location' }).click()
    await expect(toast(page, 'location permission denied')).toBeVisible()
    await expect(toast(page, 'enter a postcode')).toBeVisible()
  })
})
