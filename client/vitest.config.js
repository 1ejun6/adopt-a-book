import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

//@ChitanyaBharathi > separate from vite.config.js > tests run without the root .env file
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    setupFiles: ['./src/test/setup.js'],
    env: {
      //@ChitanyaBharathi > fake server url > msw answers every request sent here
      VITE_SERVER_URL: 'http://api.test',
    },
  },
})
