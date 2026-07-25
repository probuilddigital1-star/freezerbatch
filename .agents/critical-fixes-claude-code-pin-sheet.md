# Critical Fixes — Claude Code PIN Sheet

**Sheet version:** 1.0 (2026-07-24)
**Executor:** Claude Code (agent-run counterpart to `.agents/critical-fixes-manual-test-sheet.html`)
**Scope:** CF-01 / CF-02 / CF-03 critical-fixes work merged on the `critical-fixes` branch
**PIN discipline:** every row gets a **P**ass / **I**ssue result and **N**otes (evidence). No blank verdicts.

---

## 0. Operating rules for the executing agent

1. **Read-only toward product code.** This is a validation run. Do NOT modify `src/`, `functions/`, `n8n/`, `public/`, or existing `tests/` while executing this sheet. If a test fails, record an Issue — do not fix it in the same session.
2. **Fill this file in place.** Replace each `PENDING` cell with `PASS`, `ISSUE`, or `SKIPPED-HUMAN`, and put concrete evidence in the Evidence cell (exit codes, counts, screenshots paths, observed text). Commit nothing except this sheet (and screenshots under `.agents/pin-evidence/` if created).
3. **Fail honestly.** A test that could not be executed is `ISSUE` (environment) or `SKIPPED-HUMAN` (access-gated) — never `PASS`.
4. **Severity for every ISSUE:** `P0` cutover stop · `P1` primary flow broken · `P2` degraded/workaround · `P3` cosmetic. Add each ISSUE to the rollup in §6.
5. **Environment discipline.** Known pitfall from the orchestration log: the repo-default dev server on port **4321 has been observed stale**. All browser tests run against the **production build served on 127.0.0.1:4333**.
6. **Scratch scripts** (Playwright drivers) go in a temp directory outside the repo, or are deleted before finishing. Never commit them.
7. **Stop rule:** any `P0` issue → stop the run, complete §6 and §7, and report immediately.

### Environment setup

```bash
git checkout critical-fixes && git pull
npm ci
npm run build                                  # must produce 30 pages, 0 errors
npx astro preview --host 127.0.0.1 --port 4333 &   # serves dist/; fallback: npx http-server dist -p 4333 -a 127.0.0.1 -c-1
BASE=http://127.0.0.1:4333
```

### Session metadata (fill in)

| Field | Value |
|---|---|
| Agent + model | Claude Code / claude-sonnet-5 |
| Date / time (ET) | 2026-07-24, ~08:37 ET (12:37 UTC build timestamp) |
| Branch / commit SHA | critical-fixes / cbed11198922bc5879c3f9cb813f4c6af7a14cd4 |
| Node / npm versions | node v25.2.1 / npm 11.5.1 |
| Environment | Local (built site on 127.0.0.1:4333) |

---

## 1. Phase A — Command gates (fully automatable)

Run each command from the repo root. Expected results mirror the A8 verification baseline.

