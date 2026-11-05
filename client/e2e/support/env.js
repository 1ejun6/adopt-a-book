import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const env = loadEnv('development', workspaceRoot, '')

//@ChitanyaBharathi > same root .env the app uses > tests talk to the same server
export const serverUrl = new URL(env.serverurl).origin
export const clientUrl = new URL(env.clienturl).origin
export const baseToken = env.basetoken
export const shouldSeed = env.e2e_seed === 'true'
//@ChitanyaBharathi > the seeded demo customer > only journey 2.6 logs in as them
export const demoCustomer = { email: env.e2e_customer_email, password: env.e2e_customer_password }
//@brod > Supabase Admin credentials for automatic teardown of test accounts
export const supabaseUrl = env.supabaseurl ? new URL(env.supabaseurl).origin : ''
export const supabaseServiceRoleKey = env.supabaseservicerolekey || env.supabasesecretkey || ''
