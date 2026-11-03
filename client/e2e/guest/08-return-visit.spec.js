import { test, expect } from '@playwright/test'
import {
  bookSpines, driveCard, driveCards, openDrivesPage, openHomepage, singaporeDate, trackApiRequests,
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
  await expect(driveCards(page)).toHaveCount(drives.length)
  expect(api.to('/books').length).toBeGreaterThan(0)
  expect(api.to('/drives')).toHaveLength(1)

  // 2. comes back later (reload)
  api.clear()
  await page.goto('/')
  await expect(bookSpines(page)).toHaveCount(books.length)
  await page.goto('/drives')
  await expect(driveCards(page)).toHaveCount(drives.length)
  expect(api.to('/books').filter(request => request.query.get('limit') === '5')).toHaveLength(0)
  expect(api.to('/drives')).toHaveLength(0)

  // 3. comes back the day after the earliest drive
  const earliest = [...drives].sort((a, b) => a.eventdate.localeCompare(b.eventdate))[0]
  let daysLater = 1
  while (singaporeDate(daysLater, firstVisit) <= earliest.eventdate) { daysLater += 1 }
  const nextVisit = singaporeDate(daysLater, firstVisit)
  const nowPast = drives.filter(drive => drive.eventdate < nextVisit)

  await page.clock.setFixedTime(new Date(firstVisit.getTime() + daysLater * DAY))
  await page.reload()
  await expect(driveCards(page)).toHaveCount(drives.length - nowPast.length)
  await expect(page.getByRole('tab', { name: /past/ })).toContainText(String(nowPast.length))
  await page.getByRole('tab', { name: /past/ }).click()
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
  const drives = await openDrivesPage(page)
  await expect(driveCards(page)).toHaveCount(drives.length)
  expect(api.to('/books').length).toBeGreaterThan(0)
  expect(api.to('/drives')).toHaveLength(1)
})
