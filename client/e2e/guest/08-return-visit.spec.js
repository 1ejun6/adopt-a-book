import { test, expect } from '@playwright/test'
import {
  bookSpines, driveCard, driveSearch, foundCount, openDrivesPage, openHomepage, pastDrives, singaporeDate,
  trackApiRequests, upcomingDrives,
} from '../support/guest.js'

const DAY = 24 * 60 * 60 * 1000

//@ChitanyaBharathi > journey 1.8 > a guest comes back later > saved data shows instantly
test('guest comes back and the site loads from saved data', async ({ page }) => {
  const api = trackApiRequests(page)
  const firstVisit = new Date()
  await page.clock.setFixedTime(firstVisit)

  // 1. visits the homepage &&& the drives page once
  const books = await openHomepage(page)
  const drives = await openDrivesPage(page)
  const upcoming = upcomingDrives(drives)
  expect(api.to('/books').length).toBeGreaterThan(0)
  expect(api.to('/drives')).toHaveLength(1)

  // 2. comes back later (reload)
  api.clear()
  await page.goto('/')
  await expect(bookSpines(page)).toHaveCount(books.length)
  await page.goto('/drives')
  await expect(foundCount(page, upcoming.length)).toBeVisible()
  expect(api.to('/books').filter(request => request.query.get('limit') === '5')).toHaveLength(0)
  expect(api.to('/drives')).toHaveLength(0)

  // 3. comes back the day after the earliest upcoming drive
  const earliest = [...upcoming].sort((a, b) => a.eventdate.localeCompare(b.eventdate))[0]
  expect(earliest, 'the database needs at least one upcoming drive').toBeTruthy()
  let daysLater = 1
  while (singaporeDate(daysLater, firstVisit) <= earliest.eventdate) { daysLater += 1 }
  const nextVisit = singaporeDate(daysLater, firstVisit)

  await page.clock.setFixedTime(new Date(firstVisit.getTime() + daysLater * DAY))
  await page.reload()
  await expect(foundCount(page, upcomingDrives(drives, nextVisit).length)).toBeVisible()
  const pastTab = page.getByRole('tab', { name: /past/ })
  await expect(pastTab).toContainText(String(pastDrives(drives, nextVisit).length))
  await pastTab.click()
  await driveSearch(page).fill(earliest.title)
  await expect(driveCard(page, earliest.title)).toBeVisible()
  expect(api.to('/drives')).toHaveLength(0)
})

// 4. has broken saved data in the browser
test('guest with broken saved data still gets the books and drives', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guest-bookshelf', '{this is not json')
    localStorage.setItem('guest-adoption-drive', JSON.stringify([{ id: 1 }]))
  })
  const api = trackApiRequests(page)

  await openHomepage(page)
  await openDrivesPage(page)
  expect(api.to('/books').length).toBeGreaterThan(0)
  expect(api.to('/drives')).toHaveLength(1)
})
