import {
  test, expect, closeDialog, APPOINTMENTS, badge, BOOKS, confirmation, dialog, field, goTo, listMain, listSelect, nextList, openList, openTab, optionsOf, PICKUP_TIMES,
  pickDate, row, rowCheckbox, rows, search, seedAdoption, selectionButton, selectionHint, shownDate, tab, toast,
} from '../support/admin.js'

//@ChitanyaBharathi > the "Confirm a time" panel in Appointment details > one radio per time the customer offered
const timeChoice = (details, timeslot) => details.getByRole('radio', { name: new RegExp(`${timeslot} SGT`) })
const PICKED = PICKUP_TIMES[1]
const CONFIRMED_TOAST = 'Pickup confirmed. The customer can view the selected time in My Adoptions.'

//@ChitanyaBharathi > picks one of the customer's times in the open details window &&& confirms it
async function confirmTime(page, details, timeslot) {
  await timeChoice(details, timeslot).check()
  await details.getByRole('button', { name: 'Confirm selected time' }).click()
  await expect(toast(page, CONFIRMED_TOAST)).toBeVisible()
  await expect(badge(details, 'appointment confirmed')).toBeVisible()
}

//@ChitanyaBharathi > journey 3.9 > the admin goes through the pickup times customers proposed
test('admin confirms and rejects pickups', async ({ page, admin }) => {
  // setup > three customers, each offering the same three times on a day 3, 5 \ 7 days away
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
  await expect(listSelect(page, 'Appointment status')).toHaveCount(0)

  // 2. searches for their tag > 3 pickups with customer + email, book, "date · Three times proposed", location &&& pending
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(3)
  for (const { customer, book, appointment } of [first, second, third]) {
    const line = row(page, book.title)
    await expect(line).toContainText(customer.name)
    await expect(line).toContainText(customer.email)
    await expect(line).toContainText(`${shownDate(appointment.appointmentdate)} · Three times proposed`)
    await expect(line).toContainText(book.collectionarea)
    await expect(badge(line, 'pending confirmation')).toHaveText('pending')
    await expect(line).toContainText('Select a proposed time')
  }

  // 3. picks the first pickup's date, then clears it > only that pickup, then all 3 again
  const dated = nextList(page, APPOINTMENTS, url => url.searchParams.get('date') === first.appointment.appointmentdate)
  await pickDate(page, 'Collection date', first.appointment.appointmentdate)
  await dated
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText(first.book.title)
  await listMain(page).getByRole('button', { name: 'Clear collection date' }).click()
  await expect(rows(page)).toHaveCount(3)

  // 4. clicks the first pickup > Appointment details with every field &&& the customer's three times to choose from
  await row(page, first.book.title).click()
  const details = dialog(page)
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(field(details, 'Customer')).toHaveText(first.customer.name)
  await expect(field(details, 'Email')).toHaveText(first.customer.email)
  await expect(field(details, 'Collection date')).toHaveText(shownDate(first.appointment.appointmentdate))
  await expect(field(details, 'Time')).toHaveText('Choose from the three times below')
  await expect(field(details, 'Location')).toHaveText(first.book.collectionarea)
  await expect(details.getByRole('group', { name: 'Confirm a time' })).toBeVisible()
  for (const timeslot of PICKUP_TIMES) { await expect(timeChoice(details, timeslot)).toBeEnabled() }
  await expect(details.getByRole('button', { name: 'Confirm selected time' })).toBeDisabled()
  await expect(details.getByRole('button', { name: 'Reject', exact: true })).toBeEnabled()

  // 5. picks the middle time &&& confirms > the toast, the record turns confirmed at that time; it moves to Upcoming
  const confirmed = nextList(page, APPOINTMENTS)
  await confirmTime(page, details, PICKED)
  await confirmed
  await expect(field(details, 'Time')).toHaveText(PICKED)
  await closeDialog(page)
  await expect(row(page, first.book.title)).toHaveCount(0)
  await openTab(page, APPOINTMENTS, 'Upcoming', { view: 'upcoming' })
  await expect(badge(row(page, first.book.title), 'appointment confirmed')).toHaveText('confirmed')
  await expect(row(page, first.book.title)).toContainText(`${shownDate(first.appointment.appointmentdate)} · ${PICKED}`)

  // 6. the second pickup > Reject &&& confirm > "the book stays reserved…", "1 appointment rejected"; History → Rejected lists it
  await row(page, second.book.title).click()
  await details.getByRole('button', { name: 'Reject', exact: true }).click()
  const rejectIt = confirmation(page, 'Reject appointment?')
  await expect(rejectIt).toContainText('The book stays reserved and the customer can propose another pickup time.')
  await rejectIt.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(toast(page, '1 appointment rejected')).toBeVisible()
  await expect(badge(details, 'rejected')).toBeVisible()
  await closeDialog(page)
  await openTab(page, APPOINTMENTS, 'History', { view: 'history' })
  const rejected = nextList(page, APPOINTMENTS, url => url.searchParams.get('status') === 'rejected')
  await listSelect(page, 'Appointment status').selectOption('rejected')
  await rejected
  await expect(rows(page)).toHaveCount(1)
  await expect(badge(row(page, second.book.title), 'rejected')).toBeVisible()

  // 7. the rejected pickup's book in Book Inventory > still reserved for that customer
  await goTo(page, 'Book Inventory')
  await search(page, BOOKS, second.book.title)
  await expect(badge(row(page, second.book.title), 'reserved')).toBeVisible()

  // 8. Upcoming > ticks the confirmed pickup &&& the pending one > the "Filter by…" hint &&& both buttons disabled
  await page.goBack()
  await openTab(page, APPOINTMENTS, 'Upcoming', { view: 'upcoming' })
  await search(page, APPOINTMENTS, admin.tag)
  await expect(rows(page)).toHaveCount(2)
  await rowCheckbox(page, first.book.title).click()
  await rowCheckbox(page, third.book.title).click()
  await expect(selectionHint(page, 'Filter by Pending to confirm appointments, or Confirmed to mark them collected.')).toBeVisible()
  await expect(selectionButton(page, 'Confirm')).toBeDisabled()
  await expect(selectionButton(page, 'Mark collected')).toBeDisabled()

  // 9. filters Upcoming to Pending &&& ticks the pending pickup > proposals can't be confirmed in bulk, the hint says to open it;
  //    opening it &&& choosing a time confirms it
  const pending = nextList(page, APPOINTMENTS, url => url.searchParams.get('status') === 'pending confirmation')
  await listSelect(page, 'Appointment status').selectOption('pending confirmation')
  await pending
  await expect(rows(page)).toHaveCount(1)
  await rowCheckbox(page, third.book.title).click()
  await expect(selectionHint(page, 'Open the appointment and select one of the customer’s available times.')).toBeVisible()
  await expect(selectionButton(page, 'Confirm')).toBeDisabled()
  await row(page, third.book.title).click()
  await confirmTime(page, details, PICKUP_TIMES[0])
  await closeDialog(page)

  // 10. switches between tabs > the status dropdown resets &&& offers the right statuses, hidden on Awaiting \ Today's pickup
  for (const [label, view, expected] of [
    ['Overdue', 'overdue', ['All statuses', 'Pending', 'Confirmed']],
    ['History', 'history', ['All statuses', 'Collected', 'Cancelled', 'Rejected']],
    ['Upcoming', 'upcoming', ['All statuses', 'Pending', 'Confirmed']],
  ]) {
    await openTab(page, APPOINTMENTS, label, { view })
    await expect(listSelect(page, 'Appointment status')).toHaveValue('all')
    expect(await optionsOf(listSelect(page, 'Appointment status'))).toEqual(expected)
  }
  for (const [label, view] of [['Awaiting confirmation', 'awaiting'], ["Today's pickup", 'today']]) {
    await openTab(page, APPOINTMENTS, label, { view })
    await expect(listSelect(page, 'Appointment status')).toHaveCount(0)
  }
})
