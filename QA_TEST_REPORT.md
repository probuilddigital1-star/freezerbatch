# QA Test Report — FreezerBatchCocktails.com

**Date:** August 4, 2026
**Supersedes:** the January 9, 2026 report, which described a pre-redesign site
(13 recipes, old selectors) and had gone stale.

## Current state — all suites green

| Suite | Command | Tests | Result |
|---|---|---|---|
| Unit (vitest) | `npm run test:unit` | 112 | 112 pass |
| E2E default (Playwright, chromium) | `npm run test:e2e` | 75 | 75 pass |
| E2E analytics-enabled | `npm run test:e2e:analytics` | 14 | 14 pass |
| Build + types | `npm run build` (runs `astro check`) | 30 pages | 0 errors, 0 warnings |

## The 2026-08-04 repair

The suite carried 17 failures inherited from the site redesign — 11 in
`calculator.spec.ts`, 6 in `responsive.spec.ts`. Every one was triaged
individually as stale-vs-defect. **Verdict: all 17 stale, zero site defects.**
Root causes, in order of blast radius:

1. **Preset mode is now the calculator's default.** The custom-recipe form
   (ingredient rows, dilution controls) is hidden on load, so every test that
   filled `.ingredient-row` inputs without first entering custom mode timed out
   on hidden elements (11 tests). Fix: an `enterCustomMode()` helper that clicks
   `[data-mode="custom"]` and waits for `#custom-recipe-form`; the mode-toggle
   test now asserts the new default direction explicitly.
2. **`.card` → `.recipe-card`** in the CocktailCard redesign (3 tests).
3. **New hero copy** — heading assertion updated to the current headline (1).
4. **Mobile menu restructure** — the brand link left `#mobile-menu`; the test
   now asserts the `/cocktails` and `/#calculator` links instead (1).
5. **Small-mobile usability** — asserts preset tiles, then enters custom mode
   before expecting `#add-ingredient` (1).

Assertion intent was preserved throughout — selectors and setup steps changed,
what each test proves did not. Two TypeScript warnings (`tolerance` unused,
`devices` unused) were also fixed; the `tolerance` one became a real assertion
(ml within 10% of oz × 29.5735).

## Config hardening (same date)

Stale dev servers from another project once squatted ports 4321–4325 and the
suite silently tested the wrong site (HTTP 200 alone proves nothing — this
site's 404 page returns 200). Both Playwright configs now:

- run on **dedicated ports** (default suite 4381, analytics 4382) instead of
  Astro's 4321 default;
- set **`reuseExistingServer: false` unconditionally** — anything already
  listening on the port fails the run loudly instead of being tested by
  accident;
- bound local parallelism at **`workers: 2`** (CI stays at 1);
- default suite reporter is `html` with `open: 'never'`.

## Known scope limits

- Chromium only; no WebKit/Firefox projects.
- No visual-regression coverage.
- E2E runs against `astro dev`, not a production build (the analytics suite
  injects its key via the dev server env).

## Sign-off

| Check | Status |
|---|---|
| 17 inherited failures triaged individually | done — 17 stale, 0 defects |
| Full default suite | 75/75 pass (1.7m) |
| Analytics suite | 14/14 pass (20s) |
| Unit suite | 112/112 pass |
| `astro check` | 0 errors, 0 warnings |
