# Critical Fixes Manual Validation PIN Sheet

PIN means **Pass / Issue / Notes**. Use one copy per browser, viewport, or
deployment. Mark `P` only when the observed result matches the expected result;
otherwise mark `I` and add an entry to the issue log.

## Session

| Field | Value |
|---|---|
| Tester | |
| Date/time | |
| Branch / commit | `critical-fixes` / |
| Environment | Local / Preview / Production |
| Browser + version | |
| Viewport / device | |
| Base URL | Local: `http://127.0.0.1:4321` |

Local Astro development does not provide the deployed Cloudflare Pages
Function, production Turnstile keys, live n8n, DNS redirects, or Resend
delivery. Validate those rows on a configured preview or staging deployment.
With no `PUBLIC_TURNSTILE_SITE_KEY`, all email forms must remain visibly
disabled with an explanatory message; that is the expected fail-closed local
behavior.

## P0 local smoke and calculator

| ID | Test | Expected result | P / I | Notes |
|---|---|---|---|---|
| L-01 | Open `/` | Page loads without a visible error; Recipe mode is selected. | | |
| L-02 | Open `/cocktails/negroni/` | Negroni page and calculator load; the Negroni preset is selected. | | |
| L-03 | Use keyboard only to reach calculator mode, recipe, bottle, and unit controls | Focus is visible; controls operate with keyboard; labels are announced meaningfully. | | |
| L-04 | On `/`, select Negroni, 1L, then `ml` | Selected states update visibly and results remain populated. | | |
| L-05 | Switch to Custom and choose “Try a sample” | Three sample rows appear and calculated results are non-zero. | | |
| L-06 | Add ingredients until there are eight rows | The eighth row is allowed; adding a ninth is prevented. | | |
| L-07 | Enter a 61-character name, amount over 100, and ABV over 100 | Browser limits/validation prevent invalid C2 values from becoming a valid calculation. | | |
| L-08 | Toggle dilution between 0%, 20%, and 35% | Selected state and results update without a page reload. | | |
| L-09 | Toggle `oz` and `ml` in Custom mode | Amount headings/results update and remain usable. | | |
| L-10 | At widths 375px, 768px, and 1440px, inspect calculator and navigation | No horizontal page overflow, clipped primary controls, or overlapping content. | | |

## Share and hydration

| ID | Test | Expected result | P / I | Notes |
|---|---|---|---|---|
| S-01 | From `/`, share a Negroni with a non-default bottle and unit | Shared/copied URL uses `/cocktails/negroni/?batch=v1...` and is no longer than 1,800 characters. | | |
| S-02 | Open the S-01 URL in a new tab | “Shared recipe loaded” appears; recipe, bottle, and unit are restored. | | |
| S-03 | On a recipe page, select a different preset and share | URL targets the newly selected recipe, not the page’s original recipe. | | |
| S-04 | Build and share a Custom recipe, then reopen its URL | URL targets `/?batch=v1...#calculator`; rows, bottle, unit, dilution, and visible results match. | | |
| S-05 | Open `/?batch=v1.not-valid!!!#calculator` | Defaults remain usable and “Couldn't load the shared recipe — showing defaults” appears. No partial state is applied. | | |
| S-06 | Open `/?recipe=negroni&bottle=750` | Legacy link hydrates Negroni at 750ml and shows “Shared recipe loaded.” | | |
| S-07 | Open the prepared base-spirit regression URL below | Custom state loads. Results treat **Base whiskey**, not the earlier overproof modifier, as the source bottle: ingredient output includes modifier and vermouth but excludes Base whiskey. Resharing preserves the visible results. | | |
| S-08 | Open the prepared inert-text URL below | The `<img ...>` text is visibly rendered as text; no image appears, alert runs, or layout breaks. | | |

Prepared S-07 URL:

