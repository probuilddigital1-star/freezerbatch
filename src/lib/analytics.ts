/**
 * Anonymous, cookieless analytics wrapper (PostHog).
 *
 * Design rules, from docs/superpowers/specs/2026-07-25-measurement-instrumentation.md:
 *
 * - Fail closed. With no `PUBLIC_POSTHOG_KEY` at build time, or with Do Not Track
 *   set, every entry point here is a no-op and nothing is loaded or sent.
 * - No PII, ever. `sanitizeProps` drops anything that is not a plain primitive,
 *   any string longer than 64 characters, and anything that looks like an email
 *   address. Recipe slugs, bottle sizes, counts, and booleans are the intended
 *   payload; ingredient names and email addresses must never reach this module.
 * - Never break the feature. `track` swallows every error: analytics failures
 *   must not affect calculator, share, or form behavior.
 *
 * Nothing outside this module imports `posthog-js` directly.
 */

/** Property values we are willing to send. Anything else is dropped. */
export type EventProps = Record<string, string | number | boolean>;

export interface AnalyticsClient {
  capture(event: string, props?: EventProps): void;
}

interface InitOptions {
  /** Overrides the build-time key. Used by tests. */
  key?: string;
  /** Overrides the navigator DNT reading. Used by tests. */
  doNotTrack?: string | null;
  /** Supplies a client instead of loading posthog-js. Used by tests. */
  client?: AnalyticsClient;
}

/** Strings longer than this are assumed to be free text and are dropped. */
const MAX_STRING_LENGTH = 64;

/** Deliberately loose: we want false positives here, not false negatives. */
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

let client: AnalyticsClient | null = null;
let enabled = false;
let initialized = false;
/**
 * `initAnalytics` is async (it dynamically imports posthog-js), but events can
 * fire before it settles — the calculator emits `shared_link_opened` during its
 * `connectedCallback`. Buffer those instead of dropping them, then flush once we
 * know whether analytics is permitted. Bounded so a disabled build cannot grow
 * this without limit.
 */
let ready = false;
const MAX_QUEUED_EVENTS = 50;
const queue: Array<{ event: string; props: EventProps }> = [];

/**
 * Analytics runs only with a key present and Do Not Track unset. Pure so the
 * decision can be tested without a browser.
 */
export function analyticsAllowed(key: string | undefined | null, doNotTrack: string | null | undefined): boolean {
  if (typeof key !== 'string' || key.trim() === '') return false;
  return doNotTrack !== '1';
}

/**
 * Reduce arbitrary input to the primitive, non-identifying subset we allow.
 * Silently drops anything questionable rather than throwing — a bad property
 * must never cost us the event, and must never leak.
 */
export function sanitizeProps(props?: Record<string, unknown> | null): EventProps {
  const safe: EventProps = {};
  if (!props || typeof props !== 'object') return safe;

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'boolean') {
      safe[key] = value;
      continue;
    }
    if (typeof value === 'number') {
      // NaN/Infinity serialize badly and carry no analytical meaning.
      if (Number.isFinite(value)) safe[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LENGTH) continue;
      if (EMAIL_PATTERN.test(value)) continue;
      safe[key] = value;
      continue;
    }
    // Objects, arrays, null, undefined, functions, symbols: dropped.
  }

  return safe;
}

/** Coarse page classification, so we never send a raw path as a dimension. */
export function pageType(pathname: string): 'home' | 'recipe' | 'guide' | 'other' {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/cocktails/') && pathname !== '/cocktails/') return 'recipe';
  if (pathname.startsWith('/blog/') || pathname.startsWith('/how-it-works')) return 'guide';
  return 'other';
}

/** Affiliate placement uses its own vocabulary per the event schema. */
export function affiliatePlacement(pathname: string): 'homepage' | 'recipe-page' | 'guide' | 'other' {
  const type = pageType(pathname);
  if (type === 'home') return 'homepage';
  if (type === 'recipe') return 'recipe-page';
  if (type === 'guide') return 'guide';
  return 'other';
}

