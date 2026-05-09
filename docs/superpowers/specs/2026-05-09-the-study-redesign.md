# Visual Rebrand: The Study (Direction A)

**Date:** 2026-05-09
**Status:** awaiting user approval
**Source:** `C:\Users\zckpe\Downloads\freezerbatch\design_handoff_freezerbatch_redesign\direction-a.jsx`
**Scope:** Full-site visual rebrand. Functionality preserved.

## Goal

Replace the current cream-and-Fraunces aesthetic with The Study: dark charcoal, Cormorant Garamond italic display, brass-gold accents, editorial speakeasy mood. Every page on the site (home, calculator, all 18 recipe pages, /blog and 4 guides, /how-it-works, /about, /privacy, /terms) gets the new theme.

The mockup is a template, not a literal copy. We rebuild the existing multi-page Astro site in The Study's visual language while preserving all current capability.

## Hard constraints (preserve as-is)

- Calculator math (the entire `src/lib/calculator.ts` engine and the 18 Milk Street batch entries)
- Calculator UX features: mode toggle (Recipe / Custom), recipe tile grid, live result bar, composition bar, ABV cheatsheet, copy / share / email-recipe actions, dilution control, bottle-size selector, unit toggle
- Recipe data in `cocktails.json` (18 cocktails with full descriptions, tips, mistakes, glass mappings)
- Blog content (4 guides + index page, ~3500 words)
- AdSense-readiness (21+ footer notice, privacy ad-cookie disclosure, About page editorial credit)
- Sitemap, schema markup, SEO metadata
- Hero photo asset (`public/images/hero-decanters.{jpg,webp}` and mobile variant)

## Design tokens

From Direction A reference:

```
bg: #0c0a08              (deepest charcoal)
bgCard: #161310          (elevated card)
bgElevated: #1e1a16      (within-card elevation)
border: #2e2720
borderLight: #3d3428
text: #e8e0d4            (cream-tinted off-white)
textMuted: #9a8e7e       (warm gray)
accent: #c8a55c          (brass gold)
accentDim: rgba(200,165,92,0.15)
accentHover: #d4b76e
cream: #f0e8da           (slightly warmer than text, for headlines)
```

Typography:

- **Display:** Cormorant Garamond, weights 400/500/600, italic-by-default for headlines
- **Body:** Outfit, weights 300/400/500/600
- **Section labels:** 12-13px Outfit, uppercase, 0.2-0.3em letter-spacing, accent color
- **H1 hero:** Cormorant Garamond italic, 64-82px, 1.05 line-height
- **H2 section:** Cormorant Garamond, 36-44px, 400 weight, often italic for emphasis
- **H3:** Cormorant Garamond, 20-28px
- **Body:** Outfit 15-18px, 1.7 line-height, 300 weight
- **Step numbers:** Cormorant Garamond 48px, 300 weight, accent color

## Implementation

### Phase 1 — Theme foundation

- Update `tailwind.config.cjs`: replace existing color palette with Direction A tokens. Map to existing names (`primary`, `accent`, `cream`, `cognac`, `surface`) so component classes don't all break, but with the dark-theme values.
- Update `Layout.astro`: swap font preload from Fraunces+DM Sans to Cormorant Garamond+Outfit. Keep the non-blocking preload pattern.
- Update `global.css`: rewrite body background to charcoal, add grain texture overlay (already in current code, just darker), update `.editorial`, `.editorial-recap`, `.article-eyebrow`, `.article-headline`, `.article-deck` to dark-theme variants.
- Update `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input-field`, `.card`, `.badge-*`, `.status-*` for dark theme.

### Phase 2 — Shared components

- `Header.astro`: charcoal bg, FREEZER + amber BATCH wordmark in Cormorant Garamond, uppercase nav links with letter-spacing.
- `Footer.astro`: same wordmark, top border in border color, minimal layout.
- `CocktailCard.astro`: dark card with border, hover sets border to amber. Stats grid restyled.
- `EmailSignup.astro`: dark input on bgCard, amber subscribe button.
- `GlassIcon.astro`: stroke color becomes amber on dark bg (currentColor handles this; just needs the parent text-amber class).

