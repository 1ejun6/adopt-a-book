import { test, expect } from '@playwright/test'
import { guestNavLinks } from '../support/guest.js'

const navLinks = page => page.getByRole('banner').getByRole('link').filter({ hasNotText: 'Adopt a Book' })

//@ChitanyaBharathi > journey 1.6 > a guest opens a shared link \ types a members-only address
test('guest is sent to login from every members-only page', async ({ page }) => {
  for (const path of [
    '/customer/watchlist',        // 1. watchlist
    '/customer/books?search=dune', // 2. a shared browse link
    '/customer/adoptions',        // 3. my adoptions
    '/customer/account',          // 3. account
    '/admin/books',               // 4. admin inventory
  ]) {
    await page.goto(path)
    await expect(page, `${path} should redirect to login`).toHaveURL('/login')

    // 5. the navbar only ever shows the guest links
    await expect(navLinks(page)).toHaveText(guestNavLinks)
  }
})
