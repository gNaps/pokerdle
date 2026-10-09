import { defineConfig, devices } from '@playwright/test';
// Optionally use a locally installed Chromium browser instead of Playwright's download.
const chromiumLaunch = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {};
const externalServer = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false,
  use: { baseURL: externalServer ?? 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  webServer: externalServer ? undefined : { command: 'yarn dev --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: !process.env.CI, timeout: 120000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
    { name: 'android', use: { ...devices['Pixel 7'], launchOptions: chromiumLaunch } },
    { name: 'ios', use: { ...devices['iPhone 13'] } },
  ],
});
