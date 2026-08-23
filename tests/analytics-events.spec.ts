import { expect, test, type Page } from '@playwright/test';

/**
 * Runs under playwright.analytics.config.ts, which starts its own dev server
 * with a test PUBLIC_POSTHOG_KEY so the module is enabled.
 *
 * A `window.posthog` stub is installed before any page script runs, so
 * initAnalytics() adopts it and never dynamically imports the real posthog-js.
 * That keeps these tests fully offline: no PostHog host is ever contacted.
 */

type Captured = { event: string; props: Record<string, unknown> };

async function stubPostHog(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __captured: Captured[] }).__captured = [];
    (window as unknown as { posthog: unknown }).posthog = {
      capture(event: string, props?: Record<string, unknown>) {
        (window as unknown as { __captured: Captured[] }).__captured.push({ event, props: props ?? {} });
      },
      init() {},
    };
  });
}

async function stubWebShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => undefined,
    });
  });
}

function captured(page: Page): Promise<Captured[]> {
  return page.evaluate(() => (window as unknown as { __captured: Captured[] }).__captured);
}

function names(events: Captured[]): string[] {
  return events.map((entry) => entry.event);
}

function first(events: Captured[], name: string): Captured | undefined {
  return events.find((entry) => entry.event === name);
}

function batchValue(state: unknown): string {
  return `v1.${Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')}`;
}

