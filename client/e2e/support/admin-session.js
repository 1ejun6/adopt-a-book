import { fileURLToPath, URL } from 'node:url'
import { callApi } from './customer.js'

//@ChitanyaBharathi > the demo admin's cookies for this run > /playwright/.auth/ is already gitignored at the repo root
export const demoAdminState = fileURLToPath(new URL('../../../playwright/.auth/demo-admin.json', import.meta.url))

export const adminPassword = 'e2e-Admin-Password-123'
export const isTemporaryAdmin = email => /^e2e-admin-.+@example\.com$/.test(email)

//@ChitanyaBharathi > a temporary admin, created by the demo admin > POST answers with every admin account, so find ours by email
export async function createTemporaryAdmin(demo, label) {
  const email = `e2e-admin-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const name = `Admin ${label}`
  const { accounts } = await callApi(demo, 'POST', '/admin/users', { name, email, password: adminPassword })
  const id = accounts.find(account => account.email === email)?.id
  if (!id) { throw new Error(`POST /admin/users did not return ${email}`) }
  return { id, name, email, password: adminPassword }
}

//@ChitanyaBharathi > never silent > a failed delete means a leftover account, so say so in the output
export async function deleteTemporaryAdmin(demo, admin) {
  try {
    await callApi(demo, 'DELETE', `/admin/users/${admin.id}`)
  } catch (error) {
    console.warn(`could not delete temporary admin ${admin.email} > the next run's sweep will retry\n${error.message}`)
  }
}

export async function sweepLeftoverAdmins(demo) {
  const { accounts } = await callApi(demo, 'GET', '/admin/users')
  for (const account of accounts.filter(item => isTemporaryAdmin(item.email))) {
    await deleteTemporaryAdmin(demo, account)
  }
}
