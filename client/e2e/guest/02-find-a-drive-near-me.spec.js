import { test, expect } from '@playwright/test'
import {
  bugisLocation, driveCards, expectDrivesShown, foundCount, isApi, json, locationBox, nextResponse, openDrivesPage,
  pickDrive, toast, upcomingDrives,
} from '../support/guest.js'

const searchButton = page => page.getByRole('button', { name: 'search', exact: true })
//@ChitanyaBharathi > the drives the page should show for the stations the server called "nearby"
const nearTo = (drives, stations) => drives.filter(drive => stations.some(station => station.id === drive.mrtstationid))

//@ChitanyaBharathi > journey 1.2 > a guest looks for an upcoming drive close to where they are
test.describe('guest finds a drive near them', () => {
  test.use({ geolocation: bugisLocation, permissions: ['geolocation'] })

  test('using their current location, a postcode, then clearing it', async ({ page }) => {
    // 1. clicks Adoption Drives in the navbar
    await page.goto('/')
    const drivesResponse = nextResponse(page, '/drives')
    await page.getByRole('link', { name: 'Adoption Drives' }).click()
    const upcoming = upcomingDrives((await (await drivesResponse).json()).drives)
    await expect(page).toHaveURL('/drives')
    await expectDrivesShown(page, upcoming)
    const firstCard = driveCards(page).first()
    await expect(firstCard).toContainText(/slots? left/)
    await expect(firstCard).toContainText(/books?/)

    // 2. taps "use current location" &&& allows it
    await page.getByRole('button', { name: 'use current location' }).click()
    await expect(toast(page, 'current location ready')).toBeVisible()
    await expect(page.getByText(/Distance: \d+ km/)).toBeVisible()

    // 3. sets the distance (2 km) &&& presses search
    const slider = page.getByRole('slider')
    await slider.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Distance: 2 km')).toBeVisible()
    let nearby = nextResponse(page, '/locations/nearby')
    await searchButton(page).click()
    const close = await (await nearby).json()
    await expect(toast(page, 'location filter applied')).toBeVisible()
    await expectDrivesShown(page, nearTo(upcoming, close.stations))

    // 4. widens the distance &&& searches again
    await slider.focus()
    await page.keyboard.press('End')
    await expect(page.getByText('Distance: 20 km')).toBeVisible()
    nearby = nextResponse(page, '/locations/nearby')
    await searchButton(page).click()
    const wide = await (await nearby).json()
    expect(wide.stations.length).toBeGreaterThan(close.stations.length)
    await expectDrivesShown(page, nearTo(upcoming, wide.stations))

    // 5. 🔌 types a postcode instead &&& presses search
    const target = pickDrive(upcoming, 'upcoming drive at an MRT station', drive => drive.mrtstationid)
    const stations = [{ id: target.mrtstationid, name: target.mrtstation?.name }]
    await page.route(isApi('/locations/nearby'), json({ location: { name: 'a postcode', lat: 1.3, lng: 103.85 }, stations, radiusKm: 2 }))
    await locationBox(page).fill('188021')
    await searchButton(page).click()
    await expectDrivesShown(page, nearTo(upcoming, stations))

    // 6. 🔌 searches a place with no drives nearby
    await page.unroute(isApi('/locations/nearby'))
    await page.route(isApi('/locations/nearby'), json({ location: { name: 'Jurong Island', lat: 1.266, lng: 103.699 }, stations: [], radiusKm: 2 }))
    await locationBox(page).fill('jurong island')
    await searchButton(page).click()
    await expect(page.getByText('no adoption drives near this location > try a wider distance')).toBeVisible()

    // 7. clears the location box
    await locationBox(page).fill('')
    await expect(foundCount(page, upcoming.length)).toBeVisible()
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
