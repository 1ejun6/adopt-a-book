import { request } from '@playwright/test'
import { demoAdmin } from './env.js'
import { demoAdminState, sweepLeftoverAdmins } from './admin-session.js'
import { logIn } from './customer.js'

//@ChitanyaBharathi > supabase rate-limits logins > the demo admin logs in once per run &&& every worker reuses its cookies
//@ChitanyaBharathi > same login sweeps away temporary admins a crashed \ cancelled run left behind
async function prepareDemoAdmin() {
  if (!demoAdmin.email || !demoAdmin.password) { return }
  const demo = await request.newContext()
  try {
    await logIn(demo, demoAdmin)
    await demo.storageState({ path: demoAdminState })
    await sweepLeftoverAdmins(demo)
  } finally {
    await demo.dispose()
  }
}

export default async function globalSetup() {
  await prepareDemoAdmin()
}
