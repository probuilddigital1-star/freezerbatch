# CC prompt — stage the Cold Open republish so the postal address is the only fill-in

Repo: `~/Documents/claude-projects/freezer-batch-cocktails`. Goal: everything for the
batched n8n republish prepared and reviewable NOW, so that the moment the postal address
exists (deadline 2026-08-12), applying it is minutes, not a build. Target: republish
live by ~Aug 14; Issue 01 hand-sends ~Aug 20–24 for Labor Day (Mon Sep 7).

**HARD RULE: do not PUT anything to the n8n API and do not publish in this session.**
The live v2 workflow (the one verified end-to-end 2026-08-01) stays untouched until the
address exists and the user reviews. This session produces repo commits + a ready-to-run
apply package.

Also out of scope: the calculator consent checkbox flip (prepare it, task 4, but do not
commit it to main until after the republish is live), the photo ignore rules, Issue 01
content itself (hand-sent via Resend Broadcasts later, not n8n).

## Context you need

- The batched republish contents were decided 2026-08-02: (1) postal address in the
  footer of every send, (2) welcome subject → `Your free label sheet is inside` plus a
  "Before you print" block, (3) a second download link for the batch timing sheet —
  `/downloads/fbc-batch-timing.pdf`, shipped and live as of `ad96ce1`, (4) the
  recipe-email utility line "Batching this? Print the labels →" + 3-step timeline. Item
  4 is what makes the calculator consent checkbox's promise true (gap D).
- The 2026-08-01 publish process to mirror when the time comes: export current workflow
  via API → backup to `~/n8n-backups/` (NEVER the repo) → node-level diff → PUT → the
  user reviews in the n8n editor and clicks Publish → live signup test.
- The welcome build node in v2 fails closed if the unsubscribe link is missing. Extend
  that pattern: it must also fail closed if the postal address is unresolved.
- Static test exists: `n8n/FreezerBatchCocktails-v2.static-test.mjs`.

## Task 1 — welcome template edits (repo: `n8n/emails/cold-open/welcome.html`)

1. Everywhere the label sheet is mentioned (preheader, headline, body, button), it is
   described as **free** — same rule already applied to the site in `e200b6d`. Keep the
   existing voice; don't pile "free" into every sentence, once per surface element.
2. Add a compact **"Before you print"** block after the download button — condensed from
   page 2 of the label PDF: full-sheet label stock or plain cardstock (die-cut sheets
   don't match the grid and fail in freezers anyway) · cut on the dashed lines · apply
   to a dry, room-temperature bottle before the first freeze · or hang it as a cardstock
   neck tag. Three or four short lines in the email's table-layout style, not a wall.
3. Add the **timing sheet** as a second download: one row, secondary styling (bordered
   link, not a second gold button — the label sheet stays the primary CTA). Copy angle:
   "how long each of the 18 recipes keeps in the freezer." Use a token
   (`{{TIMING_SHEET_URL}}`) consistent with how `{{LABEL_SHEET_URL}}` works.
4. Footer: postal address slot as `{{POSTAL_ADDRESS}}` on its own line near the
   unsubscribe link. This token is EXPECTED to be unresolved for now.
5. Keep the email self-contained table-HTML, Outlook-safe like the rest (mso rules,
   role=presentation). No image row — that still waits on the Negroni photo.

## Task 2 — recipe-email utility line

Locate where the recipe email (the calculator "send me this recipe" path) gets its HTML
in the v2 workflow. Add after the recipe content: **"Batching this? Print the free
labels →"** linking to `/downloads/fbc-bottle-labels.pdf`, plus the 3-step timeline in
one compact line or three tiny rows (label the bottle while the jigger's out → taste a
small pour a few days in → glasses in the freezer an hour before guests). Every
recipient gets this regardless of consent — that's the point; it's what makes the
checkbox honest. If the recipe email's HTML lives only inside a build node in the
workflow JSON, write the new fragment to
`n8n/emails/cold-open/recipe-utility-line.html` in the repo as the source of truth and
include it in the node diff.

## Task 2.5 — monthly-issue template pre-send fixes (repo-only, same staging commit)

Two defects you already identified, fixed at the source so send day can't miss them:

1. Remove the `{{PREFERENCES_URL}}` link from `n8n/emails/cold-open/monthly-issue.html`
   — no preferences page exists; same fix already applied to the welcome email in n8n
   on 2026-08-01.
2. Next to the unsubscribe placeholder in `monthly-issue.html`, add an HTML comment:
   Resend Broadcasts requires the TRIPLE-brace `{{{RESEND_UNSUBSCRIBE_URL}}}` — the
   double-brace form will not be substituted. The comment is the guard; the swap itself
   happens when the issue is pasted into Resend.

## Task 3 — the apply package (prepared, not executed)

Produce `n8n/republish-2026-08/` in the repo containing:

- `APPLY.md` — the exact step-by-step: export live workflow → backup → which nodes
  change → PUT → user review checklist → Publish → live signup test script (sign up
  with a real address, confirm subject, both download links resolve to
  `application/pdf`, unsubscribe link present, postal address rendered).
- The node-level diffs, generated against a FRESH export of the live workflow (read-only
  API GET is fine — the no-PUT rule is about writes). Diff must cover: welcome build
  node (new subject `Your free label sheet is inside` + new template + timing-sheet URL
  + postal-address token), the fail-closed guard extension (unresolved
  `{{POSTAL_ADDRESS}}` or `{{TIMING_SHEET_URL}}` → refuse to send, same behavior as the
  missing-unsubscribe guard), and the recipe-email node (utility line).
- A single clearly-marked `POSTAL_ADDRESS` constant at the top of the apply script/diff
  so the address is a one-line fill-in.

Run `n8n/FreezerBatchCocktails-v2.static-test.mjs` against the modified workflow JSON
locally to prove the diffs are structurally sound before calling the package ready.

## Task 4 — stage (don't ship) the consent-checkbox flip

Prepare the exact edit to `src/components/Calculator.astro` (both checkbox instances):
current conservative wording → the labels version, e.g. "Also send me Cold Open — one
make-ahead recipe and a hosting timeline, monthly, plus the free printable label
sheet." Put the prepared diff in `n8n/republish-2026-08/checkbox-flip.patch` (or an
uncommitted branch) with a note: **apply only after the republish is live and the
welcome flow is re-verified.** Do not commit it to main in this session.

## Gates and report

- Site untouched except repo email templates and the new `n8n/republish-2026-08/` dir —
  `npm run build` + `npm run test:unit` still green (they should be unaffected; prove it).
- Static test passes on the modified workflow JSON.
- Commit the template edits + apply package:
  `[cold-open] stage the August republish — address is the only fill-in`
- Report: files changed, what the diffs touch node-by-node, static-test result, and the
  one line where the postal address goes. If anything about the live workflow's current
  shape contradicts this brief (nodes renamed, template moved), stop and report rather
  than improvising the diff.