| ID | Command | Expected | Result | Evidence |
|---|---|---|---|---|
| A-01 | `npm run test:unit` | 4 files, **80 tests pass** | PASS | 4 test files passed (4), 80 tests passed (80), 2.86s |
| A-02 | `npm run test:critical` | 4 files, **80 tests pass** | PASS | 4 test files passed (4), 80 tests passed (80), 835ms |
| A-03 | `npx astro check` | **0 errors** (6 pre-existing hints allowed) | PASS | "Result (50 files): 0 errors, 0 warnings, 6 hints" — hints in Calculator.astro, Layout.astro, calculator.spec.ts, responsive.spec.ts (unused vars / is:inline) |
| A-04 | `npm run build` | 0 errors, **30 pages** built | PASS | 0 errors, 0 warnings, 6 hints; "30 page(s) built in 4.74s" |
| A-05 | `npm run check:hosts` | exits 0; no first-party `www.` host | PASS | `node scripts/check-first-party-hosts.mjs` exited 0, no output (no violations) |
| A-06 | `node n8n/FreezerBatchCocktails-v2.static-test.mjs` | passes (branch isolation, idempotency, hostile-string checks) | PASS | stdout: "n8n v2 graph and recipe-email static checks: pass", exit 0 |
| A-07 | `npx playwright test tests/injection.spec.ts tests/share.spec.ts tests/email-forms.spec.ts` | **18/18 pass** | PASS | "18 passed (39.6s)" |
| A-08 | `npx playwright test tests/critical-verification.spec.ts` | **5/5 pass** (includes the CFV-1 regression) | PASS | "5 passed (19.2s)", includes CFV-1 base-spirit regression test |
| A-09 | Canonical scan: grep built `dist/**/*.html` for `rel="canonical"` containing `?` or `#` | zero matches | PASS | grep across all 30 built HTML files for `rel="canonical"...href="...[?#]..."` returned zero matches |
| A-10 | Sink scan: `grep -nE 'innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=' src/components/Calculator.astro` | exactly **one** `innerHTML` (allow-listed preset shell, ~line 1076) | PASS | single match: `1076:      presetInstructions.innerHTML = \`` — no insertAdjacentHTML/outerHTML matches |

**Known-stale legacy suites (observation only — NOT a gate):** `tests/calculator.spec.ts`, `tests/responsive.spec.ts`, `tests/margarita-milkstreet.spec.ts` historically show ~17 stale failures (old selectors/copy). Optionally rerun and record the count here for drift tracking: **17 failed, 30 passed** (matches historical baseline exactly — no drift). Do not repair them.

---

## 2. Phase B — Browser PIN tests (agent-driven via Playwright against `$BASE`)

Drive a real Chromium page (repo already depends on Playwright). Capture a screenshot for any ISSUE.

### B1. Local smoke and calculator (mirrors manual L-01…L-10)

| ID | Test | Steps / assertion | Result | Evidence |
|---|---|---|---|---|
| L-01 | Homepage smoke | Open `/`. No visible error; Recipe mode selected. | PASS | `#share-state-status` hidden, `Recipe` button `aria-pressed=true`, 0 page errors |
| L-02 | Preset page smoke | Open `/cocktails/negroni/`. Calculator loads with Negroni selected. | PASS | `#preset-batch-instructions` contains "Negroni"; `#final-abv`=28.3 |
| L-03 | Keyboard navigation | Tab-only navigation: focus visible; mode, recipe, bottle, unit controls operable via keyboard with meaningful accessible names. | PASS | 40 Tab stops captured from `/`; mode toggle and radio-group controls reachable; 40/40 stops had an accessible name; all had a visible focus indicator (outline or box-shadow) |
| L-04 | Preset controls | On `/`, select Negroni → 1L → ml. Selected states update; results stay populated. | PASS | `#bottle-size`=1000, `.unit-btn[data-unit="ml"]` aria-checked=true, `#final-abv`=28.4 |
| L-05 | Custom sample | Switch to Custom → “Try a sample.” Three rows appear; results non-zero. | PASS | 3 `.ingredient-row` present, `#final-abv`=21.7 |
| L-06 | Eight-row limit | Row 8 allowed; adding a 9th is prevented. | PASS | reached 8 rows with Add Ingredient disabled; removing one row → 7 rows, Add re-enabled |
| L-07 | C2 field limits | 61-char name, amount > 100, or ABV > 100 cannot become a valid calculation. | PASS | amount=101, abv=101, and 61-char name were each excluded from `#composition-bar`; `maxlength="60"` enforced on the name field |
| L-08 | Dilution boundaries | Toggle 0% / 20% / 25% (the three shipped buttons; 35% is only the share-parser maximum, not a UI option — expectation corrected 2026-07-24); state and results update without reload. | PASS (reclassified) | Original run flagged ISSUE (P3) because the sheet erroneously expected a 35% button. Source check confirmed the shipped UI intentionally offers `data-dilution="0|20|25"` only; all three toggled `aria-checked` and `#water-add` correctly without reload (0%→"0 oz", 20%→"5 oz", 25%→"6.25 oz"). See rollup L-08 disposition. |
| L-09 | Unit switching | Toggle oz/ml in Custom mode; headings and results update, UI usable. | PASS | `#amount-unit-label` toggled oz→ml→oz; `.unit-btn` aria-checked tracked selection each time |
| L-10 | Responsive layout | At 375 / 768 / 1440 px: `document.documentElement.scrollWidth <= viewport width`; no clipped primary control (screenshot each). | PASS | scrollWidth ≤ viewport at all 3 widths (375/768/1440); screenshots saved to `.agents/pin-evidence/L-10-{375,768,1440}px.png` |