test.describe('analytics events', () => {
  test('preset flow emits calculator_started, recipe_selected, result_completed in order', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');

    const events = await captured(page);
    const order = names(events);

    expect(order).toContain('calculator_started');
    expect(order).toContain('recipe_selected');
    expect(order).toContain('result_completed');
    expect(order.indexOf('calculator_started')).toBeLessThan(order.indexOf('result_completed'));

    expect(first(events, 'calculator_started')!.props).toEqual({ mode: 'preset', page_type: 'home' });
    expect(first(events, 'recipe_selected')!.props).toEqual({ recipe: 'negroni' });
    expect(first(events, 'result_completed')!.props).toMatchObject({
      trigger: 'user',
      mode: 'preset',
      recipe: 'negroni',
      bottle_ml: 750,
      freezer_safe: true,
    });
    expect(typeof first(events, 'result_completed')!.props.abv_band).toBe('string');
  });

  test('result_completed is debounced per mode+recipe+bottle combination', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    // Same combination three times: one event.
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');
    expect(names(await captured(page)).filter((n) => n === 'result_completed')).toHaveLength(1);

    // Changing the bottle is a new combination: a second event.
    await page.getByRole('radio', { name: '1L' }).click();
    await expect.poll(async () => names(await captured(page)).filter((n) => n === 'result_completed').length)
      .toBe(2);

    const events = await captured(page);
    const results = events.filter((e) => e.event === 'result_completed');
    expect(results.map((e) => e.props.bottle_ml)).toEqual([750, 1000]);
    // The homepage renders nothing on load, so every result here is interaction-driven.
    expect(results.map((e) => e.props.trigger)).toEqual(['user', 'user']);
  });

  test('calculator_started fires once per page load', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Custom' }).click();
    // exact: otherwise this also matches the "Copy recipe" button.
    await page.getByRole('button', { name: 'Recipe', exact: true }).click();
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();

    expect(names(await captured(page)).filter((n) => n === 'calculator_started')).toHaveLength(1);
  });

  test('share_created reports webshare and the canonical-recipe target', async ({ page }) => {
    await stubPostHog(page);
    await stubWebShare(page);
    await page.goto('/');

    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');
    await page.locator('.preset-share-btn').click();

    await expect.poll(async () => names(await captured(page))).toContain('share_created');
    expect(first(await captured(page), 'share_created')!.props).toEqual({
      mode: 'preset',
      method: 'webshare',
      target: 'canonical-recipe',
    });
  });

  test('custom share reports the homepage-custom target', async ({ page }) => {
    await stubPostHog(page);
    await stubWebShare(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByRole('button', { name: /Try a sample/ }).click();
    await expect(page.locator('#final-abv')).not.toHaveText('0');
    await page.locator('#share-btn').click();

    await expect.poll(async () => names(await captured(page))).toContain('share_created');
    expect(first(await captured(page), 'share_created')!.props).toMatchObject({
      mode: 'custom',
      target: 'homepage-custom',
    });
  });

  test('shared_link_opened reports a valid batch-v1 link', async ({ page }) => {
    await stubPostHog(page);
    const batch = batchValue({ v: 1, mode: 'preset', recipe: 'negroni', bottleMl: 750, unit: 'oz' });
    await page.goto(`/?batch=${encodeURIComponent(batch)}#calculator`);
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');

    const events = await captured(page);
    expect(first(events, 'shared_link_opened')!.props).toEqual({
      mode: 'preset',
      format: 'batch-v1',
      valid: true,
    });
  });

  test('shared_link_opened reports an invalid link without partial state', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/?batch=v1.not-valid!!!#calculator');
    await expect(page.getByRole('status')).toHaveText("Couldn't load the shared recipe — showing defaults");

    expect(first(await captured(page), 'shared_link_opened')!.props).toEqual({
      mode: 'unknown',
      format: 'batch-v1',
      valid: false,
    });
  });

  test('shared_link_opened reports the legacy format', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/?recipe=negroni&bottle=750');
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');

    expect(first(await captured(page), 'shared_link_opened')!.props).toEqual({
      mode: 'preset',
      format: 'legacy',
      valid: true,
    });
  });

  test('hydration emits shared_link_opened before result_completed and no calculator_started', async ({ page }) => {
    await stubPostHog(page);
    const batch = batchValue({ v: 1, mode: 'preset', recipe: 'negroni', bottleMl: 750, unit: 'oz' });
    await page.goto(`/?batch=${encodeURIComponent(batch)}#calculator`);
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');

    const events = await captured(page);
    const order = names(events);
    expect(order).toContain('shared_link_opened');
    expect(order).toContain('result_completed');
    expect(order.indexOf('shared_link_opened')).toBeLessThan(order.indexOf('result_completed'));
    // Hydration is not a user interaction.
    expect(order).not.toContain('calculator_started');

    // Exactly one result, attributed to the shared link rather than to the page
    // defaults or an interaction.
    const results = events.filter((e) => e.event === 'result_completed');
    expect(results).toHaveLength(1);
    expect(results[0].props).toMatchObject({ trigger: 'shared_link' });
  });

  test('recipe page emits no result on load, then a user result on interaction', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/cocktails/vesper/');
    await expect(page.locator('#preset-batch-instructions')).toContainText('Vesper');

    // A preset rendering its own default is not a completion — nobody asked for
    // it, and the `$pageview` on this page already records the visit.
    let events = await captured(page);
    expect(events.filter((e) => e.event === 'result_completed')).toHaveLength(0);
    expect(names(events)).not.toContain('calculator_started');

    // Same recipe, same bottle, but now a real interaction: must still emit.
    await page.getByRole('radio', { name: '1L' }).click();
    await page.getByRole('radio', { name: '750ml' }).click();

    await expect.poll(async () =>
      (await captured(page)).filter((e) => e.event === 'result_completed' && e.props.trigger === 'user').length
    ).toBeGreaterThan(0);

    events = await captured(page);
    expect(names(events)).toContain('calculator_started');
    // `auto` is never emitted at all now, on this page or any other.
    expect(events.filter((e) => e.event === 'result_completed' && e.props.trigger === 'auto')).toHaveLength(0);
  });

  test('affiliate_click reports retailer and placement', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    // Mocked anchor: keeps the test offline and avoids opening a new tab.
    // Clicked programmatically so the Astro dev toolbar overlay cannot
    // intercept the pointer event; the delegated listener still sees it.
    await page.evaluate(() => {
      const anchor = document.createElement('a');
      anchor.id = 'test-affiliate';
      anchor.href = 'https://www.amazon.com/dp/TEST123';
      anchor.textContent = 'Test affiliate link';
      anchor.addEventListener('click', (event) => event.preventDefault());
      document.body.appendChild(anchor);
      anchor.click();
    });

    expect(first(await captured(page), 'affiliate_click')!.props).toEqual({
      retailer: 'amazon',
      placement: 'homepage',
      page: '/',
    });
  });

  test('a non-affiliate link emits nothing', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    await page.evaluate(() => {
      const anchor = document.createElement('a');
      anchor.id = 'test-internal';
      anchor.href = 'https://freezerbatchcocktails.com/cocktails/';
      anchor.textContent = 'Internal link';
      anchor.addEventListener('click', (event) => event.preventDefault());
      document.body.appendChild(anchor);
      anchor.click();
    });

    expect(names(await captured(page))).not.toContain('affiliate_click');
  });

  test('no event carries an email address or long free text', async ({ page }) => {
    await stubPostHog(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Custom' }).click();
    const rows = page.locator('.ingredient-row');
    await rows.nth(0).getByPlaceholder('Ingredient').fill('person@example.com');
    await rows.nth(0).getByPlaceholder('2').fill('2');
    await rows.nth(0).getByPlaceholder('40').fill('40');
    await expect(page.locator('#final-abv')).not.toHaveText('0');

    const serialized = JSON.stringify(await captured(page));
    expect(serialized).not.toContain('person@example.com');
    expect(serialized).not.toContain('@');
  });

  test('makes no request to a real PostHog host (stub is adopted)', async ({ page }) => {
    const analyticsRequests: string[] = [];
    page.on('request', (request) => {
      if (/i\.posthog\.com/i.test(request.url())) analyticsRequests.push(request.url());
    });

    await stubPostHog(page);
    await page.goto('/');
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');
    await page.waitForTimeout(500);

    expect(analyticsRequests).toEqual([]);
  });
});

