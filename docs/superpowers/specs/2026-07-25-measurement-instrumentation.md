# Measurement & Event Instrumentation Scope

**Date:** 2026-07-25
**Status:** approved for implementation (provider decision: PostHog, made 2026-07-25)
**Scope:** P1 "Instrument the funnel" workstream from the growth audit
**Estimated engineering effort:** 1–2 focused days
**Depends on:** critical-fixes project (shipped 2026-07-25); PostHog account + project key (user-created)

## Objective

Make the repaired acquisition loop observable. After this project we can answer, from one dashboard: how many visitors start and complete a calculation, how many share, how many shared links get opened and convert to new results, how many email signups occur and from where, and which affiliate placements earn clicks.

## Provider decision

**PostHog Cloud (US), anonymous/cookieless configuration.**

- Free tier (1M events/mo) covers projected volume by ~100×; funnels included free.
- Anonymous events only: no cookies, no consent banner, consistent with the published privacy policy.
- Autocapture **disabled** — explicit events only, so the data stays legible and payloads small.
- Extras (session replay, A/B flags) intentionally NOT enabled in this phase.

## Non-negotiable constraints

- **No PII in any event.** Never capture email addresses, custom ingredient names, or free-text input as event properties. Recipe slugs, bottle sizes, booleans, and counts are fine.
- **Fail-closed, like Turnstile:** with no `PUBLIC_POSTHOG_KEY` at build time, the analytics module is a no-op. Local dev and forks emit nothing.
- **No cookies / localStorage persistence** (`persistence: 'memory'`); `person_profiles: 'identified_only'` and we never call `identify()`, so every event stays anonymous.
- Respect `navigator.doNotTrack === "1"` → no-op.
- No blocking scripts: analytics loads async/deferred; calculator behavior must be identical with analytics absent, blocked (adblock), or failed.
- Do not modify calculator math, share-state, or email API behavior in this project.

## Event schema (v1)

| Event | Fires when | Properties |
|---|---|---|
| `$pageview` | built-in, per page load | default PostHog props (URL, referrer, UTM) |
| `calculator_started` | first meaningful interaction with the calculator per page load (mode toggle, recipe select, or input focus) | `mode`, `page_type` (home/recipe) |
| `recipe_selected` | preset chosen | `recipe` (slug) |
| `result_completed` | a valid calculation renders **from an interaction or a shared link** (debounced: once per distinct **trigger**+recipe+bottle+mode combination per page load) | `trigger` (user/shared_link), `mode`, `recipe` (slug or "custom"), `bottle_ml`, `freezer_safe` (bool), `abv_band` (e.g. "20-25", not raw) |
| `share_created` | share URL successfully produced (Web Share invoked or clipboard copy) | `mode`, `method` (webshare/clipboard), `target` (canonical-recipe/homepage-custom) |
| `share_failed_too_large` | the >1,800-char copy-recipe fallback triggers | `mode` |
| `shared_link_opened` | URL state hydration attempt on page load | `mode`, `format` (batch-v1/legacy), `valid` (bool) |
| `email_recipe_sent` | `/api/email` returns 202 for send_recipe | `consent` (bool), `mode` |
| `newsletter_optin` | 202 for subscribe | `page_type` |
| `affiliate_click` | click on an outbound Amazon/StockTheEvent link | `retailer` (amazon/stocktheevent), `placement` (recipe-page/homepage/guide), `page` (path) |

`trigger` records where a rendered result came from: `user` (after a real interaction) or
`shared_link` (hydrated `?batch=` or legacy URL state). A result rendered from page
defaults alone is **not** emitted — see the 2026-08-19 revision.

Reserved names for later phases (do not implement now): `plan_saved`, `host_mode_checkout`, `purchase`.

## Schema revisions

- **2026-07-26 — added `trigger` to `result_completed`.** Events captured before this
  date have no `trigger` property and should be treated as legacy (a handful of sessions
  only). The debounce key also became trigger-aware, so one page load can now emit both
  an `auto` and a `user` result for the same recipe+bottle+mode.
- **2026-08-19 — `result_completed` no longer fires with `trigger: 'auto'`.** A preset
  rendering its own default on page load is not a completion, and the `$pageview` on that
  recipe page already records the visit. It also fired before `initAnalytics()` had
  settled, landing ahead of `$pageview` and stamping the page load's first event
  `$recording_status: disabled`. `auto` remains a legacy value in data captured before
  this date; every analysis already filtered to `trigger = 'user'`, so none were affected.
- **2026-08-19 — persistence changed from `memory` to `localStorage`.** `memory` reset
  identity on every navigation (a static site, so every navigation is a full load): one
  visitor counted as many, replays fragmented into one recording per pageview, and
  retention and cross-page funnels unmeasurable. Verified fixed in production: one
  `$device_id` and one `$session_id` across a three-page visit, and a single 208-second
  recording spanning all three pages, where the same journey on `memory` produced separate
  recordings with different `distinct_id`s. First-party localStorage only — deliberately
  **not** `localStorage+cookie`, so nothing is attached to a request. Every device gets one
  fresh identity at the deploy, which is the boundary for before/after comparisons.

### Open: batched event delivery is failing (2026-08-19)

