# Republish post-verification record — 2026-08-23

Test artifact, not an incident. Kept because the failure pattern will recur the
next time someone tests with a plus-tagged address.

The republish went live at 22:26:38 UTC (`versionId 4873e53b`). Every execution
below ran on the new nodes and succeeded end-to-end in n8n, and Resend accepted
every message. Local parts of work addresses elided; this repo is public.

| execution | time (UTC) | recipient | Resend id | outcome |
|---|---|---|---|---|
| 250588 | 22:29:30 | zckpearson@gmail.com | dc3cfa15… | accepted; inbox not directly observable at test time |
| 250589 | 22:34:42 | …@probuilddigital.com | (welcome) | **delivered**, full content verified (subject, PDFs, address in both parts, hero, Labor Day block) |
| 250590 | 22:36:03 | …@probuilddigital.com | (recipe) | **delivered** without consent ticked; utility line + 3-step timeline verified |
| 250591 | 22:48:46 | …+1test@probuilddigital.com | f01c3169… | accepted by Resend, **bounced by Google** |
| 250592 | 22:49:25 | …+2test@probuilddigital.com | 42436ce9… | accepted by Resend, **bounced by Google** |
| 250593 | 22:54:38 | zckpearson@gmail.com | c06d597e… | accepted and **delivered** to the personal inbox |

## The lesson

The probuilddigital address is an alias/forward into a Gmail mailbox, and
**Google does not route plus-tagged variants of aliases** — only of the real
account address. So `+tag` tests against that domain bounce even though the
base address delivers fine. Resend duly accepted all of them; the rejection
happens downstream at Google. n8n executions cannot see past Resend's
acceptance — bounce evidence lives in the Resend dashboard.

For future send tests: plus-tag the real Gmail (`zckpearson+tag@gmail.com`),
or use the base alias address, never a plus-tagged alias.

Post-verification, `checkbox-flip.patch` was applied and deployed (`ab405b7`,
live 22:41:11 UTC). The 22:54 delivery proves the send path works post-flip —
the flip touched site copy only, as designed.

## Second PUT, same evening: recipe-email hero

`versionId 4873e53b -> f7c3bb87` at 23:22:55 UTC. Exactly one node changed —
`Build Transactional Recipe Email` (5,752 -> 6,358 chars) — asserted against a
fresh export before sending; the welcome node was deliberately left untouched
because the live copy carries the injected postal address and PUTting the
committed empty-token artifact over it would have wiped it.

The hero uses the same treatment as the welcome's Start Here card: the recipe's
own 1200x630 render at the top of the card, URL shaped exactly as
src/lib/ogImage.ts shapes it, alt text from the recipe name. Preset only — a
custom recipe has no slug, so it has no render to point at and keeps the
imageless layout; a slug outside the site's `[a-z0-9-]` shape renders no image
rather than an attacker-shaped URL. Verified by execution: live margarita send
(execution 250596, 2.0s, no consent ticked) delivered 23:24:37 UTC with the
hero row, correct src and alt, utility line and timeline intact, subject
unchanged. verify-republish: 26 checks.
