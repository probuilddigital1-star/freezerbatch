import { expect, test, type Page } from '@playwright/test';

type EmailRequest = Record<string, unknown>;

async function enableMockTurnstile(page: Page) {
  await page.addInitScript(() => {
    type Options = { callback: (token: string) => void };
    const callbacks = new Map<number, Options>();
    let widgetId = 0;
    (window as Window & { turnstile?: unknown }).turnstile = {
      render: (_container: Element, options: Options) => {
        const id = ++widgetId;
        callbacks.set(id, options);
        options.callback('test-turnstile-token');
        return id;
      },
      reset: (id: number) => callbacks.get(id)?.callback('test-turnstile-token'),
    };

    const setTestKey = () => {
      document.querySelectorAll('batch-calculator, email-signup-form, unsubscribe-form').forEach((element) => {
        element.setAttribute('data-turnstile-site-key', 'test-site-key');
      });
    };
    new MutationObserver(setTestKey).observe(document, { childList: true, subtree: true });
    setTestKey();
  });
}

async function mockEmailApi(page: Page, responses: Array<{ status: number; code?: string }>) {
  const requests: EmailRequest[] = [];
  await page.route('**/api/email', async (route) => {
    requests.push(route.request().postDataJSON() as EmailRequest);
    const response = responses.shift() ?? { status: 202 };
    await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.status === 202 ? { ok: true } : { ok: false, code: response.code }) });
  });
  return requests;
}

test.describe('same-origin email forms', () => {
  test('recipe email emits contract payloads with and without marketing consent', async ({ page }) => {
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [{ status: 202 }, { status: 202 }]);
    await page.goto('/');

    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.locator('.preset-email-form input[type="email"]').fill('Person@Example.com');
    await page.locator('.preset-email-form button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ action: 'send_recipe', email: 'Person@Example.com', marketingConsent: false, page: '/', turnstileToken: 'test-turnstile-token', website: '' });
    expect(requests[0].recipe).toMatchObject({ mode: 'preset', slug: 'negroni', bottleMl: 750, unit: 'oz' });

    await page.reload();
    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.locator('.preset-email-form input[type="email"]').fill('person@example.com');
    await page.locator('.preset-email-form input[name="subscribe"]').check();
    await page.locator('.preset-email-form button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ action: 'send_recipe', marketingConsent: true, consentVersion: '2026-07-23' });
  });

  test('newsletter signup and unsubscribe emit their respective actions', async ({ page }) => {
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [{ status: 202 }, { status: 202 }]);
    await page.goto('/');
    const signup = page.locator('email-signup-form');
    await signup.locator('input[type="email"]').fill('newsletter@example.com');
    await signup.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ action: 'subscribe', consentVersion: '2026-07-23', page: '/', turnstileToken: 'test-turnstile-token' });

    await page.goto('/unsubscribe/');
    const unsubscribe = page.locator('unsubscribe-form');
    await unsubscribe.locator('input[type="email"]').fill('unsubscribe@example.com');
    await unsubscribe.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ action: 'unsubscribe', page: '/unsubscribe/', turnstileToken: 'test-turnstile-token' });
  });

  test('maps API errors accessibly and prevents duplicate requests', async ({ page }) => {
    for (const [status, code, message] of [
      [400, 'invalid_request', 'Please check the form and try again.'],
      [403, 'verification_failed', 'Please retry the challenge.'],
      [429, 'rate_limited', 'Please try again in a minute.'],
      [502, 'upstream_unavailable', "We'll be back shortly."],
    ] as const) {
      await enableMockTurnstile(page);
      const requests = await mockEmailApi(page, [{ status, code }]);
      await page.goto('/unsubscribe/');
      const form = page.locator('unsubscribe-form');
      await form.locator('input[type="email"]').fill('person@example.com');
      await form.locator('button[type="submit"]').click();
      await expect(form.getByRole('status')).toHaveText(message);
      expect(requests).toHaveLength(1);
    }

    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [{ status: 202 }]);
    await page.goto('/unsubscribe/');
    const form = page.locator('unsubscribe-form');
    await form.locator('input[type="email"]').fill('person@example.com');
    await form.locator('button[type="submit"]').dblclick();
    await expect.poll(() => requests).toHaveLength(1);
  });

  test('reuses a request ID for a retry and creates a new ID after success', async ({ page }) => {
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [
      { status: 502, code: 'upstream_unavailable' },
      { status: 202 },
      { status: 202 },
    ]);
    await page.goto('/unsubscribe/');
    const form = page.locator('unsubscribe-form');
    const submit = form.locator('button[type="submit"]');
    await form.locator('input[type="email"]').fill('person@example.com');
    await submit.click();
    await expect(form.getByRole('status')).toHaveText("We'll be back shortly.");
    await submit.click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1].requestId).toBe(requests[0].requestId);

    await form.locator('input[type="email"]').fill('new@example.com');
    await submit.click();
    await expect.poll(() => requests).toHaveLength(3);
    expect(requests[2].requestId).not.toBe(requests[1].requestId);
  });

  test('fails closed in local development when no Turnstile site key is configured', async ({ page }) => {
    await page.goto('/unsubscribe/');
    const form = page.locator('unsubscribe-form');
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
    await expect(form.locator('.turnstile-note')).toContainText('unavailable in local development');
  });
});
