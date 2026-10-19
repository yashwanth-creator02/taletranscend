import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Match the port this worktree was allocated by execution/setup_worktree.py so
// E2E never collides with another worktree's dev server. Falls back to 5173.
const DEV_PORT = (() => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.dev-port'), 'utf-8').trim();
    const port = Number.parseInt(raw, 10);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  } catch {
    // no allocation file
  }
  return 5173;
})();

const BASE_URL = `http://127.0.0.1:${DEV_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
  ],

  webServer: {
    command: 'npx vite --host 127.0.0.1',
    url: `${BASE_URL}/library.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
