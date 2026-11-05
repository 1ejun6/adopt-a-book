import { isApi, json, nextResponse } from '../support/guest.js'
import { slowly } from '../support/customer.js'
import { test, expect, closeDialog, APPLICATIONS, APPOINTMENTS, DRIVES, seedAdoption, tab, toast } from '../support/admin.js'

//@ChitanyaBharathi > the four summary cards &&& the four "Needs attention" tabs, as the dashboard labels them
const CARDS = { requests: 'Requests awaiting review', awaiting: 'Pickups awaiting confirmation', today: 'Pickups today', overdue: 'Overdue pickups' }
const TABS = { overdue: 'Overdue', awaiting: 'Confirm pickups', requests: 'Requests', drives: 'Next drive' }

const card = (page, label, count) => page.getByRole('link', { name: `${label}: ${count}` })
const anyCard = (page, label) => page.getByRole('link', { name: new RegExp(`^${label}: \\d+$`) })
const panel = page => page.getByRole('tabpanel')
const forView = view => url => url.searchParams.get('view') === view

//@ChitanyaBharathi > opens the dashboard, waits for every request &&& returns the counts each card \ tab should show
async function openDashboard(page) {
  const responses = [
    nextResponse(page, APPLICATIONS),
    nextResponse(page, DRIVES),
    nextResponse(page, APPOINTMENTS, forView('today')),
    nextResponse(page, APPOINTMENTS, forView('overdue')),
    nextResponse(page, APPOINTMENTS, forView('awaiting')),
  ]
  await page.goto('/admin')
  const [applications, drives, today, overdue, awaiting] = await Promise.all(responses.map(async response => (await response).json()))
  return {
    applications, drives, today, overdue, awaiting,
    counts: { requests: applications.counts.pending, awaiting: awaiting.total, today: today.counts.today, overdue: overdue.total, drives: drives.total },
  }
}

