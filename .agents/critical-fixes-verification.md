# Critical Fixes Verification Report

**Verifier:** A8, integration verification
**Branch:** `cf/a8-verify`
**Merged baseline:** `75ccbc9` (`critical-fixes`, after A7)
**Date:** 2026-07-24
**Result:** **FAIL - one product defect requires an A6-owned fix and A8 rerun**

## Definition of Done

| Code-verifiable item | Result | Evidence |
|---|---|---|
| Unit suite | PASS | `npm run test:unit`: 4 files, 80 tests passed. |
| Critical unit suite | PASS | `npm run test:critical`: 4 files, 80 tests passed. The managed filesystem sandbox produced a reproducible esbuild `Access is denied` startup failure; the same repository command passed outside that sandbox. |
| Astro diagnostics | PASS | `npx astro check`: 49 files, 0 errors, 6 pre-existing hints. |
| Static production build | PASS | `npm run build`: Astro diagnostics passed and 30 pages built. |
| First-party host guard | PASS | `npm run check:hosts` exited 0. A direct production-surface sweep found no `www.freezerbatchcocktails.com`; the only repository helper occurrence outside plans/docs is the intentional sentinel in `scripts/check-first-party-hosts.mjs:4`. |
| Canonical URLs exclude query and fragment state | PASS | Built `dist/**/*.html` had no canonical matching `rel="canonical" href="...?...` or `#`; samples were apex `/` and `/cocktails/negroni/`. |
| Critical Playwright suites | PASS | `npx playwright test tests/injection.spec.ts tests/share.spec.ts tests/email-forms.spec.ts`: 17/17 passed. |
| User-controlled calculator text is not injected as HTML | PASS | `rg "innerHTML\\s*=|insertAdjacentHTML|outerHTML\\s*=" src/components/Calculator.astro` finds only `Calculator.astro:1067`. That renderer is reached only after the allow-listed preset lookup at `:1012-1019`; its authored-data boundary is documented at `:1184-1187`. Custom names use DOM construction and `textContent` at `:1413-1460`. Browser injection tests passed. |
| Browser code contains no n8n webhook URL | PASS | URL sweep under `src/` returned no n8n/webhook host. Privacy copy names n8n as a processor but contains no endpoint. |
| No committed secret or hosted webhook literal in `functions/` or `n8n/` | PASS | Secret-signature and hosted-webhook URL sweeps returned no credential material. Runtime values are environment references (`functions/api/email.ts:7-10`, `n8n/FreezerBatchCocktails-v2.json:19,127,200,236,286,341,372`). Function tests contain only obvious placeholder values and an `.invalid` URL. The preserved v1 export contains n8n credential ID/name metadata, not a credential value. |
| Hostile valid ingredient text remains inert | PASS | `tests/critical-verification.spec.ts:62-76`: a literal `<script>` ingredient hydrates as text, creates no script element, and executes nothing. This is the C2-required behavior for a structurally valid name. |
| Invalid versioned shares fail closed | PASS | `tests/critical-verification.spec.ts:78-105`: 9 ingredients, bottle 5000, dilution 90, `v2.`, and truncated Base64URL all showed defaults, applied no partial fields, rendered no hostile name, and left the calculator usable. |
| Explicit C1 base-spirit selection survives browser hydration/share | **FAIL** | `tests/critical-verification.spec.ts:141-177` expected `[false, true, false]` and received `[true, false, false]`. See product bug CFV-1. |
| Legacy share compatibility and hostile rejection | PASS | `tests/critical-verification.spec.ts:107-139`: exact `?recipe=negroni&bottle=750` and a valid legacy custom URL hydrate; a hostile 9-row legacy payload is rejected without rendering. |
| C6 n8n action matrix is encoded without cross-branch effects | PASS | `node n8n/FreezerBatchCocktails-v2.static-test.mjs` passed. The structural assertions are at `n8n/FreezerBatchCocktails-v2.static-test.mjs:49-115`. Detailed trace follows below. |
| Functions route scope | PASS | `public/_routes.json:1-5` is exactly version 1, include `["/api/*"]`, exclude `[]`. |
| Vitest cannot collect Playwright specs | PASS | `vitest.config.ts:3-6` includes only `src/**/*.test.ts` and `functions/**/*.test.ts`. Both Vitest commands collected four unit files and no `tests/*.spec.ts`. |

## Product bugs

### CFV-1: Valid custom share loses its explicit base-spirit selection

**Severity:** Contract/integration defect; can change the chosen source bottle, visible result, and state emitted by a subsequent share.

