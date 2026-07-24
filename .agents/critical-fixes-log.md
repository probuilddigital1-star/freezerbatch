# Critical Fixes Orchestration Log

## Setup

- Date: 2026-07-23
- Default branch: `main`
- Prompt-pack commit: `9a39ea3775255ab18893efaa280ec7027fd5f2d0`
- Integration branch: `critical-fixes`
- Integration start SHA: `9a39ea3775255ab18893efaa280ec7027fd5f2d0`
- Contracts: C1-C6 frozen; no changes approved.
- Preserved unrelated untracked files: `.claude/ralph-loop.local.md`,
  `.claude/settings.json`, `.claude/settings.local.json`,
  `docs/growth-monetization-audit.html`, and
  `docs/superpowers/specs/2026-07-23-critical-fixes-scope.md`.

## Agent status

| Order | Wave | Agent | Branch | Model / effort | Gate attempts | Status | Merge SHA |
|---:|---:|---|---|---|---:|---|---|
| 1 | 1 | A4 | `cf/a4-url-cleanup` | `gpt-5.6-terra` / medium | 2 | Merged | `5ba7969` |
| 2 | 1 | A1 | `cf/a1-share-state` | `gpt-5.6-terra` / high | 2 | Merged | `cb72357` |
| 3 | 1 | A3 | `cf/a3-api-boundary` | `gpt-5.6-sol` / high | 2 | Merged | `c14c622` |
| 4 | 1 | A5 | `cf/a5-n8n-v2` | `gpt-5.6-terra` → `gpt-5.6-sol` / high | 3 | Merged | `6d7b6c3` |
| 5 | 1 | A2 | `cf/a2-dom-safety` | `gpt-5.6-sol` / high | 1 | Merged | `93daa21` |
| 6 | 2 | A6 | `cf/a6-hydration` | `gpt-5.6-sol` / high | 1 | Merged | `bc9a69d` |
| 7 | 3 | A7 | `cf/a7-forms` | `gpt-5.6-terra` / high | 0 | Pending | - |
| 8 | 4 | A8 | `cf/a8-verify` | `gpt-5.6-sol` / xhigh | 0 | Pending | - |

## Detailed results

Gate commands, ownership reviews, agent reports, merge SHAs, and post-merge
checks are recorded here before the next agent starts.

### Launch environment handoff

- The session task launcher rejected A4's required `gpt-5.6-luna` model; it
  exposes only `gpt-5.6-sol` and `gpt-5.6-terra`.
- Per the requested fallback, worker execution moved to manual fresh Codex
  sessions, one agent at a time. The orchestrator will gate each returned
  branch before handing off the next agent.
- The human subsequently authorized A4 to use `gpt-5.6-terra` at medium effort
  instead of its unavailable assigned `gpt-5.6-luna` model. Automated
  sequential execution resumed with this documented model-only deviation.

### A4 - URL cleanup, host assertion, and test scripts

- Branch base: `11996c553d152ab6d984af1282d514f4b6fb0d44`
- Final agent commits:
  - `f378945` - `[A4/CF-01B] replace n8n www host references`
  - `ce22b82` - `[A4/CF-01B] add host guard and canonical normalization`
- Gate attempt 1: **failed** ownership/scope review.
  - The worker had an uncommitted edit to the frozen prompt pack that changed
    the model table and escalation rule.
  - The first n8n commit changed two UTF-8 copyright characters from `©` to
    `Â©`, so it was not the required host-only mechanical replacement.
  - Remaining checks passed: host checker, build, www grep, canonical scan, and
    `git diff --check`.
- Gate attempt 2: **passed**.
  - Diff ownership: only `n8n/FreezerBatchCocktails.json`, `package.json`,
    `public/_redirects`, `scripts/check-first-party-hosts.mjs`,
    `src/layouts/Layout.astro`, and `vitest.config.ts`.
  - n8n diff: exactly four apex-host replacements; UTF-8 content preserved.
  - `node scripts/check-first-party-hosts.mjs`: passed.
  - `npm run build`: passed; Astro reported 0 errors.
  - First-party `www` grep across `src`, `public`, `n8n`, and
    `astro.config.mjs`: clean.
  - Generated canonical scan: 30 canonical links found; none contained a query
    string or fragment.
  - Frozen prompt pack: no worktree or commit diff.
