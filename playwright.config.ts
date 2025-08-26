import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:4322',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    timezoneId: 'Australia/Brisbane',
    locale: 'en-AU',
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Uncomment if you want Playwright to launch the dev server automatically
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:4322',
  //   timeout: 60_000,
  //   reuseExistingServer: !process.env.CI,
  // },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  metadata: { commit: process.env.GITHUB_SHA || '' },
});
