# Critical Fixes — Codex Multi-Agent Prompt Pack

**Repo:** freezer-batch-cocktails (Astro 4, static, Cloudflare Pages)
**Source plan:** Critical Findings Remediation Scope, 2026-07-23 (CF-01 / CF-02 / CF-03)
**Scope of this pack:** code-only work — everything agents can complete inside the repository.
Access-gated work (Cloudflare dashboard, DNS, Turnstile keys, Resend, n8n import/cutover) is
collected in the **Human Checklist** at the end and is NOT assigned to any agent.

---

## How to run this pack

1. Save this file at `.agents/critical-fixes-prompt-pack.md` and commit it. Everything an
   agent needs — global rules, shared contracts, its own prompt — is in this one file, so
   launching an agent never requires assembling or pasting sections.
2. **To launch any agent, start a fresh Codex session on that agent's branch and give it one
   line:**

   ```text
   Read .agents/critical-fixes-prompt-pack.md in full. You are agent <ID> on branch
   <branch>. Follow the Global rules and Shared contracts, then execute your agent prompt
   exactly. Stay inside your owned files.
   ```

3. Run agents sequentially in merge order (A4, A1, A3, A5, A2, A6, A7, A8) — simplest and
   conflict-free — or run Wave 1 (A1–A5) in parallel using separate Codex tasks/worktrees.
   Waves are sequential merge gates either way.
4. **File ownership is exclusive per wave.** `src/components/Calculator.astro` is the conflict
   hotspot — exactly one agent may modify it per wave. The wave plan below enforces this.
5. Whoever plays orchestrator (you, or a Codex session running the Orchestrator Prompt)
   merges each branch into `critical-fixes` only after its acceptance gate passes.

### Launch lines (copy-paste, one per session)

```text
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A4 on branch cf/a4-url-cleanup. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A1 on branch cf/a1-share-state. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A3 on branch cf/a3-api-boundary. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A5 on branch cf/a5-n8n-v2. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A2 on branch cf/a2-dom-safety. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A6 on branch cf/a6-hydration. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A7 on branch cf/a7-forms. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
Read .agents/critical-fixes-prompt-pack.md in full. You are agent A8 on branch cf/a8-verify. Follow the Global rules and Shared contracts, then execute your agent prompt exactly. Stay inside your owned files.
```

### Wave plan and dependency graph

| Wave | Agent | Work package | Owns (exclusive write) |
|---|---|---|---|
| 1 | A1 | CF-02A share-state library | `src/lib/shareState.ts`, `src/lib/shareState.test.ts` |
| 1 | A2 | CF-03A DOM-injection removal | `src/components/Calculator.astro` (wave-1 owner) |
| 1 | A3 | CF-03B Pages Function boundary | `functions/**`, `public/_routes.json` |
| 1 | A4 | CF-01B URL cleanup + host assertion + test scripts | `public/_redirects`, `src/layouts/Layout.astro`, `package.json`, `scripts/**`, `vitest.config.ts` |
| 1 | A5 | CF-03D n8n workflow v2 | `n8n/**` |
| 2 | A6 | CF-02B/C hydration + share UX | `src/components/Calculator.astro` (wave-2 owner) |
| 3 | A7 | CF-03C form migration + abuse controls | `src/components/Calculator.astro` (wave-3 owner), `src/components/EmailSignup.astro`, `src/pages/unsubscribe.astro` |
| 4 | A8 | Integration, Playwright coverage, verification | `tests/**` + read-everything verifier |

Dependencies: A6 requires A1 + A2 merged. A7 requires A3's contract (fixed in this pack) and
must not start until A6 is merged (same-file serialization). A8 requires all prior waves.

### Model assignment (GPT-5.6 in Codex)

Assigned by cost of failure, not apparent task size. The orchestrator launches each agent
with its assigned model (`codex -m <model>`) and reasoning effort.

| Agent | Model | Effort | Why |
|---|---|---|---|
| Orchestrator | gpt-5.6-sol | medium | judgment calls on gates, merges, contract disputes |
| A4 URL cleanup | gpt-5.6-luna | medium | mechanical replacements + small scripts, fully gated by grep/build |
| A1 share-state lib | gpt-5.6-terra | high | well-specified pure library, tightly gated by its own unit tests |
| A3 API boundary | gpt-5.6-sol | high | security trust boundary; validation gaps are the exact risk being remediated |
| A5 n8n v2 | gpt-5.6-terra | high | structured JSON rework against a fixed truth table; statically gated, human-staged later |
| A2 DOM safety | gpt-5.6-sol | high | XSS removal inside a 68KB monolith; a missed sink defeats the whole finding |
| A6 hydration + share UX | gpt-5.6-sol | high | intricate init-order work in the same monolith; high regression risk to core UX |
| A7 form migration | gpt-5.6-terra | high | implements against a frozen contract with full Playwright gating |
| A8 verification | gpt-5.6-sol | xhigh | adversarial verifier; its job is finding what everyone else missed |

