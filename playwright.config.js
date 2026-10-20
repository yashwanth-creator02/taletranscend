import { defineConfig, devices } from '@playwright/test';

// Local runs default to the standard Vite port. Set E2E_PORT when another
// worktree's dev server already owns 5173, so this suite never reuses a
// different checkout's server and silently tests the wrong code.
const port = Number(process.env.E2E_PORT || 5173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile-shell\.spec\.js/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /mobile-shell\.spec\.js/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile-shell\.spec\.js/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testMatch: /mobile-shell\.spec\.js/,
    },
  ],

  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/library.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
