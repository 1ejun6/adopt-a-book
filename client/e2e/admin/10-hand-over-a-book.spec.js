import { isApi, json, nextResponse, singaporeDate } from '../support/guest.js'
import { logIn } from '../support/customer.js'
import {
  test, expect, closeDialog, APPOINTMENTS, badge, BOOKS, confirmation, dialog, field, goTo, listMain, openList, openTab, PICKUP_TIMES,
  row, rows, search, seedAdoption, tab, toast,
} from '../support/admin.js'

//@ChitanyaBharathi > the dashboard previews the first few records of each queue > older data could crowd this journey's pickup out
//@ChitanyaBharathi > so the dashboard's "today" request is narrowed to the journey's tag (the card counts don't depend on search)
async function narrowTodayTo(page, tag) {
  await page.route(isApi(APPOINTMENTS), async route => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('view') === 'today') { url.searchParams.set('search', tag) }
    await route.continue({ url: url.href })
  })
}

//@ChitanyaBharathi > journey 3.10 > a customer turns up for their confirmed pickup today &&& the admin hands the book over
test('admin hands a book over on collection day', async ({ page, browser, admin }) => {
  // setup > a request approved &&& a pickup confirmed earlier for today, at the last offered time
  const { book, customer } = await seedAdoption(admin, 'collection today', { book: { title: 'Collected Today' } })
  const time = PICKUP_TIMES.at(-1)

  // 1. Appointments → Today's pickup > the pickup is listed as confirmed, &&& this tab has no date picker
  await openList(page, '/admin/appointments', APPOINTMENTS)
  await openTab(page, APPOINTMENTS, "Today's pickup", { view: 'today' })
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(1)
  await expect(badge(row(page, book.title), 'appointment confirmed')).toBeVisible()
  await expect(row(page, book.title)).toContainText(time)
  await expect(listMain(page).getByRole('button', { name: 'Collection date', exact: true })).toHaveCount(0)

  // 2. the dashboard > Today's pickups lists it with Customer: &&& Time/Location:, and the Pickups today card matches the server
  await narrowTodayTo(page, admin.tag)
  const todayList = nextResponse(page, APPOINTMENTS, url => url.searchParams.get('view') === 'today')
  await page.goto('/admin')
  const { counts } = await (await todayList).json()
  expect(counts.today).toBeGreaterThanOrEqual(1)
  await expect(page.getByRole('link', { name: `Pickups today: ${counts.today}` })).toBeVisible()
  const pickup = page.getByRole('link', { name: `View appointment for ${customer.name}: ${book.title}` })
  await expect(pickup).toContainText(`Customer: ${customer.name}`)
  await expect(pickup).toContainText(`Time/Location: ${time} @ ${book.collectionarea}`)

  // 3. clicks it > Appointments on Today's pickup with its details open &&& the collection reminder
  await pickup.click()
  await expect(tab(page, "Today's pickup")).toHaveAttribute('aria-selected', 'true')
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(field(details, 'Customer')).toHaveText(customer.name)
  await expect(field(details, 'Time')).toHaveText(time)
  await expect(details.getByText('Mark collected only after the customer has physically received the book.')).toBeVisible()

  // 4. Mark collected &&& confirm > "the copy will become adopted", then "1 appointment marked collected";
  //    the window refreshes to the collected record with no actions left, &&& History lists it
  await details.getByRole('button', { name: 'Mark collected' }).click()
  const collect = confirmation(page, 'Mark appointment collected?')
  await expect(collect).toContainText('The copy will become adopted.')
  await collect.getByRole('button', { name: 'Mark collected' }).click()
  await expect(toast(page, '1 appointment marked collected')).toBeVisible()
  await expect(badge(details, 'collected')).toBeVisible()
  for (const name of ['Mark collected', 'Confirm', 'Reject']) {
    await expect(details.getByRole('button', { name, exact: true })).toHaveCount(0)
  }
  await closeDialog(page)
  await search(page, APPOINTMENTS, admin.tag)
  await openTab(page, APPOINTMENTS, 'History', { view: 'history' })
  await expect(badge(row(page, book.title), 'collected')).toBeVisible()

  // 5. Book Inventory → Adopted > the book is adopted, can't be ticked, &&& Edit is disabled
  await goTo(page, 'Book Inventory')
  await openTab(page, BOOKS, 'Adopted', { status: 'adopted' })
  await search(page, BOOKS, book.title)
  await expect(badge(row(page, book.title), 'adopted')).toBeVisible()
  await expect(listMain(page).getByRole('checkbox')).toHaveCount(0)
  await row(page, book.title).click()
  await expect(dialog(page).getByRole('button', { name: 'Edit' })).toBeDisabled()

  // 6. (as the customer, in a second browser) My Adoptions → History > the book is Collected
  const customerContext = await browser.newContext()
  try {
    const customerPage = await customerContext.newPage()
    await logIn(customerPage.request, customer)
    await customerPage.goto('/customer/adoptions')
    await customerPage.getByRole('tab', { name: /^History\b/ }).click()
    const entry = customerPage.locator('button.adoption-row').filter({ hasText: book.title })
    await expect(entry).toBeVisible()
    await expect(entry).toContainText('Collected')
  } finally {
    await customerContext.close()
  }
})

// 7. 🔌 a pending pickup whose time has already passed > it's overdue, "No future pickup time…" &&& Confirm disabled, Reject not
test('🔌 a pending pickup whose time has passed cannot be confirmed', async ({ page, admin }) => {
  const id = '00000000-0000-4000-c000-00000000e2e0'
  const appointment = {
    id, _id: id,
    userid: '00000000-0000-4000-b000-000000000001', bookid: '00000000-0000-4000-a000-00000000e2e0',
    booktitle: `Missed Pickup ${admin.tag}`, location: 'Bugis MRT', appointmentdate: singaporeDate(-1), timeslot: PICKUP_TIMES[0],
    status: 'pending confirmation', pickupoptions: [], optionsby: null, customer: 'Late Reader', email: 'late@example.com',
    book: { id: '00000000-0000-4000-a000-00000000e2e0', title: `Missed Pickup ${admin.tag}`, authors: ['Someone'], status: 'reserved' },
  }
  //@ChitanyaBharathi > the list &&& the details window both read this made-up record
  await page.route(isApi(APPOINTMENTS), json({
    appointments: [appointment], total: 1, today: singaporeDate(0),
    counts: { awaiting: 0, today: 0, upcoming: 0, overdue: 1, history: 0 },
  }))
  await page.route(isApi(`${APPOINTMENTS}/${id}`), json({ appointment }))
  await page.goto('/admin/appointments')
  await expect(row(page, appointment.booktitle)).toContainText('Needs attention: no future pickup time or incomplete details')
  await row(page, appointment.booktitle).click()
  const details = dialog(page)
  await expect(details.getByText('No future pickup time is available, or details are incomplete. Ask the customer to reschedule.')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await expect(details.getByRole('button', { name: 'Reject', exact: true })).toBeEnabled()
})