Escalation rule: if an agent fails its acceptance gate twice, relaunch it one tier up
(luna→terra→sol) with the failure output included, before escalating to the human.

---

## Global rules (every agent, verbatim)

These are non-negotiable. Include them in every worker's context; a worker that cannot comply
must stop and report rather than improvise.

- Do NOT change calculation formulas, dilution math, or recipe quantities. `src/lib/calculator.ts` math and `src/data/cocktails.json` values are frozen except where a prompt explicitly says otherwise.
- Canonical host is the apex: `https://freezerbatchcocktails.com`. Never introduce a first-party `www.` reference.
- No browser code may contain or call the n8n webhook URL after Wave 3.
- Share parsing fails closed: malformed, oversized, or out-of-range state is ignored entirely — never partially applied, never rendered as HTML.
- User-controlled strings are never assigned via `innerHTML` or string-interpolated into markup. Use `createElement`, `.textContent`, `replaceChildren()`.
- No secret, webhook URL, API key, or subscriber data may be committed. Secrets are named env bindings only: `TURNSTILE_SECRET_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `PUBLIC_TURNSTILE_SITE_KEY`.
- Unsubscribe must never trigger a welcome or recipe email. Transactional recipe delivery must not create marketing consent.
- Every changed behavior gets an automated test in the same PR/branch.
- Work only inside your owned files (listed per agent). If you believe you must touch a file you don't own, stop and report to the orchestrator instead.
- Commit style: small commits, message prefixed with your agent ID and work package, e.g. `[A1/CF-02A] add versioned share-state parser`.

---

## Shared contracts

All agents implement against these exact contracts. They are the integration surface; changing
them requires an orchestrator decision, not a local edit.

### C1. Share-state type (CF-02)

```ts
type ShareStateV1 =
  | { v: 1; mode: 'preset'; recipe: string; bottleMl: number; unit: 'oz' | 'ml' }
  | {
      v: 1; mode: 'custom'; bottleMl: number; unit: 'oz' | 'ml';
      dilutionPercent: number;
      ingredients: Array<{ name: string; amount: number; abv: number; isBaseSpirit: boolean }>;
    };
```

URL parameter: `?batch=v1.<Base64URL(UTF-8 JSON)>`. Preset shares target the recipe's canonical
page (`/cocktails/<slug>/?batch=...`); custom shares target `/?batch=...#calculator`.
Encoding is transport, not encryption. Version prefix `v1.` is required.

### C2. Share-state validation limits (CF-02 and reused by CF-03 API)

| Field | Constraint |
|---|---|
| Version | exactly `1` |
| Mode | `preset` or `custom` |
| Recipe | must exist in `MILK_STREET_BATCHES` (see `src/lib/calculator.ts`) |
| Bottle size | integer, 100–3000 ml |
| Unit | `oz` or `ml` |
| Dilution | number, 0–35 |
| Ingredients | 1–8 entries |
| Ingredient name | 1–60 Unicode chars after trim |
| Ingredient amount | finite, > 0, ≤ 100 |
| Ingredient ABV | finite, 0–100 |
| Base spirit | exactly one after normalization |
| Final URL | ≤ 1,800 characters (else UI offers "Copy recipe" instead) |

Legacy compatibility (one release cycle): `?recipe=<slug>&bottle=<ml>` and
`?ingredients=<JSON>&bottle=<ml>` parse through `parseLegacyShareState` and are subject to the
same limits. Legacy values are never assigned through `innerHTML`.

### C3. Email API request (CF-03)

`POST /api/email`, `Content-Type: application/json`, body ≤ 10 KB (rejected before JSON parse).

```ts
type EmailRequest =
  | { action: 'send_recipe'; requestId: string; email: string; recipe: RecipeEmailPayload;
      marketingConsent: boolean; consentVersion?: string; page: string;
      turnstileToken: string; website?: string }
  | { action: 'subscribe'; requestId: string; email: string; consentVersion: string;
      page: string; turnstileToken: string; website?: string }
  | { action: 'unsubscribe'; requestId: string; email: string; page: string;
      turnstileToken: string; website?: string };
```

Rules: `website` is a visually hidden honeypot and must be empty. `requestId` is a UUID
(`crypto.randomUUID()`), generated once per user submission and reused on retries. `email` is
trimmed, lowercased, ≤ 254 chars. `page` must be a same-site path with a max length. Custom
recipe payloads revalidate against C2 limits. Preset recipe email requires an allow-listed
slug. Unknown fields are stripped before forwarding. Client-calculated ABV/servings/display
values are untrusted presentation data.

### C4. Email API responses

```text
202 { "ok": true }
400 { "ok": false, "code": "invalid_request" }
403 { "ok": false, "code": "verification_failed" }
405 { "ok": false, "code": "method_not_allowed" }
413 { "ok": false, "code": "payload_too_large" }
429 { "ok": false, "code": "rate_limited" }
502 { "ok": false, "code": "upstream_unavailable" }
```

