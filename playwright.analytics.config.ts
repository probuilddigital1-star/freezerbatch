import { defineConfig, devices } from '@playwright/test';

/**
 * Analytics-enabled Playwright run.
 *
 * The analytics module is a no-op without a build-time PUBLIC_POSTHOG_KEY, so
 * the enabled-path assertions need their own server with a test key injected.
 * It runs on its own port to avoid colliding with the default suite's server.
 *
 * The key is a throwaway string and the host points at a closed port; the specs
 * install a `window.posthog` stub before page scripts run, so the real
 * posthog-js is never imported and nothing leaves the machine.
 *
 * Run with: npm run test:e2e:analytics
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /analytics-events\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Bounded locally for the same reason as the default config.
  workers: process.env.CI ? 1 : 2,
  reporter: 'list',
  use: {
    // 4382: adjacent to the default suite's 4381, same rationale — a dedicated
    // port where anything already listening fails the run loudly.
    baseURL: 'http://127.0.0.1:4382',
    trace: 'on-first-retry',
    // Same reason as the default config: `.scroll-reveal` animates content in
    // from opacity 0 / translateY(20px), and these specs click the same tiles.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4382 --host 127.0.0.1',
    url: 'http://127.0.0.1:4382',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      PUBLIC_POSTHOG_KEY: 'phc_playwright_test_key',
      PUBLIC_POSTHOG_HOST: 'http://127.0.0.1:9',
    },
  },
});
