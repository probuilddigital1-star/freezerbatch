# CC prompt, 2026-08-23 (third): ship real link-preview images

Standalone prompt. Start a fresh Claude Code session and do not rely on prior context.

Repo: `C:\Users\zckpe\Documents\claude-projects\freezer-batch-cocktails`
Astro static site on Cloudflare Pages.

## The defect

Every page on the site advertises the same `og:image` and `twitter:image`:

```
https://freezerbatchcocktails.com/og-default.svg
```

Two problems with that, both verified against production on 2026-08-23:

1. **It is an SVG.** Facebook and the rest of Meta, X, LinkedIn, Pinterest's
   save-from-website flow, Slack and iMessage all refuse to render SVG in a link
   preview. So every link anyone shares from this site previews with no image at all.
2. **It is one image for 31 pages**, and it is still the old indigo palette
   (`#1e1b4b` / `#4338ca`) rather than the Study look the site uses now.

This matters right now because the owner is about to start posting links to Pinterest
and Instagram.

The eight photographed recipes already have correct 1200x630 JPEGs on disk from
`process.py`. They are not deployed, because `public/images/cocktails/` is gitignored.
`https://freezerbatchcocktails.com/images/cocktails/negroni-og.jpg` currently returns
`text/html`, the soft-404 page.

## What is already on disk, uncommitted

Cowork generated and wrote these into the working tree. Read them before wiring them up.

- `public/images/cocktails/<slug>-og.jpg` for the ten recipes with no photo yet:
  boulevardier, cosmopolitan, moscow-mule, espresso-martini, paper-plane, daiquiri,
  vesper, hanky-panky, aviation, bijou. Typographic, 1200x630, Study palette,
  Cormorant Garamond and Outfit. Every number on them (ABV, drinks, base spirit,
  tagline) was read from `src/data/cocktails.json`, not typed by hand. Spot-check a
  couple against the JSON and tell me if any disagree.
- `public/images/og-default.jpg`, 1200x630, for the homepage, blog and everything that
  is not a recipe page.

**The naming is deliberate.** The placeholders use exactly the filename `process.py`
writes when a photo is shot, so shooting a recipe and running the pipeline overwrites
its placeholder and no template change is ever needed. Do not rename them or route
them through a separate placeholder path.

## Task 1: let the finished images deploy

`.gitignore` currently ignores `/public/images/cocktails/` wholesale. Its own comment
explains why: anything under `public/` ships on the very next deploy, and the guard
existed to stop an in-progress photo set going live.

That rationale does not cover og images. Every recipe now has an og JPEG that is
correct to ship, either a photo (8) or a typographic placeholder (10).

Before changing anything, **clean out the stray alternate frames** still parked in
`public/images/cocktails/`: `sazerac1` through `sazerac4`, `julep1`, `julip2`, `julip3`.
They are reject frames and must never ship. The bridge cannot delete files, so move them
somewhere outside the repo or into `_to_delete/`.

Then choose a mechanism and explain your choice: either narrow the ignore so `*-og.jpg`
and `*-og.webp` are tracked while `-card`, `-card-760` and full renders stay ignored, or
move og outputs to their own directory and update `process.py` to write there. Git
cannot re-include files inside an ignored directory, so a bare negation pattern will not
work. Pick whichever is less fragile and say why.

The grid stays as it is. `CocktailCard.astro` has no image slot and is not getting one in
this task. Card and full renders stay ignored until the whole set of 18 is shot.

## Task 2: point the metadata at the right image

In `src/layouts/Layout.astro` (or wherever the og tags are emitted), make `og:image` and
`twitter:image` resolve per page:

- Recipe pages: `/images/cocktails/<slug>-og.jpg`
- Everything else: `/images/og-default.jpg`

Also emit, for every page:

- `og:image:width` 1200 and `og:image:height` 630
- `og:image:type` as `image/jpeg`
- `og:image:alt` with something useful per page, the recipe name for recipe pages
- absolute URLs, not paths. Several crawlers reject relative og:image values.

Serve the JPEG, not the WebP. Crawler WebP support is inconsistent and this is the one
place where the safe format matters more than the bytes.

Delete `og-default.svg` once nothing references it, or keep it and say why.

## Task 3: report on the old palette

The retired indigo `#1e1b4b` / `#4338ca` appearing in `og-default.svg` suggests other
pre-Study assets may still be around. Grep for those two hex values and report what you
find. Do not fix anything you find in this task; just list it.

## Gates

`astro check`, `astro build`, unit, e2e, the analytics check, `check:hosts`.

Live verification after deploy, asserting content type rather than status:

- `https://freezerbatchcocktails.com/images/cocktails/negroni-og.jpg` returns
  `content-type: image/jpeg`, not `text/html`
- the same for `paper-plane-og.jpg`, which is a placeholder rather than a photo
- `https://freezerbatchcocktails.com/images/og-default.jpg` returns `image/jpeg`
- the margarita page's `og:image` is an absolute URL ending `margarita-og.jpg`
- the homepage and `/blog/batch-ahead-for-labor-day/` both resolve to `og-default.jpg`
- no page still references `og-default.svg`
- none of `sazerac1`..`sazerac4`, `julep1`, `julip2`, `julip3` resolve to an image

Verify against `freezerbatchcocktails.com`, never a preview or `*.pages.dev` URL, since
those carry the production PostHog key.

## After this ships

Task 6 from the earlier prompt, the n8n republish with `POSTAL_ADDRESS`, becomes
straightforward: the welcome email's image row can point at a real deployed URL, so run
it with images rather than text-only. That is still gated on the owner's approval of the
diff before any PUT.

## Report

Report what you changed, which gitignore mechanism you chose and why, what the live
content-type checks returned, whether the placeholder numbers matched `cocktails.json`,
and what the indigo grep turned up.
