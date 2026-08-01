# Handoff: Cold Open by FBC — email program

## Overview
Visual system for the email program of **Freezer Batch Cocktails** (freezerbatchcocktails.com), a free calculator for batching cocktails ahead and freezing them. The program name is **Cold Open by FBC**. Four deliverables:

1. Masthead lockup (wordmark + small-scale mark)
2. On-site signup module (embedded card + footer one-liner) — to be ported to an Astro component
3. Three email templates (welcome, monthly issue, countdown step)
4. Printable bottle-label sheet (the lead magnet)

Promise line used everywhere: **"Ready before the guests arrive."** Voice: confident, practical, a little wry. Never cocktail-snob, never hype, no fake urgency.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy wholesale. Recreate them in the target codebase (Astro/React components for the site) using its existing patterns, Tailwind config, and layout primitives.

**Two exceptions**, which ARE production artifacts and should be used close to as-is:
- `emails/*.html` — send-ready email HTML. These are meant to be pasted into the ESP as templates. Do not restructure them into semantic/flexbox markup; email clients need the tables. Only swap `{{tokens}}` for the ESP's own merge-field syntax and replace `{{IMAGE_URL}}` with hosted https URLs.
- The label-sheet layout — it's a print artifact; keep the print CSS behavior intact.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and copy. Colors and type come from the production Tailwind config ("The Study" palette), so they should map 1:1 onto existing tokens in the codebase rather than being re-entered as literals. Recreate pixel-close.

## Design Tokens

### Palette — "The Study"
| Role | Hex |
|---|---|
| Background | `#0c0a08` |
| Card | `#161310` |
| Elevated | `#1e1a16` |
| Border (subtle) | `#2e2720` |
| Border (defined) | `#3d3428` |
| Body text | `#e8e0d4` |
| Headline text | `#f0e8da` |
| Muted text | `#9a8e7e` |
| Brass accent | `#c8a55c` |
| Brass hover | `#d4b76e` |
| Brass dim wash | `rgba(200,165,92,0.15)` |
| Success | `#10b981` |
| Danger | `#ef4444` |

Buttons: brass `#c8a55c` fill with `#161310` text; outline variant is `1px solid #c8a55c` + `#c8a55c` text on dark. Inputs: `#1e1a16` fill, `1px solid #3d3428`, focus border `#c8a55c`.

### Typography
- **Display serif:** Cormorant Garamond (400/500/600 + italic). Stack: `'Cormorant Garamond', Georgia, 'Times New Roman', serif`
- **Sans:** Outfit (300–700). Stack: `Outfit, Helvetica, Arial, sans-serif`
- Uppercase micro-labels: Outfit, 10–11px, `letter-spacing: 0.18em–0.3em`, muted or brass. Always add a matching `padding-left` equal to the tracking so centered labels stay optically centered.
- Wordmark: Cormorant Garamond 500, uppercase, `letter-spacing: 0.16em`.
- In email, webfonts are **progressive enhancement only** (the `<link>` is wrapped in `<!--[if !mso]><!-->…<!--<![endif]-->`). Nothing may break without them; Georgia/Helvetica fallbacks are the real design.

### Spacing / structure
- Email content width: 600px fixed; inner content column 520px inside 40px cell padding.
- Site card: 40px vertical / 44px horizontal padding, 1px border, no border-radius anywhere (the brand is square-cornered).
- Rules: 1px, `#2e2720` for dividers, `#c8a55c` for the 44px masthead accent rule.
- Border radius: **0** throughout. Shadows: none.

## Screens / Views

### 1. Masthead lockup — `Masthead Lockups.dc.html`
**Purpose:** the program identity, used at the top of every email and wherever the program is referenced.

- **Full lockup (600px, centered stack):** 44px × 1px brass rule → `COLD OPEN` in Cormorant Garamond 500 / 50px / `0.16em` tracking / `#f0e8da` → `BY FBC` in Outfit 11px / `0.3em` / `#c8a55c`, flanked by 28px `#3d3428` rules → tagline `READY BEFORE THE GUESTS ARRIVE` in Outfit 11px / `0.2em` / `#9a8e7e`.
- **Small-scale mark (favicon / avatar):** a solid brass square, `#c8a55c` fill, letters `FBC` in Cormorant Garamond 600, `#161310`. Provided at 64px (22px type), 32px (11px type) and 16px (single `F`, 9px type). This is the site's button language applied as a mark.
- **Inline lockup (nav / footer / compact email masthead):** brass `FBC` tab (4px 7px padding, 13px type) + `COLD OPEN` at 22px / `0.16em`, 12px gap.
- The file also retains the earlier round of three name candidates below the final lockup, for reference only. Do not implement those.

