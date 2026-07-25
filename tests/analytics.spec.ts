import { expect, test, type Page } from '@playwright/test';

/**
 * Runs under the DEFAULT config, which builds with no PUBLIC_POSTHOG_KEY.
 * This is the fail-closed half of the analytics test plan: with no key the
 * module must capture nothing and must reach no PostHog host, even though a
 * `window.posthog` is sitting right there.
 *
 * The enabled-path assertions live in analytics-events.spec.ts, which runs
 * under playwright.analytics.config.ts with a test key injected.
 */

async function stubPostHog(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __captured: unknown[] }).__captured = [];
    (window as unknown as { posthog: unknown }).posthog = {
      capture(event: string, props?: Record<string, unknown>) {
        (window as unknown as { __captured: unknown[] }).__captured.push({ event, props });
      },
      init() {},
    };
  });
}

function captured(page: Page) {
  return page.evaluate(() => (window as unknown as { __captured: unknown[] }).__captured);
}

test.describe('analytics fails closed without a key', () => {
  test('captures nothing across a full preset flow', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.getByRole('radio', { name: '1L' }).click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');

    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByRole('button', { name: /Try a sample/ }).click();
    await expect(page.locator('#final-abv')).not.toHaveText('0');

    expect(await captured(page)).toEqual([]);
  });

  test('captures nothing when a shared link is hydrated', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/?recipe=negroni&bottle=750');
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    expect(await captured(page)).toEqual([]);
  });

  test('makes no request to any PostHog host', async ({ page }) => {
    const analyticsRequests: string[] = [];
    page.on('request', (request) => {
      if (/posthog|i\.posthog\.com/i.test(request.url())) analyticsRequests.push(request.url());
    });

    await page.goto('/');
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');
    await page.waitForTimeout(500);

    expect(analyticsRequests).toEqual([]);
  });

  test('calculator still works normally with analytics disabled', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByRole('button', { name: /Try a sample/ }).click();
    await expect(page.locator('.ingredient-row')).toHaveCount(3);
    await expect(page.locator('#final-abv')).not.toHaveText('0');
  });
});