```text
http://127.0.0.1:4321/?batch=v1.eyJ2IjoxLCJtb2RlIjoiY3VzdG9tIiwiYm90dGxlTWwiOjc1MCwidW5pdCI6Im96IiwiZGlsdXRpb25QZXJjZW50IjoyMCwiaW5ncmVkaWVudHMiOlt7Im5hbWUiOiJPdmVycHJvb2YgbW9kaWZpZXIiLCJhbW91bnQiOjAuMjUsImFidiI6NTAsImlzQmFzZVNwaXJpdCI6ZmFsc2V9LHsibmFtZSI6IkJhc2Ugd2hpc2tleSIsImFtb3VudCI6MiwiYWJ2Ijo0MCwiaXNCYXNlU3Bpcml0Ijp0cnVlfSx7Im5hbWUiOiJWZXJtb3V0aCIsImFtb3VudCI6MSwiYWJ2IjoxNiwiaXNCYXNlU3Bpcml0IjpmYWxzZX1dfQ#calculator
```

Prepared S-08 URL:

```text
http://127.0.0.1:4321/?batch=v1.eyJ2IjoxLCJtb2RlIjoiY3VzdG9tIiwiYm90dGxlTWwiOjc1MCwidW5pdCI6Im96IiwiZGlsdXRpb25QZXJjZW50IjoyMCwiaW5ncmVkaWVudHMiOlt7Im5hbWUiOiI8aW1nIHNyYz14IG9uZXJyb3I9YWxlcnQoMSk-IiwiYW1vdW50IjoyLCJhYnYiOjQwLCJpc0Jhc2VTcGlyaXQiOnRydWV9LHsibmFtZSI6IlZlcm1vdXRoIiwiYW1vdW50IjoxLCJhYnYiOjE2LCJpc0Jhc2VTcGlyaXQiOmZhbHNlfV19#calculator
```

For Preview or Production, replace only
`http://127.0.0.1:4321` in the prepared URLs with that environment’s apex
origin.

## Email forms and accessibility

| ID | Environment | Test | Expected result | P / I | Notes |
|---|---|---|---|---|---|
| E-01 | Local, no Turnstile key | Inspect recipe-email, newsletter, and unsubscribe forms | Each form renders but submission is disabled with an accessible verification-configuration explanation. | | |
| E-02 | Preview | Complete Turnstile and send a recipe without marketing consent | One `send_recipe` request succeeds; recipe is delivered; CRM marketing status is unchanged. | | |
| E-03 | Preview | Send a recipe with marketing consent | Recipe is delivered once; consent becomes pending; confirmation is sent once. | | |
| E-04 | Preview | Submit newsletter signup | One `subscribe` request succeeds; consent becomes pending; confirmation is sent once; no recipe email is sent. | | |
| E-05 | Preview | Submit unsubscribe for existing and unknown addresses | Both receive the same success presentation; CRM becomes/remains unsubscribed; no welcome or recipe email is sent. | | |
| E-06 | Preview | Double-click each submit control | Only one network request is sent for that logical submission. | | |
| E-07 | Preview | Cause a retryable upstream failure, then retry without editing | Accessible error receives focus; retry reuses the same request ID. | | |
| E-08 | Preview | Complete a successful submission, then make a genuinely new submission | Success status receives focus; Turnstile resets without a false retry error; new submission uses a new request ID. | | |
| E-09 | Preview | Exercise 400, 403, 429, and 502 responses using staging controls | Specific accessible messages appear for invalid request, verification failure, rate limit, and upstream outage. | | |
| E-10 | Preview | Fill the off-screen `website` honeypot using DevTools, then submit | UI does not reveal the bot rule; no n8n side effect occurs. | | |

## n8n / Resend staging matrix

Use controlled test recipients and a disposable test sheet. Record the
request ID and downstream message/CRM evidence for each row.

