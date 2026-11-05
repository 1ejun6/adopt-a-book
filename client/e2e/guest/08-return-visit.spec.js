import { test, expect } from '@playwright/test'
import {
  bookSpines, driveCard, driveSearch, foundCount, holdRequests, isApi, openDrivesPage, openHomepage, pastDrives, pastTab,
  singaporeDate, trackApiRequests, upcomingDrives,
} from '../support/guest.js'

const DAY = 24 * 60 * 60 * 1000
const isShelf = url => isApi('/books')(url) && url.searchParams.get('limit') === '5'

//@ChitanyaBharathi > journey 1.8 > a guest comes back later > the saved shelf shows instantly
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

  // 2. comes back later (reload) > saved books show before the server answers, then refresh in the background
  api.clear()
  const release = await holdRequests(page, isShelf)
  await page.goto('/')
  for (const [index, book] of books.entries()) {
    await expect(bookSpines(page).nth(index)).toHaveAccessibleName(new RegExp(`^${RegExp.escape(book.title)} by`))
  }
  await expect(bookSpines(page)).toHaveCount(books.length)
  await release()
  expect(api.to('/books').filter(request => request.query.get('limit') === '5')).toHaveLength(1)

  //@ChitanyaBharathi > the drives page refreshes too, but shows placeholders until the server answers
  await page.goto('/drives')
  await expect(foundCount(page, upcoming.length)).toBeVisible()
  expect(api.to('/drives')).toHaveLength(1)

  // 3. comes back the day after the earliest upcoming drive > drives are split again by the new date
  const earliest = [...upcoming].sort((a, b) => a.eventdate.localeCompare(b.eventdate))[0]
  expect(earliest, 'the database needs at least one upcoming drive').toBeTruthy()
  let daysLater = 1
  while (singaporeDate(daysLater, firstVisit) <= earliest.eventdate) { daysLater += 1 }
  const nextVisit = singaporeDate(daysLater, firstVisit)

  await page.clock.setFixedTime(new Date(firstVisit.getTime() + daysLater * DAY))
  await page.reload()
  await expect(foundCount(page, upcomingDrives(drives, nextVisit).length)).toBeVisible()
  await expect(pastTab(page)).toContainText(String(pastDrives(drives, nextVisit).length))
  await pastTab(page).click()
  await driveSearch(page).fill(earliest.title)
  await expect(driveCard(page, earliest.title)).toBeVisible()
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