Unsubscribe responses must not reveal whether an address exists. No secrets, full email
addresses, raw recipe bodies, or Turnstile tokens in logs or error bodies.

### C5. Function → n8n handoff

Forwarded requests carry headers `X-FBC-Webhook-Secret` and `X-FBC-Request-Id`, a short
upstream timeout, and a normalized body. n8n v2 rejects requests missing the secret, switches
on exactly one `action`, and uses the request ID as the Resend `Idempotency-Key`.

### C6. n8n v2 action matrix (acceptance truth table)

| Request | Transactional recipe | CRM marketing status | Welcome/confirm | Unsub update |
|---|---:|---|---:|---:|
| Recipe, consent false | 1 | unchanged | 0 | 0 |
| Recipe, consent true | 1 | pending/subscribed | 1 | 0 |
| Newsletter signup | 0 | pending/subscribed | 1 | 0 |
| Unsubscribe | 0 | unsubscribed | 0 | 1 |
| Invalid action | 0 | unchanged | 0 | 0 |

Subscriber states: `never_subscribed` → `pending` → `subscribed` → `unsubscribed`
(double opt-in is the selected design; single opt-in fallback still records consent version,
source, and timestamp).

---

## Orchestrator Prompt

Paste this into the lead Codex session.

```text
You are the orchestrator for a multi-agent remediation of the freezer-batch-cocktails repo.
The full plan, shared contracts, wave plan, and per-agent prompts live in
.agents/critical-fixes-prompt-pack.md — read that file completely before doing anything.

Your job is coordination and merge-gating, not implementation. Do not write feature code
yourself; the only edits you make directly are merge-conflict resolution and tiny integration
glue, and you record every such edit in your log.

Process:

1. Create integration branch `critical-fixes` from the current default branch.
2. Launch Wave 1 agents A1, A2, A3, A4, A5 in parallel, each in its own task/session on its
   own branch (`cf/a1-share-state`, `cf/a2-dom-safety`, `cf/a3-api-boundary`,
   `cf/a4-url-cleanup`, `cf/a5-n8n-v2`). Launch each with its one-line launch line from the
   pack — the agent reads the pack itself; never re-type or summarize its prompt. Launch each
   agent on its assigned model and reasoning effort from the Model assignment table; on a
   second gate failure apply the escalation rule (one tier up, with failure output) before
   involving the human.
3. For each returned branch, run its acceptance gate (listed in the agent prompt) yourself:
   run the commands, read the diff, verify the agent stayed inside its owned files. Reject and
   relaunch with feedback if a gate fails or ownership was violated. Do not "fix it up
   quietly" — a failed gate goes back to the agent that owns it.
4. Merge passing Wave 1 branches into `critical-fixes` in this order: A4, A1, A3, A5, A2
   (A2 last because Calculator.astro is the conflict hotspot and A2's diff is the base for
   Wave 2). After merging, run: npx astro check && npm run test:unit && npm run build.
5. Launch Wave 2 (A6) from the merged `critical-fixes` branch. Gate, merge, re-run checks.
6. Launch Wave 3 (A7) the same way. Gate, merge, re-run checks.
7. Launch Wave 4 (A8) the same way. A8's report is the project verification report.
8. Produce a final summary: per-agent status, gates passed, deviations from the pack,
   remaining Human Checklist items (from the pack) that block production cutover, and the
   exact commands a human should run for final verification.

Rules for you:
- Never let two concurrently-running agents own the same file. The wave plan already
  guarantees this; preserve it if you re-plan.
- The Shared contracts (C1–C6) are frozen. If an agent reports a contract problem, pause the
  affected waves, decide, document the change in the pack file, and restart only the affected
  agents.
- If an agent stalls or returns work that fails its gate twice, stop and escalate to the human
  with a precise description of the failure instead of retrying a third time.
- Track state in .agents/critical-fixes-log.md: wave, agent, branch, gate results, merge SHA.
- Access-gated items (Cloudflare dashboard, DNS, Turnstile secrets, Resend, n8n import) are
  NEVER assigned to agents. They live in the Human Checklist. When code depends on one (e.g.
  Turnstile keys), the code must degrade cleanly behind env checks and the dependency goes in
  your final summary.
```

---

## Agent prompts

Agents reach these prompts by reading this pack file (see Launch lines above) — no manual
assembly needed. Every agent starts from the branch named in its launch line, works only in
its owned files, and ends by reporting: what changed, test results, and any contract concerns.

### A1 — Share-state library (CF-02A) · Wave 1

