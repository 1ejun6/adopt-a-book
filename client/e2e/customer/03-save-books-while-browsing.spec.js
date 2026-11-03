import { toast } from '../support/guest.js'
import { test, expect, bookCard, bookCards, openBrowseBooks, saveButton, uniqueTitles } from '../support/customer.js'

const savedToast = (page, title) => page.locator('[data-sonner-toast]').filter({ hasText: 'saved to watchlist' }).filter({ hasText: title })

//@ChitanyaBharathi > journey 2.3 > a customer bookmarks books they like &&& leaves a note on one
test('customer saves books while browsing', async ({ page, customer }) => {
  const { books } = await openBrowseBooks(page)
  const [first, second, third] = uniqueTitles(books, 3)

  // 1. clicks the bookmark on a book card
  const firstSave = saveButton(bookCard(page, first.title))
  await expect(firstSave).toBeEnabled()
  await firstSave.click()
  await expect(firstSave).toHaveAttribute('aria-pressed', 'true')
  const firstToast = savedToast(page, first.title)
  await expect(firstToast).toBeVisible()

  // 2. types a comment &&& presses save
  await firstToast.getByPlaceholder('optional comment').fill('ask about the cover')
  await firstToast.getByRole('button', { name: 'save' }).click()
  await expect(toast(page, 'comment saved')).toBeVisible()
  await expect(firstToast).toBeHidden()

  // 3. bookmarks a second book &&& closes the toast without typing
  const secondSave = saveButton(bookCard(page, second.title))
  await secondSave.click()
  const secondToast = savedToast(page, second.title)
  await expect(secondToast).toBeVisible()
  await secondToast.getByRole('button', { name: 'dismiss' }).click()
  await expect(secondToast).toBeHidden()
  await expect(secondSave).toHaveAttribute('aria-pressed', 'true')

  // 4. opens a third book's details &&& saves it inside the window
  await bookCard(page, third.title).click()
  const dialog = page.getByRole('dialog', { name: 'Book details' })
  await expect(dialog).toContainText(third.title)
  const dialogSave = dialog.getByRole('button', { name: 'save to watchlist' })
  await dialogSave.click()
  await expect(dialog.getByRole('button', { name: 'remove from watchlist' })).toHaveAttribute('aria-pressed', 'true')
  //@ChitanyaBharathi > the toast holds focus until it's gone > Esc before that only closes the toast
  await savedToast(page, third.title).getByRole('button', { name: 'dismiss' }).click()
  await expect(savedToast(page, third.title)).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const thirdSave = saveButton(bookCard(page, third.title))
  await expect(thirdSave).toHaveAttribute('aria-pressed', 'true')

  // 5. clicks a filled bookmark
  await thirdSave.click()
  await expect(toast(page, 'removed from watchlist')).toBeVisible()
  await expect(thirdSave).toHaveAttribute('aria-pressed', 'false')

  // 6. opens Watchlist
  await page.getByRole('banner').getByRole('link', { name: 'Watchlist' }).click()
  await expect(page.getByText('2 saved books')).toBeVisible()
  await expect(bookCards(page)).toHaveCount(2)
  await expect(bookCard(page, first.title)).toBeVisible()
  await expect(bookCard(page, second.title)).toBeVisible()

  // 7. goes back to Browse Books
  await page.getByRole('banner').getByRole('link', { name: 'Browse Books' }).click()
  await expect(saveButton(bookCard(page, first.title))).toHaveAttribute('aria-pressed', 'true')
  await expect(saveButton(bookCard(page, second.title))).toHaveAttribute('aria-pressed', 'true')
  await expect(saveButton(bookCard(page, third.title))).toHaveAttribute('aria-pressed', 'false')
})
