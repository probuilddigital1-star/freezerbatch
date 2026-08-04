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
  // Bounded locally: an unbounded worker pool hammers one dev server and turns
  // slow responses into flaky timeouts.
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { open: 'never' }]],
  use: {
    // Dedicated port, NOT Astro's 4321 default. Stale dev servers from another
    // project once squatted 4321-4325 and the suite silently tested the wrong
    // site. Combined with reuseExistingServer: false below, anything already
    // listening here fails the run loudly instead.
    baseURL: 'http://127.0.0.1:4381',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4381 --host 127.0.0.1',
    url: 'http://127.0.0.1:4381',
    // Never reuse a server we didn't start — a leftover process on this port is
    // an error, not a convenience.
    reuseExistingServer: false,
    timeout: 120000,
  },
});
