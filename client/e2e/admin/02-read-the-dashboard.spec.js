import { isApi, json, nextResponse } from '../support/guest.js'
import { slowly } from '../support/customer.js'
import { test, expect, seedAdoption, tab, toast } from '../support/admin.js'

const card = (page, label, count) => page.getByRole('link', { name: `${label}: ${count}` })
const panel = page => page.getByRole('tabpanel')
const forView = view => url => url.searchParams.get('view') === view

//@ChitanyaBharathi > waits for every dashboard request &&& returns the counts each card \ tab should show
async function openDashboard(page) {
  const responses = [
    nextResponse(page, '/admin/applications'),
    nextResponse(page, '/admin/drives'),
    nextResponse(page, '/admin/appointments', forView('today')),
    nextResponse(page, '/admin/appointments', forView('overdue')),
    nextResponse(page, '/admin/appointments', forView('awaiting')),
  ]
  await page.goto('/admin')
  const [applications, drives, today, overdue, awaiting] = await Promise.all(responses.map(async response => (await response).json()))
  return {
    applications, drives, today, overdue, awaiting,
    counts: { requests: applications.counts.pending, awaiting: awaiting.total, today: today.counts.today, overdue: overdue.total, drives: drives.total },
  }
}

//@ChitanyaBharathi > journey 3.2 > the admin starts the day on the dashboard
test('admin reads the dashboard and jumps to the waiting work', async ({ page, admin }) => {
  // setup > one request awaiting review &&& one pickup awaiting confirmation, so both queues have a record
  await seedAdoption(admin, 'requested')
  await seedAdoption(admin, 'pickup proposed', { days: 3 })

  // 1. opens Home > date in Singapore time, loading placeholders, then 4 cards with the server's counts
  await page.route(isApi('/admin/applications'), slowly(800))
  const dashboard = openDashboard(page)
  await expect(page.getByRole('status', { name: 'Loading attention queue' }).first()).toBeAttached()
  const { counts, drives, awaiting, overdue, applications } = await dashboard
  await page.unroute(isApi('/admin/applications'))
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expect(page.getByText('Singapore time')).toBeVisible()
  await expect(page.locator('time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
  expect(counts.requests).toBeGreaterThanOrEqual(1)
  expect(counts.awaiting).toBeGreaterThanOrEqual(1)
  await expect(card(page, 'Requests awaiting review', counts.requests)).toBeVisible()
  await expect(card(page, 'Pickups awaiting confirmation', counts.awaiting)).toBeVisible()
  await expect(card(page, 'Pickups today', counts.today)).toBeVisible()
  await expect(card(page, 'Overdue pickups', counts.overdue)).toBeVisible()

  // 2. Needs attention > 4 tabs each carry the same count as their card
  const tabList = page.getByRole('tablist', { name: 'Attention queues' })
  await expect(tabList.getByRole('tab', { name: `Overdue ${counts.overdue}` })).toBeVisible()
  await expect(tabList.getByRole('tab', { name: `Pickup confirmations ${counts.awaiting}` })).toBeVisible()
  await expect(tabList.getByRole('tab', { name: `Adoption requests ${counts.requests}` })).toBeVisible()
  await expect(tabList.getByRole('tab', { name: `Upcoming drive ${counts.drives}` })).toBeVisible()

  // 3. clicks across the 4 tabs > first record, "· 1 of N" &&& how the queue is ordered
  const queues = [
    { label: 'Overdue', order: 'Oldest collection date first', count: counts.overdue, first: overdue.appointments[0]?.booktitle, empty: 'No overdue pickups.' },
    { label: 'Pickup confirmations', order: 'Earliest proposed time first', count: counts.awaiting, first: awaiting.appointments[0]?.booktitle },
    { label: 'Adoption requests', order: 'Oldest request first', count: counts.requests, first: applications.adoptionapplications[0]?.bookid.title },
    { label: 'Upcoming drive', order: 'Earliest event first', count: counts.drives, first: drives.drives[0]?.title, empty: 'No upcoming drives.' },
  ]
  for (const queue of queues) {
    await tab(page, queue.label).click()
    if (queue.count) {
      await expect(panel(page)).toContainText(`${queue.order} · 1 of ${queue.count}`)
      await expect(panel(page)).toContainText(queue.first)
    } else {
      await expect(panel(page)).toContainText(queue.empty)
    }
  }
  const drive = drives.drives[0]
  if (drive) {
    await expect(panel(page)).toContainText(drive.location)
    await expect(panel(page)).toContainText(`${drive.userids.length} / ${drive.maxcapacity} registrations`)
    await expect(panel(page).locator(`[data-status="${drive.status}"]`)).toBeVisible()
    await expect(panel(page).locator(`time[datetime="${drive.eventdate}"]`)).toBeVisible()
  }

  // 4. Pickup confirmations > Review proposal > appointments on Awaiting confirmation with that record open
  await tab(page, 'Pickup confirmations').click()
  await panel(page).getByRole('link', { name: 'Review proposal' }).click()
  await expect(page).toHaveURL('/admin/appointments')
  await expect(tab(page, 'Awaiting confirmation')).toHaveAttribute('aria-selected', 'true')
  const details = page.getByRole('dialog')
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(details).toContainText(awaiting.appointments[0].booktitle)
  await page.keyboard.press('Escape')

  //@ChitanyaBharathi > other journeys run at the same time &&& move these counts > after going back, match the card by label only
  // 5. back > Requests awaiting review card > applications on the Pending tab
  await page.goBack()
  await page.getByRole('link', { name: /^Requests awaiting review: \d+$/ }).click()
  await expect(page).toHaveURL('/admin/applications')
  await expect(tab(page, 'Pending')).toHaveAttribute('aria-selected', 'true')

  // 6. back > Pickups today card > appointments on Today's pickup
  await page.goBack()
  await page.getByRole('link', { name: /^Pickups today: \d+$/ }).click()
  await expect(page).toHaveURL('/admin/appointments')
  await expect(tab(page, "Today's pickup")).toHaveAttribute('aria-selected', 'true')

  // 7. back > Today's pickups lists up to 5 confirmed pickups ||| says none &&& View all opens Today's pickup
  const { today } = await openDashboard(page)
  const todays = page.locator('section', { has: page.getByRole('heading', { name: "Today's pickups" }) })
  const pickups = todays.getByRole('link', { name: /^View appointment for/ })
  await expect(todays.getByRole('status')).toHaveCount(0)
  if (today.appointments.length) {
    await expect(pickups).toHaveCount(today.appointments.length)
    expect(today.appointments.length).toBeLessThanOrEqual(5)
    await expect(pickups.first()).toContainText('Customer:')
    await expect(pickups.first()).toContainText('Time/Location:')
  } else {
    await expect(todays.getByText('No pickups today.')).toBeVisible()
  }
  await todays.getByRole('link', { name: "View all today's pickups" }).click()
  await expect(tab(page, "Today's pickup")).toHaveAttribute('aria-selected', 'true')
})

test.describe('🔌 dashboard states the real data cannot produce', () => {
  // 8. empty queues > each tab says its empty message &&& the cards show 0
  test('empty queues show their empty messages', async ({ page, admin }) => {
    const empty = { total: 0, counts: { pending: 0, awaiting: 0, today: 0, overdue: 0, upcoming: 0 } }
    await page.route(isApi('/admin/applications'), json({ ...empty, adoptionapplications: [] }))
    await page.route(isApi('/admin/drives'), json({ ...empty, drives: [] }))
    await page.route(isApi('/admin/appointments'), json({ ...empty, appointments: [] }))
    await page.goto('/admin')

    for (const label of ['Requests awaiting review', 'Pickups awaiting confirmation', 'Pickups today', 'Overdue pickups']) {
      await expect(card(page, label, 0)).toBeVisible()
    }
    for (const [label, message] of [
      ['Overdue', 'No overdue pickups.'],
      ['Pickup confirmations', 'No pickups awaiting confirmation.'],
      ['Adoption requests', 'No pending adoption requests.'],
      ['Upcoming drive', 'No upcoming drives.'],
    ]) {
      await tab(page, label).click()
      await expect(panel(page)).toContainText(message)
    }
    await expect(page.getByText('No pickups today.')).toBeVisible()
  })

  // 9. /admin/drives is down > toast with retry, "—" &&& "Queue preview unavailable." (not a false 0), retry fills it in
  test('a failed queue says unavailable and retry fills it in', async ({ page, admin }) => {
    await page.route(isApi('/admin/drives'), json({ error: 'could not load drives' }, 503))
    await page.goto('/admin')
    const failed = toast(page, 'could not load drives')
    await expect(failed).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Upcoming drive —' })).toBeVisible()
    await tab(page, 'Upcoming drive').click()
    await expect(panel(page)).toContainText('Queue preview unavailable.')
    await expect(page.getByRole('link', { name: /^Requests awaiting review: \d+$/ })).toBeVisible()

    await page.unroute(isApi('/admin/drives'))
    const drives = nextResponse(page, '/admin/drives')
    await failed.getByRole('button', { name: 'retry' }).click()
    const { total } = await (await drives).json()
    await expect(page.getByRole('tab', { name: `Upcoming drive ${total}` })).toBeVisible()
    await expect(panel(page)).not.toContainText('Queue preview unavailable.')
  })
})