/**
 * Minimal Turnstile + /api/email stand-ins. The analytics dev server has no
 * Turnstile site key, so without this the submit button is disabled and the
 * opt-in path is unreachable.
 */
async function enableSignupPath(page: Page) {
  await page.addInitScript(() => {
    type Options = { callback: (token: string) => void };
    (window as unknown as { turnstile: unknown }).turnstile = {
      render: (_container: Element, options: Options) => {
        options.callback('test-turnstile-token');
        return 1;
      },
      reset: () => undefined,
    };
    const setTestKey = () => {
      document.querySelectorAll('email-signup-form').forEach((el) => el.setAttribute('data-turnstile-site-key', 'test-site-key'));
    };
    new MutationObserver(setTestKey).observe(document, { childList: true, subtree: true });
    setTestKey();
  });
  await page.route('**/api/email', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
  );
}

async function subscribeAt(page: Page, placement: string) {
  const form = page.locator(`email-signup-form[data-placement="${placement}"]`);
  await form.locator('input[type="email"]').fill('person@example.com');
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole('status')).toContainText("You're in.");
}

test.describe('newsletter_optin placement', () => {
  test('each capture module reports which one earned the signup', async ({ page }) => {
    await stubPostHog(page);
    await enableSignupPath(page);

    // Two instances on a recipe page: page_type alone cannot tell them apart,
    // which is the entire reason `placement` exists.
    await page.goto('/cocktails/negroni/');
    await subscribeAt(page, 'inline-post-calculator');
    let optin = first(await captured(page), 'newsletter_optin');
    expect(optin?.props).toMatchObject({ page_type: 'recipe', placement: 'inline-post-calculator' });

    await page.goto('/cocktails/negroni/');
    await subscribeAt(page, 'page-bottom');
    optin = first(await captured(page), 'newsletter_optin');
    expect(optin?.props).toMatchObject({ page_type: 'recipe', placement: 'page-bottom' });

    await page.goto('/');
    await subscribeAt(page, 'homepage-footer');
    optin = first(await captured(page), 'newsletter_optin');
    expect(optin?.props).toMatchObject({ page_type: 'home', placement: 'homepage-footer' });

    // Still no address, by any route.
    const serialized = JSON.stringify(await captured(page));
    expect(serialized).not.toContain('person@example.com');
  });

  test('an opt-in carries no properties beyond page_type and placement', async ({ page }) => {
    await stubPostHog(page);
    await enableSignupPath(page);
    await page.goto('/cocktails/negroni/');
    await subscribeAt(page, 'inline-post-calculator');
    const optin = first(await captured(page), 'newsletter_optin');
    expect(Object.keys(optin?.props ?? {}).sort()).toEqual(['page_type', 'placement']);
  });
});
