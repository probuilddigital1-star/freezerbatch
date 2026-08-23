import { expect, test, type Page } from '@playwright/test';

type EmailRequest = Record<string, unknown>;

async function enableMockTurnstile(page: Page) {
  await page.addInitScript(() => {
    type Options = { callback: (token: string) => void };
    const callbacks = new Map<number, Options>();
    // Which element each widget was rendered into, so a test can solve one
    // instance's challenge without touching another's on the same page.
    const containers = new Map<number, Element>();
    let widgetId = 0;
    (window as Window & { turnstile?: unknown }).turnstile = {
      render: (container: Element, options: Options) => {
        const id = ++widgetId;
        callbacks.set(id, options);
        containers.set(id, container);
        options.callback('test-turnstile-token');
        return id;
      },
      reset: (_id: number) => undefined,
    };
    (window as Window & { __solveTurnstile?: () => void }).__solveTurnstile = () => {
      callbacks.get(widgetId)?.callback('fresh-turnstile-token');
    };
    // The placement of every signup widget rendered, in render order. One entry
    // per instance is the assertion that two forms each got their own widget.
    (window as Window & { __signupWidgetPlacements?: () => Array<string | null> }).__signupWidgetPlacements = () =>
      [...containers.values()]
        .map((c) => c.closest('email-signup-form'))
        .filter((el): el is Element => el !== null)
        .map((el) => el.getAttribute('data-placement'));
    (window as Window & { __solveTurnstileFor?: (placement: string) => boolean }).__solveTurnstileFor = (placement) => {
      for (const [id, container] of containers) {
        if (container.closest('email-signup-form')?.getAttribute('data-placement') === placement) {
          callbacks.get(id)?.callback('fresh-turnstile-token');
          return true;
        }
      }
      return false;
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

async function solveMockTurnstile(page: Page) {
  await page.evaluate(() => (window as Window & { __solveTurnstile?: () => void }).__solveTurnstile?.());
}

async function solveMockTurnstileFor(page: Page, placement: string) {
  const solved = await page.evaluate(
    (p) => (window as Window & { __solveTurnstileFor?: (x: string) => boolean }).__solveTurnstileFor?.(p) ?? false,
    placement,
  );
  expect(solved, `no Turnstile widget rendered for placement "${placement}"`).toBe(true);
}

function signupAt(page: Page, placement: string) {
  return page.locator(`email-signup-form[data-placement="${placement}"]`);
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

test.describe('Cold Open capture placement', () => {
  test('recipe page renders both cards and the homepage renders one', async ({ page }) => {
    await page.goto('/cocktails/negroni/');
    const recipeSignup = page.locator('email-signup-form');
    // Two since 2026-08-23: one under the calculator, one at the foot.
    await expect(recipeSignup).toHaveCount(2);
    await expect(recipeSignup.first()).toHaveAttribute('data-placement', 'inline-post-calculator');
    await expect(recipeSignup.last()).toHaveAttribute('data-placement', 'page-bottom');
    for (const placement of ['inline-post-calculator', 'page-bottom']) {
      const instance = signupAt(page, placement);
      await expect(instance).toHaveAttribute('data-variant', 'card');
      await expect(instance.locator('.cold-open-card')).toHaveCount(1);
      await expect(instance.locator('.cold-open-footer')).toHaveCount(0);
      await expect(instance).toContainText('Get the free label sheet');
      await expect(instance).toContainText('No spam. Unsubscribe anytime.');
    }
    // The inline one leads on labelling the bottle you just sized; the bottom
    // one keeps the original hosting promise. Distinct asks, not a repeat.
    await expect(signupAt(page, 'inline-post-calculator')).toContainText('Label the bottle before it goes in.');
    await expect(signupAt(page, 'page-bottom')).toContainText('Ready before the guests arrive.');
    // The inline card sits after the calculator and before "How to serve".
    await expect(page.locator('batch-calculator')).toHaveCount(1);
    const order = await page.evaluate(() => {
      const calc = document.querySelector('batch-calculator')!;
      const inline = document.querySelector('email-signup-form[data-placement="inline-post-calculator"]')!;
      const serve = [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('How to serve'))!;
      const pos = (a: Element, b: Element) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
      return { calcBeforeInline: !!pos(calc, inline), inlineBeforeServe: !!pos(inline, serve) };
    });
    expect(order).toEqual({ calcBeforeInline: true, inlineBeforeServe: true });
    // The calculator keeps its own recipe-email form; the two are separate elements
    // and the Cold Open card must not be mistaken for it.
    await expect(page.locator('batch-calculator email-signup-form')).toHaveCount(0);

    // The homepage carries the same full card as recipe pages (swapped from
    // the footer one-liner 2026-08-19): the offer must name the label sheet.
    await page.goto('/');
    const homeSignup = page.locator('email-signup-form');
    await expect(homeSignup).toHaveCount(1);
    await expect(homeSignup).toHaveAttribute('data-variant', 'card');
    await expect(homeSignup).toHaveAttribute('data-placement', 'homepage-footer');
    await expect(homeSignup.locator('.cold-open-card')).toHaveCount(1);
    await expect(homeSignup.locator('.cold-open-footer')).toHaveCount(0);
    await expect(homeSignup).toContainText('Get the free label sheet');
  });
});

/**
 * Recipe pages render <email-signup-form> twice as of 2026-08-23. The submit
 * logic is shared verbatim between the instances, so every way one could reach
 * across and disturb the other gets its own assertion here.
 */
test.describe('two signup instances on one recipe page', () => {
  const INLINE = 'inline-post-calculator';
  const BOTTOM = 'page-bottom';

  test('ids are instance-scoped, so no id is duplicated in the document', async ({ page }) => {
    await page.goto('/cocktails/negroni/');
    const report = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      const seen = new Set<string>();
      const duplicated = [...new Set(ids.filter((id) => seen.size === seen.add(id).size))];
      // Every label must resolve to a control inside its OWN instance. With a
      // shared id this silently targets the first instance on the page.
      const misTargeted = [...document.querySelectorAll('email-signup-form label[for]')]
        .filter((label) => {
          const target = document.getElementById((label as HTMLLabelElement).htmlFor);
          return !target || target.closest('email-signup-form') !== label.closest('email-signup-form');
        })
        .map((label) => (label as HTMLLabelElement).htmlFor);
      return { duplicated, misTargeted };
    });
    expect(report).toEqual({ duplicated: [], misTargeted: [] });
  });

  test('each instance renders its own Turnstile widget and neither gates the other', async ({ page }) => {
    await enableMockTurnstile(page);
    await page.goto('/cocktails/negroni/');

    const placements = await page.evaluate(
      () => (window as Window & { __signupWidgetPlacements?: () => Array<string | null> }).__signupWidgetPlacements?.() ?? [],
    );
    expect(placements.sort()).toEqual([INLINE, BOTTOM].sort());

    // A solved challenge enables only its own submit button.
    for (const placement of [INLINE, BOTTOM]) {
      await expect(signupAt(page, placement).locator('button[type="submit"]')).toBeEnabled();
      await expect(signupAt(page, placement).locator('.turnstile-container')).toHaveCount(1);
    }

    // Expiring one instance's token must not disable the other's button.
    await page.evaluate((p) => {
      document.querySelector<HTMLElement>(`email-signup-form[data-placement="${p}"]`)!.dispatchEvent(new Event('noop'));
    }, INLINE);
    await signupAt(page, INLINE).locator('input[type="email"]').fill('a@example.com');
    await expect(signupAt(page, BOTTOM).locator('button[type="submit"]')).toBeEnabled();
    await expect(signupAt(page, BOTTOM).locator('input[type="email"]')).toHaveValue('');
  });

  test('submitting one form leaves the other untouched, honeypot and all', async ({ page }) => {
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [{ status: 202 }, { status: 202 }]);
    await page.goto('/cocktails/negroni/');

    const inline = signupAt(page, INLINE);
    const bottom = signupAt(page, BOTTOM);

    // Type into both, and bait only the bottom instance's honeypot.
    await inline.locator('input[type="email"]').fill('inline@example.com');
    await bottom.locator('input[type="email"]').fill('bottom@example.com');
    await bottom.locator('input[name="website"]').fill('trap');

    await inline.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(1);
    // Only the submitting instance's own field values travel.
    expect(requests[0]).toMatchObject({ action: 'subscribe', email: 'inline@example.com', website: '' });

    await expect(inline.getByRole('status')).toContainText("You're in.");
    await expect(inline.locator('input[type="email"]')).toHaveValue('');

    // The other instance kept its value, its untouched status line, and its button.
    await expect(bottom.locator('input[type="email"]')).toHaveValue('bottom@example.com');
    await expect(bottom.locator('button[type="submit"]')).toBeEnabled();
    await expect(bottom.getByRole('status')).toBeHidden();

    await bottom.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ action: 'subscribe', email: 'bottom@example.com', website: 'trap' });
    expect(requests[1].requestId).not.toBe(requests[0].requestId);
  });

  test('a retry reuses only its own instance requestId', async ({ page }) => {
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [
      { status: 502, code: 'upstream_unavailable' },
      { status: 202 },
      { status: 202 },
    ]);
    await page.goto('/cocktails/negroni/');
    const inline = signupAt(page, INLINE);
    const bottom = signupAt(page, BOTTOM);

    await inline.locator('input[type="email"]').fill('inline@example.com');
    await inline.locator('button[type="submit"]').click();
    await expect(inline.getByRole('status')).toHaveText("We'll be back shortly.");
    // The failure reset this instance's challenge, and only this instance's.
    await expect(inline.locator('button[type="submit"]')).toBeDisabled();
    await expect(bottom.locator('button[type="submit"]')).toBeEnabled();

    // The other instance's send in between must get its own id.
    await bottom.locator('input[type="email"]').fill('bottom@example.com');
    await bottom.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1].requestId).not.toBe(requests[0].requestId);

    // And the retry still resumes the first instance's original id.
    await solveMockTurnstileFor(page, INLINE);
    await inline.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(3);
    expect(requests[2].requestId).toBe(requests[0].requestId);
    expect(requests[2]).toMatchObject({ email: 'inline@example.com' });
  });
});

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
    const recipeForm = page.locator('.preset-email-form');
    await expect(recipeForm.getByRole('status')).toBeFocused();
    await expect(recipeForm.locator('.turnstile-note')).not.toContainText('retry the verification challenge');
    await expect(recipeForm.locator('button[type="submit"]')).toBeDisabled();
    await solveMockTurnstile(page);
    await expect(recipeForm.locator('button[type="submit"]')).toBeEnabled();

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
    await expect(signup.getByRole('status')).toBeFocused();
    await expect(signup.locator('.turnstile-note')).not.toContainText('retry the verification challenge');
    await expect(signup.locator('button[type="submit"]')).toBeDisabled();
    await solveMockTurnstile(page);
    await expect(signup.locator('button[type="submit"]')).toBeEnabled();

    await page.goto('/unsubscribe/');
    const unsubscribe = page.locator('unsubscribe-form');
    await unsubscribe.locator('input[type="email"]').fill('unsubscribe@example.com');
    await unsubscribe.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ action: 'unsubscribe', page: '/unsubscribe/', turnstileToken: 'test-turnstile-token' });
    await expect(unsubscribe.getByRole('status')).toBeFocused();
    await expect(unsubscribe.locator('.turnstile-note')).not.toContainText('retry the verification challenge');
    await expect(unsubscribe.locator('button[type="submit"]')).toBeDisabled();
    await solveMockTurnstile(page);
    await expect(unsubscribe.locator('button[type="submit"]')).toBeEnabled();
  });

  test('custom-mode recipe email with no valid ingredients is blocked client-side', async ({ page }) => {
    // Regression coverage for the 2026-08-19 session: names-only ingredient
    // rows produce an empty recipe, which the API correctly 400s — so the
    // client must refuse to send it and say what is missing instead.
    await enableMockTurnstile(page);
    const requests = await mockEmailApi(page, [{ status: 202 }]);
    await page.goto('/');

    await page.click('[data-mode="custom"]');
    await page.locator('.ingredient-row [name="name"]').first().fill('Fireball');

    const form = page.locator('#email-recipe-form');
    await form.locator('input[type="email"]').fill('person@example.com');
    await form.locator('button[type="submit"]').click();

    await expect(form.getByRole('status')).toContainText('Add an amount for each ingredient');
    // The request must never leave the browser.
    expect(requests).toHaveLength(0);
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
      await expect(form.getByRole('status')).toBeFocused();
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
    await solveMockTurnstile(page);
    await submit.click();
    await expect.poll(() => requests).toHaveLength(2);
    expect(requests[1].requestId).toBe(requests[0].requestId);

    // `requests` is appended by the route handler, so polling it only proves the
    // request left the page — not that the component finished handling the
    // response. On 202 it still has to clear the field, null the requestId and
    // reset Turnstile. Setting up the next submit before that lands lets the
    // in-flight handler wipe the email and token this test just supplied, and
    // the third request never fires. Wait for the observable end state, the way
    // the first retry above waits on its status text.
    await expect(form.getByRole('status')).toHaveText("You've been unsubscribed.");
    await expect(form.locator('input[type="email"]')).toHaveValue('');
    await expect(submit).toBeDisabled();

    await form.locator('input[type="email"]').fill('new@example.com');
    await solveMockTurnstile(page);
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
