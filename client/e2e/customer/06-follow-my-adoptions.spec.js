import { isApi, json, nextResponse } from '../support/guest.js'
import { test, expect, adoptionRow, adoptionRows, adoptionSection, fakeApplication, fakeAppointment } from '../support/customer.js'

const history = ['rejected', 'withdrawn', 'cancelled', 'collected', 'completed']
const daysAgo = days => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

//@ChitanyaBharathi > journey 2.6 > the seeded demo customer has approved requests > checks what to do next
test('customer with approved requests checks their next step', async ({ page, demoCustomer }) => {
  // 1. opens My Adoptions
  const response = nextResponse(page, '/applications')
  await page.goto('/customer/adoption')
  const { adoptionapplications } = await (await response).json()
  const approved = adoptionapplications.filter(application => application.status === 'approved')
  if (!approved.length) { throw new Error('the demo customer has no approved requests > seed the database') }
  //@brod > accessible tab names format as "Active N" and "History N" without parentheses
  await expect(page.getByRole('tab', { name: /^Active\s+\d+/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^History\s+\d+/ })).toBeVisible()

  // 2. looks at an active adoption row
  const rows = adoptionRows(page)
  await expect(rows.first()).toBeVisible()

  // 3. clicks a row to open details
  const firstTitle = (await rows.first().locator('strong').textContent() || '').trim()
  await rows.first().click()
  const dialog = page.getByRole('dialog')
  //@brod > dialog title uses DialogTitle which renders an h1 heading
  await expect(dialog.getByRole('heading').first()).toBeVisible()
  if (firstTitle) {
    await expect(dialog).toContainText(firstTitle)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 4. opens the History tab
  await page.getByRole('tab', { name: /^History\s+\d+/ }).click()
  await expect(page.getByRole('tab', { name: /^History\s+\d+/ })).toHaveAttribute('data-state', 'active')
})

//@brod > 🔌 statuses the seed can't make > uses mockCustomer fixture to avoid unnecessary DB account registrations
test.describe('🔌 requests the seed does not have', () => {
  // 5. has one request in each status
  test('each status lands in the right section', async ({ page, mockCustomer }) => {
    const apps = ['pending', 'approved', 'rejected', 'withdrawn'].map(status => fakeApplication(status))
    const collectedApp = fakeApplication('approved', {
      bookid: { id: '00000000-0000-4000-a000-000000000999', title: 'collected book 5', authors: ['someone'], status: 'reserved' },
    })
    const collectedApt = fakeAppointment('collected', {
      bookid: collectedApp.bookid.id,
      userid: collectedApp.userid.id,
      appointmentdate: '2025-01-01',
    })
    apps.push(collectedApp)

    await page.route(isApi('/applications'), json({ adoptionapplications: apps }))
    await page.route(isApi('/appointments'), json({ appointments: [collectedApt] }))
    await page.goto('/customer/adoption')

    await expect(page.getByRole('tab', { name: /Active\s+2/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /History\s+3/ })).toBeVisible()
    await expect(adoptionSection(page, 'Arrange a pickup')).toContainText('approved book')

    await page.getByRole('tab', { name: /Waiting/ }).click()
    await expect(adoptionSection(page, 'Waiting for book approval')).toContainText('pending book')

    await page.getByRole('tab', { name: /History/ }).click()
    const past = adoptionRows(page)
    await expect(past).toHaveCount(3)
    for (const [title, label] of [['rejected book', 'Not approved'], ['withdrawn book', 'Withdrawn'], ['collected book', 'Collected']]) {
      await expect(adoptionRow(page, title)).toContainText(label)
    }
  })

  // 6. has requests from different days
  test('each section lists newest first', async ({ page, mockCustomer }) => {
    const apps = [
      fakeApplication('pending', { createdat: daysAgo(10), bookid: { id: 'b1', title: 'oldest request', authors: [] } }),
      fakeApplication('pending', { createdat: daysAgo(1), bookid: { id: 'b2', title: 'newest request', authors: [] } }),
      fakeApplication('pending', { createdat: daysAgo(5), bookid: { id: 'b3', title: 'middle request', authors: [] } }),
    ]
    await page.route(isApi('/applications'), json({ adoptionapplications: apps }))
    await page.route(isApi('/appointments'), json({ appointments: [] }))
    await page.goto('/customer/adoption')

    //@brod > wait for rows to finish rendering before reading text contents
    await expect(adoptionRows(page)).toHaveCount(3)
    const titles = await adoptionRows(page).locator('strong').allTextContents()
    expect(titles.map(t => t.trim())).toEqual(['newest request', 'middle request', 'oldest request'])
  })

  // 7. has a request whose book was deleted
  test('a request without its book still shows', async ({ page, mockCustomer }) => {
    await page.route(isApi('/applications'), json({ adoptionapplications: [fakeApplication('pending', { bookid: null })] }))
    await page.route(isApi('/appointments'), json({ appointments: [] }))
    await page.goto('/customer/adoption')

    const row = adoptionRows(page).first()
    await expect(row).toContainText('Book details unavailable')
    await row.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  })
})