/** Which outbound partner a URL points at, or null when it is not an affiliate link. */
export function retailerFromUrl(url: string): 'amazon' | 'stocktheevent' | null {
  let host: string;
  try {
    host = new URL(url, 'https://freezerbatchcocktails.com').hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === 'amzn.to' || host === 'amazon.com' || host.endsWith('.amazon.com')) return 'amazon';
  if (host === 'stocktheevent.com' || host.endsWith('.stocktheevent.com')) return 'stocktheevent';
  return null;
}

/**
 * Bucket ABV into 5-point bands so we never store a raw computed value that
 * could, combined with other properties, describe one person's exact recipe.
 */
export function abvBand(abv: number): string {
  if (!Number.isFinite(abv) || abv < 0) return 'unknown';
  if (abv >= 60) return '60-plus';
  const low = Math.floor(abv / 5) * 5;
  return `${low}-${low + 5}`;
}

function readEnvKey(): string | undefined {
  try {
    return import.meta.env?.PUBLIC_POSTHOG_KEY as string | undefined;
  } catch {
    return undefined;
  }
}

function readEnvHost(): string {
  try {
    return (import.meta.env?.PUBLIC_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';
  } catch {
    return 'https://us.i.posthog.com';
  }
}

function readDoNotTrack(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.doNotTrack ?? null;
}

/**
 * Initialise analytics at most once. Safe to call unconditionally: it returns
 * without loading anything when analytics is not permitted.
 */
export async function initAnalytics(options: InitOptions = {}): Promise<void> {
  if (initialized) return;
  initialized = true;

  const key = options.key ?? readEnvKey();
  const doNotTrack = options.doNotTrack !== undefined ? options.doNotTrack : readDoNotTrack();

  if (!analyticsAllowed(key, doNotTrack)) {
    settle();
    return;
  }

  try {
    if (options.client) {
      client = options.client;
    } else if (typeof window !== 'undefined' && (window as unknown as { posthog?: AnalyticsClient }).posthog) {
      // Already present (pre-loaded, or stubbed by a test): reuse rather than
      // loading a second copy.
      client = (window as unknown as { posthog: AnalyticsClient }).posthog;
    } else {
      // Dynamic import keeps posthog-js out of the main bundle and off the
      // network entirely when analytics is disabled.
      const { default: posthog } = await import('posthog-js');
      posthog.init(key as string, {
        api_host: readEnvHost(),
        autocapture: false,
        capture_pageview: true,
        persistence: 'memory',
        person_profiles: 'identified_only',
        disable_session_recording: true,
      });
      client = posthog as unknown as AnalyticsClient;
    }
    enabled = true;
  } catch {
    // Blocked by an extension, offline, chunk failed: stay silent and disabled.
    client = null;
    enabled = false;
  }

  settle();
}

/**
 * Mark init complete and drain anything captured while it was in flight —
 * forwarding when analytics is on, discarding when it is off.
 */
function settle(): void {
  ready = true;
  if (enabled && client) {
    for (const queued of queue.splice(0, queue.length)) {
      try {
        client.capture(queued.event, queued.props);
      } catch {
        // Same contract as track(): never surface an analytics failure.
      }
    }
  }
  queue.length = 0;
}

/**
 * Record an event. Never throws, never blocks, and no-ops whenever analytics
 * is disabled — call sites can use it without defensive wrapping.
 */
export function track(event: string, props?: Record<string, unknown> | null): void {
  if (typeof event !== 'string' || event === '') return;

  // Sanitize up front so queued events carry no PII even before we know whether
  // analytics is enabled.
  const safeProps = sanitizeProps(props);

  if (!ready) {
    if (queue.length < MAX_QUEUED_EVENTS) queue.push({ event, props: safeProps });
    return;
  }

  if (!enabled || !client) return;
  try {
    client.capture(event, safeProps);
  } catch {
    // Analytics must never surface an error to the user-facing flow.
  }
}

/** Test seam: clears module state between cases. */
export function resetAnalytics(): void {
  client = null;
  enabled = false;
  initialized = false;
  ready = false;
  queue.length = 0;
}