```text
ROLE: You implement the pure share-state module for freezer-batch-cocktails. No DOM, no
component edits — this is a standalone library plus its unit tests.

OWNED FILES (exclusive write): src/lib/shareState.ts (new), src/lib/shareState.test.ts (new).
READ-ONLY: src/lib/calculator.ts (for MILK_STREET_BATCHES and types), src/data/cocktails.json.
Touch nothing else.

BUILD:
- serializeShareState(state): string — produces the `v1.<Base64URL(UTF-8 JSON)>` payload.
- parseShareState(value): ParseResult — parses and validates a `batch` parameter value.
- parseLegacyShareState(searchParams): ParseResult — best-effort parse of the current
  `?recipe=`, `?ingredients=`, `?bottle=` parameters through the same validation.
- buildShareUrl(state, origin): URL — preset states target /cocktails/<slug>/?batch=...,
  custom states target /?batch=...#calculator. Returns a failure (not a URL) when the result
  exceeds 1,800 characters.
- Normalization and validation helpers implementing every limit in contract C2.
- UTF-8-safe Base64URL encode/decode (btoa alone corrupts non-ASCII; handle Unicode names).

DESIGN RULES:
- ParseResult is a discriminated union: { ok: true, state: ShareStateV1 } | { ok: false,
  reason: string }. Parsing NEVER throws and never returns a partially-valid state.
- Fail closed on: unknown version, unknown mode, unknown recipe slug, out-of-range numbers,
  NaN/Infinity, wrong types, missing fields, >8 or 0 ingredients, zero or multiple base
  spirits after normalization, oversized input.
- The module must not import anything DOM-related and must not mutate its inputs.
- Recipe slug validity is checked against MILK_STREET_BATCHES exported from calculator.ts.
  If it is not exported, export it (type-only re-export or named export) — that one edit to
  calculator.ts is permitted, with no logic changes.

TESTS (src/lib/shareState.test.ts, vitest): preset round trip; custom round trip with Unicode
ingredient names; missing/unknown version; malformed Base64 and malformed JSON; unknown
recipe; bottle boundaries (99, 100, 3000, 3001); dilution boundaries (-1, 0, 35, 36);
ingredient count 0/1/8/9; name length 0/1/60/61; NaN, Infinity, string-where-number;
URL length limit behavior; legacy parser happy path and hostile input (HTML in names parses
as plain text data, oversize rejected).

ACCEPTANCE GATE (orchestrator runs): npx vitest run src/lib/shareState.test.ts passes;
npx astro check passes; diff touches only owned files (plus the permitted calculator.ts
export); no innerHTML/document/window references in shareState.ts.

REPORT: exported API surface, any deviation from contract C1/C2 (should be none), and the
exact export you added to calculator.ts if any.
```

### A2 — DOM-injection removal (CF-03A) · Wave 1

```text
ROLE: You remove every user-controlled innerHTML path from the calculator component. You are
the ONLY agent allowed to edit src/components/Calculator.astro in this wave.

OWNED FILES: src/components/Calculator.astro.
READ-ONLY: src/lib/calculator.ts. Do not change any math, recipe data, or the share/email
code paths beyond what is listed here (other agents own those in later waves).

CONTEXT: renderCompositionBar() currently builds an HTML string that interpolates custom
ingredient names into a title attribute, legend markup, and an innerHTML assignment
(around lines 1272 and 1435; verify current positions yourself).

BUILD:
1. Replace renderCompositionBar(): string with DOM construction: createElement,
   .textContent for all user-controlled text, element.title = name (property assignment, not
   attribute string), style via .style properties or classList. Replace the innerHTML
   assignment with replaceChildren().
2. Keep static preset-template rendering separate from custom-data rendering so preset markup
   (trusted, authored) and user data (untrusted) never share an interpolation path.
3. Add UX-level input limits to the custom ingredient inputs: maxlength=60 on names, a
   maximum of eight ingredient rows, explicit numeric min/max on amount and ABV matching
   contract C2.
4. Re-validate on read: when reading field values in JS, clamp/reject against C2 limits.
   HTML attributes are hints, not security controls.
5. Do NOT restructure initialization, share code, or email code — Wave 2/3 agents own those.
   Keep your diff as narrow as the task allows.

TESTS: Calculator.astro has no test harness of its own; your gate is behavioral. Add one
Playwright spec tests/injection.spec.ts: enter an ingredient named
<img src=x onerror="window.__pwned=1"> and 'nasty" onmouseover="window.__pwned=1', run a
calculation, assert window.__pwned is undefined and the name renders as visible text.

ACCEPTANCE GATE: npx playwright test tests/injection.spec.ts passes; npm run build passes;
grep of Calculator.astro shows no innerHTML assignment whose input includes user-controlled
ingredient data; diff touches only owned files.

REPORT: every innerHTML/insertAdjacentHTML/outerHTML site you found, what you did with each
(replaced vs. left because it renders only trusted static content), and the line ranges you
changed (Wave 2 needs this to plan around your diff).
```

### A3 — Pages Function email boundary (CF-03B) · Wave 1

