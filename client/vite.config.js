import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))

//@1ejun6 > https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const { clienturl, serverurl } = loadEnv(mode, workspaceRoot, '')

  const config = {
    envDir: workspaceRoot,
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL || serverurl || '/api'),
    },
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }

  if (command === 'build') return config

  if (!clienturl) { throw new Error('clienturl must be set in the root .env file') }

  if (!serverurl) { throw new Error('serverurl must be set in the root .env file') }

  const clientUrl = new URL(clienturl)
  const port = Number(clientUrl.port)

  if (!port) { throw new Error('clienturl in the root .env file must include a port') }

  const localServer = { host: clientUrl.hostname, port, strictPort: true }
  return { ...config, server: localServer, preview: localServer }
})