### 2. Signup module — `Signup Module.dc.html`
**Purpose:** embedded end-of-recipe-page subscribe card. **Not a popup or modal** — it sits in the page flow. Two variants.

**Variant A — recipe-page card (720px max width):**
- Container: `#161310` background, `1px solid #3d3428`, 40px/44px padding, column flex, 20px gap.
- Header row: brass `FBC` tab + `COLD OPEN` (Cormorant 19px, `0.18em`, uppercase, `#f0e8da`), 11px gap.
- Headline: Cormorant 500 / 30px / `#f0e8da` / line-height 1.25 — "Ready before the guests arrive."
- Promise: Outfit 15px / `#e8e0d4` / line-height 1.6, max-width 520px — "One make-ahead recipe and a hosting timeline, monthly — plus the printable bottle-label sheet when you join."
- Form row: flex, 10px gap. Email input flexes (min-width 220px), `#1e1a16` fill, `#3d3428` border, 13px/16px padding, 15px Outfit, placeholder `#9a8e7e`, focus border `#c8a55c`. Submit button: brass fill, `#161310` text, Outfit 12px 600 uppercase `0.16em`, 26px horizontal padding, hover `#d4b76e`.
- Reassurance: Outfit 13px `#9a8e7e` — "No spam. Unsubscribe anytime."
- Wraps to stacked input/button below ~520px (flex-wrap already handles it).

**Variant B — homepage footer one-liner:**
Single row, `border-top`/`border-bottom` `1px solid #2e2720`, 18px vertical padding: brass FBC tab + `COLD OPEN` (16px) + "A recipe and a hosting timeline, monthly." (`#9a8e7e` 14px) on the left; 200px email input + "Join" button right-aligned.

**Tweakable props in the prototype:** `programName` (text) and `ctaLabel` (enum: "Get the label sheet" / "Join the batch" / "Subscribe"). Expose these as component props in Astro.

### 3. Email templates — `emails/welcome.html`, `emails/monthly-issue.html`, `emails/countdown-step.html`
All three share one system: 600px wrapper table on `#0c0a08`, centered masthead block, `#161310` content card, `#0c0a08` footer.

**Shared masthead:** brass 44px rule → `COLD OPEN` (Cormorant/Georgia 30px, `letter-spacing: 6px`, `#f0e8da`) → `BY FBC` (11px, `letter-spacing: 4px`, `#c8a55c`) → context line (`READY BEFORE THE GUESTS ARRIVE`, or issue month, or series name).

**Shared footer:** 44px `#3d3428` rule, provenance line, `{{UNSUBSCRIBE_URL}}` + `{{PREFERENCES_URL}}` (countdown uses `{{SERIES_OPTOUT_URL}}` — "Skip this series only"), `{{COMPANY_NAME}} · {{POSTAL_ADDRESS}}` (CAN-SPAM), and a 21+ / drink-responsibly line.

**a. Welcome** — delivers the lead magnet. Headline "You're in. Here's your label sheet." → brass bulletproof button "Download your label sheet" (`{{LABEL_SHEET_URL}}`) → "What arrives, and how often" block (Monthly / Occasionally / Never) → featured Negroni recipe card with image slot and brass-outline "Batch the Negroni" button.

**b. Monthly issue** — hero recipe module (image slot, `{{SPIRIT}} · {{METHOD}} · {{ABV}}%` eyebrow, recipe name, dek, a **solid brass timing bar** reading "Batch it by {{DATE}} → ready for {{OCCASION}}", outline CTA) → numbered hosting timeline (01/02/03, brass Cormorant numerals in a 36px column) → one contextual product module (140px image cell + editorial copy + `{{AFFILIATE_URL}}` "Shop →") with the Amazon Associate disclosure → footer.

**c. Countdown step** — compact masthead + `{{SERIES_NAME}}`; **progress indicator** built from four 127px cells with 3px top borders: completed `#3d3428`, current `#c8a55c`, upcoming `#2e2720`, labeled "3 weeks out ✓ / 1 week out — you are here / Day before / Day of" (current label brass + bold). Then one task block (single job, headline + body + a bordered fallback note) and one brass CTA to the calculator (`{{CALCULATOR_URL}}`).

**Email rules that must be preserved if you touch these files:**
- 600px max, `role="presentation"` tables, single-column, no flex/grid/float/position.
- Every style inline; every table and cell has an explicit width; `mso-line-height-rule: exactly` on text.
- Bulletproof buttons: padded `<td bgcolor>` with a `display:block` `<a>` inside. Never `<button>`, never an image.
- No JS, no forms, no external CSS.
- `<meta name="color-scheme" content="light dark">` plus explicit `bgcolor` **and** `background-color` on every structural cell so forced-light clients don't render brass on cream.
- Images are `{{IMAGE_URL}}` / `{{PRODUCT_IMAGE_URL}}` placeholders with meaningful alt text; each email must read fine with images blocked.
- Hidden preheader span (~85 chars) is the first element in `<body>`.
- Keep total HTML well under 100KB (Gmail clipping).