```text
ROLE: You build the same-origin email API as Cloudflare Pages Functions. Pure server-side
work — no component edits, no n8n edits.

OWNED FILES (all new): functions/api/email.ts, functions/_lib/emailPayload.ts,
functions/_lib/turnstile.ts, functions/_lib/*.test.ts, public/_routes.json.
Touch nothing else.

BUILD — functions/api/email.ts (onRequestPost):
1. Method gate: non-POST → 405 per contract C4.
2. Content-Type must be application/json → else 400.
3. Reject bodies > 10 KB using Content-Length and a length check BEFORE JSON.parse → 413.
4. Honeypot: non-empty `website` → respond 202 { ok: true } and forward nothing (do not
   teach bots the field matters).
5. Verify turnstileToken against Cloudflare Siteverify
   (https://challenges.cloudflare.com/turnstile/v0/siteverify) using TURNSTILE_SECRET_KEY.
   Failure or timeout → 403 verification_failed.
6. Validate + normalize via emailPayload.ts (below). Invalid → 400.
7. Forward the normalized payload to N8N_WEBHOOK_URL with headers X-FBC-Webhook-Secret:
   N8N_WEBHOOK_SECRET and X-FBC-Request-Id: <requestId>, with an AbortController timeout of
   ~5s. Upstream non-2xx or timeout → 502 upstream_unavailable. Success → 202.
8. Never log or echo: full email addresses, turnstile tokens, raw recipe bodies, secrets.
   Unsubscribe must return 202 whether or not the address exists.

BUILD — functions/_lib/emailPayload.ts (pure, fully unit-testable):
- Discriminate the three actions of contract C3; reject unknown actions and unknown fields
  (strip-then-validate, forward only known fields).
- Email: trim, lowercase, max 254, structural sanity check.
- requestId: UUID format check.
- page: same-site path only (leading '/', no protocol/host, max length ~200, no '//').
- send_recipe custom payloads: re-apply contract C2 ingredient limits. Preset payloads:
  slug must match an allow-list (duplicate the slug list or import from a shared location —
  functions cannot import src/ at runtime on Pages; a small generated/duplicated const with a
  comment is acceptable, note it in your report).
- Treat client-calculated ABV/servings/display strings as bounded opaque strings (length-cap),
  never as trusted numbers.

BUILD — functions/_lib/turnstile.ts: siteverify call with timeout, typed result, no token
logging.

BUILD — public/_routes.json: route ONLY /api/* through Functions so all static traffic stays
static: { "version": 1, "include": ["/api/*"], "exclude": [] }.

TESTS (vitest, functions/_lib/*.test.ts): action discrimination; unknown action; unknown-field
stripping; email normalization and 254 cap; UUID rejection; page-path validation (protocol,
'//' and traversal attempts, length); C2 limit enforcement on custom recipes; honeypot;
oversize body; plus turnstile.ts success/failure/timeout using injected fetch. Design the
handler so fetch and env are injectable for tests.

ACCEPTANCE GATE: npx vitest run functions passes; npx astro check and npm run build still
pass; no secret literals in the diff; _routes.json exactly restricts Functions to /api/*.

REPORT: the env bindings required (names only), the preset slug allow-list approach you chose,
and any C3/C4 ambiguity you resolved.
```

### A4 — URL cleanup, host assertion, test scripts (CF-01B + cross-cutting) · Wave 1

```text
ROLE: Repository hygiene: apex-host consistency, canonical URL normalization, a guard that
keeps www from creeping back, and trustworthy test commands.

OWNED FILES: public/_redirects, src/layouts/Layout.astro, package.json, vitest.config.ts
(new), scripts/check-first-party-hosts.mjs (new). Also permitted: mechanical www→apex string
replacements inside n8n/*.json ONLY (A5 owns n8n structure; coordinate via commit message —
make host replacements one isolated commit so A5 can rebase trivially).

BUILD:
1. public/_redirects: remove the commented-out www rule and replace with a comment stating
   host consolidation is a Cloudflare zone-level redirect (Pages _redirects cannot do
   domain-level redirects), pointing at the Human Checklist item. Keep the existing path
   redirects (/recipe/*, /recipes/*, /calculator, /calc) untouched.
2. src/layouts/Layout.astro: normalize the default canonical to
   new URL(Astro.url.pathname, Astro.site) — no query strings, no fragments. Preserve any
   existing per-page canonical override behavior.
3. n8n/*.json: replace every https://www.freezerbatchcocktails.com with the apex host,
   including email-template fallback URLs and unsubscribe links. String replacement only —
   do not restructure nodes.
4. scripts/check-first-party-hosts.mjs: fail (exit 1, listing offenders) if any tracked
   source file contains a first-party www.freezerbatchcocktails.com reference. Scan src/,
   functions/, public/, n8n/, astro.config.mjs. Exclude node_modules, dist, .astro,
   playwright-report, test-results, and third-party/external www URLs (e.g. amazon).
5. package.json scripts:
   "test": "vitest run",
   "test:unit": "vitest run",
   "test:e2e": "playwright test",
   "test:critical": "vitest run src/lib/shareState.test.ts functions",
   "check:hosts": "node scripts/check-first-party-hosts.mjs"
6. vitest.config.ts: include only src/**/*.test.ts and functions/**/*.test.ts so vitest never
   loads Playwright specs from tests/.

Note: src/lib/shareState.test.ts and functions/ are being created in parallel by A1 and A3.
Write the globs anyway; if vitest errors on no-match at gate time the orchestrator gates you
with passWithNoTests or after merge — flag it in your report.

ACCEPTANCE GATE: node scripts/check-first-party-hosts.mjs passes on your branch; npm run
build passes; grep -r "www.freezerbatchcocktails" src public n8n astro.config.mjs returns
nothing; canonical URLs in built output (dist/) carry no query strings.

REPORT: every file where you replaced a www reference, and the exclusion rules your host
checker applies.
```