- Merge: `5ba79690af336b702a0e310bce7947015ba4b446`
  (`[orchestrator] merge A4 CF-01B`).
- Post-merge:
  - `npx astro check`: passed with 0 errors (6 existing hints).
  - `npx vitest run --passWithNoTests`: passed with no matching tests, the
    prompt-pack allowance before A1/A3 merge. The first sandboxed invocation
    could not load the Vitest config due to parent-directory access; the
    approved unsandboxed rerun passed.
  - `npm run build`: passed.
- Report details:
  - First-party host replacements were confined to
    `n8n/FreezerBatchCocktails.json`.
  - The host guard scans Git-tracked files under `src/`, `functions/`,
    `public/`, `n8n/`, and `astro.config.mjs`; excluded directory names are
    `node_modules`, `dist`, `.astro`, `playwright-report`, and `test-results`.

### A1 - Share-state library

- Branch base: `97248756f66449b646546646e7366e71bd9d538e`
- Agent commits:
  - `b0d15eb` - `[A1/CF-02A] add versioned share-state parser`
  - `7be4460` - `[A1/CF-02A] fail closed on legacy unit conflicts`
- Gate attempt 1: **failed** contract/test review.
  - Command gates passed: 13 Vitest tests, Astro 0 errors, ownership clean,
    and no `innerHTML`, `document`, or `window` references.
  - `resolveLegacyUnit()` silently defaulted invalid or mixed embedded legacy
    units to `oz`, which could change recipe meaning instead of failing closed.
  - The required missing-version JSON payload was not directly tested.
- Gate attempt 2: **passed**.
  - Diff ownership: only `src/lib/shareState.ts` and
    `src/lib/shareState.test.ts`; no calculator export was needed because
    `MILK_STREET_BATCHES` was already exported.
  - `npx vitest run src/lib/shareState.test.ts`: 15 tests passed.
  - `npx astro check`: passed with 0 errors.
  - Forbidden DOM/global grep: clean.
  - Review confirmed C1/C2 normalization, UTF-8 Base64URL transport,
    fail-closed parsing, URL-length failure, non-mutation, and legacy
    invalid/mixed/partial/conflicting-unit rejection.
  - Contract deviations: none.
- Merge: `cb723577d38038ac27c8e04f3888c6c3503b2013`
  (`[orchestrator] merge A1 CF-02A`).
- Post-merge:
  - `npm run test:unit`: passed, 15 tests.
  - `npx astro check`: passed with 0 errors (6 existing hints).
  - `npm run build`: passed.

### A3 - Pages Function email boundary

- Branch base: `aee708226298e29ec67ff7a87a0af9ce6a003fe5`.
- Agent commits:
  - `1d57e2b` - `[A3/CF-03B] WIP checkpoint before shutdown`
  - `cc9d7ad` - `[A3/CF-03B] complete email boundary tests`
  - `809f976` - `[A3/CF-03B] reject deeply encoded path traversal`
- Continuity note: A3 was interrupted for an imminent laptop shutdown. The
  orchestrator checkpointed only A3-owned files at `1d57e2b`; the same A3 task
  later resumed from that commit and completed the package.
- Gate attempt 1: **failed** adversarial contract review.
  - Formal checks passed: 60 Functions tests, Astro 0 errors, 30-page build,
    exact ownership, clean diff, exact `/api/*` routes, and no real secret
    literals.
  - Direct reproduction showed that four- and five-layer percent-encoded `..`
    page segments passed `normalizePage()` because decoding stopped after three
    rounds.
