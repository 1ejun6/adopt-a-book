import { Buffer } from 'node:buffer'
import { test as base, expect } from '@playwright/test'
import { demoAdmin, serverUrl, supabaseServiceRoleKey, supabaseUrl } from './env.js'
import { callApi, deleteCustomer, logIn, registerCustomer } from './customer.js'
import { nextResponse, singaporeDate } from './guest.js'
import { createTemporaryAdmin, deleteTemporaryAdmin, demoAdminState } from './admin-session.js'

//@ChitanyaBharathi > supabase rate-limits logins (429) > so logins are kept to a minimum:
//@ChitanyaBharathi > • the demo admin logs in once per run in global-setup.js &&& workers reuse its cookies
//@ChitanyaBharathi > • each worker gets one temporary admin, logged in once > a worker runs one test at a time, so no two tests share a session
//@ChitanyaBharathi > • journeys that log out (3.1, 3.14) set test.use({ ownAdmin: true }) > logging out signs that admin out everywhere
//@ChitanyaBharathi > • customers never log in > their requests, pickups &&& rsvps are written with the service key

//@ChitanyaBharathi > the admin list endpoints every journey waits on
export const BOOKS = '/admin/books'
export const APPLICATIONS = '/admin/applications'
export const APPOINTMENTS = '/admin/appointments'
export const DRIVES = '/admin/drives'

export const adminNavLinks = ['Home', 'Book Inventory', 'Adoption Applications', 'Appointments', 'Drives']
export const PAGE_SIZE = 15
export const TIMESLOT = '10:30–11:00'
//@ChitanyaBharathi > the database refuses to confirm a pickup whose start time has passed > a pickup "today" uses a late slot
//@ChitanyaBharathi > (so journey 3.10 can't pass between 23:00 &&& midnight Singapore time)
export const TODAY_TIMESLOT = '23:00–23:30'

const titles = ['Tidy Shelves', 'Quiet Harbour', 'Paper Lanterns', 'Morning Tide', 'Silver Orchard', 'Lantern Street', 'Copper Kettle', 'Hidden Garden', 'Willow Lane', 'Amber Sky']
let titleNumber = 0
const randomTag = () => `e2e-${Math.random().toString(36).slice(2, 8)}`

//@ChitanyaBharathi > ignore failures while cleaning up > a reserved \ adopted book can't be deleted &&& that's expected
async function quietly(action) {
  try { await action() } catch { /* best-effort teardown */ }
}

const hasDemoAdmin = Boolean(demoAdmin.email && demoAdmin.password)

export const test = base.extend({
  ownAdmin: [false, { option: true }],

  //@ChitanyaBharathi > the demo admin, already logged in by global setup > only creates \ deletes admins &&& cleans up
  demo: [async ({ playwright }, use) => {
    if (!hasDemoAdmin) { await use(null); return }
    const demo = await playwright.request.newContext({ storageState: demoAdminState })
    await use(demo)
    await demo.dispose()
  }, { scope: 'worker' }],

  //@ChitanyaBharathi > this worker's temporary admin > logged in once &&& its cookies handed to every test the worker runs
  workerAdmin: [async ({ playwright, demo }, use, workerInfo) => {
    if (!demo) { await use(null); return }
    const account = await createTemporaryAdmin(demo, `w${workerInfo.workerIndex}`)
    const session = await playwright.request.newContext()
    try {
      await logIn(session, account)
      const { cookies } = await session.storageState()
      await use({ ...account, cookies })
    } finally {
      await session.dispose()
      await deleteTemporaryAdmin(demo, account)
    }
  }, { scope: 'worker' }],

  admin: async ({ page, context, demo, workerAdmin, ownAdmin }, use) => {
    test.skip(!hasDemoAdmin, 'admin journeys need e2e_admin_email and e2e_admin_password in the root .env')
    const tag = randomTag()
    let account = workerAdmin
    if (ownAdmin) {
      account = await createTemporaryAdmin(demo, tag)
      await logIn(page.request, account)
    } else {
      await context.addCookies(workerAdmin.cookies)
    }

    const admin = { ...account, tag, request: page.request, demo, books: [], drives: [], customers: [] }
    delete admin.cookies
    try {
      await use(admin)
    } finally {
      //@ChitanyaBharathi > journeys also create books \ drives through the page > find those by the journey's tag
      await quietly(async () => {
        const { books } = await callApi(demo, 'GET', `/admin/books?limit=100&search=${tag}`)
        admin.books.push(...books.map(book => book.id).filter(bookId => !admin.books.includes(bookId)))
      })
      await quietly(async () => {
        const { drives } = await callApi(demo, 'GET', `/admin/drives?view=all&limit=100&search=${tag}`)
        admin.drives.push(...drives.map(drive => drive.id).filter(driveId => !admin.drives.includes(driveId)))
      })
      //@ChitanyaBharathi > drives first (removes rsvps), then books, then customers, then the admin itself
      for (const driveId of admin.drives) { await quietly(() => callApi(demo, 'DELETE', `/admin/drives/${driveId}`)) }
      for (const bookId of admin.books) { await quietly(() => callApi(demo, 'DELETE', `/admin/books/${bookId}`)) }
      for (const customer of admin.customers) {
        await quietly(() => deleteCustomer(demo, customer.id))
      }
      if (ownAdmin) { await deleteTemporaryAdmin(demo, account) }
    }
  },
})
export { expect }

