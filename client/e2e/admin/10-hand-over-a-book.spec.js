import { isApi, json, singaporeDate } from '../support/guest.js'
import { logIn } from '../support/customer.js'
import {
  test, expect, goTo, TODAY_TIMESLOT, badge, confirmation, dialog, field, listMain, nextList, openList, row, rows, search, seedAdoption, tab, toast,
} from '../support/admin.js'

const APPOINTMENTS = '/admin/appointments'
const BOOKS = '/admin/books'

//@ChitanyaBharathi > the dashboard previews the first record of each queue > older seed data could come first
//@ChitanyaBharathi > so these dashboard requests are narrowed to the journey's tag (the counts are unaffected by search)
async function narrowDashboardTo(page, tag) {
  await page.route(isApi(APPOINTMENTS), async route => {
    const url = new URL(route.request().url())
    if (['overdue', 'today'].includes(url.searchParams.get('view'))) { url.searchParams.set('search', tag) }
    await route.continue({ url: url.href })
  })
}

async function openView(page, label, view) {
  const list = nextList(page, APPOINTMENTS, url => url.searchParams.get('view') === view)
  await tab(page, label).click()
  return (await list).json()
}

//@ChitanyaBharathi > journey 3.10 > a customer turns up today &&& the admin follows the pickup through to adopted
test('admin hands a book over on collection day', async ({ page, browser, admin }) => {
  const { book, customer } = await seedAdoption(admin, 'pickup today', { book: { title: 'Collected Today' } })

  // 1. Appointments → Overdue > today's unconfirmed pickup is here, not in Awaiting confirmation
  await openList(page, '/admin/appointments', APPOINTMENTS)
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(0)
  await openView(page, 'Overdue', 'overdue')
  await expect(rows(page)).toHaveCount(1)
  await expect(badge(row(page, book.title), 'pending confirmation')).toBeVisible()

  // 2. the dashboard's Overdue tab > "Collection due today and awaiting confirmation."
  await narrowDashboardTo(page, admin.tag)
  await page.goto('/admin')
  await tab(page, 'Overdue').click()
  await expect(page.getByRole('tabpanel')).toContainText(book.title)
  await expect(page.getByRole('tabpanel')).toContainText('Collection due today and awaiting confirmation.')

  // 3. back to Appointments &&& confirms it > "1 appointment confirmed"; it moves to Today's pickup (no date picker there)
  await goTo(page, 'Appointments')
  await openView(page, 'Overdue', 'overdue')
  await search(page, APPOINTMENTS, admin.tag)
  await row(page, book.title).click()
  await dialog(page).getByRole('button', { name: 'Confirm appointment' }).click()
  await confirmation(page, 'Confirm appointment?').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(toast(page, '1 appointment confirmed')).toBeVisible()
  await openView(page, "Today's pickup", 'today')
  await expect(badge(row(page, book.title), 'appointment confirmed')).toBeVisible()
  await expect(listMain(page).getByRole('button', { name: 'Collection date', exact: true })).toHaveCount(0)

  // 4. the dashboard > Today's pickups lists it with Customer: &&& Time/Location:, and the Pickups today card matches the server
  const today = page.waitForResponse(response => {
    const url = new URL(response.url())
    return isApi(APPOINTMENTS)(url) && url.searchParams.get('view') === 'today'
  })
  await page.goto('/admin')
  const { counts } = await (await today).json()
  expect(counts.today).toBeGreaterThanOrEqual(1)
  await expect(page.getByRole('link', { name: `Pickups today: ${counts.today}` })).toBeVisible()
  const pickup = page.getByRole('link', { name: `View appointment for ${customer.name}: ${book.title}` })
  await expect(pickup).toContainText(`Customer: ${customer.name}`)
  await expect(pickup).toContainText(`Time/Location: ${TODAY_TIMESLOT} @ ${book.collectionarea}`)

  // 5. clicks it > Appointments on Today's pickup with its details open &&& the collection hint
  await pickup.click()
  await expect(tab(page, "Today's pickup")).toHaveAttribute('aria-selected', 'true')
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(field(details, 'Customer')).toHaveText(customer.name)
  await expect(details.getByText('Mark collected only after the customer has physically received the book.')).toBeVisible()

  // 6. Mark collected &&& confirm > "the copy will become adopted", then "1 appointment marked collected"; History lists it, read only
  await details.getByRole('button', { name: 'Mark collected' }).click()
  const collect = confirmation(page, 'Mark appointment collected?')
  await expect(collect).toContainText('The copy will become adopted.')
  await collect.getByRole('button', { name: 'Mark collected' }).click()
  await expect(toast(page, '1 appointment marked collected')).toBeVisible()
  await search(page, APPOINTMENTS, admin.tag)
  await openView(page, 'History', 'history')
  await expect(badge(row(page, book.title), 'collected')).toBeVisible()
  await row(page, book.title).click()
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  for (const name of ['Mark collected', 'Confirm appointment', 'Reject appointment']) {
    await expect(details.getByRole('button', { name })).toHaveCount(0)
  }
  await page.keyboard.press('Escape')

  // 7. Book Inventory → Adopted > the book is adopted, no checkbox &&& Edit disabled
  await goTo(page, 'Book Inventory')
  const adopted = nextList(page, BOOKS, url => url.searchParams.get('status') === 'adopted')
  await tab(page, 'Adopted').click()
  await adopted
  await search(page, BOOKS, book.title)
  await expect(badge(row(page, book.title), 'adopted')).toBeVisible()
  await expect(listMain(page).getByRole('checkbox')).toHaveCount(0)
  await row(page, book.title).click()
  await expect(dialog(page).getByRole('button', { name: 'Edit' })).toBeDisabled()

  // 8. (as the customer, in a second browser) My Adoptions → History > the book is Collected
  const customerContext = await browser.newContext()
  try {
    const customerPage = await customerContext.newPage()
    await logIn(customerPage.request, customer)
    await customerPage.goto('/customer/adoption')
    await customerPage.getByRole('tab', { name: /^History\s+\d+/ }).click()
    const entry = customerPage.locator('button.adoption-row').filter({ hasText: book.title })
    await expect(entry).toBeVisible()
    await expect(entry).toContainText('Collected')
  } finally {
    await customerContext.close()
  }
})

