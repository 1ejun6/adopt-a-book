import { Buffer } from 'node:buffer'
import { test as base, expect } from '@playwright/test'
import { demoAdmin, serverUrl, supabaseServiceRoleKey, supabaseUrl } from './env.js'
import { callApi, deleteCustomer, logIn, registerCustomer } from './customer.js'
import { nextResponse, singaporeDate } from './guest.js'
import { createTemporaryAdmin, deleteTemporaryAdmin, demoAdminState } from './admin-session.js'

//@ChitanyaBharathi > shared setup for the admin journeys (e2e/admin) > see E2E_ADMIN_JOURNEYS.md for what each journey covers
//
//@ChitanyaBharathi > supabase rate-limits logins (429) > so logins are kept to a minimum:
//@ChitanyaBharathi > • the demo admin logs in once per run in global-setup.js &&& workers reuse its cookies
//@ChitanyaBharathi > • each worker gets one temporary admin, logged in once > a worker runs one test at a time, so no two tests share a session
//@ChitanyaBharathi > • journeys that log out (3.1, 3.14) set test.use({ ownAdmin: true }) > logging out signs that admin out everywhere
//@ChitanyaBharathi > • customers never log in > their requests, pickups &&& rsvps are written with the service key
//
//@ChitanyaBharathi > every record a journey creates carries its tag (e.g. "Tidy Shelves e2e-k3x9q2") > journeys search for their tag
//@ChitanyaBharathi > so they only ever see &&& act on their own rows, even with other journeys running at the same time

// ─── constants ─────────────────────────────────────────────────────────────

//@ChitanyaBharathi > the admin list endpoints every journey waits on
export const BOOKS = '/admin/books'
export const APPLICATIONS = '/admin/applications'
export const APPOINTMENTS = '/admin/appointments'
export const DRIVES = '/admin/drives'

export const adminNavLinks = ['Home', 'Book Inventory', 'Adoption Applications', 'Appointments', 'Drives']
export const PAGE_SIZE = 15

//@ChitanyaBharathi > customers offer three of the hourly slots (09:00–18:00) on one day &&& the admin confirms one of them
export const PICKUP_TIMES = ['10:00–11:00', '13:00–14:00', '16:00–17:00']

const titles = ['Tidy Shelves', 'Quiet Harbour', 'Paper Lanterns', 'Morning Tide', 'Silver Orchard', 'Lantern Street', 'Copper Kettle', 'Hidden Garden', 'Willow Lane', 'Amber Sky']
let titleNumber = 0
const randomTag = () => `e2e-${Math.random().toString(36).slice(2, 8)}`
const hasDemoAdmin = Boolean(demoAdmin.email && demoAdmin.password)

// ─── fixtures ──────────────────────────────────────────────────────────────

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

  //@ChitanyaBharathi > the logged-in admin a journey runs as > { id, name, email, password, tag, request }
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
      await cleanUp(admin)
      if (ownAdmin) { await deleteTemporaryAdmin(demo, account) }
    }
  },
})
export { expect }

//@ChitanyaBharathi > removes everything the journey created, found by its tag as well as by what the helpers recorded
//@ChitanyaBharathi > order matters: drives (drops their rsvps) → customers (drops their requests &&& pickups) → books
//@ChitanyaBharathi > a reserved \ adopted book refuses DELETE /admin/books on purpose, so those go straight from the database
async function cleanUp(admin) {
  const { demo, tag } = admin
  await quietly(async () => {
    const { drives } = await callApi(demo, 'GET', `${DRIVES}?view=all&limit=100&search=${tag}`)
    remember(admin.drives, drives)
  })
  await quietly(async () => {
    const { books } = await callApi(demo, 'GET', `${BOOKS}?limit=100&search=${tag}`)
    remember(admin.books, books)
  })
  for (const driveId of admin.drives) { await quietly(() => callApi(demo, 'DELETE', `${DRIVES}/${driveId}`)) }
  for (const customer of admin.customers) { await quietly(() => deleteCustomer(demo, customer.id)) }
  for (const bookId of admin.books) {
    try { await callApi(demo, 'DELETE', `${BOOKS}/${bookId}`) }
    catch { await quietly(() => database(demo, 'DELETE', `/rest/v1/books?id=eq.${bookId}`)) }
  }
}
const remember = (ids, records) => ids.push(...records.map(record => record.id).filter(id => !ids.includes(id)))

async function quietly(action) {
  try { await action() } catch { /* best-effort teardown */ }
}

// ─── setup helpers (through the api, so journeys start from a known state) ─

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
  const { book } = await callApi(admin.request, 'POST', BOOKS, body)
  admin.books.push(book.id)
  return { ...book, collectionarea: book.collectionarea || station?.name }
}

//@ChitanyaBharathi > one open, tagged drive (10 days away, room for 30) > POST only answers with a message, so read it back by title
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
  await callApi(admin.request, 'POST', DRIVES, body)
  const { drives } = await callApi(admin.request, 'GET', `${DRIVES}?view=all&search=${encodeURIComponent(body.title)}`)
  const drive = drives.find(item => item.title === body.title)
  if (!drive) { throw new Error(`created drive ${body.title} was not found`) }
  admin.drives.push(drive.id)
  return drive
}

