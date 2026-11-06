import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const env = loadEnv('development', workspaceRoot, '')

//@ChitanyaBharathi > e2e_url set → test that deployed site, whose api sits behind /api > unset → localhost from clienturl \ serverurl
const deployedUrl = env.e2e_url ? new URL(env.e2e_url).origin : ''
export const isDeployed = Boolean(deployedUrl)
export const clientUrl = deployedUrl || new URL(env.clienturl).origin
export const serverUrl = deployedUrl ? `${deployedUrl}/api` : new URL(env.serverurl).origin

//@ChitanyaBharathi > a request's api path without the /api prefix > '' when it isn't an api request
const apiBase = new URL(serverUrl)
const apiPrefix = apiBase.pathname.replace(/\/$/, '')
export function apiPath(url) {
  if (url.origin !== apiBase.origin) { return '' }
  if (apiPrefix && !url.pathname.startsWith(`${apiPrefix}/`)) { return '' }
  return url.pathname.slice(apiPrefix.length)
}

//@ChitanyaBharathi > the seeded demo customer > only journey 2.6 logs in as them
export const demoCustomer = { email: env.e2e_customer_email, password: env.e2e_customer_password }
//@ChitanyaBharathi > the seeded demo admin > only the admin fixture logs in as them, to create a fresh admin per journey
export const demoAdmin = { email: env.e2e_admin_email, password: env.e2e_admin_password }
//@brod > Supabase Admin credentials for automatic teardown of test accounts
export const supabaseUrl = env.supabaseurl ? new URL(env.supabaseurl).origin : ''
export const supabaseServiceRoleKey = env.supabaseservicerolekey || env.supabasesecretkey || ''