| ID | Request | Transactional recipe | CRM marketing | Confirm/welcome | Unsubscribe update | P / I | Evidence |
|---|---|---:|---|---:|---:|---|---|
| N-01 | Recipe, consent false | 1 | unchanged | 0 | 0 | | |
| N-02 | Recipe, consent true | 1 | pending/subscribed | 1 | 0 | | |
| N-03 | Newsletter signup | 0 | pending/subscribed | 1 | 0 | | |
| N-04 | Unsubscribe | 0 | unsubscribed | 0 | 1 | | |
| N-05 | Invalid action | 0 | unchanged | 0 | 0 | | |
| N-06 | Duplicate the same request ID | One intended message only | No duplicate mutation | No duplicate message | No duplicate mutation | | |
| N-07 | Hostile HTML in every supported text field | Correct intended message | Correct intended mutation | Correct intended message | Correct intended mutation | | All hostile text is escaped in HTML and harmless in plain text. |
| N-08 | Missing/wrong webhook secret | 0 | unchanged | 0 | 0 | | Deterministic 401; no side effects. |

## Live domain and cutover

Capture status, `Location`, final URL, and screenshots/network evidence.

| ID | Test | Expected result | P / I | Notes |
|---|---|---|---|---|
| D-01 | `https://www.freezerbatchcocktails.com/` | One 301 to the apex root. | | |
| D-02 | `https://www.freezerbatchcocktails.com/cocktails/daiquiri/?utm_source=manual` | One 301; path and query are preserved on the apex. | | |
| D-03 | Repeat with a guide path, missing path, and query-only path | Each redirects once to the equivalent apex URL. | | |
| D-04 | Test HTTP `www` and HTTPS apex | HTTP `www` reaches HTTPS apex without loops; apex does not redirect to `www`. | | |
| D-05 | Inspect representative page canonicals | Canonical uses the apex and contains no query string or fragment. | | |
| D-06 | Confirm obsolete Pages project ownership is detached after redirect validation | `www` remains proxied with valid TLS and is served only by the zone redirect. | | |
| D-07 | Confirm rollback owner and procedure | Redirect can be disabled and old domain reattached only for a verified outage. | | |
| D-08 | Confirm WAF rule | `POST /api/email` challenges/blocks after 5 requests per IP per 10 seconds without unacceptable false positives. | | |
| D-09 | Confirm Privacy Policy | Names Turnstile, same-origin email API, actual consent behavior, and processors. | | |

## Cutover blockers

All pre-cutover boxes must be checked before production traffic is switched:

- [ ] Cloudflare `www` DNS/project ownership, redirect, live matrix, detach,
      and rollback readiness are verified.
- [ ] Production and preview Turnstile widgets and bindings are configured.
- [ ] Pages `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, and the matching n8n
      secret check are configured.
- [ ] n8n v2 is imported and N-01 through N-08 pass.
- [ ] The external double-opt-in mechanism promotes `pending` to `subscribed`.
- [ ] Resend domain, SPF, DKIM, DMARC, sender/reply-to, and marketing
      unsubscribe headers are verified.
- [ ] The WAF rate rule passes D-08.
- [ ] Function and n8n v2 are ready for coordinated deployment; the old public
      webhook will be disabled or authenticated immediately afterward.
- [ ] Privacy Policy passes D-09.
- [ ] A named owner is assigned for the required 48-hour observation window.

## Issue log

| Issue ID | Test ID | Severity | Summary and reproduction | Evidence | Owner | Status |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |

Severity guide: **P0** security/data loss/cutover stop, **P1** broken primary
flow, **P2** degraded or confusing behavior with a workaround, **P3** cosmetic.

## Sign-off

| Role | Name | Decision | Date/time | Notes |
|---|---|---|---|---|
| Manual QA | | Pass / Block | | |
| Engineering | | Pass / Block | | |
| Email / CRM owner | | Pass / Block | | |
| Cloudflare owner | | Pass / Block | | |
| Cutover owner | | Go / No-go | | |