### A5 — n8n workflow v2 (CF-03D) · Wave 1

```text
ROLE: You produce n8n workflow v2 as an importable JSON export in the repo. You cannot reach
the live n8n instance — the deliverable is the versioned workflow file plus a migration note.
A human imports, stages, and cuts over (Human Checklist).

OWNED FILES: n8n/FreezerBatchCocktails-v2.json (new), n8n/MIGRATION.md (new). Do not modify
the original n8n/FreezerBatchCocktails.json (it documents current production; A4 only patches
its host strings).

BUILD — workflow v2, starting from a copy of the current workflow:
1. Webhook node: require header X-FBC-Webhook-Secret to match an n8n credential/env value.
   Reject mismatches with 401 and no side effects.
2. Normalize the (already Function-validated) request into one internal schema early, in a
   single Set/Code node.
3. Replace the two parallel IF nodes ("Check Has Recipe", "Check Action Type") with ONE
   Switch on `action` with exactly three cases plus a default that does nothing. Every
   downstream path must be reachable from exactly one case — this removes the bug where an
   unsubscribe request also follows the welcome-email branch.
4. send_recipe case: send one transactional recipe email. If marketingConsent is true, upsert
   the CRM row (status pending/subscribed per double-opt-in design, with consent version,
   source, timestamp). If false, touch NOTHING in the CRM — the current workflow wrongly
   writes Status: subscribed here. A recipe may be delivered to an unsubscribed address.
5. subscribe case: upsert consent with source, page, consent version, timestamp; send
   confirmation (double opt-in) or welcome (single opt-in fallback) per the design note in
   contract C6.
6. unsubscribe case: set marketing status unsubscribed with timestamp and source; send NO
   email; succeed even when the row does not exist.
7. HTML-escape EVERY interpolated value in email templates, including attribute contexts.
   Add a plain-text body alongside HTML.
8. Template copy fixes: 22% pourable threshold, nuanced citrus storage guidance, current dark
   editorial brand, apex host on every link.
9. Sender fields: Freezer Batch Cocktails <recipes@freezerbatchcocktails.com>, reply-to
   hello@freezerbatchcocktails.com. (DNS/Resend verification is the human's job; the workflow
   just uses the identity.)
10. Resend node: set Idempotency-Key from X-FBC-Request-Id.
11. End every branch in an explicit Respond to Webhook node so the Function gets a
    deterministic response, not whichever terminal branch finishes last.

BUILD — n8n/MIGRATION.md: import steps, credentials to create (names only, no values),
staging test plan implementing contract C6's truth table with controlled test addresses,
cutover order (deploy Function + v2 together, then disable/protect the old public webhook),
and rollback (re-enable v1).

ACCEPTANCE GATE: v2 JSON is valid JSON and structurally an n8n export (nodes + connections
arrays consistent, no dangling connections); exactly one Switch on action; no branch from
unsubscribe reaches any email-send node except none; no www hosts; no credential values in
the file. Orchestrator verifies by reading the graph, not by running n8n.

REPORT: node-by-node summary of the Switch cases, every template variable you escape, and
anything in the current workflow you could not carry over faithfully.
```

### A6 — Calculator hydration + share UX (CF-02B/C) · Wave 2

