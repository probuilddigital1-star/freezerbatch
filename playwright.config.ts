import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // analytics-events.spec.ts needs a build with PUBLIC_POSTHOG_KEY set; it runs
  // under playwright.analytics.config.ts instead. analytics.spec.ts (the
  // fail-closed half) belongs here, where no key is configured.
  testIgnore: /analytics-events\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
