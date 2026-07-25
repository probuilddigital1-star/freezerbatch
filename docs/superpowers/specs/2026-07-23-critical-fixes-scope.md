# Critical Findings Remediation Scope

**Date:** 2026-07-23  
**Status:** proposed for implementation  
**Scope:** the three audit findings marked Critical  
**Estimated engineering effort:** 8–12 focused engineering days, plus access-dependent DNS and email setup  
**Primary deployment:** Cloudflare Pages

## Objective

Remove the three issues that prevent future traffic from compounding safely:

1. `www.freezerbatchcocktails.com` and `freezerbatchcocktails.com` serve different site generations.
2. Shared calculator links do not restore the sender's calculation.
3. User-controlled input and the public email workflow expose injection, abuse, and consent-state risks.

The work should preserve the current calculator math and static Astro delivery while establishing:

- one canonical public site;
- a stable, validated share-state contract;
- a trusted same-origin boundary in front of n8n;
- deterministic transactional, subscription, and unsubscribe behavior.

## Scope boundary

### Included

- CF-01: apex-domain consolidation and production redirect
- CF-02: preset and custom share serialization, parsing, validation, and hydration
- CF-03: browser DOM-injection remediation
- CF-03: same-origin email API boundary using Cloudflare Pages Functions
- CF-03: Turnstile, input validation, rate limiting, and upstream authentication
- CF-03: n8n workflow routing, consent handling, template escaping, and sender cleanup
- Automated tests for every changed behavior
- Production rollout checks and rollback steps

### Explicitly deferred

- New recipe photography and full structured-data improvements
- Shelf-life taxonomy and recipe-data consolidation
- Full repair of all stale Playwright tests
- Dynamic social images for custom recipes
- Saved accounts, database-backed short links, or paid Host Mode
- A general rewrite of n8n, Resend, or Google Sheets
- Migration to a full Astro server adapter

## Non-negotiable constraints

- Do not change calculation formulas or recipe quantities as part of this project.
- The apex host remains canonical: `https://freezerbatchcocktails.com`.
- No production browser code may call the n8n webhook directly.
- Transactional recipe delivery must not create marketing consent.
- Unsubscribe must never trigger a welcome or recipe email.
- Share parsing must fail closed: malformed or excessive state is ignored and never rendered as HTML.
- Existing copied links using the current `recipe`, `ingredients`, and `bottle` parameters receive best-effort backwards compatibility.
- No API key, webhook credential, Turnstile secret, or subscriber data is committed to Git.

## Target architecture

```text
Visitor browser
│
├── Share / open a recipe
│   └── versioned URL state
│       └── pure parser + validator
│           └── calculator hydration
│
└── POST /api/email
    ├── same-origin request
    ├── content-type and body-size enforcement
    ├── honeypot check
    ├── Turnstile Siteverify
    ├── schema and range validation
    ├── action-specific rate controls
    └── authenticated request to n8n
        └── Switch on exactly one action
            ├── send_recipe
            │   ├── send transactional recipe
            │   └── upsert marketing consent only when explicitly checked
            ├── subscribe
            │   └── upsert consent + send confirmation/welcome
            └── unsubscribe
                └── update marketing status only
```

The Astro site remains statically generated. Cloudflare Pages Functions run only for `/api/*`.

---

## CF-01: Consolidate the public domain

### Current state

- The apex domain serves the current 18-recipe design.
- The `www` hostname serves an older site with different content and calculations.
- The intended host redirect is commented out in `public/_redirects`.
- n8n configuration and email fallbacks still use `https://www.freezerbatchcocktails.com`.
- Astro's `site` value, sitemap URLs, and most repository links already use the apex host.

Relevant files:

- `public/_redirects:5`
- `astro.config.mjs:9`
- `src/layouts/Layout.astro:17`
- `src/pages/sitemap-index.xml.ts:4`
- `n8n/FreezerBatchCocktails.json:25`
- `n8n/FreezerBatchCocktails.json:31`
- `n8n/FreezerBatchCocktails.json:77`
- `n8n/FreezerBatchCocktails.json:87`

