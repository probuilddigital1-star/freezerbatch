import { afterEach, describe, expect, it } from 'vitest';
import {
  abvBand,
  affiliatePlacement,
  analyticsAllowed,
  initAnalytics,
  pageType,
  resetAnalytics,
  retailerFromUrl,
  sanitizeProps,
  signupPlacement,
  track,
  type AnalyticsClient,
  type EventProps,
} from './analytics';

function recordingClient() {
  const calls: Array<{ event: string; props?: EventProps }> = [];
  const client: AnalyticsClient = {
    capture(event, props) {
      calls.push({ event, props });
    },
  };
  return { calls, client };
}

afterEach(() => {
  resetAnalytics();
});

describe('analyticsAllowed', () => {
  it('requires a non-empty key', () => {
    expect(analyticsAllowed('phc_abc', null)).toBe(true);
    expect(analyticsAllowed(undefined, null)).toBe(false);
    expect(analyticsAllowed('', null)).toBe(false);
    expect(analyticsAllowed('   ', null)).toBe(false);
  });

  it('honours Do Not Track', () => {
    expect(analyticsAllowed('phc_abc', '1')).toBe(false);
    expect(analyticsAllowed('phc_abc', '0')).toBe(true);
    expect(analyticsAllowed('phc_abc', 'unspecified')).toBe(true);
  });
});

describe('initAnalytics + track', () => {
  it('is a no-op without a key: nothing is captured', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: undefined, doNotTrack: null, client });
    track('calculator_started', { mode: 'preset' });
    expect(calls).toEqual([]);
  });

  it('is a no-op under Do Not Track', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: '1', client });
    track('calculator_started', { mode: 'preset' });
    expect(calls).toEqual([]);
  });

  it('is a no-op before init', () => {
    expect(() => track('calculator_started', { mode: 'preset' })).not.toThrow();
  });

  it('flushes events captured before init finished', async () => {
    const { calls, client } = recordingClient();
    // Fires during connectedCallback, before the async init settles.
    track('shared_link_opened', { mode: 'preset', format: 'batch-v1', valid: true });
    expect(calls).toEqual([]);
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    expect(calls).toEqual([
      { event: 'shared_link_opened', props: { mode: 'preset', format: 'batch-v1', valid: true } },
    ]);
  });

  it('discards queued events when analytics turns out to be disabled', async () => {
    const { calls, client } = recordingClient();
    track('shared_link_opened', { mode: 'preset' });
    await initAnalytics({ key: undefined, doNotTrack: null, client });
    track('calculator_started', { mode: 'preset' });
    expect(calls).toEqual([]);
  });

  it('bounds the pre-init queue', async () => {
    const { calls, client } = recordingClient();
    for (let i = 0; i < 120; i += 1) track('calculator_started', { i });
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    expect(calls).toHaveLength(50);
  });

  it('forwards event name and properties once enabled', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    track('result_completed', { mode: 'preset', recipe: 'negroni', bottle_ml: 750, freezer_safe: true });
    expect(calls).toEqual([
      {
        event: 'result_completed',
        props: { mode: 'preset', recipe: 'negroni', bottle_ml: 750, freezer_safe: true },
      },
    ]);
  });

  it('captures an empty property object when no props are supplied', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    track('share_created');
    expect(calls).toEqual([{ event: 'share_created', props: {} }]);
  });

  it('initialises at most once', async () => {
    const first = recordingClient();
    const second = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client: first.client });
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client: second.client });
    track('calculator_started');
    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(0);
  });

  it('never lets a throwing client break the caller', async () => {
    const client: AnalyticsClient = {
      capture() {
        throw new Error('posthog exploded');
      },
    };
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    expect(() => track('share_created', { mode: 'custom' })).not.toThrow();
  });

  it('ignores empty event names', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    track('');
    expect(calls).toEqual([]);
  });
});

