import { test, expect, availableBooks, bookCard, callApi } from '../support/customer.js'

//@brod > journey 2.15 > a customer decides to adopt a book saved on their watchlist
test('customer adopts a book directly from their watchlist and follows it in my adoptions', async ({ page, customer }) => {
  // Setup: pick an available book and save it to the watchlist with a private note
  const [book] = await availableBooks(page.request, 1)
  await callApi(page.request, 'POST', '/watchlist', { bookid: book.id, comments: 'ready to adopt this weekend' })

  const details = page.getByRole('dialog', { name: 'Book details' })
  const requestDialog = page.getByRole('dialog', { name: 'Request this book' })
  const sentDialog = page.getByRole('dialog', { name: 'Adoption request sent' })

  // 1. opens Watchlist and verifies the saved book and note
  await page.goto('/customer/watchlist')
  await expect(page.getByText('1 saved book', { exact: true })).toBeVisible()
  const card = bookCard(page, book.title)
  await expect(card).toBeVisible()
  const collection = book.collectionarea || book.mrtstation?.name
  if (collection) {
    await expect(card).toContainText(`collection: ${collection}`)
  }

  // 2. clicks the card to inspect details
  await card.click()
  await expect(details).toBeVisible()
  await expect(details.getByRole('heading', { name: 'Your private note' })).toBeVisible()
  await expect(details).toContainText('ready to adopt this weekend')
  await expect(details.getByText('Available to request')).toBeVisible()
  const requestButton = details.getByRole('button', { name: 'Request this book' })
  await expect(requestButton).toBeEnabled()

  // 3. clicks Request this book to open the nested request modal
  await requestButton.click()
  await expect(details).toBeHidden()
  await expect(requestDialog).toBeVisible()
  await expect(requestDialog.getByRole('heading', { name: 'Request this book' })).toBeVisible()
  await expect(requestDialog.locator('section[aria-label="Requesting as"]')).toContainText(customer.email)

  // 4. clicks Send adoption request
  await requestDialog.getByRole('button', { name: 'Send adoption request' }).click()
  await expect(sentDialog.getByRole('heading', { name: 'Adoption request sent' })).toBeVisible()
  await expect(sentDialog.getByText('Under review')).toBeVisible()
  const viewRequestLink = sentDialog.getByRole('link', { name: 'View my request' })
  await expect(viewRequestLink).toBeVisible()
  //@brod > wait for tracking refresh so the deep-link carries ?request=<id>
  await expect(viewRequestLink).toHaveAttribute('href', /\/customer\/adoption\?request=/)

  // 5. clicks View my request to follow the deep-link into My Adoptions
  await viewRequestLink.click()
  //@brod > the page consumes ?request= once the dialog opens > the href check above covers the deep-link
  await expect(page).toHaveURL(/\/customer\/adoption/)
  const adoptionDialog = page.getByRole('dialog')
  await expect(adoptionDialog.getByRole('heading', { name: 'Adoption details' })).toBeVisible()
  await expect(adoptionDialog).toContainText(book.title)
  await expect(adoptionDialog.getByRole('button', { name: 'Withdraw request' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(adoptionDialog).toBeHidden()

  // 6. returns to Watchlist and verifies the card now shows the existing request status
  await page.goto('/customer/watchlist')
  await bookCard(page, book.title).click()
  await expect(details).toBeVisible()
  await expect(details.getByText('You already have a request for this book.')).toBeVisible()
  await expect(details.getByRole('link', { name: 'View my request' })).toBeVisible()
  await expect(details.getByRole('button', { name: 'Request this book' })).toHaveCount(0)
})