### Technical decision

Use a Cloudflare zone-level Single Redirect or Bulk Redirect, not Pages `_redirects`.

Cloudflare Pages does not support domain-level redirects in `_redirects`. The rule must execute at the Cloudflare zone edge before either Pages project is selected:

- Match hostname: `www.freezerbatchcocktails.com`
- Destination: `https://freezerbatchcocktails.com` plus the original path
- Status: `301`
- Preserve query string: enabled
- Preserve path: enabled

Reference:

- [Cloudflare Pages redirect limitations](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare redirecting a subdomain to an apex domain](https://developers.cloudflare.com/fundamentals/manage-domains/manage-subdomains/)

### Work package CF-01A: edge and DNS configuration

**Owner:** infrastructure / Cloudflare account holder  
**Estimate:** 1–2 hours, excluding access delays

1. Confirm the `www` DNS record is proxied through Cloudflare.
2. Identify which Pages project currently owns the old `www` custom domain.
3. Create the host redirect as a draft.
4. Test it with a non-production hostname or Cloudflare Trace when possible.
5. Deploy the rule.
6. Once verified, detach `www` from the obsolete Pages project so it cannot accidentally become the origin again.
7. Keep the proxied DNS record and TLS coverage required for the edge redirect.

### Work package CF-01B: repository and automation cleanup

**Owner:** application  
**Estimate:** 0.5 day

1. Replace all n8n site and unsubscribe defaults with the apex host.
2. Update both email-template fallback URLs.
3. Replace the misleading commented domain rule in `_redirects` with a note that host consolidation is managed at the Cloudflare zone.
4. Normalize Layout's default canonical to `Astro.site + pathname`, without query strings or fragments.
5. Add a repository assertion that blocks new first-party `www.freezerbatchcocktails.com` references.
6. Update the audit report after production verification.

Amazon and unrelated external `www` URLs are excluded from the assertion.

### Acceptance criteria

- `http://www.freezerbatchcocktails.com/*` and `https://www.freezerbatchcocktails.com/*` return one permanent redirect to HTTPS apex.
- The original path and query string survive unchanged.
- No `www` request serves a `200` response from the legacy site.
- All first-party canonical, sitemap, Open Graph, email, and unsubscribe URLs use the apex host.
- Redirects do not loop.
- Apex URLs continue serving the current site without an additional host redirect.

### Verification matrix

Test at minimum:

```text
www root
www recipe path
www guide path
www missing path
www path with query string
HTTP www request
HTTPS apex request
```

Expected example:

```text
GET https://www.freezerbatchcocktails.com/cocktails/daiquiri/?utm_source=email
301 Location: https://freezerbatchcocktails.com/cocktails/daiquiri/?utm_source=email
```

### Rollback

- Disable the Cloudflare redirect rule.
- Reattach the old custom domain only if a verified production outage requires it.
- Repository URL cleanup does not need rollback unless email delivery breaks.

---

## CF-02: Make shared calculator links deterministic

### Current state

`shareRecipe()` writes:

- `recipe=<slug>` for presets, or
- `ingredients=<JSON>` for a custom recipe,
- plus `bottle=<milliliters>`.

`connectedCallback()` only checks `data-cocktail`; it never reads the URL.

Relevant files:

- `src/components/Calculator.astro:602`
- `src/components/Calculator.astro:1440`
- `src/lib/calculator.ts`
- `src/pages/index.astro:126`
- `src/pages/cocktails/[slug].astro:197`

### Technical decision

Create a pure, versioned share-state module and keep shared state client-side for this phase.

New module:

```text
src/lib/shareState.ts
```

Suggested contract:

```ts
type ShareStateV1 =
  | {
      v: 1;
      mode: 'preset';
      recipe: string;
      bottleMl: number;
      unit: 'oz' | 'ml';
    }
  | {
      v: 1;
      mode: 'custom';
      bottleMl: number;
      unit: 'oz' | 'ml';
      dilutionPercent: number;
      ingredients: Array<{
        name: string;
        amount: number;
        abv: number;
        isBaseSpirit: boolean;
      }>;
    };
```

### URL design

Preset shares should use the recipe's canonical path:

```text
https://freezerbatchcocktails.com/cocktails/negroni/?batch=v1.<payload>
```

Custom shares should use the homepage calculator:

```text
https://freezerbatchcocktails.com/?batch=v1.<payload>#calculator
```

The payload is compact Base64URL-encoded UTF-8 JSON.

Important properties:

- The encoding is transport encoding, not encryption.
- The version prefix allows future migrations.
- Query-state pages keep the normal page canonical, so they do not create new indexable content.
- A preset selected from the homepage or a different recipe page always shares its own canonical recipe page.

### Validation limits

These limits apply before state can enter the calculator:

| Field | Constraint |
|---|---|
| Version | exactly `1` |
| Mode | `preset` or `custom` |
| Recipe | must exist in `MILK_STREET_BATCHES` |
| Bottle size | integer, 100–3000 ml |
| Unit | `oz` or `ml` |
| Dilution | number, 0–35% |
| Ingredients | 1–8 entries |
| Ingredient name | 1–60 Unicode characters after trim |
| Ingredient amount | finite number, greater than 0, maximum 100 |
| Ingredient ABV | finite number, 0–100 |
| Base spirit | exactly one after normalization |
| Final URL | maximum 1,800 characters |

If the user creates a custom recipe that exceeds the share limit, the UI should offer “Copy recipe” instead of producing a fragile URL.

### Work package CF-02A: pure share-state library

**Estimate:** 1 day

Implement:

- `serializeShareState(state): string`
- `parseShareState(value): ParseResult`
- `parseLegacyShareState(searchParams): ParseResult`
- `buildShareUrl(state, origin): URL`
- normalization and validation helpers
- UTF-8-safe Base64URL helpers

The parser must not mutate calculator data or the DOM.

### Work package CF-02B: calculator hydration

**Estimate:** 1–1.5 days

Refactor calculator initialization:

1. Register event listeners.
2. Parse and validate `batch`.
3. If absent, attempt current legacy parameters.
4. If valid, hydrate the correct mode.
5. If invalid, render normal defaults and an unobtrusive error message.
6. If no URL state exists, use the recipe page's `data-cocktail` value.
7. Otherwise, use homepage defaults.

Preset hydration order:

1. set preset mode;
2. set bottle size;
3. set unit;
4. sync the hidden select and visible tile;
5. load the preset once.

Custom hydration order:

1. set custom mode;
2. clear default ingredient rows;
3. create validated rows with form `.value` properties;
4. set bottle, unit, and dilution;
5. recalculate once.

Avoid cascading repeated calculations while hydrating. A private `isHydrating` flag or one final render call is acceptable.

### Work package CF-02C: share behavior and UX

**Estimate:** 0.5 day

- Replace the current query construction with `buildShareUrl`.
- Use the recipe name in the Web Share title for presets.
- Include a short, responsible-hosting share description where supported.
- Preserve clipboard fallback.
- Show “Shared recipe loaded” after successful hydration.
- Show a clear fallback when a custom recipe is too large to share.
- Leave dynamic custom Open Graph cards for a later server-backed sharing project.

### Backwards compatibility

For one release cycle, support:

```text
?recipe=negroni&bottle=750
?ingredients=<encoded JSON>&bottle=750
```

Legacy custom values still go through the new validation limits. They are never assigned through `innerHTML`.

### Acceptance criteria

- A preset shared from any page opens the matching canonical recipe and reproduces bottle size and unit.
- A custom shared link reproduces mode, ingredients, bottle size, display unit, dilution, result, and freeze status.
- Refreshing a shared link does not change the result.
- Unknown versions, recipes, units, and out-of-range values never throw.
- Malformed JSON or Base64 never produces a partial unsafe state.
- Ingredient names containing HTML render as text.
- Existing query links receive best-effort hydration.
- URLs above the size limit are not shared.
- Standard non-shared page loads behave exactly as before.

### Automated tests

Unit tests in `src/lib/shareState.test.ts`:

- preset round trip
- custom Unicode round trip
- missing and unknown versions
- malformed Base64 and JSON
- unknown recipe
- bottle and dilution boundaries
- ingredient count and length boundaries
- `NaN`, infinity, and non-number rejection
- URL length limit
- legacy parser

Playwright coverage:

- share a Negroni from the homepage and reopen it
- share a non-default bottle size from a recipe page
- share a custom recipe, reload, and compare visible results
- load malicious ingredient text and confirm no script executes
- load malformed state and confirm default UI remains usable
- confirm a different selected preset does not retain the original page's slug

---

## CF-03: Secure custom rendering and email delivery

### Current state

#### Browser rendering

Custom ingredient names enter `renderCompositionBar()` and are interpolated into:

- a `title` attribute;
- visible legend markup;
- a string assigned to `innerHTML`.

Relevant code:

- `src/components/Calculator.astro:1272`
- `src/components/Calculator.astro:1435`

#### Public email surface

Three public forms post directly to the same n8n webhook:

- calculator recipe email;
- newsletter signup;
- unsubscribe.

Relevant code:

- `src/components/Calculator.astro:1546`
- `src/components/EmailSignup.astro:21`
- `src/pages/unsubscribe.astro:8`

The workflow then independently fans each request into:

- “Check Has Recipe”; and
- “Check Action Type”.

This creates non-exclusive behavior. For example, an unsubscribe request has no recipe, so it also follows the welcome-email branch.

The CRM branch writes `Status: subscribed` for recipe-email requests even when the optional marketing checkbox is false.

User-controlled values are interpolated directly into the HTML email.

### Technical decision

Retain n8n as the automation backend, but remove it from the public trust boundary.

Add one same-origin endpoint:

```text
POST /api/email
```

Implemented as:

```text
functions/api/email.ts
functions/_lib/emailPayload.ts
functions/_lib/turnstile.ts
```

The Function validates the browser request and forwards a normalized, authenticated payload to n8n.

Cloudflare Pages Functions support server-side form processing without moving the whole static site to a server-rendered adapter:

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Pages Function environment bindings](https://developers.cloudflare.com/pages/functions/bindings/)

### Public API contract

```ts
type EmailRequest =
  | {
      action: 'send_recipe';
      requestId: string;
      email: string;
      recipe: RecipeEmailPayload;
      marketingConsent: boolean;
      consentVersion?: string;
      page: string;
      turnstileToken: string;
      website?: string; // honeypot; must be empty
    }
  | {
      action: 'subscribe';
      requestId: string;
      email: string;
      consentVersion: string;
      page: string;
      turnstileToken: string;
      website?: string;
    }
  | {
      action: 'unsubscribe';
      requestId: string;
      email: string;
      page: string;
      turnstileToken: string;
      website?: string;
    };
```

The `website` field is a visually hidden honeypot and must remain empty.

### Public response contract

```text
202 { "ok": true }
400 { "ok": false, "code": "invalid_request" }
403 { "ok": false, "code": "verification_failed" }
405 { "ok": false, "code": "method_not_allowed" }
413 { "ok": false, "code": "payload_too_large" }
429 { "ok": false, "code": "rate_limited" }
502 { "ok": false, "code": "upstream_unavailable" }
```

Unsubscribe responses must not reveal whether an address exists.

### Validation rules

- Require `POST`.
- Require `application/json`.
- Reject request bodies above 10 KB before JSON parsing.
- Normalize email case and whitespace; enforce a maximum of 254 characters.
- Allow only known action names and fields.
- Require a UUID request ID.
- Restrict `page` to a same-site path with a maximum length.
- Apply the share-state ingredient count, name, amount, and range limits to custom recipe data.
- For preset recipe email, require an allow-listed preset slug.
- Treat client-calculated ABV, servings, and display values as untrusted presentation values.
- Strip unknown fields before forwarding.
- Do not log full email addresses, raw recipe bodies, or Turnstile tokens.

### Work package CF-03A: remove browser injection paths

**Estimate:** 0.5–1 day

1. Replace `renderCompositionBar(): string` with DOM construction using `createElement`, `.textContent`, and safe style properties.
2. Use `replaceChildren()` instead of assigning generated user content to `innerHTML`.
3. Keep static preset-template rendering separate from custom data.
4. Add field limits to the custom ingredient inputs:
   - `maxlength=60`
   - maximum eight rows
   - explicit amount and ABV maximums
5. Validate again when reading the fields; HTML attributes are UX hints, not security controls.

### Work package CF-03B: Pages Function boundary

**Estimate:** 1.5–2 days

1. Add `/api/email`.
2. Add pure payload validation and normalization helpers.
3. Verify Turnstile through Cloudflare Siteverify. Server-side verification is mandatory:
   - [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
4. Forward normalized requests to n8n with:
   - `X-FBC-Webhook-Secret`
   - `X-FBC-Request-Id`
   - a short upstream timeout
5. Keep the n8n URL and shared secret in Cloudflare runtime secrets.
6. Return stable, non-sensitive error codes.
7. Limit Functions routing to `/api/*` through `_routes.json` so static asset traffic remains static.

Required environment values:

```text
TURNSTILE_SECRET_KEY
N8N_WEBHOOK_URL
N8N_WEBHOOK_SECRET
PUBLIC_TURNSTILE_SITE_KEY
```

Production and preview must use separate Turnstile widgets and secrets.

### Work package CF-03C: form migration and abuse controls

**Estimate:** 1 day

1. Add Turnstile to:
   - recipe email forms;
   - newsletter signup;
   - the public email-address unsubscribe form.
2. Replace all direct n8n URLs with `/api/email`.
3. Send an explicit action from every form.
4. Generate one `crypto.randomUUID()` request ID per user submission and reuse it for retries.
5. Add the honeypot.
6. Map API codes to specific accessible form messages.
7. Disable double submission while a request is active.
8. Reset Turnstile after success or a retryable failure.

Initial Cloudflare WAF rate rule:

- match `POST /api/email`;
- challenge or block after five requests per IP in ten seconds;
- monitor false positives before tightening.

Cloudflare's available counting periods and rule count depend on the zone plan:

- [Cloudflare rate-limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)

Turnstile is the primary bot control. The WAF rule limits bursts. If email bombing still occurs, add a privacy-preserving hashed-email throttle using KV as a follow-up.

### Work package CF-03D: n8n workflow v2

**Estimate:** 1.5–2 days

1. Duplicate the current workflow and leave the original active until staging passes.
2. Require the shared secret from the Pages Function.
3. Normalize the already-validated request into one internal schema.
4. Replace the two parallel IF nodes with one Switch on `action`.
5. Make every action mutually exclusive:

#### `send_recipe`

- Send one transactional recipe email.
- If `marketingConsent` is true, record consent and start the marketing onboarding path.
- If false, do not create or update a marketing subscriber row.
- A requested recipe may still be delivered to an address whose marketing status is unsubscribed.

#### `subscribe`

- Record source, page, consent version, and consent timestamp.
- Recommended: send a confirmation link and activate marketing only after confirmation.
- Minimum P0 fallback: explicit single opt-in with the same consent audit fields.

#### `unsubscribe`

- Mark marketing status unsubscribed.
- Record timestamp and source.
- Send no welcome email and no recipe email.
- Return success even when the row does not exist.

6. HTML-escape every interpolated value, including attribute values.
7. Add a plain-text email body.
8. Update template claims to match the product:
   - 22% pourable threshold;
   - nuanced citrus storage guidance;
   - current dark editorial brand.
9. Use the apex host for every link.
10. Use the request ID as the Resend idempotency key. Resend supports an `Idempotency-Key` header for 24 hours:
    - [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
11. Respond to the Pages Function through an explicit Respond to Webhook node instead of relying on whichever terminal branch finishes last.
12. Disable or protect the original public webhook after production cutover.

### Work package CF-03E: sender and unsubscribe identity

**Owner:** email / DNS account holder  
**Estimate:** 0.5–1 day, excluding DNS propagation

1. Verify `freezerbatchcocktails.com` in Resend.
2. Configure required SPF and DKIM records.
3. Add a DMARC record in monitoring mode if none exists.
4. Change sender to:

```text
Freezer Batch Cocktails <recipes@freezerbatchcocktails.com>
```

5. Set reply-to:

```text
hello@freezerbatchcocktails.com
```

6. Add `List-Unsubscribe` and one-click unsubscribe headers to marketing messages, not one-off requested recipe delivery:
   - [Resend custom headers](https://resend.com/docs/dashboard/emails/custom-headers)
   - [Resend one-click unsubscribe guidance](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails)
7. Update the Privacy Policy to describe Turnstile, the same-origin email API, actual consent behavior, and current email processors.

Tokenized one-click unsubscribe is recommended in the same workstream if marketing email begins immediately. It requires a signed subscriber token or migration to an email audience system that manages preferences. A signed one-click endpoint must validate its token instead of requiring Turnstile, because email clients make that POST automatically. The public form where someone manually enters an email address remains Turnstile-protected.

### Acceptance criteria

#### Browser and API

- No user ingredient value is assigned through `innerHTML`.
- Direct browser code contains no n8n production webhook URL.
- Missing or invalid Turnstile tokens are rejected.
- Invalid actions, fields, ranges, or excessive payloads never reach n8n.
- The API does not expose secrets or full subscriber data in errors or logs.
- Duplicate retries with the same request ID do not send duplicate email.
- All forms remain keyboard and screen-reader usable.

#### Workflow behavior

| Request | Transactional recipe | CRM marketing status | Welcome/confirmation | Unsubscribe update |
|---|---:|---:|---:|---:|
| Recipe, consent false | 1 | unchanged | 0 | 0 |
| Recipe, consent true | 1 | pending/subscribed | 1 | 0 |
| Newsletter signup | 0 | pending/subscribed | 1 | 0 |
| Unsubscribe | 0 | unsubscribed | 0 | 1 |
| Invalid action | 0 | unchanged | 0 | 0 |

#### Deliverability

- Messages pass SPF and DKIM.
- The visible sender uses the Freezer Batch Cocktails domain.
- Marketing messages have working unsubscribe links and headers.
- Recipe messages contain the requested values as plain text and safe HTML.
- Recipe links and unsubscribe links use the apex host.

### Automated tests

Unit tests:

- email payload action discrimination
- email normalization
- payload size and unknown-field rejection
- custom ingredient limits and sanitization
- same-site page-path validation
- honeypot rejection
- Turnstile success, failure, timeout, and duplicate-token responses
- upstream timeout and error mapping

Playwright tests with `/api/email` mocked:

- recipe email without marketing consent
- recipe email with consent
- newsletter signup
- unsubscribe
- accessible loading, success, and error states
- challenge failure and retry
- double-click does not duplicate a request

Staging integration tests:

- valid Turnstile test token reaches n8n v2
- each action executes only its expected branch
- malicious HTML input appears escaped in received email
- duplicate request ID results in one Resend message
- n8n rejects calls without the shared secret
- old direct webhook is disabled or protected after cutover

---

## Cross-cutting test and CI cleanup

This project does not require repairing the entire stale test suite, but the touched paths need trustworthy commands.

Update `package.json` to separate:

```json
{
  "test": "vitest run",
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "test:critical": "vitest run src/lib/shareState.test.ts functions"
}
```

Exact test globs can be adjusted to avoid Vitest loading Playwright suites.

Minimum CI checks for this project:

1. `astro check`
2. `vitest run`
3. production build
4. focused Playwright project for calculator share and email UI
5. repository first-party-host assertion

Production-only redirect checks should run as a post-deploy smoke script, not block a preview build.

---

## Implementation sequence

### Phase 0: access and baseline

1. Confirm Cloudflare zone, Pages project, n8n workflow, Resend, and DNS access.
2. Export and timestamp the active n8n workflow.
3. Record current email delivery and CRM behavior using controlled test addresses.
4. Confirm the current `www` and apex DNS/Pages attachment.

### Phase 1: domain consolidation

1. Deploy and verify the Cloudflare host redirect.
2. Remove stale first-party `www` references from the repository and n8n v2.
3. Verify canonical, sitemap, email, and query preservation.

This phase is independent and can ship first.

### Phase 2: make the browser safe

1. Remove custom-data `innerHTML`.
2. Add share-state parsing and tests.
3. Add share-state hydration and Playwright coverage.
4. Ship share restoration only after the injection test passes.

Security remediation intentionally precedes accepting user data from URLs.

### Phase 3: build the trusted email path

1. Create n8n workflow v2.
2. Add the Pages Function and Turnstile in preview.
3. Run all action-matrix tests against a test CRM sheet and test recipients.
4. Configure the branded sender.
5. Point browser forms to `/api/email`.
6. Deploy the Pages Function and n8n v2 together.
7. Disable or authenticate the old public webhook.

### Phase 4: observe and close

For at least 48 hours, monitor:

- Pages Function 4xx, 429, and 5xx counts;
- Turnstile challenge and failure rates;
- n8n execution errors by action;
- Resend delivery, bounce, and complaint events;
- CRM consent-state anomalies;
- share-link parse errors.

Then:

- remove temporary compatibility logging;
- close the legacy share-query deprecation window when appropriate;
- update the audit status.

---

## Effort and dependencies

| Work package | Estimate | External access required | Blocks |
|---|---:|---|---|
| CF-01A Cloudflare redirect | 1–2 hours | Cloudflare DNS/rules | canonical production state |
| CF-01B URL cleanup | 0.5 day | n8n edit access | clean email links |
| CF-02A share library | 1 day | none | hydration |
| CF-02B hydration | 1–1.5 days | none | working share loop |
| CF-02C share UX | 0.5 day | none | share release |
| CF-03A DOM safety | 0.5–1 day | none | custom share release |
| CF-03B API boundary | 1.5–2 days | Cloudflare Pages | form migration |
| CF-03C forms and abuse controls | 1 day | Turnstile/WAF | email cutover |
| CF-03D n8n v2 | 1.5–2 days | n8n, Google Sheet | email cutover |
| CF-03E sender identity | 0.5–1 day | DNS, Resend | branded production mail |
| Integration and rollout | 1–2 days | all systems | completion |

Expected total: **8–12 engineering days**. Calendar time may be longer if Cloudflare, n8n, Resend, or DNS access is not immediately available.

## Required implementation decisions

### Decision 1: newsletter confirmation

**Recommendation:** double opt-in.

Minimum P0 behavior can remain explicit single opt-in if launch speed is essential, but consent version, source, and timestamp must still be recorded. Double opt-in should be selected before n8n v2 is built to avoid redesigning the state model.

Suggested states:

```text
never_subscribed
pending
subscribed
unsubscribed
```

### Decision 2: custom share persistence

**Recommendation:** client-encoded URLs for this phase.

Database-backed short links would enable shorter URLs, editable saved recipes, and dynamic Open Graph cards, but add persistence, moderation, deletion, and privacy scope. Defer until share adoption is measured.

### Decision 3: email backend

**Recommendation:** retain n8n behind the Pages Function.

Moving Resend and subscriber storage entirely into Cloudflare would reduce system count but materially expands this remediation project. The proxy and deterministic n8n switch address the present risks without a platform migration.

## Definition of done

This critical-fixes project is complete when:

- every `www` page permanently redirects to the equivalent apex URL;
- a shared preset or custom link reliably reproduces the original calculation;
- malicious URL or form input renders only as text;
- no browser code exposes or calls the n8n webhook;
- Turnstile and validation reject abusive or malformed requests before n8n;
- the n8n workflow processes exactly one action per request;
- recipe delivery without consent does not subscribe the recipient;
- unsubscribe sends no other email;
- branded messages pass sender authentication;
- focused unit, browser, staging, and production smoke tests pass;
- monitoring shows no material regression during the 48-hour observation window.