describe('sanitizeProps — PII and type guard', () => {
  it('keeps primitives', () => {
    expect(sanitizeProps({ mode: 'custom', bottle_ml: 750, freezer_safe: false })).toEqual({
      mode: 'custom',
      bottle_ml: 750,
      freezer_safe: false,
    });
  });

  it('strips strings longer than 64 characters', () => {
    const longValue = 'x'.repeat(65);
    expect(sanitizeProps({ recipe: 'negroni', note: longValue })).toEqual({ recipe: 'negroni' });
  });

  it('keeps a string of exactly 64 characters', () => {
    const boundary = 'x'.repeat(64);
    expect(sanitizeProps({ note: boundary })).toEqual({ note: boundary });
  });

  it('strips anything that looks like an email address', () => {
    expect(sanitizeProps({ mode: 'custom', who: 'person@example.com' })).toEqual({ mode: 'custom' });
    expect(sanitizeProps({ who: 'Contact person@example.co.uk now' })).toEqual({});
  });

  it('drops non-primitive values', () => {
    expect(
      sanitizeProps({
        mode: 'custom',
        ingredients: [{ name: 'Gin' }],
        nested: { a: 1 },
        missing: undefined,
        empty: null,
        fn: () => 'nope',
      } as unknown as Record<string, unknown>),
    ).toEqual({ mode: 'custom' });
  });

  it('drops non-finite numbers', () => {
    expect(sanitizeProps({ a: NaN, b: Infinity, c: 12 })).toEqual({ c: 12 });
  });

  it('handles missing or non-object input', () => {
    expect(sanitizeProps()).toEqual({});
    expect(sanitizeProps(null)).toEqual({});
  });

  // Note: the wrapper's guard is length + email pattern. A short free-text value
  // would still pass, so call-site discipline (never passing names/emails) is the
  // primary control; this asserts the backstop, not a substitute for it.
  it('strips long free-text and email-shaped values passed through track', async () => {
    const { calls, client } = recordingClient();
    await initAnalytics({ key: 'phc_abc', doNotTrack: null, client });
    track('result_completed', {
      mode: 'custom',
      // The kind of value that must never leave the browser.
      ingredient: 'My secret barrel-aged overproof thing that I named after the street I grew up on',
      email: 'person@example.com',
    });
    expect(calls[0].props).toEqual({ mode: 'custom' });
  });
});

describe('property helpers', () => {
  it('classifies page types', () => {
    expect(pageType('/')).toBe('home');
    expect(pageType('/cocktails/negroni/')).toBe('recipe');
    expect(pageType('/cocktails/')).toBe('other');
    expect(pageType('/blog/dilution-guide/')).toBe('guide');
    expect(pageType('/how-it-works/')).toBe('guide');
    expect(pageType('/privacy/')).toBe('other');
  });

  it('maps placements', () => {
    expect(affiliatePlacement('/')).toBe('homepage');
    expect(affiliatePlacement('/cocktails/negroni/')).toBe('recipe-page');
    expect(affiliatePlacement('/blog/dilution-guide/')).toBe('guide');
    expect(affiliatePlacement('/terms/')).toBe('other');
  });

  it('maps signup placements, and closes the vocabulary', () => {
    expect(signupPlacement('inline-post-calculator')).toBe('inline-post-calculator');
    expect(signupPlacement('page-bottom')).toBe('page-bottom');
    expect(signupPlacement('homepage-footer')).toBe('homepage-footer');
    // Anything unrecognised collapses to 'other' rather than opening a
    // free-text dimension — a recipe page renders two of these, and a typo in
    // one `placement` attribute must not silently create a new bucket.
    expect(signupPlacement('page_bottom')).toBe('other');
    expect(signupPlacement('')).toBe('other');
    expect(signupPlacement(undefined)).toBe('other');
    expect(signupPlacement(null)).toBe('other');
  });

  it('identifies affiliate retailers', () => {
    expect(retailerFromUrl('https://www.amazon.com/dp/B000')).toBe('amazon');
    expect(retailerFromUrl('https://amzn.to/abc')).toBe('amazon');
    expect(retailerFromUrl('https://www.stocktheevent.com')).toBe('stocktheevent');
    expect(retailerFromUrl('https://freezerbatchcocktails.com/cocktails/')).toBe(null);
    expect(retailerFromUrl('/cocktails/negroni/')).toBe(null);
    expect(retailerFromUrl('not a url')).toBe(null);
  });

  it('does not treat a lookalike host as an affiliate', () => {
    expect(retailerFromUrl('https://notamazon.com/dp/B000')).toBe(null);
    expect(retailerFromUrl('https://amazon.com.evil.test/dp/B000')).toBe(null);
  });

  it('bands ABV into 5-point buckets', () => {
    expect(abvBand(22.4)).toBe('20-25');
    expect(abvBand(25)).toBe('25-30');
    expect(abvBand(0)).toBe('0-5');
    expect(abvBand(61)).toBe('60-plus');
    expect(abvBand(NaN)).toBe('unknown');
    expect(abvBand(-3)).toBe('unknown');
  });
});
