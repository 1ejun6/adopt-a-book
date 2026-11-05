import { devices } from '@playwright/test'
import { test, expect, adminNavLinks, confirmation, listMain, search, seedAdoption } from '../support/admin.js'

//@ChitanyaBharathi > journey 3.14 > phone-sized screen with touch > same setup as journeys 1.7 &&& 2.10
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']
//@ChitanyaBharathi > this journey logs out, which signs the admin out everywhere > it gets an admin of its own
test.use({ ...pixel5, ownAdmin: true })

//@ChitanyaBharathi > fails when the box spills past either side of the screen
async function expectFitsScreen(page, locator) {
  const box = await locator.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1)
}

test('admin checks requests on their phone', async ({ page, admin }) => {
  const { customer } = await seedAdoption(admin, 'requested', { book: { title: 'Phone Request' } })
  await seedAdoption(admin, 'pickup proposed', { book: { title: 'Phone Pickup' } })
  const menuButton = page.locator('button[aria-controls="mobile"]')
  const mobileMenu = page.locator('#mobile')
  const cards = page => listMain(page).locator('article')

  // 1. logs in &&& taps ☰ > all 5 admin links &&& Logout; Esc closes it
  await page.goto('/admin/books')
  await menuButton.tap()
  await expect(mobileMenu).toBeVisible()
  await expect(mobileMenu.getByRole('link')).toHaveText(adminNavLinks)
  await expect(mobileMenu.getByRole('button', { name: 'Logout' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(mobileMenu).toBeHidden()

  // 2. taps Book Inventory > the menu closes &&& each book is a card with Select all, Select record &&& View details
  await menuButton.tap()
  await mobileMenu.getByRole('link', { name: 'Book Inventory' }).tap()
  await expect(mobileMenu).toBeHidden()
  await expect(cards(page).first()).toBeVisible()
  await expect(listMain(page).locator('table')).toBeHidden()
  await expect(listMain(page).getByText('Select all visible rows')).toBeVisible()
  await expect(cards(page).first().getByText('Select record')).toBeVisible()
  await expect(cards(page).first().getByRole('button', { name: /^View details for/ })).toBeVisible()

  // 3. taps View details on a card > Book details fits the screen &&& scrolls to Edit
  await cards(page).first().getByRole('button', { name: /^View details for/ }).tap()
  const details = page.getByRole('dialog')
  await expect(details.getByRole('heading', { name: 'Book details' })).toBeVisible()
  await expectFitsScreen(page, details)
  const edit = details.getByRole('button', { name: 'Edit' })
  await edit.scrollIntoViewIfNeeded()
  await expect(edit).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()

  // 4. ☰ → Adoption Applications, Select record on their request > "1 selected", full-width Approve \ Reject &&& a confirmation that fits
  await menuButton.tap()
  await mobileMenu.getByRole('link', { name: 'Adoption Applications' }).tap()
  await expect(page.getByRole('heading', { name: 'Adoption applications', level: 1 })).toBeVisible()
  await search(page, '/admin/applications', admin.tag)
  const card = cards(page).filter({ hasText: customer.email })
  await card.getByRole('checkbox').tap()
  await expect(listMain(page).getByRole('status').filter({ hasText: '1 selected' })).toBeVisible()
  const group = listMain(page).getByRole('group')
  for (const name of ['Approve', 'Reject']) {
    const button = group.getByRole('button', { name, exact: true })
    const [buttonBox, groupBox] = [await button.boundingBox(), await group.boundingBox()]
    expect(Math.round(buttonBox.width)).toBe(Math.round(groupBox.width))
  }
  await group.getByRole('button', { name: 'Approve', exact: true }).tap()
  const ask = confirmation(page, 'Approve application?')
  await expect(ask).toBeVisible()
  await expectFitsScreen(page, ask)
  await ask.getByRole('button', { name: 'Cancel' }).tap()
  await expect(ask).toBeHidden()

  // 5. ☰ → Appointments &&& scrolls to the bottom > the page count &&& Next page stay stuck to the bottom of the screen
  await menuButton.tap()
  await mobileMenu.getByRole('link', { name: 'Appointments' }).tap()
  await expect(page.getByRole('heading', { name: 'Appointments', level: 1 })).toBeVisible()
  const next = listMain(page).getByRole('button', { name: 'Next page' })
  await expect(next).toBeVisible()
  //@ChitanyaBharathi > sticky only matters when the cards are taller than the screen > check from the top &&& the bottom
  for (const scrollTo of [0, 'bottom']) {
    await page.evaluate(top => window.scrollTo(0, top === 'bottom' ? document.body.scrollHeight : top), scrollTo)
    await expect(next).toBeInViewport()
    await expect(listMain(page).getByText(/^\s*\d+–\d+ of \d+ appointments\s*$/)).toBeInViewport()
  }

  // 6. ☰ → Logout > Login, with the menu closed
  await menuButton.tap()
  await mobileMenu.getByRole('button', { name: 'Logout' }).tap()
  await expect(page).toHaveURL('/login')
  await expect(mobileMenu).toBeHidden()
})