// 9. 🔌 a pending pickup dated in the past > "Past appointments cannot be confirmed…", Confirm disabled, Reject not
test('🔌 a past pending pickup cannot be confirmed', async ({ page, admin }) => {
  const yesterday = singaporeDate(-1)
  const appointment = {
    id: '00000000-0000-4000-c000-00000000e2e0', _id: '00000000-0000-4000-c000-00000000e2e0',
    userid: '00000000-0000-4000-b000-000000000001', bookid: '00000000-0000-4000-a000-00000000e2e0',
    booktitle: `Missed Pickup ${admin.tag}`, location: 'Bugis MRT', appointmentdate: yesterday, timeslot: '10:30–11:00',
    status: 'pending confirmation', customer: 'Late Reader', email: 'late@example.com',
    book: { id: '00000000-0000-4000-a000-00000000e2e0', title: `Missed Pickup ${admin.tag}`, authors: ['Someone'], status: 'reserved' },
  }
  await page.route(isApi(APPOINTMENTS), json({
    appointments: [appointment], total: 1, today: singaporeDate(0),
    counts: { awaiting: 0, today: 0, upcoming: 0, overdue: 1, history: 0 },
  }))
  await page.goto('/admin/appointments')
  await row(page, appointment.booktitle).click()
  const details = dialog(page)
  await expect(details.getByText('Past appointments cannot be confirmed. The customer needs to reschedule.')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Confirm appointment' })).toBeDisabled()
  await expect(details.getByRole('button', { name: 'Reject appointment' })).toBeEnabled()
})
