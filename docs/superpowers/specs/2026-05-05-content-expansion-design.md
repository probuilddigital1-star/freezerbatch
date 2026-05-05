# Content Expansion Design

**Date:** 2026-05-05
**Status:** awaiting user approval
**Purpose:** add 5 new freezer-safe cocktail recipes and 4 educational technique posts to support AdSense approval and SEO long-tail.

## Scope

- **5 new recipes:** Vieux Carré, Hanky-Panky, Aviation, Sazerac, Bijou
- **4 technique posts** at `/blog/<slug>`
- **New `/blog/` section** with index + per-post pages
- **"Guides" nav link** added to Header and Footer

Total: 9 new substantial pages, plus the index.

## Recipe additions

All five validated for 750ml bottle math. Pour-off equals add-back so each bottle fills exactly. Final ABV is computed by the existing `calculateMilkStreetBatch` from actual final volume.

| Slug | Name | Glass | Pour off | Add back | Final ABV | Shelf bucket |
|---|---|---|---|---|---|---|
| `vieux-carre` | Vieux Carré | rocks | 17.5 oz rye | 7.75 oz cognac, 7.75 oz sweet vermouth, 2 oz Bénédictine | ~34% | Lasts months |
| `hanky-panky` | Hanky-Panky | coupe | 12.75 oz gin | 12.5 oz sweet vermouth, 0.25 oz Fernet-Branca | ~28% | Lasts months |
| `aviation` | Aviation | coupe | 10.75 oz gin | 3.5 oz maraschino, 1.75 oz crème de violette, 5.5 oz lemon | ~29% | Best within a week |
| `sazerac` | Sazerac | rocks | 2.75 oz rye | 2.75 oz simple syrup (extras: Peychaud's bitters, absinthe rinse) | ~40% | Lasts months |
| `bijou` | Bijou | coupe | 17 oz gin | 8.5 oz sweet vermouth, 8.5 oz green Chartreuse | ~37% | Lasts months |

Each recipe gets:

- Entry in `MILK_STREET_BATCHES` in `src/lib/calculator.ts`
- Entry in `src/data/cocktails.json` with all the existing fields (tagline, description, tags, difficulty, servings, prepTime, freezeTime, recipe.batch, recipe.single, dilutionType, dilutionPercent, freezeStatus, tips, serve, commonMistakes, affiliateProducts (optional), relatedCocktails, seo)
- Entry in `GLASS_BY_SLUG` in `src/pages/cocktails/[slug].astro`

ABVs added to ABV_DEFAULTS as needed: Bénédictine (40%), Maraschino (32%, already present), Crème de Violette (20%), Green Chartreuse (55%), Fernet (39%, already present).

## Technique posts

Routed at `/blog/<slug>`. Each post is 700-900 words, plain prose written under the `writing-without-ai-tells` skill (no em dashes, no banned phrases, rate-limited transitions, no rule-of-three triplets, no hype words). Each ends with a CTA back to the calculator.

| Slug | Title | Hook |
|---|---|---|
| `why-your-batch-is-too-sweet` | Why your freezer batch is too sweet (and how to fix it) | Cold mutes some flavors and accentuates sugar in others. Walks through dialing back syrup. |
| `fresh-citrus-in-batches` | Fresh citrus in freezer batches: how to keep it from going off | Covers the 3-5 day window for fresh juice and how to size batches around it. |
| `choosing-vermouth` | Choosing a vermouth (and knowing when it's dead) | Picks brands by drink type, plus a 30-second oxidation test. |
| `dilution-guide` | The freezer-batch dilution guide: when to add water | Explains the calculator's 0% / 20% / 25% choices and matches each to a drink style. |

## Routing

- `src/pages/blog/index.astro` lists all posts (cards: title, hook, read time)
- `src/pages/blog/<slug>.astro` per post, hardcoded
- Header + Footer get a "Guides" link to `/blog`

Decision: hardcoded `.astro` files rather than Astro content collections. Content collections add a layer of abstraction that is not worth the maintenance cost for 4 posts. If post count grows past ~10, migrate.

## Build sequence

1. Add the 5 recipes to the data layer (`MILK_STREET_BATCHES` + `cocktails.json` + `GLASS_BY_SLUG`)
2. Update `ABV_DEFAULTS` with any missing ingredient values
3. Build `npm run build` and verify each new recipe page renders, math balances, ABV displays
4. Build `/blog/index.astro` and the four post `.astro` files
5. Add "Guides" nav link to `Header.astro` and `Footer.astro`
6. Final `npm run build` + visual smoke test on each new page

## Out of scope

- Pillar piece (Option D from brainstorm): not included in this round
- Story / opinion posts (Option E): not included in this round
- Glossary pages (Option C): not included in this round
- Astro content collections / CMS: deferred until post count justifies it
- Per-post hero imagery: deferred (the recipe pages already have the SVG glass icons; technique posts use a small inline icon per topic)

## Open questions

None. Math is validated. Routing decision made. Voice rules in place via the `writing-without-ai-tells` skill.