**Failing regression:** `tests/critical-verification.spec.ts:141-177`

Reproduction state:

```text
Overproof modifier  50% ABV  isBaseSpirit=false
Base whiskey        40% ABV  isBaseSpirit=true
Vermouth            16% ABV  isBaseSpirit=false
```

The URL is accepted as a valid C1/C2 custom share. After hydration, sharing it again emits:

```text
expected: [false, true, false]
received: [true, false, false]
```

Root cause evidence:

- `src/components/Calculator.astro:694-699` hydrates only `name`, `amount`, and `abv`; it discards validated `isBaseSpirit`.
- `src/components/Calculator.astro:1340-1349` then reconstructs the base flag as the first ingredient with ABV at least 20%.

A8 did not patch product code. This must return to the calculator/share owner, then the A8 suite and all gates must be rerun.

## C6 n8n v2 trace

`Route by action` is the only Switch and has exactly three cases plus fallback:

| Input | Static path | Transactional recipe | CRM marketing | Welcome/confirm | Unsubscribe update |
|---|---|---:|---|---:|---:|
| `send_recipe`, consent false | Build/send recipe -> restore request -> consent false -> respond | 1 | unchanged | 0 | 0 |
| `send_recipe`, consent true | Build/send recipe -> restore request -> consent true -> prepare/upsert pending -> build/send confirmation -> respond | 1 | pending | 1 | 0 |
| `subscribe` | prepare consent -> upsert pending -> build/send confirmation -> respond | 0 | pending | 1 | 0 |
| `unsubscribe` | append-or-update unsubscribed -> respond | 0 | unsubscribed | 0 | 1 |
| fallback/invalid | respond invalid action | 0 | unchanged | 0 | 0 |

Additional static evidence:

- All 25 nodes are reachable and all connection endpoints exist.
- Every action-owned downstream node is reachable from exactly one Switch output.
- Unsubscribe and invalid action reach no Resend node.
- Transactional Resend uses the request ID as `Idempotency-Key`; consent messages use a deterministic `-consent` suffix so the two intended messages do not collide.
- The v2 export contains no embedded n8n credential object/value.
- Auth failure routes directly to a 401 response before the action Switch.

## Stale Playwright debt observed

The three older suites were run separately:

```text
npx playwright test tests/calculator.spec.ts tests/margarita-milkstreet.spec.ts tests/responsive.spec.ts
30 passed, 17 failed
```

These failures predate and are unrelated to CFV-1; A8 did not repair them:

- `tests/calculator.spec.ts`: 11 failures. Most custom/edge/dilution/suggestion cases try to fill custom inputs while the new default Recipe mode keeps those inputs hidden. The mode-toggle case also asserts stale active-state behavior.
- `tests/responsive.spec.ts`: 6 failures from stale `.card` selectors, old hero copy (`Cocktails That Wait`), an obsolete mobile-menu home-link expectation, and expecting the custom-only Add Ingredient control while Recipe mode is active.
- `tests/margarita-milkstreet.spec.ts` passed within the combined run.

The prompt explicitly excludes full legacy-suite repair.

## Access-gated items not verifiable in this repository

| Item | Human Checklist mapping |
|---|---|
| Live `www` -> apex redirect, preservation of path/query, HTTP/HTTPS matrix | Phase 1 items 1-5, especially redirect item 2 and matrix item 3 |
| Production and preview Turnstile end-to-end behavior and bindings | Phase 3 item 6 |
| Pages n8n URL/secret bindings and matching live n8n secret | Phase 3 item 7 |
| Live n8n staging truth table, hostile HTML, and duplicate-ID delivery | Phase 3 item 8 |
| Resend delivery, sender verification, SPF, DKIM, DMARC, and marketing headers | Phase 3 item 9 |
| WAF rate rule behavior and false positives | Phase 3 item 10 |
| Coordinated Function/workflow cutover and old-webhook shutdown | Phase 3 item 11 |
| 48-hour Function, Turnstile, n8n, Resend, CRM, and share-error observation | Phase 4 |

## Required rerun after CFV-1 is fixed

```text
npm run test:unit
npm run test:critical
npm run build
npx astro check
npm run check:hosts
npx playwright test tests/injection.spec.ts tests/share.spec.ts tests/email-forms.spec.ts
npx playwright test tests/critical-verification.spec.ts
node n8n/FreezerBatchCocktails-v2.static-test.mjs
```

Final acceptance requires every command above to pass, followed by the access-gated Human Checklist.
