import { expect } from '@playwright/test'
import { serverUrl } from './env.js'

//@ChitanyaBharathi > drives created by sql/seed.sql > all open &&& upcoming
export const seededDrives = {
  dhobyGhaut: { title: 'Community Book Swap', venue: 'Dhoby Ghaut MRT' },
  bugis: { title: 'Weekend Book Adoption', venue: 'Bugis MRT' },
  cityHall: { title: 'Neighbourhood Reading Day', venue: 'City Hall MRT' },
  tampines: { title: 'Books for Everyone', venue: 'Tampines MRT' },
  bishan: { title: 'Library Friends Meetup', venue: 'Bishan MRT' },
}
export const seededDriveTitlesByDate = [
  seededDrives.dhobyGhaut.title,
  seededDrives.bugis.title,
  seededDrives.cityHall.title,
  seededDrives.tampines.title,
  seededDrives.bishan.title,
]

//@ChitanyaBharathi > Bugis MRT coordinates > used for "use current location"
export const bugisLocation = { latitude: 1.3009, longitude: 103.8559 }

//@ChitanyaBharathi > true only for requests to our express server at this exact path
export function isApi(path) {
  return url => url.origin === serverUrl && url.pathname === path
}

//@ChitanyaBharathi > page.route() handler that answers with json instead of the real server
export function json(body, status = 200) {
  return route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
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

//@ChitanyaBharathi > opens /drives &&& returns the real drives the server sent
export async function openDrivesPage(page) {
  const response = page.waitForResponse(response => isApi('/drives')(new URL(response.url())))
  await page.goto('/drives')
  const { drives } = await (await response).json()
  return drives
}

export const driveCards = page => page.getByRole('main').getByRole('button').filter({ has: page.locator('h3') })
export const driveCard = (page, title) => driveCards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) })
export const driveTitles = page => driveCards(page).locator('h3')
export const foundCount = (page, count) => page.getByText(new RegExp(`^\\s*${count}\\s+adoption\\s+drives\\s+found\\s*$`))
export const driveSearch = page => page.getByRole('searchbox', { name: 'search', exact: true })
export const locationBox = page => page.getByRole('searchbox', { name: 'location', exact: true })
export const statusSelect = page => page.locator('select[title="adoption drive status"]')
export const sortSelect = page => page.locator('select[title="sort adoption drives by date"]')
export const toast = (page, text) => page.locator('[data-sonner-toast]').filter({ hasText: text })

export const bookSpines = page => page.locator('.book-spine')

//@ChitanyaBharathi > waits for the 5 shelf books &&& returns what the server sent
export async function openHomepage(page) {
  const response = page.waitForResponse(response => isApi('/books')(new URL(response.url())))
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