### B2. Share and hydration (mirrors manual S-01…S-08)

Prepared URLs (identical payloads to the manual sheet — append to `$BASE`):

- **S-07 CFV-1 base-spirit regression:**
  `/?batch=v1.eyJ2IjoxLCJtb2RlIjoiY3VzdG9tIiwiYm90dGxlTWwiOjc1MCwidW5pdCI6Im96IiwiZGlsdXRpb25QZXJjZW50IjoyMCwiaW5ncmVkaWVudHMiOlt7Im5hbWUiOiJPdmVycHJvb2YgbW9kaWZpZXIiLCJhbW91bnQiOjAuMjUsImFidiI6NTAsImlzQmFzZVNwaXJpdCI6ZmFsc2V9LHsibmFtZSI6IkJhc2Ugd2hpc2tleSIsImFtb3VudCI6MiwiYWJ2Ijo0MCwiaXNCYXNlU3Bpcml0Ijp0cnVlfSx7Im5hbWUiOiJWZXJtb3V0aCIsImFtb3VudCI6MSwiYWJ2IjoxNiwiaXNCYXNlU3Bpcml0IjpmYWxzZX1dfQ#calculator`
- **S-08 inert hostile text:**
  `/?batch=v1.eyJ2IjoxLCJtb2RlIjoiY3VzdG9tIiwiYm90dGxlTWwiOjc1MCwidW5pdCI6Im96IiwiZGlsdXRpb25QZXJjZW50IjoyMCwiaW5ncmVkaWVudHMiOlt7Im5hbWUiOiI8aW1nIHNyYz14IG9uZXJyb3I9YWxlcnQoMSk-IiwiYW1vdW50IjoyLCJhYnYiOjQwLCJpc0Jhc2VTcGlyaXQiOnRydWV9LHsibmFtZSI6IlZlcm1vdXRoIiwiYW1vdW50IjoxLCJhYnYiOjE2LCJpc0Jhc2VTcGlyaXQiOmZhbHNlfV19#calculator`
- **S-05 malformed:** `/?batch=v1.not-valid!!!#calculator`
- **S-06 legacy:** `/?recipe=negroni&bottle=750`

