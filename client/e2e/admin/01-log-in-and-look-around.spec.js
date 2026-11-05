import { guestNavLinks, isApi } from '../support/guest.js'
import { logInThroughForm, slowly } from '../support/customer.js'
import { test, expect, adminNavLinks, navLinks, toast } from '../support/admin.js'

//@ChitanyaBharathi > every admin page, the navbar link that opens it &&& its heading
const pages = [
  { link: 'Home', heading: 'Dashboard', path: '/admin' },
  { link: 'Book Inventory', heading: 'Book Inventory', path: '/admin/books' },
  { link: 'Adoption Applications', heading: 'Adoption applications', path: '/admin/applications' },
  { link: 'Appointments', heading: 'Appointments', path: '/admin/appointments' },
  { link: 'Drives', heading: 'Drives', path: '/admin/drives' },
]
const dashboard = page => page.getByRole('heading', { name: 'Dashboard', level: 1 })

//@ChitanyaBharathi > this journey logs out, which signs the admin out everywhere > it gets an admin of its own
test.use({ ownAdmin: true })

//@ChitanyaBharathi > journey 3.1 > a fresh admin logs in through the form &&& checks what they can and can't reach
test('admin logs in and finds their way around', async ({ page, admin }) => {
  const banner = page.getByRole('banner')

  // 1. logs in with their email and password (through the login form) > "Signing in…", then the dashboard
  //    the fixture already logged in through the api > drop those cookies so the form does the work
  await page.context().clearCookies()
  await page.goto('/login')
  await page.route(isApi('/login'), slowly(), { times: 1 })
  await logInThroughForm(page, admin)
  await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  await expect(toast(page, 'login successful')).toBeVisible()
  await expect(page).toHaveURL('/admin')
  await expect(dashboard(page)).toBeVisible()

  // 2. the navbar shows the admin links &&& Logout, and none of the guest \ customer links
  await expect(navLinks(page)).toHaveText(adminNavLinks)
  await expect(banner.getByRole('button', { name: 'Logout' })).toBeVisible()
  for (const other of ['Browse Books', 'Watchlist', 'My Adoptions', 'Adoption Drives', 'Account', 'Login', 'Create Account']) {
    await expect(banner.getByRole('link', { name: other, exact: true })).toHaveCount(0)
  }

  // 3. clicks each navbar link in turn > each page opens with its own heading &&& its link marked current
  for (const { link, heading, path } of pages) {
    await banner.getByRole('link', { name: link, exact: true }).click()
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    await expect(banner.getByRole('link', { name: link, exact: true })).toHaveAttribute('aria-current', 'page')
  }

  // 4. clicks the Adopt a Book logo > back to the dashboard
  await banner.getByRole('link', { name: 'Adopt a Book' }).click()
  await expect(page).toHaveURL('/admin')
  await expect(dashboard(page)).toBeVisible()

  // 5. reloads the page > still logged in, same navbar
  await page.reload()
  await expect(dashboard(page)).toBeVisible()
  await expect(navLinks(page)).toHaveText(adminNavLinks)

  // 6. types a guest address > sent to the dashboard
  // 7. types a customer address > also the dashboard, never the customer page
  for (const path of ['/', '/drives', '/login', '/register', '/customer', '/customer/books', '/customer/adoptions']) {
    await page.goto(path)
    await expect(page, `${path} should send an admin to /admin`).toHaveURL('/admin')
  }

  // 8. clicks Logout > the login page &&& the guest navbar
  await banner.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL('/login')
  await expect(navLinks(page)).toHaveText(guestNavLinks)

  // 9. presses Back > still on login (it remembers the admin page to return to), never back inside
  await page.goBack()
  await expect(page).toHaveURL(/\/login(\?redirect=%2Fadmin.*|\?redirect=\/admin.*)?$/)
  await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible()
  await expect(navLinks(page)).toHaveText(guestNavLinks)
})