//@ChitanyaBharathi > a tagged title so the journey can search for only its own rows
export function taggedTitle(admin, base) {
  titleNumber += 1
  return `${base || titles[titleNumber % titles.length]} ${admin.tag}`
}

let stationList
export async function stations(request) {
  if (!stationList) {
    const response = await request.get(`${serverUrl}/locations/stations`)
    stationList = (await response.json()).stations
  }
  return stationList
}
//@ChitanyaBharathi > one real station every helper uses unless told otherwise
export async function defaultStation(request) {
  const list = await stations(request)
  const station = list.find(item => item.name === 'Bugis MRT') || list[0]
  if (!station) { throw new Error('the database has no MRT stations > run /base') }
  return station
}

//@ChitanyaBharathi > one available, tagged book at a real MRT station
export async function createBook(admin, changes = {}) {
  const station = changes.mrtstationid ? null : await defaultStation(admin.request)
  const { title, ...rest } = changes
  const body = {
    title: taggedTitle(admin, title),
    authors: ['E2E Author'],
    isbn: `978${String(Date.now()).slice(-9)}${titleNumber % 10}`,
    subjects: ['Fiction'],
    condition: 'good',
    description: 'Created by an admin journey.',
    mrtstationid: station?.id,
    ...rest,
  }
  const { book } = await callApi(admin.request, 'POST', '/admin/books', body)
  admin.books.push(book.id)
  return { ...book, collectionarea: book.collectionarea || station?.name }
}

//@ChitanyaBharathi > one open, tagged drive > POST only answers with a message, so read it back by title
export async function createDrive(admin, changes = {}) {
  const station = changes.mrtstationid ? null : await defaultStation(admin.request)
  const { title, ...rest } = changes
  const body = {
    title: taggedTitle(admin, title || 'Community Drive'),
    location: 'Community Hall, 1 Example Road',
    mrtstationid: station?.id,
    eventdate: singaporeDate(10),
    description: 'Created by an admin journey.',
    maxcapacity: 30,
    ...rest,
  }
  await callApi(admin.request, 'POST', '/admin/drives', body)
  const { drives } = await callApi(admin.request, 'GET', `/admin/drives?view=all&search=${encodeURIComponent(body.title)}`)
  const drive = drives.find(item => item.title === body.title)
  if (!drive) { throw new Error(`created drive ${body.title} was not found`) }
  admin.drives.push(drive.id)
  return drive
}