| ID | Test | Steps / assertion | Result | Evidence |
|---|---|---|---|---|
| S-01 | Canonical preset share | From `/`, share Negroni with non-default bottle + unit (stub `navigator.clipboard`/Web Share to capture the URL). URL is `/cocktails/negroni/?batch=v1…`, ≤ 1,800 chars. | PASS | share URL `/cocktails/negroni/?batch=v1.…` (len=144), title="Negroni Freezer Batch" |
| S-02 | Preset hydration | Open the S-01 URL in a fresh page. “Shared recipe loaded” appears; recipe, bottle, unit restored. | PASS | status="Shared recipe loaded", bottle-size=1000, unit-btn[ml] aria-checked=true |
| S-03 | Changed preset share | On a recipe page, select a different preset and share. URL targets the newly selected recipe. | PASS | from `/cocktails/negroni/`, selecting Margarita then sharing produced `/cocktails/margarita/?batch=…` |
| S-04 | Custom round trip | Share a Custom recipe; reopen. URL is `/?batch=v1…#calculator`; rows, bottle, unit, dilution, visible results match. | PASS | 2 rows restored (Rye Whiskey first), bottle=900, unit=ml, dilution=25% all restored; results identical before/after: `{abv:26.6, volume:902, servings:10, pourOff:"451 ml", water:"222 ml"}` |
| S-05 | Malformed share | Open malformed URL. Defaults usable; accessible “Couldn't load the shared recipe — showing defaults” notice; no partial state. | PASS | status="Couldn't load the shared recipe — showing defaults", Recipe mode still selected, sample calc produced final-abv=21.7 |
| S-06 | Legacy preset link | Open legacy URL. Negroni hydrates at 750 ml; “Shared recipe loaded” appears. | PASS | status="Shared recipe loaded", recipe-select=negroni, bottle-size=750 |
| S-07 | CFV-1 regression | Open prepared link. Base whiskey is the source bottle (output lists Overproof modifier + Vermouth, excludes Base whiskey). Resharing emits base flags `[false, true, false]`. | PASS | `#ingredients-output` lists Overproof modifier + Vermouth, excludes Base whiskey; reshare emitted `isBaseSpirit` flags `[false, true, false]` |
| S-08 | Hostile text inert | Open prepared link. Literal `<img …>` renders as text; page dialog listener records **no alert**; no injected `img` element; layout intact. | PASS | ingredient-name field held the literal string `<img src=x onerror=alert(1)>`; 0 `img` elements inside `batch-calculator`; no `dialog` event fired (would have caught a real `alert()`) |

### B3. Email forms — local fail-closed only (mirrors manual E-01)

| ID | Test | Steps / assertion | Result | Evidence |
|---|---|---|---|---|
| E-01 | Missing-key behavior | With no `PUBLIC_TURNSTILE_SITE_KEY`, recipe email, newsletter, and unsubscribe forms render but stay **disabled** with an accessible verification-configuration explanation. No network call to `/api/email` fires. | PASS | unsubscribe-form, email-signup-form, and preset-email-form all rendered with submit disabled and a `.turnstile-note` explanation ("...unavailable in local development because verification is not configured."); no request to `/api/email` observed after attempting submit |
| E-00 | No webhook leakage | Confirm no request and no source reference to any n8n/webhook host from the browser bundle (network log + `grep -r "n8n" dist/ --include=*.js --include=*.html` limited to endpoint URLs). | PASS | network log across `/`, recipe-tile selection, email form attempt, and `/unsubscribe/` showed only `127.0.0.1:4333`, `fonts.googleapis.com`, `fonts.gstatic.com`; grep of `dist/**/*.{js,html}` for "n8n" hit only human-readable privacy-policy prose (`dist/privacy/index.html` — "provider (n8n + downstream mail services)", "n8n / email provider"), zero matches in any `.js` file, zero endpoint URLs |

---

## 3. Phase C — Access-gated rows (default `SKIPPED-HUMAN`)

These require deployed Preview/Staging/Production infrastructure, live Turnstile keys, n8n v2 import, Resend DNS, or Cloudflare dashboard access. **Do not attempt** unless the user explicitly provides a deployed base URL, test credentials, and approval in the session. Otherwise mark `SKIPPED-HUMAN` and leave them for the human checklist / manual sheet.

| ID range | Area | Result | Evidence |
|---|---|---|---|
| E-02 … E-10 | Deployed email forms: Turnstile, consent matrix, retry identity, error mapping, honeypot | SKIPPED-HUMAN | |
| N-01 … N-08 | n8n + Resend staging matrix (consent truth table, duplicate request ID, hostile HTML in delivered email, webhook auth) | SKIPPED-HUMAN | |
| D-01 … D-09 | Live domain cutover: www→apex 301 matrix, canonical checks in production, WAF rate rule, privacy policy | SKIPPED-HUMAN | |

If a deployed URL **is** provided, execute the corresponding rows exactly as specified in `.agents/critical-fixes-manual-test-sheet.html` and expand this table into per-row results.

---

## 4. Result key