//@ChitanyaBharathi > a fresh customer account > registered only, never logged in (deleted again after the test)
export async function newCustomer(admin, name = 'Book Reader') {
  const customer = await registerCustomer(admin.demo, `${name} ${admin.tag}`)
  admin.customers.push(customer)
  return customer
}

//@ChitanyaBharathi > the customer side goes straight to the database with the service key > no customer logins
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

//@ChitanyaBharathi > the same row POST /applications makes for a customer
export function requestBook(admin, customer, book) {
  return database(admin.demo, 'POST', '/rest/v1/adoptionapplications', { userid: customer.id, bookid: book.id })
}

export async function decideRequest(admin, application, status = 'approved') {
  await callApi(admin.request, 'PATCH', `${APPLICATIONS}/${application.id}/status`, { status })
}

//@ChitanyaBharathi > the customer offers PICKUP_TIMES on one day, n days away > same database function as POST /appointments
export function proposePickup(admin, customer, book, daysFromToday = 3) {
  const date = singaporeDate(daysFromToday)
  return database(admin.demo, 'POST', '/rest/v1/rpc/book_collection_options', {
    customer_id: customer.id, book_id: book.id, collection_location: book.collectionarea, collection_date: date,
    options: PICKUP_TIMES.map(timeslot => ({ appointmentdate: date, timeslot })),
  })
}

//@ChitanyaBharathi > the admin confirms one of the customer's times (index into PICKUP_TIMES) > same call as "Confirm selected time"
export async function confirmPickup(admin, appointment, slot = 0) {
  const { appointment: confirmed } = await callApi(admin.request, 'PATCH', `${APPOINTMENTS}/${appointment.id}`, { proposalversion: appointment.proposalversion, slot })
  return confirmed
}

//@ChitanyaBharathi > the same database function POST /drives/:id/rsvp calls for a customer
export function rsvp(admin, customer, drive) {
  return database(admin.demo, 'POST', '/rest/v1/rpc/rsvp_adoption_drive', { drive_id: drive.id, customer_id: customer.id })
}

//@ChitanyaBharathi > a tagged book plus a fresh customer, taken as far as stage:
//@ChitanyaBharathi > 'requested' → 'approved' → 'pickup proposed' (three times, `days` away) → 'pickup confirmed' (the first time)
//@ChitanyaBharathi > 'collection today' > a pickup that was confirmed earlier for today > confirming a time today only works
//@ChitanyaBharathi > before it starts, so the row is written directly &&& the journey can run at any hour
export async function seedAdoption(admin, stage, { days = 3, book: bookChanges = {}, customerName } = {}) {
  const book = await createBook(admin, bookChanges)
  const customer = await newCustomer(admin, customerName)
  const application = await requestBook(admin, customer, book)
  const result = { book, customer, application }
  if (stage === 'requested') { return result }

  await decideRequest(admin, application, 'approved')
  if (stage === 'approved') { return result }

  if (stage === 'collection today') {
    result.appointment = await database(admin.demo, 'POST', '/rest/v1/appointments', {
      userid: customer.id, bookid: book.id, booktitle: book.title, location: book.collectionarea,
      appointmentdate: singaporeDate(0), timeslot: PICKUP_TIMES.at(-1), status: 'appointment confirmed',
    })
    return result
  }

  result.appointment = await proposePickup(admin, customer, book, days)
  if (stage === 'pickup proposed') { return result }

  result.appointment = await confirmPickup(admin, result.appointment)
  return result
}

//@ChitanyaBharathi > same format as formatDate() in src/lib/date.js > e.g. "8 Nov 2026"
export function shownDate(date) {
  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' })
}

// ─── locators ──────────────────────────────────────────────────────────────

export const listMain = page => page.getByRole('main')
export const navLinks = page => page.getByRole('banner').getByRole('link').filter({ hasNotText: 'Adopt a Book' })
export const listSearch = page => listMain(page).getByRole('searchbox').first()
export const rows = page => listMain(page).locator('tbody tr')
export const row = (page, text) => rows(page).filter({ hasText: text }).first()
export const rowCheckbox = (page, text) => row(page, text).getByRole('checkbox')
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
//@ChitanyaBharathi > a list that failed to load shows this box with its own Retry button
export const loadError = page => listMain(page).getByRole('alert').filter({ has: page.getByRole('button', { name: 'Retry', exact: true }) })

//@ChitanyaBharathi > confirmations are toasts with their own buttons > find the one with this title
export const confirmation = (page, title) => toast(page, title)

// ─── page helpers ──────────────────────────────────────────────────────────

//@ChitanyaBharathi > clicks a navbar link &&& waits for that page > typing earlier would land in the previous page's search box
export async function goTo(page, link, heading = link) {
  await page.getByRole('banner').getByRole('link', { name: link, exact: true }).click()
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
}

//@ChitanyaBharathi > a details window reloads its record when it opens \ after a change, &&& is "busy" until that finishes:
//@ChitanyaBharathi > its actions are disabled &&& it hides its Close button &&& ignores Esc > wait for the Close button to come back
export async function whenIdle(details) {
  await expect(details.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
}
export async function closeDialog(page) {
  const details = dialog(page)
  await whenIdle(details)
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
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