### Phase 3 — Calculator (most critical, most preserve-the-functionality)

`Calculator.astro` keeps ALL its current logic. Only visual changes:

- Card surface: bgCard
- Mode toggle pill: dark variant with amber-active state
- Recipe tile grid: dark cards with amber-on-active
- Bottle-size buttons, unit toggle, dilution buttons: dark with amber-active
- Custom recipe form: dark inputs
- Live result bar: dark card with amber stat numerals
- Composition bar: kept as-is, palette already works on dark
- Copy/share/print/email buttons: amber-on-dark variant
- Email recipe form: dark input + amber button
- Preset batch instructions card: bgElevated with amber step badges

### Phase 4 — Page composition

- **Home:** Hero gets the existing decanter photo as a darkened, slightly-blurred backdrop with charcoal gradient overlay. Italic centered headline, amber section label above. Add the decorative vertical gradient line below hero. How It Works as 3-column with top border accents and large amber serif step numbers. Calculator section on bgCard. Featured cocktails as 3-column dark cards. Science section as bgCard with stat callouts. Newsletter centered. Footer.
- **Cocktails listing:** Page bg charcoal. Header centered with amber section label. Filter pills restyled dark. Section headers ("Lasts 2-3 months" / "Best within a week") with amber section labels and updated icons.
- **Cocktail detail (`[slug].astro`):** Charcoal bg. Eyebrow + italic Cormorant cocktail name. Stats bar in bgCard. About section with amber eyebrow. Calculator inline. How to Serve and Tips/Mistakes as dark cards with amber accents. Glass icon SVG in amber on dark.
- **Blog index + posts:** Charcoal bg. Editorial styles updated to dark variant. Drop cap stays brass-gold. Recap card uses bgElevated.
- **How It Works, About, Privacy, Terms:** Dark editorial.

### Phase 5 — Polish details

- Grain noise overlay on body (4% opacity per existing pattern, slight dark color shift)
- Decorative vertical gradient line under hero (Direction A signature)
- Section labels: small uppercase amber text with optional flanking dashes
- Border color hierarchy: `border` for default, `borderLight` for hover/active, `accent` for active selection
- Hover transitions: 0.2-0.3s ease

### Phase 6 — Hero photo treatment

The existing decanter photos already shot with dark backdrops and warm amber liquid look made for The Study. Use as the hero background:

- Desktop: `/images/hero-decanters.webp` as background image at 50-60% opacity, gradient overlay from `bg` (top) to `bgCard` (bottom), then italic headline overlaid centered.
- Mobile: `/images/hero-decanters-mobile.webp`, same treatment.
- Keep `<picture>` element with `srcset` for responsive serving.

## Out of scope

- Changing the calculator math (already correct)
- Changing recipe data (already complete)
- Changing blog content (already shipped)
- Adding new content (this is a visual rebrand only)
- Aerial or freezer photography (use existing decanter shots only)
- Switching to a different font pairing
- Mobile-specific layout changes beyond responsive adjustments to the new visual language

## Build sequence

1. Phase 1: tokens, fonts, global.css, base button/input styles
2. Phase 2: Header, Footer, CocktailCard, EmailSignup, GlassIcon
3. Phase 3: Calculator restyle (zero functional change)
4. Phase 4: Home page composition, then cocktails listing, then cocktail detail, then blog
5. Phase 5: Static pages (About, Privacy, Terms, How It Works)
6. Phase 6: Hero photo background treatment
7. Build, smoke-test every page, deploy

## Verification checklist

- All 30 pages build with `npm run build`
- Calculator math identical to pre-redesign (spot-check Negroni, Vieux Carré, Aviation)
- Recipe pages all render with descriptions, tips, mistakes, glass icons
- Blog posts render with new dark editorial styling, drop cap intact
- Mobile view (375px) functional on home, calculator, recipe page
- Sitemap still generates 29 URLs
- No JS errors in console
- Lighthouse score within 10 points of pre-redesign

## Open questions

None. Scope is full-site, calculator stays functional, decanter hero photo is reused.
