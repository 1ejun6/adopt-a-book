import { test, expect } from '@playwright/test'
import { bookSpines, openHomepage, stubGoogleMaps } from '../support/guest.js'

//@ChitanyaBharathi > journey 1.1 > a first-time visitor looks through the shelf &&& reads about a book
test('guest browses the bookshelf and reads about a book', async ({ page, context }) => {
  await stubGoogleMaps(context)

  // 1. opens the website for the first time
  const books = await openHomepage(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Different shelves')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Shared stories')
  expect(books).toHaveLength(5)
  for (const [index, book] of books.entries()) {
    await expect(bookSpines(page).nth(index).getByRole('heading', { level: 2 })).toHaveText(book.title)
  }

  // 2. hovers the mouse over a spine
  const firstSpine = bookSpines(page).nth(0)
  await firstSpine.hover()
  await expect(firstSpine.locator('.book-preview')).toBeVisible()
  await expect(firstSpine.locator('.book-preview')).toContainText(books[0].title)

  // 3. moves to another spine
  const secondSpine = bookSpines(page).nth(1)
  await secondSpine.hover()
  await expect(firstSpine.locator('.book-preview')).toBeHidden()
  await expect(secondSpine.locator('.book-preview')).toBeVisible()

  // 4. clicks a spine
  await secondSpine.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expect(dialog).toContainText(books[1].title)
  await expect(dialog.getByText('condition', { exact: true })).toBeVisible()
  if (books[1].isbn) { await expect(dialog).toContainText(books[1].isbn) }
  if (books[1].publicationyear) { await expect(dialog).toContainText(String(books[1].publicationyear)) }

  // 5. clicks the collection point
  const collection = books[1].collectionarea || books[1].mrtstation?.name
  if (collection) {
    const mapLink = dialog.getByRole('link', { name: collection })
    await expect(mapLink).toHaveAttribute('target', '_blank')
    await expect(mapLink).toHaveAttribute('href', /google\.com\/maps/)
    const [mapsTab] = await Promise.all([context.waitForEvent('page'), mapLink.click()])
    await expect(mapsTab).toHaveURL(/google\.com\/maps/)
    await mapsTab.close()
    await expect(page).toHaveURL('/')
  }

  // 6. presses Esc
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // 7. uses only the keyboard to open another book
  await bookSpines(page).nth(2).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(books[2].title)

  // 8. closes it with ✕
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
})