- Gate attempt 2: **passed**.
  - Diff ownership: only `functions/**` and `public/_routes.json`.
  - `npx vitest run functions`: 65 tests passed across payload, handler, and
    Turnstile suites.
  - `npx astro check`: passed with 0 errors.
  - `npm run build`: passed, 30 pages.
  - Direct adversarial reproduction confirmed three-, four-, five-, and
    deeper-layer traversal inputs fail closed after the bounded decode-until-
    stable fix.
  - `public/_routes.json` exactly includes only `/api/*`.
  - Secret-literal sweep: clean; only named bindings and the official
    Cloudflare Siteverify URL are present.
  - Cloudflare Pages Functions documentation was checked to confirm
    verb-specific `onRequestPost` takes precedence over generic `onRequest`,
    leaving the generic handler as the non-POST 405 fallback.
- Required environment bindings: `TURNSTILE_SECRET_KEY`,
  `N8N_WEBHOOK_URL`, and `N8N_WEBHOOK_SECRET`.
- Preset allow-list: 18 slugs duplicated from `MILK_STREET_BATCHES` with a
  deployment-boundary comment because Pages Functions cannot import `src/` at
  runtime.
- C3/C4 resolutions:
  - Unknown actions reject; unknown fields strip before forwarding.
  - Preset/custom recipe payloads are an explicit union; bounded `display`
    strings remain untrusted presentation data.
  - Upstream non-2xx maps to 502. A5 must make missing-address unsubscribe a
    successful upstream response to preserve enumeration resistance.
  - HTTP 429 remains the access-gated Cloudflare WAF responsibility.
- Merge: `c14c6229070c8873cc372076d109e4c7c87352c7`
  (`[orchestrator] merge A3 CF-03B`).
- Post-merge:
  - `npm run test:unit`: passed, 80 tests.
  - `npx astro check`: passed with 0 errors (6 existing hints).
  - `npm run build`: passed, 30 pages.

### A5 - n8n workflow v2

- Branch base: `c75473b32fc77f0ddd7097aecc2f7bc0e9fd49d9`.
- Agent commits:
  - `4f5349d` - `[A5/CF-03D] add n8n workflow v2`
  - `3659e2a` - `[A5/CF-03D] isolate n8n action branches`
  - `fa3fdf7` - `[A5/CF-03D] render normalized recipe email payload`
  - `0bb0fa7` - revert of the first normalized-renderer attempt
  - `ef9aea5` - `[A5/CF-03D] render normalized recipe email payload`
  - `c1acca9` - `[A5/CF-03D] correct v2 recipe fallback and graph`
- Gate attempt 1: **failed** integration-contract review.
  - The structural acceptance checks passed, but the connected recipe renderer
    consumed the legacy flat `recipe.name` shape rather than A3's normalized
    C3 `RecipeEmailPayload` union.
- Gate attempt 2: **failed** representative-payload review.
  - The A3-aware renderer and static test were present, but the core custom
    fallback rendered `bottleMl: 500` as `500 oz`; `bottleMl` is always
    millilitres under C1/C3.
  - An obsolete flat-payload renderer also remained as a dead, unconnected
    node.
- Escalation: after two failed gates, A5 was relaunched one model tier up from
  `gpt-5.6-terra` to `gpt-5.6-sol`, high effort, with both failures.
  The escalated task committed the correction at `c1acca9` but stalled while
  returning its report; the orchestrator interrupted the stalled session and
  independently gated the committed result.
- Gate attempt 3: **passed**.
  - JSON parses as an importable 25-node workflow.
  - Graph verification found exactly one three-case action Switch plus
    fallback, unique node names/IDs, no dangling or unreachable nodes, and
    isolated terminal response paths.
  - Unsubscribe and invalid-action paths reach no email node. Recipe delivery
    without consent reaches no CRM or confirmation node.
  - All three Resend calls carry deterministic idempotency headers: the
    transactional send uses the exact request ID required by C5, while the
    distinct confirmation send uses the deterministic
    `<requestId>-consent` derivative.
  - `node n8n/FreezerBatchCocktails-v2.static-test.mjs`: passed, including
    preset, custom, formatted-display, hostile-string, branch-isolation, and
    idempotency checks.
  - Credential review found no credential bindings or values, no suspect token
    literals, and only named environment references.
  - First-party host scan: no `www` references.
  - `git diff --check critical-fixes...cf/a5-n8n-v2`: passed.
  - UTF-8 review of `MIGRATION.md`: no replacement or mojibake characters.
