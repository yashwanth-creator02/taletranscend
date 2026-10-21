import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Match the port this worktree was allocated by execution/setup_worktree.py so
// E2E never collides with another worktree's dev server. E2E_PORT overrides the
// allocation for a one-off run; both fall back to 5173.
const DEV_PORT = (() => {
  const override = Number.parseInt(process.env.E2E_PORT ?? '', 10);
  if (Number.isInteger(override) && override > 0 && override < 65536) return override;
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.dev-port'), 'utf-8').trim();
    const port = Number.parseInt(raw, 10);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  } catch {
    // Fall back to 5173 if .dev-port does not exist or is unreadable.
  }
  return 5173;
})();

const BASE_URL = `http://127.0.0.1:${DEV_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${DEV_PORT}`,
    url: `${BASE_URL}/library.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