//@ChitanyaBharathi > journey 3.2 > the admin starts the day on the dashboard &&& jumps to the waiting work
test('admin reads the dashboard and jumps to the waiting work', async ({ page, admin }) => {
  // setup > one request awaiting review &&& one pickup awaiting confirmation, so both queues have a record
  await seedAdoption(admin, 'requested')
  await seedAdoption(admin, 'pickup proposed', { days: 3 })

  // 1. opens Home > the cards say "Loading" first, then the date in Singapore time &&& 4 cards with the server's counts
  await page.route(isApi(APPLICATIONS), slowly(800), { times: 1 })
  const dashboard = openDashboard(page)
  await expect(card(page, CARDS.requests, 'Loading')).toBeVisible()
  const { counts, drives, awaiting, overdue, applications } = await dashboard
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expect(page.getByText('Singapore time')).toBeVisible()
  await expect(page.locator('time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
  expect(counts.requests).toBeGreaterThanOrEqual(1)
  expect(counts.awaiting).toBeGreaterThanOrEqual(1)
  for (const [key, label] of Object.entries(CARDS)) {
    await expect(card(page, label, counts[key])).toBeVisible()
  }

  // 2. Needs attention > 4 tabs, each carrying the same count as its card
  const tabList = page.getByRole('tablist', { name: 'Attention queues' })
  for (const [key, label] of Object.entries(TABS)) {
    await expect(tabList.getByRole('tab', { name: `${label} ${counts[key]}` })).toBeVisible()
  }

  // 3. clicks across the 4 tabs > the first record, "· 1 of N" &&& how the queue is ordered
  const queues = [
    { label: TABS.overdue, order: 'Oldest collection date first', count: counts.overdue, first: overdue.appointments[0]?.booktitle, empty: 'No overdue pickups.' },
    { label: TABS.awaiting, order: 'Earliest proposed time first', count: counts.awaiting, first: awaiting.appointments[0]?.booktitle },
    { label: TABS.requests, order: 'Oldest request first', count: counts.requests, first: applications.adoptionapplications[0]?.bookid.title },
    { label: TABS.drives, order: 'Earliest event first', count: counts.drives, first: drives.drives[0]?.title, empty: 'No upcoming drives.' },
  ]
  //@ChitanyaBharathi > overdue pickups \ upcoming drives depend on everyone's data > a queue may be empty, so both outcomes are checked
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

  // 4. Confirm pickups → Review proposal > Appointments on "Awaiting confirmation" with that record already open
  await tab(page, TABS.awaiting).click()
  await panel(page).getByRole('link', { name: 'Review proposal' }).click()
  await expect(page).toHaveURL('/admin/appointments')
  await expect(tab(page, 'Awaiting confirmation')).toHaveAttribute('aria-selected', 'true')
  const details = page.getByRole('dialog')
  await expect(details.getByRole('heading', { name: 'Appointment details' })).toBeVisible()
  await expect(details).toContainText(awaiting.appointments[0].booktitle)
  await closeDialog(page)

  //@ChitanyaBharathi > other journeys run at the same time &&& move these counts > after going back, match the card by label only
  // 5. back → Requests awaiting review card > Adoption applications on the Pending tab
  await page.goBack()
  await anyCard(page, CARDS.requests).click()
  await expect(page).toHaveURL('/admin/applications')
  await expect(tab(page, 'Pending')).toHaveAttribute('aria-selected', 'true')

  // 6. back → Pickups today card > Appointments on "Today's pickup"
  await page.goBack()
  await anyCard(page, CARDS.today).click()
  await expect(page).toHaveURL('/admin/appointments')
  await expect(tab(page, "Today's pickup")).toHaveAttribute('aria-selected', 'true')

  // 7. back → Today's pickups lists up to 5 confirmed pickups (or says none) &&& View all opens "Today's pickup"
  const { today } = await openDashboard(page)
  //@ChitanyaBharathi > last() > the dashboard's own <section> contains this one too
  const todays = page.locator('section', { has: page.getByRole('heading', { name: "Today's pickups" }) }).last()
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
  // 8. every queue empty > each tab says its empty message &&& every card shows 0
  test('empty queues show their empty messages', async ({ page, admin }) => {
    const empty = { total: 0, counts: { pending: 0, awaiting: 0, today: 0, overdue: 0, upcoming: 0 } }
    await page.route(isApi(APPLICATIONS), json({ ...empty, adoptionapplications: [] }))
    await page.route(isApi(DRIVES), json({ ...empty, drives: [] }))
    await page.route(isApi(APPOINTMENTS), json({ ...empty, appointments: [] }))
    await page.goto('/admin')

    for (const label of Object.values(CARDS)) {
      await expect(card(page, label, 0)).toBeVisible()
    }
    for (const [label, message] of [
      [TABS.overdue, 'No overdue pickups.'],
      [TABS.awaiting, 'No pickups awaiting confirmation.'],
      [TABS.requests, 'No pending adoption requests.'],
      [TABS.drives, 'No upcoming drives.'],
    ]) {
      await tab(page, label).click()
      await expect(panel(page)).toContainText(message)
    }
    await expect(page.getByText('No pickups today.')).toBeVisible()
  })

  // 9. /admin/drives is down > a toast with retry, "—" &&& "Queue preview unavailable." (never a false 0); retry fills it in
  test('a failed queue says unavailable and retry fills it in', async ({ page, admin }) => {
    await page.route(isApi(DRIVES), json({ error: 'could not load drives' }, 503))
    await page.goto('/admin')
    const failed = toast(page, 'could not load drives')
    await expect(failed).toBeVisible()
    await expect(page.getByRole('tab', { name: `${TABS.drives} —` })).toBeVisible()
    await tab(page, TABS.drives).click()
    await expect(panel(page)).toContainText('Queue preview unavailable.')
    await expect(anyCard(page, CARDS.requests)).toBeVisible()

    await page.unroute(isApi(DRIVES))
    const drives = nextResponse(page, DRIVES)
    await failed.getByRole('button', { name: 'retry' }).click()
    const { total } = await (await drives).json()
    await expect(page.getByRole('tab', { name: `${TABS.drives} ${total}` })).toBeVisible()
    await expect(panel(page)).not.toContainText('Queue preview unavailable.')
  })
})
