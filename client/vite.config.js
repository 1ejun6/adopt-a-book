import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { clienturl } = loadEnv(mode, workspaceRoot, '')

  if (!clienturl) {
    throw new Error('clienturl must be set in the root .env file')
  }

  const clientUrl = new URL(clienturl)
  const port = Number(clientUrl.port)

  if (!port) {
    throw new Error('clienturl in the root .env file must include a port')
  }

  return {
    envDir: workspaceRoot,
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: clientUrl.hostname,
      port,
      strictPort: true,
    },
    preview: {
      host: clientUrl.hostname,
      port,
      strictPort: true,
    },
  }
})
