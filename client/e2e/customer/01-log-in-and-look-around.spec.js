import { test, expect } from '@playwright/test'
import { guestNavLinks, isApi, toast } from '../support/guest.js'
import { customerNavLinks, demoCustomer, logInThroughForm, navLinks, slowly } from '../support/customer.js'

//@brod > pickups is now part of my adoptions > canonical path is /customer/adoption
const pages = [
  { link: 'Browse Books', path: '/customer/books', heading: 'Find your next read' },
  { link: 'Watchlist', path: '/customer/watchlist', heading: 'My Watchlist' },
  { link: 'My Adoptions', path: '/customer/adoption', heading: 'My Adoptions' },
  { link: 'Adoption Drives', path: '/customer/drives', heading: 'adoption drives' },
  { link: 'Account', path: '/customer/account', heading: 'My account' },
]

//@ChitanyaBharathi > journey 2.1 > a new customer logs in &&& checks what they can &&& can't reach
//@brod > uses seeded demoCustomer from .env so no new DB account is created
test('customer logs in and finds their way around', async ({ page }) => {
  test.skip(!demoCustomer.email || !demoCustomer.password, 'journey 2.1 needs e2e_customer_email and e2e_customer_password in the root .env')

  // 1. logs in with their email &&& password (through the login form)
  await page.route(isApi('/login'), slowly())
  await page.goto('/login')
  await logInThroughForm(page, demoCustomer)
  await expect(page.getByRole('button', { name: 'Logging in…' })).toBeVisible()
  await expect(toast(page, 'login successful')).toBeVisible()
  await expect(page).toHaveURL('/customer')
  await page.unroute(isApi('/login'))

  // 2. looks at the navbar
  await expect(navLinks(page)).toHaveText(customerNavLinks)
  await expect(page.getByRole('banner').getByRole('button', { name: 'Logout' })).toBeVisible()

  // 3. clicks each navbar link in turn
  for (const { link, path, heading } of pages) {
    const navLink = navLinks(page).filter({ hasText: link })
    await navLink.click()
    await expect(page).toHaveURL(path)
    await expect(navLink).toHaveAttribute('data-active')
    if (heading) { await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible() }
  }

  // check /customer/adoptions redirects to /customer/adoption
  await page.goto('/customer/adoptions')
  await expect(page).toHaveURL('/customer/adoption')

  // 4. clicks the Adopt a Book logo
  await page.getByRole('banner').getByRole('link', { name: 'Adopt a Book' }).click()
  await expect(page).toHaveURL('/customer')

  // 5. reloads the page
  await page.reload()
  await expect(navLinks(page)).toHaveText(customerNavLinks)

  // 6. types a guest address
  for (const path of ['/', '/drives', '/login', '/register']) {
    await page.goto(path)
    await expect(page, `${path} should send a customer home`).toHaveURL('/customer')
  }

  // 7. types an admin address
  await page.goto('/admin/books')
  await expect(page).toHaveURL('/customer')

  // 8. clicks Logout
  await page.getByRole('banner').getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL('/login')
  await expect(navLinks(page)).toHaveText(guestNavLinks)

  // 9. presses the browser Back button
  await page.goBack()
  await expect(page).toHaveURL('/login')
  await expect(navLinks(page)).toHaveText(guestNavLinks)
})
