import { expect } from '@playwright/test'
import { serverUrl } from './env.js'

//@ChitanyaBharathi > journeys never assume which drives \ books exist > they read what the server sends &&& check against that

//@ChitanyaBharathi > Bugis MRT coordinates > used for "use current location"
export const bugisLocation = { latitude: 1.3009, longitude: 103.8559 }

export const DRIVES_PER_PAGE = 10

//@ChitanyaBharathi > one matcher per path > page.unroute() only removes a route when given the same function
const matchers = new Map()
export function isApi(path) {
  if (!matchers.has(path)) {
    matchers.set(path, url => url.origin === serverUrl && url.pathname === path)
  }
  return matchers.get(path)
}

//@ChitanyaBharathi > page.route() handler that answers with json instead of the real server
export function json(body, status = 200) {
  return route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

//@ChitanyaBharathi > waits for the next response from our server at this path
export function nextResponse(page, path, check = () => true) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    return isApi(path)(url) && check(url)
  })
}

//@ChitanyaBharathi > records every request the page sends to our server
export function trackApiRequests(page) {
  const requests = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.origin === serverUrl) { requests.push({ method: request.method(), path: url.pathname, query: url.searchParams }) }
  })
  return {
    requests,
    to: path => requests.filter(request => request.path === path),
    clear: () => { requests.length = 0 },
  }
}

//@ChitanyaBharathi > YYYY-MM-DD n days from today in Singapore > same format the app compares
export function singaporeDate(daysFromToday, from = new Date()) {
  const date = new Date(from.getTime() + daysFromToday * 24 * 60 * 60 * 1000)
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

//@ChitanyaBharathi > the same split the drives page makes > past = before today in Singapore
export function upcomingDrives(drives, today = singaporeDate(0)) {
  return drives.filter(drive => drive.eventdate >= today)
}
export function pastDrives(drives, today = singaporeDate(0)) {
  return drives.filter(drive => drive.eventdate < today)
}

//@ChitanyaBharathi > the same order the drives page uses > date first, id breaks ties
export function sortDrives(drives, direction = 'asc') {
  const sign = direction === 'asc' ? 1 : -1
  return [...drives].sort((a, b) => a.eventdate.localeCompare(b.eventdate) * sign || a.id.localeCompare(b.id))
}

//@ChitanyaBharathi > the same search the drives page does > title, venue \ mrt name
export function matchesSearch(drive, text) {
  const search = text.trim().toLowerCase()
  return [drive.title, drive.location, drive.mrtstation?.name || ''].some(value => value.toLowerCase().includes(search))
}

//@ChitanyaBharathi > picks a real drive for a journey > fails clearly when the database has none
export function pickDrive(drives, description, check) {
  const drive = drives.find(check)
  if (!drive) { throw new Error(`the database has no ${description} > add one or seed the database`) }
  return drive
}
export const isRsvpable = drive => drive.status === 'open' && drive.mrtstationid && drive.spotsleft > 0

let fakeId = 0
//@ChitanyaBharathi > a made-up drive for 🔌 journeys > shaped like a /drives response item
export function fakeDrive(changes = {}) {
  fakeId += 1
  const id = `00000000-0000-4000-8000-${String(fakeId).padStart(12, '0')}`
  return {
    id,
    title: `fake drive ${fakeId}`,
    location: 'Bugis MRT',
    eventdate: singaporeDate(10 + fakeId),
    description: 'made up for testing',
    maxcapacity: 30,
    spotsleft: 30,
    status: 'open',
    mrtstationid: '00000000-0000-4000-8000-0000000000aa',
    mrtstation: { id: '00000000-0000-4000-8000-0000000000aa', name: 'Bugis MRT', codes: ['EW12'] },
    ...changes,
  }
}

//@ChitanyaBharathi > 🔌 replaces /drives &&& the book lookups so a journey sees exactly these drives
export async function serveFakeDrives(page, drives, bookTotal = 3) {
  await page.route(isApi('/drives'), json({ drives }))
  await page.route(isApi('/books'), json({
    books: Array.from({ length: bookTotal }, (_, index) => ({ id: `fake-book-${index}`, title: `fake book ${index}`, authors: ['someone'] })),
    total: bookTotal,
  }))
}

//@ChitanyaBharathi > opens /drives &&& returns every drive the server sent
export async function openDrivesPage(page) {
  const response = nextResponse(page, '/drives')
  await page.goto('/drives')
  const { drives } = await (await response).json()
  await expect(foundCount(page, upcomingDrives(drives).length)).toBeVisible()
  return drives
}

export const driveCards = page => page.getByRole('main').getByRole('button').filter({ has: page.locator('h3') })
export const driveCard = (page, title) => driveCards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) }).first()
export const driveTitles = page => driveCards(page).locator('h3')
export const foundCount = (page, count) => page.getByText(new RegExp(`^\\s*${count}\\s+adoption\\s+drives\\s+found\\s*$`))
export const driveSearch = page => page.getByRole('searchbox', { name: 'search', exact: true })
export const locationBox = page => page.getByRole('searchbox', { name: 'location', exact: true })
export const statusSelect = page => page.locator('select[title="adoption drive status"]')
export const sortSelect = page => page.locator('select[title="sort adoption drives by date"]')
export const toast = (page, text) => page.locator('[data-sonner-toast]').filter({ hasText: text })

//@ChitanyaBharathi > the list shows 10 per page > a drive may be on page 3 > search its title so it's on page 1
export async function showDrive(page, drive) {
  await driveSearch(page).fill(drive.title)
  await expect(driveCard(page, drive.title)).toBeVisible()
  return driveCard(page, drive.title)
}

//@ChitanyaBharathi > checks the list shows exactly these drives (first page) &&& the right "found" count
export async function expectDrivesShown(page, drives, direction = 'asc') {
  await expect(foundCount(page, drives.length)).toBeVisible()
  const firstPage = sortDrives(drives, direction).slice(0, DRIVES_PER_PAGE).map(drive => drive.title)
  await expect(driveTitles(page)).toHaveText(firstPage)
}

export const bookSpines = page => page.locator('.book-spine')

//@ChitanyaBharathi > waits for the shelf books &&& returns what the server sent
export async function openHomepage(page) {
  const response = nextResponse(page, '/books')
  await page.goto('/')
  const { books } = await (await response).json()
  await expect(bookSpines(page)).toHaveCount(books.length)
  return books
}

//@ChitanyaBharathi > google maps links are checked without leaving for the real site
export async function stubGoogleMaps(context) {
  await context.route('https://www.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>maps</title>' }))
}

export const guestNavLinks = ['Browse Books', 'Adoption Drives', 'Login', 'Create Account']