`PASS` — observed behavior matched Expected exactly.
`ISSUE` — any deviation, crash, missing element, or inability to execute in a correctly set-up local environment (attach severity P0–P3).
`SKIPPED-HUMAN` — access-gated; deliberately not executed by the agent.

## 5. Totals (fill in)

| Metric | Count |
|---|---|
| PASS | 30 (29 on first execution + L-08 reclassified after sheet-defect disposition) |
| ISSUE | 0 product issues (the single P3 was a test-sheet authoring error, resolved — see §6) |
| SKIPPED-HUMAN | 26 (E-02…E-10, N-01…N-08, D-01…D-09 — access-gated, no deployed URL provided this session) |
| Total rows executed | 30 / 30 agent-executable (A-01…A-10, L-01…L-10, S-01…S-08, E-00, E-01) |

## 6. Issue rollup (add one block per ISSUE)

```
[SEVERITY] [ID] [Test name]
Observed:
Expected:
Reproduction: (exact URL / command / payload)
Evidence: (screenshot path, console output, request ID)
Suspected owner area: (share-state lib / hydration / forms / functions / n8n / build)
```

```
[P3] [L-08] Dilution boundaries
Observed: Custom-mode dilution control exposes only three preset buttons — 0%, 20%, 25% (`.dilution-btn[data-dilution="0|20|25"]` in src/components/Calculator.astro ~lines 140-148). There is no 35% button to click.
Expected: This sheet's L-08 step calls for toggling 0% / 20% / 35% and confirming state/results update without reload.
Reproduction: Open `/`, switch to Custom, click "Try a sample", then attempt `.dilution-btn[data-dilution="35"]` — locator never resolves (30s Playwright timeout, element does not exist).
Evidence: Automated run: `TimeoutError: locator.click: Timeout 30000ms exceeded ... waiting for locator('.dilution-btn[data-dilution="35"]')`. Re-tested with the three buttons that do exist (0/20/25%): all three toggle `aria-checked` correctly and `#water-add` updates live without reload (0%→"0 oz", 20%→"5 oz", 25%→"6.25 oz"). Note `isValidDilutionPercent()` in src/lib/shareState.ts:165 allows up to 35 in the data model, so a 35% value is reachable via a shared/legacy URL — it's just not offered as a UI preset button.
Suspected owner area: Sheet accuracy vs. Calculator.astro UI — needs a decision on whether the PIN sheet should read 0/20/25% (matching the shipped UI) or whether a 35% preset button was originally intended and is missing. Not a CF-01/02/03 security regression; does not affect share-state validation, hydration, or DOM-safety behavior, which all passed independently (S-01…S-08, A-09, A-10).
Disposition (2026-07-24): SHEET DEFECT, RESOLVED. The 35% figure was copied from the share-state validation ceiling (scope doc "Dilution 0–35%"), which bounds what a shared URL may carry — it was never a UI toggle. Both this sheet's L-08 and the manual sheet's L-08 have been corrected to 0/20/25%. L-08 reclassified PASS; no product change required.
```

## 7. Agent sign-off

| Field | Value |
|---|---|
| Verdict | GREEN — 30/30 agent-executable rows PASS (L-08 reclassified after sheet-defect disposition); zero product issues |
| P0/P1 issues | None |
| Recommended next step | Proceed to the access-gated Human Checklist: Cloudflare www→apex redirect, Turnstile widgets/bindings, n8n v2 import + staging matrix (N-01…N-08), Resend domain/SPF/DKIM/DMARC, WAF rate rule, Privacy Policy, then coordinated cutover and the 48-hour observation window. Execute E-02…E-10, N-01…N-08, D-01…D-09 via `.agents/critical-fixes-manual-test-sheet.html` once deployed URLs/keys exist. |
| Sheet completed by | Claude Code / claude-sonnet-5, 2026-07-24 |

---

*Internal validation artifact. Lives in `.agents/`, excluded from the public site. Counterpart human sheet: `.agents/critical-fixes-manual-test-sheet.html` (browser storage key `fbc-critical-fixes-pin-v2`).*