- Ownership review:
  - The diff is confined to `n8n/**`, A5's exclusive wave ownership.
  - It includes `n8n/FreezerBatchCocktails-v2.static-test.mjs` in addition to
    the two files named by the narrower agent prompt. The orchestrator accepted
    this documented deviation because the wave table grants A5 `n8n/**` and
    the global rules require an automated test for changed behavior.
- Switch report:
  - `send_recipe`: one transactional recipe message; consent false terminates
    without CRM or confirmation work; consent true records pending consent and
    sends a separate confirmation.
  - `subscribe`: records pending consent and sends confirmation.
  - `unsubscribe`: upserts unsubscribed status and returns without email.
  - default: deterministic invalid-action response with no side effects.
- Template review:
  - Recipe/display name, ingredient names and amounts, ABV, servings, bottle
    size, dilution, pour-off, and water-to-add values are escaped before HTML
    interpolation. Text/subject values strip CR/LF.
  - All links use the apex host; sender/reply-to, 22% threshold copy, and
    nuanced citrus guidance match the prompt.
- Carry-over limitation / production dependency:
  - The repository workflow can record `pending` consent and send a
    confirmation message, but promotion to `subscribed` depends on the
    access-gated subscriber/CRM double-opt-in mechanism. Import, credential
    attachment, staging, activation, and cutover remain Human Checklist work.
- Merge: `6d7b6c39f864443c41cff620f65a8521fc7b75d8`
  (`[orchestrator] merge A5 CF-03D`).
- Post-merge:
  - `npm run test:unit`: passed, 80 tests.
  - `npx astro check`: passed with 0 errors (6 existing hints).
  - `npm run build`: passed, 30 pages.

### A2 - Calculator DOM-injection removal

- Branch base: `9cd7e2bcfedf051a283a28057f3c63cfd8d5a32c`.
- Agent commit:
  - `4643852` - `[A2/CF-03A] remove calculator DOM injection paths`
- Gate attempt 1: **passed**.
  - `tests/injection.spec.ts` passed independently in Chromium: 3 tests in
    8.8 seconds against an isolated static server on port 4333.
  - `npm run build`: passed with 0 errors and 30 generated pages.
  - Diff/check ownership: clean and confined to
    `src/components/Calculator.astro` plus the explicitly required
    `tests/injection.spec.ts`.
  - Sink grep found one remaining `innerHTML` assignment and no
    `insertAdjacentHTML` or `outerHTML` assignments. Manual review confirmed
    the retained assignment builds only the validated, repository-authored
    preset shell; the composition is inserted separately with safe DOM APIs.
  - Hostile custom names now reach only `.textContent` and the `.title`
    property. The behavioral test verifies both supplied injection strings
    remain inert visible text and create no `img` or event-handler execution.
  - C2 UX/runtime review confirmed name/amount/ABV limits, a hard maximum of
    eight rows, bounded bottle/dilution setters, and exactly one normalized
    base spirit for non-empty valid custom input.
  - `git diff --check critical-fixes...cf/a2-dom-safety`: passed.
- Prompt ownership ruling:
  - A2's prompt says to add `tests/injection.spec.ts` but separately names only
    `Calculator.astro` as owned and requires an owned-files-only diff. Before
    editing the test, the agent stopped and asked for a ruling. The
    orchestrator authorized that exact required spec as the sole exception;
    A8's `tests/**` work occurs in a later wave.
- Playwright environment note:
  - The repository-default command reused a pre-existing stale Vite server on
    port 4321 and timed out with dependency-resolution/access errors unrelated
    to the branch. A temporary managed-server attempt executed the assertions
    but hung in teardown. The agent was interrupted after the timebox, resumed
    to commit, and both agent and orchestrator obtained clean 3/3 runs against
    the built site on isolated port 4333.
