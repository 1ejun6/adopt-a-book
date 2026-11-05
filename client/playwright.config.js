import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))
const { clienturl, serverurl, e2e_url } = loadEnv('development', workspaceRoot, '')

//@ChitanyaBharathi > e2e_url in the root .env → test that deployed site, nothing starts locally > remove it to test localhost
const deployedUrl = e2e_url ? new URL(e2e_url) : null

if (!deployedUrl && !clienturl) { throw new Error('clienturl must be set in the root .env file') }
if (!deployedUrl && !serverurl) { throw new Error('serverurl must be set in the root .env file') }

const clientUrl = deployedUrl || new URL(clienturl)
const clientPort = Number(clientUrl.port)

if (!deployedUrl && !clientPort) { throw new Error('clienturl in the root .env file must include a port') }

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: clientUrl.origin,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Keep automated runs consistent locally and in CI. */
    headless: true,
  },

  //@ChitanyaBharathi > chrome only for now > phone-sized journeys switch device inside their own file
  //@ChitanyaBharathi > customer &&& admin tests share one real account each from the .env > run them one at a time
  projects: [
    {
      name: 'guest',
      testMatch: 'guest/**/*.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    //@ChitanyaBharathi > reset runs first &&& undoes whatever a half-finished run left on the shared account
    {
      name: 'customer reset',
      testMatch: 'customer/reset.setup.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'customer',
      testMatch: 'customer/**/*.spec.js',
      dependencies: ['customer reset'],
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin reset',
      testMatch: 'admin/reset.setup.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      testMatch: 'admin/**/*.spec.js',
      dependencies: ['admin reset'],
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  //@ChitanyaBharathi > journeys need the real backend too > start express before vite > skipped for a deployed site
  webServer: deployedUrl ? undefined : [
    {
      command: 'node server.js',
      cwd: fileURLToPath(new URL('../server', import.meta.url)),
      url: new URL('/', serverurl).href,
      reuseExistingServer: !process.env.CI,
    },
    {
      /**
       * Use the dev server by default for faster feedback loop.
       * Use the preview server on CI for more realistic testing.
       * Playwright will re-use the local server if there is already a dev-server running.
       */
      command: process.env.CI ? 'pnpm run preview' : 'pnpm run dev',
      host: clientUrl.hostname,
      port: clientPort,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
