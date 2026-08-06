# August republish — apply procedure

Staged 2026-08-06. **Nothing in this package has been sent to n8n.** The live v2 workflow
(`oAutYB68sxicWzZZ`, `versionId 04794c4a`, verified end-to-end 2026-08-01) is untouched.

The one fill-in is the postal address. Everything else is built and verified.

---

## ⛔ Read this before applying

**1. Do not PUT `proposed-workflow.REVIEW-ONLY.json`.** Credential bindings are stripped
from it so it can live in the repo — the repo's static test enforces that committed
workflow JSON carries no credential values. PUTting the stripped file would unbind Resend
and Google Sheets from **six** nodes and silently break every send. Apply the two jsCode
payloads on top of a *fresh live export* instead. Step 3 below does exactly that.

**2. The repo's static test is currently red against production, and has been since
2026-08-01.** `n8n/FreezerBatchCocktails-v2.static-test.mjs` still asserts the *pre-*Cold
Open welcome email — subject `Welcome to Freezer Batch Cocktails`, the copy
"Welcome to the newsletter", and the old `#171411`/`#d7b46a` palette. The live node has
said `You're in — your label sheet is inside` in the Cold Open palette since the Aug-1
publish. `n8n/FreezerBatchCocktails-v2.json` in the repo is stale for the same reason
(its welcome node is the old 1,835-char version), which is why the test still passes
locally: the repo is self-consistently out of date.

Proven, not assumed: running the test against a fresh live export with **none** of this
session's changes fails on `Build Newsletter Double Opt-In Confirmation sends the welcome
subject`. Running it against this package's proposed workflow with only that 20-line
welcome-design block neutralised passes everything else — graph integrity, node/ID
uniqueness, connection targets, Idempotency-Key headers, code compilation, credential
absence, recipe-email rendering, and the unsubscribe branch.

**This must be reconciled before or alongside the republish.** Two pieces of debt:
refresh `n8n/FreezerBatchCocktails-v2.json` from a credential-stripped live export, and
rewrite the 20-line welcome block to assert the Cold Open design. Both are judgment calls
about what the invariant should now be, so they were left for a decision rather than
improvised here.

---

## Step 1 — fill the address

Edit the constant at the top of `build-republish.mjs`:

```js
export const POSTAL_ADDRESS = '';   // <- the only fill-in
```

That is the single line. A PO box is fine.

## Step 2 — rebuild and verify

```bash
N8N_KEY_FILE=<path-to-key> node n8n/republish-2026-08/build-republish.mjs
node n8n/republish-2026-08/verify-republish.mjs
```

`build-republish.mjs` does a read-only GET, constructs the change, and writes
`welcome-node.jsCode.js`, `recipe-node.jsCode.js`, and the review JSON. It refuses to
continue if any node other than the two expected ones differs, or if connections or
settings drift.

`verify-republish.mjs` must report **20 checks passed** (19 plus the static test) once the
address is filled. Before it is filled, expect the first check to prove the CAN-SPAM guard
throws — that is the guard working, not a failure.

## Step 3 — back up, then PUT

Backups go to `~/n8n-backups/`, **never** the repo.

1. Fresh GET of `oAutYB68sxicWzZZ`; write it to `~/n8n-backups/FreezerBatchCocktails-v2.pre-republish-<stamp>.json`.
2. On that fresh export (credentials intact), replace exactly two `parameters.jsCode` values:
   - `Build Newsletter Double Opt-In Confirmation` ← `welcome-node.jsCode.js`
   - `Build Transactional Recipe Email` ← `recipe-node.jsCode.js`
3. Assert exactly two nodes differ, and that connections, settings, and every
   `credentials` block are byte-identical to the export.
4. PUT only the writable fields: `name`, `nodes`, `connections`, `settings`
   (and `staticData` if present). The API rejects `settings.binaryMode` — filter it out
   and expect the server to preserve the stored value, as it did on 2026-08-01.

## Step 4 — the user reviews and publishes

**Claude never publishes.** Print a node-by-node summary, then hand off.

Review checklist in the n8n editor:

- [ ] Exactly two nodes show as changed
- [ ] `Build Newsletter Double Opt-In Confirmation` — new subject, timing-sheet link, postal address
- [ ] `Build Transactional Recipe Email` — utility line present, subject unchanged
- [ ] No other node, connection, or credential touched
- [ ] Webhook trigger still `responseMode: "responseNode"`
- [ ] `Record Unsubscribe → Respond Unsubscribed` — still no reachable email node

Then click **Publish**.

## Step 5 — live signup test

Sign up on the production site with a real address, then confirm:

- [ ] Subject reads `Your free label sheet is inside`
- [ ] Label sheet link resolves — **assert `content-type: application/pdf`**, not just HTTP 200. This site returns `200 text/html` for missing paths, which has produced two false passes already.
- [ ] Timing sheet link resolves, same assertion
- [ ] Unsubscribe link present and correct
- [ ] **Postal address renders** in both the HTML and the plain-text alternative
- [ ] "Before you print" block present
- [ ] Send a recipe email from the calculator; confirm the utility line and 3-step timeline appear, and that it arrives for a recipient who did *not* tick the consent box

Then poll `GET /executions?workflowId=oAutYB68sxicWzZZ` and record the execution id,
status, and runtime. Expect ~3-5s, inside the 10s budget from `0d99948`.

## Step 6 — only after the above is verified

Apply `checkbox-flip.patch` (see its header). It changes the calculator's consent copy to
promise the label sheet, which is only honest once the recipe email actually carries it.

---

## What changes, node by node

| Node | Change |
|---|---|
| `Build Newsletter Double Opt-In Confirmation` | `jsCode` 10,884 → 15,163 chars. New subject `Your free label sheet is inside`; template now generated from `n8n/emails/cold-open/welcome.html`; adds the timing-sheet link and `{{POSTAL_ADDRESS}}`; extends the fail-closed guard to refuse an unresolved postal address or missing timing-sheet link. |
| `Build Transactional Recipe Email` | `jsCode` 4,916 → 5,752 chars. Inserts the utility line + 3-step timeline from `n8n/emails/cold-open/recipe-utility-line.html`, immediately before the "Browse cocktails" link. Subject and all recipe rendering unchanged. |
| *all 23 others* | untouched |

Connections, settings, and credentials: unchanged.

## Where the postal address goes

Rendered into the welcome footer on its own line, directly beneath the company name:

```html
<tr><td align="center" style="...">{{COMPANY_NAME}}</td></tr>
<tr><td align="center" style="...">{{POSTAL_ADDRESS}}</td></tr>
```

and into the plain-text alternative on the line after `Freezer Batch Cocktails`. The build
node throws unless it renders into **both**.