```text
ROLE: You wire the merged share-state library (A1) into the calculator and replace the share
URL construction. You own src/components/Calculator.astro this wave; A2's DOM-safety changes
are already merged — preserve them (never reintroduce innerHTML for user data).

OWNED FILES: src/components/Calculator.astro. READ-ONLY: src/lib/shareState.ts,
src/lib/calculator.ts, src/pages/index.astro, src/pages/cocktails/[slug].astro. If a page
template needs a change to pass data, report it — do not edit pages yourself.

CONTEXT: connectedCallback() currently only reads data-cocktail and never the URL; shareRecipe()
builds `recipe`/`ingredients`/`bottle` query strings by hand (~lines 602 and 1440; verify).

BUILD — initialization order in connectedCallback():
1. Register event listeners.
2. parseShareState(new URLSearchParams(location.search).get('batch')).
3. If absent → parseLegacyShareState(searchParams).
4. Valid preset state → preset hydration: set preset mode → bottle size → unit → sync hidden
   select + visible tile → load the preset ONCE.
5. Valid custom state → custom hydration: set custom mode → clear default rows → create
   validated rows setting form field .value properties (never markup) → bottle, unit,
   dilution → recalculate ONCE.
6. Invalid state → normal defaults plus one unobtrusive, accessible error note
   ("Couldn't load the shared recipe — showing defaults").
7. No URL state → data-cocktail preset if present, else homepage defaults.
Use a private isHydrating flag (or a single final render) so hydration triggers exactly one
calculation, not a cascade.

BUILD — share behavior (CF-02C):
- Replace hand-built query construction with buildShareUrl from shareState.
- Preset shares always target the recipe's own canonical page even when shared from the
  homepage or a different recipe page.
- Web Share API: recipe name in the title for presets; short responsible-hosting description
  where supported; clipboard fallback preserved.
- After successful hydration show "Shared recipe loaded" (aria-live polite).
- When buildShareUrl reports the URL exceeds 1,800 chars, show the "Copy recipe" fallback
  instead of producing a fragile link.

TESTS (tests/share.spec.ts, Playwright): share a Negroni from the homepage, open the produced
URL, assert canonical recipe page + bottle + unit restored; share a non-default bottle size
from a recipe page and reopen; share a custom recipe, reload, compare visible results;
malicious ingredient text in a share URL renders inert as text (extends A2's guarantee);
malformed batch value leaves default UI fully usable with the error note; selecting a
different preset on a recipe page then sharing yields the newly selected recipe's slug, not
the page's.

ACCEPTANCE GATE: npx playwright test tests/share.spec.ts tests/injection.spec.ts passes;
npm run test:unit still passes; npm run build passes; a plain page load with no query
parameters behaves exactly as before (compare against pre-branch behavior); diff touches only
Calculator.astro + tests/share.spec.ts.

REPORT: the exact hydration order you implemented, how legacy params behaved in your tests,
and any place the A1 API was awkward (contract feedback for the orchestrator).
```

### A7 — Form migration + abuse controls (CF-03C) · Wave 3

```text
ROLE: You point every public form at /api/email per contracts C3/C4, add Turnstile and the
honeypot, and remove all direct n8n URLs from browser code. You own Calculator.astro this
wave; A2 and A6 changes are merged — preserve them.

OWNED FILES: src/components/Calculator.astro (email form section), src/components/
EmailSignup.astro, src/pages/unsubscribe.astro. READ-ONLY: functions/** (the contract is
fixed; if the API doesn't match C3/C4, report — don't adapt around it).

BUILD, for all three forms (calculator recipe email ~line 1546, newsletter signup, public
unsubscribe):
1. Replace every direct n8n webhook URL with POST /api/email, application/json, explicit
   `action` per form.
2. Turnstile widget on each form using PUBLIC_TURNSTILE_SITE_KEY (import.meta.env). When the
   key is absent (local dev), render the form with the widget gracefully absent and submission
   disabled with an explanatory note — never fall back to bypassing verification.
3. Honeypot: visually hidden `website` field (off-screen, aria-hidden, tabindex=-1,
   autocomplete="off") — hidden by CSS positioning, not display:none, so bots still fill it.
4. requestId: one crypto.randomUUID() per user submission attempt, reused for retries of that
   same logical submission, regenerated for a genuinely new submission.
5. Map C4 codes to specific accessible messages (aria-live): invalid_request,
   verification_failed ("please retry the challenge"), rate_limited ("try again in a
   minute"), upstream_unavailable ("we'll be back shortly"). Success → confirmation message.
6. Disable submit while a request is in flight; re-enable after settle. Double-click must not
   produce two requests (Playwright-verified).
7. Reset the Turnstile widget after success and after retryable failures.
8. Keep every form keyboard- and screen-reader-usable: labels, focus management, aria-live
   status regions.
9. Confirm with grep that no n8n URL remains anywhere under src/.

TESTS (tests/email-forms.spec.ts, Playwright, /api/email mocked via page.route): recipe email
without consent (assert body: marketingConsent false); recipe email with consent; newsletter
signup; unsubscribe; each error code shows its message accessibly; double-click sends exactly
one request; retry after failure reuses the same requestId; new submission uses a new one.

ACCEPTANCE GATE: npx playwright test tests/email-forms.spec.ts tests/share.spec.ts
tests/injection.spec.ts passes; npm run build passes; grep for the n8n host under src/
returns nothing; diff touches only owned files.

REPORT: request bodies each form emits (one example per action), dev-mode behavior without a
Turnstile key, and any C3/C4 mismatch you found (should be none).

NOT YOURS: the WAF rate rule (5 req/IP/10s on POST /api/email) is dashboard work — it is in
the Human Checklist.
```

### A8 — Integration verification (cross-cutting) · Wave 4