- Sink report:
  - Three clear-only `innerHTML` assignments were replaced by
    `replaceChildren()`.
  - The user-controlled composition renderer now returns a
    `DocumentFragment` built with `createElement`, `.textContent`, `.title`,
    `.style`, and `replaceChildren()`.
  - The sole retained preset-shell `innerHTML` is at the agent's reported
    current line 970; no user-controlled custom ingredient data enters it.
  - Agent-reported changed ranges:
    `Calculator.astro` 199-203, 345-371, 408-412, 713-903, 954-1085,
    1207-1260, 1282-1370, and 1479-1488; `injection.spec.ts` 1-84.
- Contract deviations: none.
- Merge: `93daa21872f138d2453f6209c92d90bf864e260b`
  (`[orchestrator] merge A2 CF-03A`).
- Post-merge:
  - `npm run test:unit`: passed, 80 tests.
  - `npx astro check`: passed with 0 errors (6 existing hints).
  - `npm run build`: passed, 30 pages.

### A6 - Calculator hydration and share UX

- Branch base: `a64c4eacc9d3a392763ba67c02ea157e38ffc7de`.
- Agent commit:
  - `0d94a6a` - `[A6/CF-02B-C] hydrate and share calculator state`
- Gate attempt 1: **passed**.
  - Independent isolated Chromium run:
    `tests/share.spec.ts tests/injection.spec.ts`: 12 tests passed in 30.0
    seconds.
  - `npm run test:unit`: passed, 80 tests.
  - `npm run build`: passed with 0 errors and 30 generated pages.
  - Diff/check ownership: clean and confined to
    `src/components/Calculator.astro` and `tests/share.spec.ts`.
  - A2's DOM-safety work is preserved: custom/shared ingredient names still
    render through `.textContent` and `.title`, and the injection regression
    suite remains green.
- Hydration order:
  - Event listeners register first.
  - A present `batch` parameter is parsed with `parseShareState`; legacy
    parameters are considered only when `batch` is absent.
  - Preset hydration sets mode, bottle, and unit; synchronizes the select and
    visible tile; then performs one `loadPreset`.
  - Custom hydration sets mode, clears defaults, creates validated rows through
    input `.value` properties, then sets bottle, unit, and dilution before one
    final recalculation.
  - `isHydrating` suppresses intermediate calculations from setters.
  - Invalid URL state initializes normal defaults and exposes the accessible
    "Couldn't load the shared recipe — showing defaults" status.
  - A page without share parameters retains the pre-branch default behavior;
    the browser spec checks homepage defaults and row count.
- Share behavior:
  - `buildShareUrl` replaces the legacy hand-built query strings.
  - Presets target their selected recipe's canonical page, including when a
    different preset is chosen from a recipe page.
  - Custom shares target `/?batch=...#calculator`; visible results match after
    reopening.
  - Web Share receives a preset-specific title, a short responsible-hosting
    description, and the canonical URL; clipboard fallback remains.
  - An over-1,800-character result invokes the recipe-copy fallback and never
    calls Web Share.
- Legacy behavior:
  - Both representative preset and custom legacy URLs hydrate through A1's
    validated compatibility parser.
  - A1 API feedback: the agent reported no awkward integration point or
    contract concern.
- Environment note:
  - The shared port-4321 Playwright environment remains stale, so agent and
    orchestrator gates used the same built output on isolated port 4333.
  - The first post-merge `npx astro check` emitted no output and hit its
    120-second process timeout. The child processes exited; a direct Astro CLI
    rerun passed with 0 errors, and the subsequent full build's Astro check
    also passed.
- Contract deviations: none.
- Merge: `bc9a69daa2517952f9f4ef67dedab0a688a3bb83`
  (`[orchestrator] merge A6 CF-02B-C`).
- Post-merge:
  - `npm run test:unit`: passed, 80 tests.
  - direct `astro check`: passed with 0 errors (6 existing hints).
  - `npm run build`: passed, 30 pages.
