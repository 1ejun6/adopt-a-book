import { isApi, json, nextResponse } from '../support/guest.js'
import { test, expect, adoptionSection, fakeApplication } from '../support/customer.js'

const history = ['rejected', 'withdrawn', 'cancelled', 'collected', 'completed']
const daysAgo = days => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

//@ChitanyaBharathi > journey 2.6 > the seeded demo customer has approved requests > checks what to do next
test('customer with approved requests checks their next step', async ({ page, demoCustomer }) => {
  // 1. opens My Adoptions
  const response = nextResponse(page, '/applications')
  await page.goto('/customer/adoptions')
  const { adoptionapplications } = await (await response).json()
  const approved = adoptionapplications.filter(application => application.status === 'approved')
  const past = adoptionapplications.filter(application => history.includes(application.status))
  if (!approved.length) { throw new Error('the demo customer has no approved requests > seed the database') }
  await expect(page.getByRole('tab', { name: `Active (${adoptionapplications.length - past.length})` })).toBeVisible()
  await expect(page.getByRole('tab', { name: `History (${past.length})` })).toBeVisible()
  const nextStep = adoptionSection(page, 'Your Next Step').locator('article')
  await expect(nextStep).toHaveCount(approved.length)
  for (const application of approved) {
    await expect(nextStep.filter({ hasText: application.bookid.title })).toContainText('Approved')
  }

  // 2. looks at an approved card
  const card = nextStep.filter({ hasText: approved[0].bookid.title })
  await expect(card.getByRole('button', { name: 'Arrange Pickup' })).toBeDisabled()
  await expect(card.getByRole('button', { name: 'View Book' })).toBeVisible()
  await expect(card).toContainText('pickup scheduling is not available yet')

  // 3. clicks View Book
  await card.getByRole('button', { name: 'View Book' }).click()
  const dialog = page.getByRole('dialog', { name: 'Book details' })
  await expect(dialog).toContainText(approved[0].bookid.title)
  await expect(dialog.getByRole('button', { name: 'request', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // 4. opens the History tab
  await page.getByRole('tab', { name: /History/ }).click()
  await expect(page.getByText('No adoption history yet')).toHaveCount(past.length ? 0 : 1)
})

//@ChitanyaBharathi > 🔌 statuses the seed can't make > a fresh account sees exactly these applications
test.describe('🔌 requests the seed does not have', () => {
  // 5. has one request in each status
  test('each status lands in the right section', async ({ page, customer }) => {
    const apps = ['pending', 'approved', 'rejected', 'withdrawn', 'collected'].map(status => fakeApplication(status))
    await page.route(isApi('/applications'), json({ adoptionapplications: apps }))
    await page.goto('/customer/adoptions')

    await expect(page.getByRole('tab', { name: 'Active (2)' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'History (3)' })).toBeVisible()
    await expect(adoptionSection(page, 'Awaiting Approval')).toContainText('pending book')
    await expect(adoptionSection(page, 'Your Next Step')).toContainText('approved book')

    await page.getByRole('tab', { name: /History/ }).click()
    const past = adoptionSection(page, 'Adoption History').locator('article')
    await expect(past).toHaveCount(3)
    for (const [title, label] of [['rejected book', 'Rejected'], ['withdrawn book', 'Withdrawn'], ['collected book', 'Collected']]) {
      await expect(past.filter({ hasText: title })).toContainText(label)
    }
  })

  // 6. has requests from different days
  test('each section lists newest first', async ({ page, customer }) => {
    const apps = [
      fakeApplication('pending', { createdat: daysAgo(10), bookid: { id: 'b1', title: 'oldest request', authors: [] } }),
      fakeApplication('pending', { createdat: daysAgo(1), bookid: { id: 'b2', title: 'newest request', authors: [] } }),
      fakeApplication('pending', { createdat: daysAgo(5), bookid: { id: 'b3', title: 'middle request', authors: [] } }),
    ]
    await page.route(isApi('/applications'), json({ adoptionapplications: apps }))
    await page.goto('/customer/adoptions')

    await expect(adoptionSection(page, 'Awaiting Approval').locator('article strong'))
      .toHaveText(['newest request', 'middle request', 'oldest request'])
  })

  // 7. has a request whose book was deleted
  test('a request without its book still shows', async ({ page, customer }) => {
    await page.route(isApi('/applications'), json({ adoptionapplications: [fakeApplication('pending', { bookid: null })] }))
    await page.goto('/customer/adoptions')

    const card = adoptionSection(page, 'Awaiting Approval').locator('article')
    await expect(card).toContainText('book details unavailable')
    await expect(card.getByRole('button', { name: 'View Book' })).toHaveCount(0)
  })
})
