import { test, expect } from '@playwright/test'
import {
  bookSpines, driveCards, foundCount, isApi, json, nextResponse, openDrivesPage, pickDrive, showDrive, toast,
  upcomingDrives,
} from '../support/guest.js'

const serverDown = json({ error: 'server unavailable > please try again' }, 503)
//@ChitanyaBharathi > one function per route > page.unroute() needs the same one to remove it
const isBookList = url => isApi('/books')(url) && url.searchParams.get('limit') === '5'
const isBookCount = url => isApi('/books')(url) && url.searchParams.get('limit') === '1'

//@ChitanyaBharathi > journey 1.9 > 🔌 the server is having trouble > the guest recovers without reloading
test('guest recovers on the homepage and drives page when the server is down', async ({ page }) => {
  // 1. 🔌 opens the homepage while the server is down
  await page.route(isApi('/books'), serverDown)
  await page.goto('/')
  const homeError = toast(page, 'server unavailable')
  await expect(homeError).toBeVisible()
  await expect(bookSpines(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Different shelves')

  // 2. 🔌 clicks retry once the server is back
  await page.unroute(isApi('/books'))
  const books = nextResponse(page, '/books')
  await homeError.getByRole('button', { name: 'retry' }).click()
  const { books: shelf } = await (await books).json()
  await expect(bookSpines(page)).toHaveCount(shelf.length)
  await expect(toast(page, 'books refreshed')).toBeVisible()

  // 3. 🔌 opens Adoption Drives while the server is down
  await page.route(isApi('/drives'), serverDown)
  await page.getByRole('link', { name: 'Adoption Drives' }).click()
  const drivesError = page.getByRole('alert').filter({ hasText: 'server unavailable' })
  await expect(drivesError).toBeVisible()
  await expect(driveCards(page)).toHaveCount(0)

  // 4. 🔌 clicks try again once the server is back
  await page.unroute(isApi('/drives'))
  const drives = nextResponse(page, '/drives')
  await drivesError.getByRole('button', { name: 'try again' }).click()
  const { drives: list } = await (await drives).json()
  await expect(foundCount(page, upcomingDrives(list).length)).toBeVisible()
})

test('guest retries a drive book list that failed to load', async ({ page }) => {
  const drive = pickDrive(upcomingDrives(await openDrivesPage(page)), 'upcoming drive at an MRT station', drive => drive.mrtstationid)
  const card = await showDrive(page, drive)

  // 5. 🔌 opens a drive whose book list fails to load
  await page.route(isBookList, serverDown)
  await card.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: drive.title })).toBeVisible()
  await expect(dialog.getByText('date', { exact: true })).toBeVisible()
  const bookError = dialog.getByRole('alert')
  await expect(bookError).toContainText('server unavailable')

  // 6. 🔌 clicks retry book list
  await page.unroute(isBookList)
  const books = nextResponse(page, '/books', url => url.searchParams.get('limit') === '5')
  await bookError.getByRole('button', { name: 'retry book list' }).click()
  const { books: list } = await (await books).json()
  await expect(bookError).toBeHidden()
  for (const book of list) { await expect(dialog).toContainText(book.title) }
})

test('guest still sees every drive when one book count fails', async ({ page }) => {
  // 7. 🔌 one station's book count fails to load
  const drivesResponse = nextResponse(page, '/drives')
  let failingStation
  await page.route(isBookCount, async route => {
    const { drives } = await (await drivesResponse).json()
    failingStation ??= pickDrive(upcomingDrives(drives), 'upcoming drive at an MRT station', drive => drive.mrtstationid).mrtstationid
    const station = new URL(route.request().url()).searchParams.get('mrtstationids')
    return station === failingStation ? serverDown(route) : route.continue()
  })
  const drives = upcomingDrives(await openDrivesPage(page))

  const broken = drives.find(drive => drive.mrtstationid === failingStation)
  const working = pickDrive(drives, 'upcoming drive at another MRT station', drive => drive.mrtstationid && drive.mrtstationid !== failingStation)
  await expect(await showDrive(page, broken)).toContainText('— books')
  await expect(await showDrive(page, working)).not.toContainText('— books')
})