```text
ROLE: Adversarial verifier. Everything is merged on `critical-fixes`. You confirm the
Definition of Done items that are code-verifiable, fix nothing yourself except test
infrastructure, and produce the verification report.

OWNED FILES: tests/** (may add specs and fix stale selectors in the three existing suites
ONLY where they block running your checks — full legacy-suite repair is explicitly out of
scope). Everything else read-only. If you find a product bug, report it with a failing test;
do not patch product code.

VERIFY (evidence required for each — command output or file:line):
1. npm run test:unit, npm run test:critical, npm run build, npx astro check, npm run
   check:hosts all pass.
2. Playwright: injection.spec.ts, share.spec.ts, email-forms.spec.ts pass. Note (not fix)
   remaining stale-suite failures unrelated to this project.
3. Grep sweeps: no innerHTML fed by user data in Calculator.astro; no n8n host under src/;
   no first-party www anywhere; no secret-looking literals in functions/ or n8n/ (keys,
   tokens, webhook URLs with hostnames).
4. Contract conformance spot-check: build a hostile share URL by hand (script tag ingredient
   name, 9 ingredients, bottle 5000, dilution 90, unknown version v2., truncated Base64) and
   confirm each fails closed in the browser via a Playwright scratch test.
5. C6 truth table is encoded in the n8n v2 graph: trace each Switch case in
   n8n/FreezerBatchCocktails-v2.json and confirm the matrix (this is static analysis of the
   JSON, not a live run).
6. Legacy links: ?recipe=negroni&bottle=750 and a valid legacy ?ingredients= URL hydrate;
   hostile legacy ingredients are rejected without rendering.
7. Confirm _routes.json restricts Functions to /api/*, and vitest never loads tests/*.spec.ts.

REPORT — the final verification document (.agents/critical-fixes-verification.md):
- Definition-of-Done table: each code-verifiable item → pass/fail → evidence.
- Items NOT verifiable in-repo (www redirect live behavior, Turnstile end-to-end, Resend
  delivery, SPF/DKIM, WAF rule, n8n staging matrix, 48h observation) → mapped to their Human
  Checklist entries.
- Every product bug found, each with a failing test attached.
- Stale-test debt you observed but did not fix.
```

---

## Human Checklist (access-gated — never assigned to agents)

Sequenced to match the plan's phases. Each item lists what merged code assumes.

**Phase 1 — domain (CF-01A):**
1. Cloudflare zone: confirm `www` DNS is proxied; identify which Pages project owns the old
   `www` custom domain.
2. Create a zone-level Single/Bulk Redirect: host `www.freezerbatchcocktails.com` →
   `https://freezerbatchcocktails.com`, 301, preserve path + query. (Pages `_redirects`
   cannot do this — the repo comment A4 added points here.)
3. Verify the matrix: www root / recipe path / guide path / missing path / query-string path /
   http www / https apex. Example: GET https://www.freezerbatchcocktails.com/cocktails/daiquiri/?utm_source=email
   → 301 → same path+query on apex.
4. Detach `www` from the obsolete Pages project; keep proxied DNS + TLS for the redirect.
5. Rollback: disable the redirect rule; reattach the old domain only for a verified outage.

**Phase 3 — email path (CF-03B/C/D/E):**
6. Create separate Turnstile widgets for production and preview; set
   PUBLIC_TURNSTILE_SITE_KEY (build var) and TURNSTILE_SECRET_KEY (secret) in Pages.
7. Set N8N_WEBHOOK_URL and N8N_WEBHOOK_SECRET as Pages secrets; create the matching secret
   check in n8n v2 (per n8n/MIGRATION.md).
8. Import n8n/FreezerBatchCocktails-v2.json, run the staging matrix from MIGRATION.md against
   a test sheet and test recipients (contract C6 truth table, hostile-HTML escaping check,
   duplicate request-ID → one Resend message).
9. Resend: verify freezerbatchcocktails.com, SPF + DKIM, DMARC monitoring record; sender
   `Freezer Batch Cocktails <recipes@freezerbatchcocktails.com>`, reply-to hello@; List-Unsubscribe
   + one-click headers on marketing mail only (CF-03E).
10. WAF rate rule: POST /api/email, challenge/block after 5 requests per IP per 10s; watch
    false positives before tightening.
11. Cut over: deploy Pages Function + n8n v2 together; then disable or authenticate the old
    public webhook.
12. Update the Privacy Policy (Turnstile, same-origin email API, actual consent behavior,
    processors). Content edit — can be delegated to an agent later if preferred.

**Phase 4 — observe (48h):** Function 4xx/429/5xx, Turnstile challenge/failure rates, n8n
errors by action, Resend delivery/bounce/complaints, CRM consent anomalies, share parse
errors. Then remove temporary logging, close the legacy share-parameter window, update the
audit status.

---

## Deferred (unchanged from the scope doc — reject if an agent drifts into these)

New photography/structured data, shelf-life taxonomy, full stale-Playwright repair beyond
what A8 needs, dynamic social images, accounts/short links/Host Mode, n8n/Resend/Sheets
rewrite, Astro server adapter migration.
