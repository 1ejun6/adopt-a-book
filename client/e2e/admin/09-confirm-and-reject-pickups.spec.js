import {
  test, expect, goTo, TIMESLOT, badge, confirmation, dialog, field, listMain, nextList, openList, pickDate, row, rowCheckbox, rows, search, seedAdoption, shownDate, tab, toast,
} from '../support/admin.js'

const APPOINTMENTS = '/admin/appointments'
const BOOKS = '/admin/books'
const statusSelect = page => listMain(page).getByRole('combobox', { name: 'Appointment status' })
const actionButton = (page, name) => listMain(page).getByRole('group').getByRole('button', { name, exact: true })

async function openView(page, label, view) {
  const list = nextList(page, APPOINTMENTS, url => url.searchParams.get('view') === view)
  await tab(page, label).click()
  return (await list).json()
}

//@ChitanyaBharathi > journey 3.9 > the admin goes through pickup times customers proposed
test('admin confirms and rejects pickups', async ({ page, admin }) => {
  const [first, second, third] = [
    await seedAdoption(admin, 'pickup proposed', { days: 3, book: { title: 'Pickup Three Days' } }),
    await seedAdoption(admin, 'pickup proposed', { days: 5, book: { title: 'Pickup Five Days' } }),
    await seedAdoption(admin, 'pickup proposed', { days: 7, book: { title: 'Pickup Seven Days' } }),
  ]

  // 1. opens Appointments > Awaiting confirmation, 5 tabs with counts, a Collection date picker &&& no status dropdown
  const opened = await openList(page, '/admin/appointments', APPOINTMENTS)
  await expect(tab(page, 'Awaiting confirmation')).toHaveAttribute('aria-selected', 'true')
  for (const [label, key] of [['Awaiting confirmation', 'awaiting'], ["Today's pickup", 'today'], ['Upcoming', 'upcoming'], ['Overdue', 'overdue'], ['History', 'history']]) {
    await expect(page.getByRole('tab', { name: `${label} ${opened.counts[key]}` })).toBeVisible()
  }
  await expect(listMain(page).getByRole('button', { name: 'Collection date', exact: true })).toBeVisible()
  await expect(statusSelect(page)).toHaveCount(0)

  // 2. searches for their tag > 3 pickups with customer + email, book, "date · time", location &&& a pending badge
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(3)
  for (const { customer, book, appointment } of [first, second, third]) {
    const line = row(page, book.title)
    await expect(line).toContainText(customer.name)
    await expect(line).toContainText(customer.email)
    await expect(line).toContainText(`${shownDate(appointment.appointmentdate)} · ${TIMESLOT}`)
    await expect(line).toContainText(book.collectionarea)
    await expect(badge(line, 'pending confirmation')).toHaveText('pending')
  }

  // 3. picks the first pickup's date, then clears it > only that pickup, then all 3 again
  const dated = nextList(page, APPOINTMENTS, url => url.searchParams.get('date') === first.appointment.appointmentdate)
  await pickDate(page, 'Collection date', first.appointment.appointmentdate)
  await dated
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText(first.book.title)
  await listMain(page).getByRole('button', { name: 'Clear collection date' }).click()
  await expect(rows(page)).toHaveCount(3)

  // 4. clicks the first pickup > Appointment details with every field, the hint &&& both actions
  await row(page, first.book.title).click()
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(field(details, 'Customer')).toHaveText(first.customer.name)
  await expect(field(details, 'Email')).toHaveText(first.customer.email)
  await expect(field(details, 'Collection date')).toHaveText(shownDate(first.appointment.appointmentdate))
  await expect(field(details, 'Time')).toHaveText(TIMESLOT)
  await expect(field(details, 'Location')).toHaveText(first.book.collectionarea)
  await expect(details.getByText('Confirm after checking the requested date, time, and location.')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Reject appointment' })).toBeEnabled()

  // 5. Confirm appointment &&& confirm > the details repeated, then "1 appointment confirmed"; it moves to Upcoming as confirmed
  await details.getByRole('button', { name: 'Confirm appointment' }).click()
  const confirmIt = confirmation(page, 'Confirm appointment?')
  await expect(confirmIt).toContainText(`${first.customer.name} — ${first.book.title}`)
  await expect(confirmIt).toContainText(`${shownDate(first.appointment.appointmentdate)} · ${TIMESLOT} · ${first.book.collectionarea}`)
  await confirmIt.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(toast(page, '1 appointment confirmed')).toBeVisible()
  await expect(row(page, first.book.title)).toHaveCount(0)
  await openView(page, 'Upcoming', 'upcoming')
  await expect(badge(row(page, first.book.title), 'appointment confirmed')).toHaveText('confirmed')

  // 6. the second pickup > Reject appointment &&& confirm > the book stays reserved; History filtered to Rejected lists it
  await row(page, second.book.title).click()
  await details.getByRole('button', { name: 'Reject appointment' }).click()
  const rejectIt = confirmation(page, 'Reject appointment?')
  await expect(rejectIt).toContainText('The book stays reserved and the customer can propose another pickup time.')
  await rejectIt.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(toast(page, '1 appointment rejected')).toBeVisible()
  await openView(page, 'History', 'history')
  const rejected = nextList(page, APPOINTMENTS, url => url.searchParams.get('status') === 'rejected')
  await statusSelect(page).selectOption('rejected')
  await rejected
  await expect(rows(page)).toHaveCount(1)
  await expect(badge(row(page, second.book.title), 'rejected')).toBeVisible()

  // 7. the rejected pickup's book in Book Inventory > still reserved
  await goTo(page, 'Book Inventory')
  await search(page, BOOKS, second.book.title)
  await expect(badge(row(page, second.book.title), 'reserved')).toBeVisible()

  // 8. Upcoming > ticks the confirmed pickup &&& the pending one > the "Filter by…" hint &&& both buttons disabled
  await page.goBack()
  await openView(page, 'Upcoming', 'upcoming')
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(2)
  await rowCheckbox(page, first.book.title).click()
  await rowCheckbox(page, third.book.title).click()
  await expect(listMain(page).locator('p[role="status"]').filter({ hasText: 'Filter by Pending to confirm appointments, or Confirmed to mark them collected.' })).toBeVisible()
  await expect(actionButton(page, 'Confirm appointments')).toBeDisabled()
  await expect(actionButton(page, 'Mark collected')).toBeDisabled()

  // 9. filters Upcoming to Pending, ticks the pending pickup &&& Confirm appointments > "1 appointment confirmed"
  const pending = nextList(page, APPOINTMENTS, url => url.searchParams.get('status') === 'pending confirmation')
  await statusSelect(page).selectOption('pending confirmation')
  await pending
  await expect(rows(page)).toHaveCount(1)
  await rowCheckbox(page, third.book.title).click()
  await actionButton(page, 'Confirm appointments').click()
  await confirmation(page, 'Confirm appointment?').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(toast(page, '1 appointment confirmed')).toBeVisible()

  // 10. switches between tabs > the status dropdown resets &&& offers the right statuses, hidden on Awaiting \ Today's pickup
  const options = async () => (await statusSelect(page).locator('option').allTextContents()).map(text => text.trim())
  for (const [label, view, expected] of [
    ['Overdue', 'overdue', ['All statuses', 'Pending', 'Confirmed']],
    ['History', 'history', ['All statuses', 'Collected', 'Cancelled', 'Rejected']],
    ['Upcoming', 'upcoming', ['All statuses', 'Pending', 'Confirmed']],
  ]) {
    await openView(page, label, view)
    await expect(statusSelect(page)).toHaveValue('all')
    expect(await options()).toEqual(expected)
  }
  for (const [label, view] of [['Awaiting confirmation', 'awaiting'], ["Today's pickup", 'today']]) {
    await openView(page, label, view)
    await expect(statusSelect(page)).toHaveCount(0)
  }
})
