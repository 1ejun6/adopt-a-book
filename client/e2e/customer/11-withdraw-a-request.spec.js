import { isApi, json, toast } from '../support/guest.js'
import { test, expect, adoptionRow, availableBooks, callApi, fakeApplication } from '../support/customer.js'

//@brod > journey 2.11 > a customer inspects their pending adoption request and withdraws it
test('customer inspects a pending request and withdraws it', async ({ page, customer }) => {
  // Setup: create a real pending application through the API
  const [book] = await availableBooks(page.request, 1)
  await callApi(page.request, 'POST', '/applications', { bookid: book.id })

  // 1. opens My Adoptions
  await page.goto('/customer/adoption')
  await expect(page.getByRole('tab', { name: /Active\s+1/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Waiting\s+1/ })).toBeVisible()
  const row = adoptionRow(page, book.title)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Under review')

  // 2. clicks the row
  await row.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  await expect(dialog.getByLabel('Adoption progress')).toBeVisible()
  await expect(dialog.locator('.adoption-progress li.current')).toContainText('Request')
  await expect(dialog.getByText('Under review', { exact: true })).toBeVisible()
  const withdrawButton = dialog.getByRole('button', { name: 'Withdraw request' })
  await expect(withdrawButton).toBeVisible()

  // 3. expands Book and request information
  const bookInfo = dialog.locator('details').filter({ hasText: 'Book and request information' })
  await bookInfo.locator('summary').click()
  await expect(bookInfo.getByText('Condition')).toBeVisible()
  //@brod > exact: true distinguishes <dt>Collection area</dt> from description paragraph
  await expect(bookInfo.getByText('Collection area', { exact: true })).toBeVisible()
  await expect(bookInfo.getByRole('heading', { name: 'Book description' })).toBeVisible()

  // 5. clicks Withdraw request, then Keep request
  await withdrawButton.click()
  await expect(dialog.getByRole('heading', { name: 'Withdraw this request?' })).toBeVisible()
  await expect(dialog.getByText('You can request this book again if it is still available.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()

  // 6. clicks Withdraw request, then confirms
  await withdrawButton.click()
  const confirmButton = dialog.getByRole('button', { name: 'Withdraw request' })
  await confirmButton.click()
  await expect(dialog.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible()
  await expect(dialog.getByText('Your request has been withdrawn and moved to History.')).toBeVisible()

  // 7. clicks View in History > dialog closes so background tabs leave aria-hidden
  await dialog.getByRole('button', { name: 'View in History' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('tab', { name: /Active\s+0/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /History\s+1/ })).toBeVisible()
  const historyRow = adoptionRow(page, book.title)
  await expect(historyRow).toBeVisible()
  await expect(historyRow).toContainText('Withdrawn')
})

//@brod > 🔌 edge cases for lazy book description loading and failed withdrawal reconciliation
test.describe('🔌 withdrawal edge cases and retry', () => {
  test('book description failure can be retried', async ({ page, customer }) => {
    const fake = fakeApplication('pending')
    await page.route(isApi('/applications'), json({ adoptionapplications: [fake] }))
    await page.route(isApi(`/books/${fake.bookid.id}`), json({ error: 'service unavailable' }, 503))

    // 4. 🔌 expands Book and request information while /books/:id fails
    await page.goto('/customer/adoption')
    await adoptionRow(page, fake.bookid.title).click()
    const dialog = page.getByRole('dialog')
    const bookInfo = dialog.locator('details').filter({ hasText: 'Book and request information' })
    await bookInfo.locator('summary').click()
    await expect(bookInfo.getByRole('alert')).toContainText('We couldn’t load the book description.')

    // unroute and retry
    await page.unroute(isApi(`/books/${fake.bookid.id}`))
    await bookInfo.getByRole('button', { name: 'Retry book information' }).click()
    await expect(bookInfo.getByRole('alert')).toHaveCount(0)
  })

  test('failed withdrawal notifies customer to check status', async ({ page, customer }) => {
    const fake = fakeApplication('pending')
    await page.route(isApi('/applications'), json({ adoptionapplications: [fake] }))
    await page.route(isApi(`/applications/${fake.id}`), json({ error: 'cannot withdraw request' }, 500))

    // 8. 🔌 tries to withdraw when DELETE fails
    await page.goto('/customer/adoption')
    await adoptionRow(page, fake.bookid.title).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Withdraw request' }).click()
    await dialog.getByRole('button', { name: 'Withdraw request' }).click()

    await expect(dialog.getByRole('alert')).toContainText('Your change was not saved. You can try again.')
    await expect(dialog.getByRole('button', { name: 'Withdraw request' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Keep request' })).toBeVisible()
  })
})
