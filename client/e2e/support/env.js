import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const env = loadEnv('development', workspaceRoot, '')

//@ChitanyaBharathi > same root .env the app uses > tests talk to the same server
export const serverUrl = new URL(env.serverurl).origin
export const baseToken = env.basetoken
export const shouldSeed = env.e2e_seed === 'true'