//@ChitanyaBharathi > customer-side setup goes straight to the database with the service key > no customer logins
async function database(request, method, path, body) {
  if (!supabaseUrl || !supabaseServiceRoleKey) { throw new Error('admin journeys need supabaseurl and supabasesecretkey in the root .env') }
  const response = await request.fetch(`${supabaseUrl}${path}`, {
    method,
    data: body,
    headers: { apikey: supabaseServiceRoleKey, authorization: `Bearer ${supabaseServiceRoleKey}`, 'content-type': 'application/json', prefer: 'return=representation' },
  })
  if (!response.ok()) { throw new Error(`${method} ${path} failed > ${response.status()} ${await response.text()}`) }
  const result = await response.json()
  return Array.isArray(result) ? result[0] : result
}

//@ChitanyaBharathi > a fresh customer account > registered only, never logged in (deleted again after the test)
export async function newCustomer(admin, name = 'Book Reader') {
  const customer = await registerCustomer(admin.demo, `${name} ${admin.tag}`)
  admin.customers.push(customer)
  return customer
}

//@ChitanyaBharathi > the same row POST /applications makes for a customer
export function requestBook(admin, customer, book) {
  return database(admin.demo, 'POST', '/rest/v1/adoptionapplications', { userid: customer.id, bookid: book.id })
}

export async function decideRequest(admin, application, status = 'approved') {
  await callApi(admin.request, 'PATCH', `/admin/applications/${application.id}/status`, { status })
}

//@ChitanyaBharathi > the same database function POST /appointments calls for a customer
export function proposePickup(admin, customer, book, daysFromToday = 3) {
  return database(admin.demo, 'POST', '/rest/v1/rpc/book_collection_appointment', {
    customer_id: customer.id, book_id: book.id, collection_location: book.collectionarea, collection_date: singaporeDate(daysFromToday),
    time_slot: daysFromToday === 0 ? TODAY_TIMESLOT : TIMESLOT,
  })
}

//@ChitanyaBharathi > the same database function POST /drives/:id/rsvp calls for a customer
export function rsvp(admin, customer, drive) {
  return database(admin.demo, 'POST', '/rest/v1/rpc/rsvp_adoption_drive', { drive_id: drive.id, customer_id: customer.id })
}

//@ChitanyaBharathi > a tagged book plus a fresh customer, taken as far as stage
//@ChitanyaBharathi > 'requested' → 'approved' → 'pickup proposed' (future) \ 'pickup today' → 'pickup confirmed'
export async function seedAdoption(admin, stage, { days = 3, book: bookChanges = {}, customerName } = {}) {
  const book = await createBook(admin, bookChanges)
  const customer = await newCustomer(admin, customerName)
  const application = await requestBook(admin, customer, book)
  const result = { book, customer, application }
  if (stage === 'requested') { return result }

  await decideRequest(admin, application, 'approved')
  if (stage === 'approved') { return result }

  result.appointment = await proposePickup(admin, customer, book, stage === 'pickup today' ? 0 : days)
  if (stage === 'pickup proposed' || stage === 'pickup today') { return result }

  await callApi(admin.request, 'PATCH', `/admin/appointments/${result.appointment.id}`, { status: 'appointment confirmed' })
  return result
}

//@ChitanyaBharathi > same format as formatDate() in src/lib/date.js > e.g. "8 Nov 2026"
export function shownDate(date) {
  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' })
}

// ---- locators ----