**Merge fields in use:** `{{PREHEADER}}`, `{{ISSUE_MONTH}}`, `{{ISSUE_NUMBER}}`, `{{IMAGE_URL}}`, `{{RECIPE_NAME}}`, `{{RECIPE_DEK}}`, `{{RECIPE_URL}}`, `{{SPIRIT}}`, `{{METHOD}}`, `{{ABV}}`, `{{DATE}}`, `{{DATE_1..3}}`, `{{OCCASION}}`, `{{SERVINGS}}`, `{{FALLBACK_NOTE}}`, `{{PRODUCT_NAME}}`, `{{PRODUCT_DEK}}`, `{{PRODUCT_IMAGE_URL}}`, `{{AFFILIATE_URL}}`, `{{LABEL_SHEET_URL}}`, `{{CALCULATOR_URL}}`, `{{SERIES_NAME}}`, `{{STEP_NUMBER}}`, `{{STEP_TOTAL}}`, `{{UNSUBSCRIBE_URL}}`, `{{PREFERENCES_URL}}`, `{{SERIES_OPTOUT_URL}}`, `{{COMPANY_NAME}}`, `{{POSTAL_ADDRESS}}`.

### 4. Label sheet — `Label Sheet.dc.html`
**Purpose:** the free lead magnet. Print-ready US Letter page, 0.5in margins, six labels in a 2 × 3 grid (0.18in row gap, 0.2in column gap) sized for 750 ml swing-top bottles.

- Light background (`#fdfcf9` sheet, `#ffffff` labels) — ink-cheap and legible in B&W.
- Cut guides: `1px dashed #b6ad9c` around each label.
- Each label, top row: a wide `1.5px solid #3a352c` write-on rule (0.5in tall) with a `COCKTAIL` micro-label under it, and the brass `FBC` tab in the top-right corner.
- Bottom-left stack: "batched on ____", "ABV ____ %", "serve: pour ___ oz · glass ______", and a 0.14in checkbox + "stir / shake before pouring".
- Bottom-right: a 1in square QR placeholder (diagonal hatch fill, "QR recipe link" in monospace) with `SCAN FOR RECIPE` beneath.
- All rules are heavy enough to write over with a Sharpie; nothing smaller than ~6.5pt.
- Built on a paged-document shell (`doc-page.js`) that owns `@page`, margins, and print geometry. If you reimplement, the only hard requirements are: one US Letter page, 0.5in margins, `@page { margin: 0 }` with the inset on the sheet's own padding (so the browser doesn't stamp its date/URL header), and no page-break CSS inside the grid.

## Interactions & Behavior
Deliberately minimal — this is a calm, static system.
- Signup module: input focus moves the border to `#c8a55c`; button hover `#c8a55c → #d4b76e`. Submit posts to the existing newsletter endpoint (the site already has one on the homepage "Join the batch" form) and swaps the card body for a short success state confirming the label-sheet download link is on its way. No modal, no popup, ever.
- Emails: no interactivity beyond links.
- **No** countdown clocks, urgency styling, or "LAST CHANCE" treatments anywhere.

## State Management
Only the signup module needs state: `email` (string), `status` (`idle | submitting | success | error`), and an inline error string. Validate email format client-side, surface errors in Outfit 13px `#ef4444` beneath the field, and disable the button while submitting. Everything else is static.

## Assets
No real imagery is included — the site is commissioning its own photography. Image areas are:
- Emails: `{{IMAGE_URL}}` / `{{PRODUCT_IMAGE_URL}}` `<img>` tags over `#1e1a16` cells, with alt text written to carry the meaning when images are blocked. Hero slots are 518px wide (200px tall in the comp); the product slot is 140px wide.
- Label sheet: 1in QR placeholder, to be replaced with a generated QR pointing at the recipe.
Fonts load from Google Fonts (Cormorant Garamond, Outfit) — the site already loads both.

## Files
| File | What it is |
|---|---|
| `Masthead Lockups.dc.html` | Final Cold Open lockup + small marks (plus the earlier candidate round, reference only) |
| `Signup Module.dc.html` | Recipe-page card + homepage footer one-liner |
| `Email Templates.dc.html` | Preview page framing the three emails side by side |
| `emails/welcome.html` | Send-ready welcome email |
| `emails/monthly-issue.html` | Send-ready monthly issue template |
| `emails/countdown-step.html` | Send-ready countdown step template |
| `Label Sheet.dc.html` | Print-ready six-label sheet |
| `doc-page.js`, `support.js` | Runtime files the `.dc.html` prototypes need to open in a browser — not part of the design, don't port |