Since some point after 2026-08-17 18:44 UTC, the only event type arriving is `$pageleave`
— the one event posthog-js sends via `sendBeacon` instead of the batched `/e/` queue.
`$pageview`, `$web_vitals`, `calculator_started` and `result_completed` are captured and
silently never sent. No `/e/` request is issued in 60+ seconds on an open page, while
replay `/s/` snapshots keep flowing normally, so replay is unaffected.

This was first mistaken for a side effect of the persistence change. It is not: it
reproduced identically after reverting to `memory`, which is why persistence was restored.

Ruled out so far: client rate limiting (`$capture_rate_limit` at 99/100 tokens), project
quota (4–101 events/day), opt-out state (no `__ph_opt_in_out_` key in either storage), a
stuck retry queue, bot classification (`Regular`, `$virt_is_bot` false), ingestion lag
(30+ minutes), endpoint reachability (`POST /e/` from the page returns 400, so nothing is
blocking it), and server-side dropping (GeoIP is the only pipeline transformation).

All observations come from one automated Chrome profile, so **whether real visitors are
affected is still unconfirmed** — traffic is too low to tell from data alone. Next steps:
check for non-synthetic events arriving, and reproduce with `debug: true` to see what
posthog-js does with the queue.

`unsubscribe` is deliberately **not** tracked — negligible analytical value, disproportionate privacy sensitivity.

## Implementation plan

### WP-1: analytics module (0.5 day)

`src/lib/analytics.ts`:

- `initAnalytics()` — no-op unless `import.meta.env.PUBLIC_POSTHOG_KEY` exists and DNT is unset; loads `posthog-js` async with `autocapture: false`, `capture_pageview: true`, `persistence: 'localStorage'`, `person_profiles: 'identified_only'`, host from `PUBLIC_POSTHOG_HOST`.
- `track(event: string, props?: Record<string, string | number | boolean>)` — safe wrapper: silently no-ops if PostHog absent/failed. All call sites use this; nothing imports posthog directly.
- Unit tests: no-op without key; no-op under DNT; track forwards name+props; property values restricted to primitives.

### WP-2: wire events (0.5–1 day)

- `Layout.astro`: init once; delegated click listener for `affiliate_click` (match `amazon.com`/`amzn.to`/StockTheEvent hosts; derive `placement` from page type).
- `Calculator.astro`: `calculator_started`, `recipe_selected`, `result_completed` (respect `isHydrating` — hydration then fires `shared_link_opened` + one `result_completed` with `mode` only after successful hydration), `share_created`, `share_failed_too_large`, `email_recipe_sent`.
- `EmailSignup.astro`: `newsletter_optin` on 202.
- Guard rails: event calls sit AFTER existing behavior succeeds; a thrown analytics error must never break the feature (wrapper catches).

### WP-3: environment & deploy (0.5 day, includes user account setup)

- User creates PostHog project; values `PUBLIC_POSTHOG_KEY` (public token, plaintext) and `PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com`) added to Pages Production + Preview.
- Preview deploy first: verify events arrive in PostHog Activity view; verify zero console errors with adblock enabled.
- Privacy policy: analytics paragraph names PostHog, anonymous/cookieless operation; add PostHog to processors list.

### WP-4: dashboards (0.5 day, in PostHog UI)

Create and pin one dashboard, "FBC Funnel", with four insights:

1. **Activation funnel:** `$pageview` → `calculator_started` → `result_completed`
   (weekly). The final step **must filter `result_completed` to `trigger = user`** —
   unfiltered, recipe pages emit an `auto` result on load and the funnel reads as ~100%
   conversion with 0% `calculator_started`.
2. **Share loop:** `result_completed` → `share_created`; and separately `shared_link_opened` → `result_completed` (same-session), the recipient-activation rate.
3. **Email conversion:** `$pageview` → `newsletter_optin` + `email_recipe_sent` split by `consent`.
4. **Affiliate:** `affiliate_click` by `retailer`/`placement`, weekly trend.

## Acceptance criteria

- No network requests to PostHog when key absent or DNT set; site functions identically with analytics blocked.
- No PII property ever sent (test asserts the `track` wrapper rejects/strips string props over 64 chars and anything matching an email pattern).
- Each v1 event observable in PostHog from a preview deploy walkthrough.
- Lighthouse performance delta ≤ 2 points on homepage vs pre-analytics baseline.
- `npm run build` 0 errors / 30 pages; existing unit + critical Playwright suites stay green.
- Privacy policy updated in the same PR.

## Test plan

- Unit: analytics wrapper behavior (no-op paths, PII guard, prop types).
- Playwright: stub `window.posthog`; assert `calculator_started`/`result_completed`/`share_created` sequence on a preset flow, `shared_link_opened` on a `?batch=` load, `affiliate_click` on a mocked affiliate anchor, and zero capture calls when key is absent.
- Manual (preview): PostHog Activity live view during one full walkthrough of the four funnels.

## Rollout

1. Implement on branch `measurement`, PR gates: build + unit + focused Playwright.
2. Preview deploy → manual event verification → merge to main.
3. Build dashboards, pin, bookmark.
4. Baseline week: no decisions off the first 7 days of data (novelty + own-traffic noise); add own-IP filter in PostHog project settings.

## Explicitly deferred

- Session replay, A/B testing, feature flags, surveys.
- Server-side event capture from the Pages Function.
- Revenue/affiliate attribution beyond click counts.
- Backfilling any historical estimates.