//@ChitanyaBharathi > AppLayout has its own <main> > admin lists render a second one inside it
export const listMain = page => page.locator('main main')
export const navLinks = page => page.getByRole('banner').getByRole('link').filter({ hasNotText: 'Adopt a Book' })
export const listSearch = page => listMain(page).getByRole('searchbox').first()
export const rows = page => listMain(page).locator('tbody tr')
export const row = (page, text) => rows(page).filter({ hasText: text }).first()
export const rowCheckbox = (page, text) => row(page, text).getByRole('checkbox')
export const selectAll = page => listMain(page).locator('thead').getByRole('checkbox')
export const tab = (page, label) => page.getByRole('tab', { name: new RegExp(`^${label}\\b`) })
export const pageCount = page => listMain(page).getByText(/^\s*\d+–\d+ of \d+ \w+\s*$/)
export const toast = (page, text) => page.locator('[data-sonner-toast]').filter({ hasText: text })
export const dialog = page => page.getByRole('dialog')
export const badge = (scope, status) => scope.locator(`[data-status="${status}"]`)
export const selectedCount = (page, count) => listMain(page).getByRole('status').filter({ hasText: `${count} selected` })
//@ChitanyaBharathi > the buttons that appear once rows are ticked (Approve, Delete, Close registration…)
export const selectionButton = (page, name) => listMain(page).getByRole('group').getByRole('button', { name, exact: true })
//@ChitanyaBharathi > the hint beside those buttons > a <p role="status"> inside the bar's own role="status", so target the <p>
export const selectionHint = (page, text) => listMain(page).locator('p[role="status"]').filter({ hasText: text })
//@ChitanyaBharathi > a list's filter dropdown, e.g. "Appointment status", "Drive status", "Application order"
export const listSelect = (page, name) => listMain(page).getByRole('combobox', { name })
export const optionsOf = async select => (await select.locator('option').allTextContents()).map(text => text.trim())
//@ChitanyaBharathi > a details window field > <dt>label</dt><dd>value</dd>
export const field = (scope, label) => scope.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]')

//@ChitanyaBharathi > confirmations are toasts with their own buttons > find the one with this title
export const confirmation = (page, title) => toast(page, title)
export async function confirm(page, title, action) {
  const box = confirmation(page, title)
  await expect(box).toBeVisible()
  await box.getByRole('button', { name: action, exact: true }).click()
  await expect(box).toBeHidden()
}

// ---- page helpers ----

//@ChitanyaBharathi > clicks a navbar link &&& waits for that page > typing earlier would land in the previous page's search box
export async function goTo(page, link, heading = link) {
  await page.getByRole('banner').getByRole('link', { name: link, exact: true }).click()
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
}

//@ChitanyaBharathi > opens an admin list &&& returns the first response
export async function openList(page, path, endpoint) {
  const response = nextResponse(page, endpoint)
  await page.goto(path)
  return (await response).json()
}

//@ChitanyaBharathi > types into the list search &&& waits for the server to answer that search
export async function search(page, endpoint, text) {
  const response = nextResponse(page, endpoint, url => (url.searchParams.get('search') || '') === text)
  await listSearch(page).fill(text)
  return (await response).json()
}

//@ChitanyaBharathi > clicks a list tab &&& waits for that tab's list > filter is the query it should send, e.g. { status: 'approved' } \ { view: 'past' }
export async function openTab(page, endpoint, label, filter) {
  const [[key, value]] = Object.entries(filter)
  const list = nextList(page, endpoint, url => url.searchParams.get(key) === value)
  await tab(page, label).click()
  return (await list).json()
}

//@ChitanyaBharathi > waits for the next list response after an action
export function nextList(page, endpoint, check = () => true) {
  return nextResponse(page, endpoint, url => url.searchParams.has('page') && check(url))
}

//@ChitanyaBharathi > the date picker is a calendar popover > move forward a month at a time until the day shows
export async function pickDate(page, label, date) {
  await page.getByRole('button', { name: label, exact: true }).click()
  const popover = page.locator('[data-reka-popper-content-wrapper]')
  const day = popover.locator(`[data-value="${date}"]:not([data-outside-view])`)
  for (let month = 0; month < 12 && !(await day.count()); month++) {
    await popover.getByRole('button', { name: 'Next month' }).click()
  }
  await day.click()
  await expect(popover).toBeHidden()
}

//@ChitanyaBharathi > small images for the cover field > built in memory so no binary files live in the repo
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
export const coverFiles = {
  png: { name: 'cover.png', mimeType: 'image/png', buffer: pngBytes },
  gif: { name: 'cover.gif', mimeType: 'image/gif', buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') },
  //@ChitanyaBharathi > a real png header padded past 5 MB > the size check runs before the image is decoded
  huge: { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.concat([pngBytes, Buffer.alloc(6 * 1024 * 1024)]) },
}
