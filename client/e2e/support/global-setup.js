import { request } from '@playwright/test'
import { baseToken, demoAdmin, serverUrl, shouldSeed } from './env.js'
import { demoAdminState, sweepLeftoverAdmins } from './admin-session.js'
import { logIn } from './customer.js'

//@ChitanyaBharathi > seed.sql resets users &&& demo data > only run it when the root .env says e2e_seed=true
async function seed() {
  if (!shouldSeed) { return }
  if (!baseToken) { throw new Error('e2e_seed=true needs basetoken in the root .env') }

  const response = await fetch(`${serverUrl}/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-base-token': baseToken },
    body: '{}',
  })
  if (!response.ok) {
    throw new Error(`seeding failed > ${response.status} ${await response.text()}`)
  }
}

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
  await seed()
  await prepareDemoAdmin()
}
