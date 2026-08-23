# Recipe photography: 18 shots, multiple days

> **Canonical, and synced to two places.** This file lives both in the repo at
> `claude/photo-shoot-log.md` (what Claude Code reads) and in claude.ai project storage
> at `claude/photo-shoot-log.md` (what Cowork and chat read). They are kept
> byte-identical. Whoever edits it updates both in the same session. The earlier header
> declaring the project-storage copy frozen caused a real divergence; see the 2026-08-23
> correction below.

Started 2026-08-02. This doc is the memory across sessions. A chat session forgets;
this does not.

## Status

8 of 18 shot. All eight fully processed (master + 8 renders each). Vieux Carré
resolved 2026-08-22: the light-frost reshoot won; committed same night.

| # | Slug | Recipe | Shot | Notes |
|---|---|---|---|---|
| 1 | `dirty-martini` | Dirty Martini | 2026-08-02 | Master is a ChatGPT retouch, see below. og regenerated under v2 rule 08-22. |
| 2 | `negroni` | Negroni | 2026-08-22 | Master + all 8 renders on disk (anchor sat 0.25, frost; gains R0.941 G0.961 B1.129). Keeper `abf0f715` (25% headroom). Real Campari pour, cut-crystal rocks glass. **Welcome-email image row unblocked**; CC restores it in the republish. |
| 3 | `manhattan` | Manhattan | 2026-08-22 | Master + all 8 renders on disk (anchor sat 0.06, gains R0.983 G0.995 B1.023). Keeper `748a0068`, best of six on BOTH axes (30% headroom, bowl sharpness 243); two rejected for visible blur. Coupe, cherry on pick, frosted stem. Card visually verified. |
| 4 | `old-fashioned` | Old Fashioned | 2026-08-03 | Camera original STILL missing from `photos/originals/`; master is the chat-downscaled upload. og regenerated under v2 08-22. |
| 5 | `boulevardier` | Boulevardier | | Campari now owned; shoot with Paper Plane. |
| 6 | `margarita` | Margarita | 2026-08-22 | Master + all 8 renders on disk (anchor sat 0.05, gains R0.989 G0.992 B1.020). og regenerated under v2 after the v1 crop sliced mid-glass. Salt + Tajín rim, dried lime wheel; prose-agreement note below. |
| 7 | `cosmopolitan` | Cosmopolitan | | |
| 8 | `moscow-mule` | Moscow Mule | | |
| 9 | `espresso-martini` | Espresso Martini | | |
| 10 | `paper-plane` | Paper Plane | | Issue 01 alternate hero. **Top search-traffic recipe page on the site** (10 of 11 pageviews from search engines, 30 days to 08-23), so worth prioritising in the shoot order. |
| 11 | `daiquiri` | Daiquiri | | |
| 12 | `vesper` | Vesper | | |
| 13 | `mint-julep` | Mint Julep | 2026-08-06 | Alternates `julep1/julip2/julip3` parked in `public/images/cocktails/`. MOVE BEFORE PUBLISH. v2 og is the set's best social image (mint crown + ice dome). |
| 14 | `vieux-carre` | Vieux Carré | 2026-08-22 | Master + all 8 renders on disk (anchor sat 0.25, ice and speculars; gains R0.927 G0.994 B1.103). Keeper `05dd6f2d` from the light-frost reshoot, at **42.6% headroom, the set's closest to the 47% template**. Frosted first attempt superseded, nothing from it in the repo. Cut-crystal rocks glass, one large cube legible, lemon peel a clear yellow flash mid-glass. og + card visually verified. |
| 15 | `hanky-panky` | Hanky-Panky | | |
| 16 | `aviation` | Aviation | | |
| 17 | `sazerac` | Sazerac | 2026-08-06 | Alternates `sazerac1–4` parked in `public/images/cocktails/`. MOVE BEFORE PUBLISH. og regenerated under v2 08-22. |
| 18 | `bijou` | Bijou | | Least-trafficked; defer or stage with color blend (see staging guide). |

Slugs verified against `src/data/cocktails.json` on 2026-08-02. Filenames must use
these exact strings.

Nothing is wired into a page yet, and that is deliberate. The grid changes in a single
commit when the set is done.

## The vieux carré session, 2026-08-22 (late). RESOLVED: reshoot won

**First attempt, five frames:** frost went from veil to curtain. The deep-frozen glass
fogged over completely, the top half read as white fog, the drink showed only as a band
in the bottom third, and the page's "single large ice cube" wasn't legible. Liquid
color where visible was right (sat 0.61–0.72), so it was purely a visibility problem.
Sharpness ran 79–135 (dim fog has no edges). Best frame `917a0a13` (38%/106). Cowork
recommended a light-frost reshoot; the user shot it the same night.

**Reshoot, three frames.** ONE variable changed per the brief (much lighter frost,
one large cube visible). Full camera res (3072×4096, EXIF orientation 6; pipeline bakes
it). Measured in one self-consistent run, references included:

| frame | headroom | sharpness | liquid sat |
|---|---|---|---|
| manhattan keeper (set ref) | 29.9% | 410 | 0.64 |
| VC frosted best `917a0a13` | 37.7% | 313 | 0.64 |
| reshoot `0c43e248` | 32.7% | 660 | 0.66 |
| reshoot `2d977796` | 36.1% | 509 | 0.65 |
| **reshoot `05dd6f2d`, KEEPER** | **42.6%** | **567** | **0.66** |

Every reshoot frame beat the entire frosted batch on sharpness (lit crystal has edges,
fog doesn't) and two beat the Manhattan keeper. `05dd6f2d` took it: closest headroom
to the 47% template of any keeper in the project, drink legible top to bottom, cube
reads, lemon peel visible. Committed (original, master, 8 renders). The frosted frames
never entered the repo; the "frost is a veil, not a curtain" rule (below) is now
validated by measurement, not just taste.

## The manhattan session, 2026-08-22 (evening)

Six frames at full camera res. Keeper `748a0068` at **30% / 243**, best on both axes.
Backup `add67f80` (28%/217). Rejected: `26785d44` (17%/101, soft), `77d7b6d9` (12%/125),
`3ae67d92` (17%/211), `4d3ee0ef` (20%/162). Anchor sat 0.06, gains R0.983 G0.995 B1.023.
Committed (original, master, 8 renders).

Four recipes shot 08-22 in one day (margarita, negroni, manhattan, vieux carré including
its same-night reshoot), far ahead of the dated plan.

## og crop rule v2, 2026-08-22 (pipeline change, pending git commit)

v1 aimed a fixed 16%-of-height window (tuned for the 47%-headroom template) and sliced
mid-glass on tighter frames, flagged by the user on the margarita. **v2 anchors on the
measured rim**: `find_rim()` = first row where the bright vessel mass starts against the
dark wall (dense >0.45-value run in the centre band; v1 fallback if nothing triggers),
placed ~22% from the strip top. One rule for every photo. Measured rims: martini 22%,
julep 23%, negroni 25%, margarita 32%, old fashioned 41%, sazerac 49%, vieux carré 43%.
All og pairs regenerated (older rebuilt from masters; grades reproduced to ±0.001).
Visually checked: margarita, negroni, julep, vieux carré.

**`scripts/photos/process.py` in the working tree carries v2** (plus the 08-03 fixes,
already awaiting commit). CC: commit the script.

## The negroni session, 2026-08-22

Four uploads, one duplicate; full camera res. Keeper `abf0f715` (25% headroom, sharpest
centre). Rejected `c5d357df`/`a63bf22e` (same frame, 11%). Backup `360ff4ca`. Anchor sat
0.25 (frost), gains R0.941 G0.961 B1.129.

## The margarita session, 2026-08-22

Four frames, full camera res. Keeper `69b95c9e` (33%/90%); backup `06e398ff`; two
rejected (base 85% / low headroom). Anchor sat 0.05 (salt rim, cleanest in set), gains
R0.989 G0.992 B1.020. v1 og sliced mid-glass, which prompted v2.

**Prose-agreement note (same class as the storage-honesty fix):** the margarita photo
shows a **salt + Tajín rim and a dried lime wheel**; the live page says "salt rim
optional. Garnish with lime wheel." Align the serving line in `cocktails.json` (CC
one-liner; timing-sheet regen NOT needed, this is serving text rather than storage data)
or reshoot plain-salt. Decide before the grid publishes.

**Portrait-mode check unconfirmed for all 08-22 sessions.** Photographer to confirm
straight captures.

## The mint julep and sazerac session, 2026-08-06

Two camera originals came off the phone at full resolution, the first session where
the "send camera files, not chat uploads" rule was followed from the start. Both
verified 4096×3072 (3.00 MB / 2.88 MB) before processing, copied to
`photos/originals/`, Downloads copies retained as the second on-machine copy.

Processed with the 08-03 anchor rule:

| | anchor before | anchor sat | gains |
|---|---|---|---|
| mint-julep | R253.8 G251.6 B240.4 | 0.06 | R0.987 G0.993 B1.021 |
| sazerac | R248.2 G244.5 B218.0 | 0.12 | R0.972 G0.981 B1.054 |

Both anchors far under the 0.35 warning line. The julep barely needed correction;
crushed ice over a silver cup is the friendliest anchor the rule will ever see.

The sazerac was the second real test of the anchor rule on amber-in-clear-glass, the
case it was built for. Result: correction in the same direction as the old fashioned
(R down, B up) but about half the magnitude, B gain 1.054 against the old fashioned's
1.149 under the same lamp. **The old fashioned's B1.149 reference is suspect until its
camera original turns up**: those numbers were measured on the chat-downscaled master,
and chat recompression plausibly shifted the measured cast. Re-measure when the camera
file arrives and the master rebuilds.

Renders inspected visually at card size: amber reads amber, wood keeps its warmth, wall
stays neutral, julep ice is clean white. No reshoot indicated. Masters and all eight
renders per slug on disk.

## The old fashioned session, 2026-08-03

Three frames sent through chat. The one used: `IMG_20260803_172407968`, a straight
capture, 47% headroom, base at 91%, clean background. This is the template frame.
Rejected: `IMG_20260803_172406533` (base on the bottom edge, frame one's mistake
repeated) and the `_PORTRAIT` frame (synthetic bokeh, see rules). Processed with the new
anchor: anchor sat 0.29, gains R0.923 G0.969 B1.149. Master and all eight renders on disk.

## 2026-08-23 correction: generated cards contradicted their own pages

Cowork generated ten typographic og placeholders for the unshot recipes and pulled ABV,
servings and base spirit from `finalAbv` / `servings` in `src/data/cocktails.json`. The
CC prompt even stated the numbers were "read from cocktails.json, not typed by hand", as
though sourcing them proved they were right.

They were not. **The site does not display those stored fields.** Both `/cocktails` and
the recipe pages compute ABV and servings from `calculateMilkStreetBatch()` at render
time, and there is a comment in `cocktails/index.astro` saying so. The stored fields have
drifted. Seven of the ten cards disagreed with the page they were previewing:

| slug | card said | page says |
|---|---|---|
| cosmopolitan | 22% | 32% |
| espresso-martini | 24% | 31% |
| moscow-mule | 25% | 30% |
| paper-plane | 20% | 23% |
| daiquiri | 25% | 29% |
| boulevardier | 28% | 32% |
| vesper | 32% | 35% |

Servings were wrong on three more. The paper plane one was worse than a mismatch: 20% is
**below the 22% freeze floor the site itself tells readers to stay above**, advertised on
the highest search-traffic page on the site.

CC caught it before it shipped and fixed the class rather than the instance: a generator
(`scripts/generate-og-images.mjs`) that reads the same calculator the pages read, so a card cannot
contradict its page again. It also refuses to run when `photos/masters/` is absent, so it
can never overwrite real photographs with typography, and it stops generating for a recipe
once that recipe is shot.

**The rule this earns:** a data file is not the source of truth just because it is the
source of the data. Check what the page renders, not where the value came from. Same class
as the margarita prose-agreement note and the divergent-log correction below.

**It recurred the same day, in the structured data.** `recipeYield` in the Recipe JSON-LD
was built from the same stale `cocktail.servings` field and disagrees with the page on 5
of 18 recipes: negroni, boulevardier, cosmopolitan and vesper claim 8 where the page
computes 7; aviation claims 7 where the page computes 8. Verified independently on the
live negroni page, which displays 7 Drinks. That is markup telling Google something the
visible page contradicts, which Google's own structured-data guidelines treat as grounds
for losing rich results. Fixed by deriving from `calculateMilkStreetBatch()`, the same
remedy as the og cards.

Anywhere `cocktail.servings` or `cocktail.finalAbv` is read, assume it is stale until
proven otherwise.

## 2026-08-23 correction: two divergent copies of this log

Found while updating the backup status. The repo copy carried a header declaring itself
canonical and the project-storage copy frozen, written 2026-08-06. Cowork sessions from
08-21 onward updated only the project-storage copy. Result: the repo copy sat at 4/18
with no record of the margarita, negroni, manhattan or vieux carré sessions, while the
project copy had lost the full mint-julep/sazerac numbers and the retouch measurements.

Neither copy was complete. This version is the merge, written to both. The header at the
top now says so. Same class of error as the 08-21 reconciliation and critical-fixes
correction 8: a doc that claimed a state the disk disagreed with.

## 2026-08-21 reconciliation (Cowork, via connected repo folder)

This log said 2/18; the disk said 4/18. Mint-julep and sazerac were shot 08-06 but
never logged. Corrected. Also:

- **Seven alternate/reject frames live in `public/images/cocktails/`** (`sazerac1–4`,
  `julep1`, `julip2`, `julip3`). Gitignored today, but the publish flow lifts the ignore,
  so **clean these out before the publish commit**. Bridge can't move files; user or CC.
- `originals/old-fashioned.jpg` still absent.
- Backup state: **RESOLVED 2026-08-23.** Originals and masters are backed up in Google
  Cloud (user-confirmed). No longer single-copy.

Shoot plan and staging recipes for the remaining recipes: `claude/photo-staging-guide.md`.

## Git state changed 2026-08-02/04: photos are IGNORED, not just untracked

Per Claude Code's session (commit `503d29a`, pushed): Cloudflare builds from the GitHub
repo, so nothing untracked was ever at risk of going live, but `git add .` would have
published the in-progress set. The guard is in `.gitignore`:

```
/photos/
/public/images/cocktails/
/_to_delete/
/public/images/IMG_*.jpg
/public/images/IMG_*.jpeg
```

**Publish flow when the set is done:** delete the `/public/images/cocktails/` line from
`.gitignore` and commit the finished renders in one go, after the alternate-frame
cleanup. `scripts/photos/process.py` stays trackable and **now carries the v2 og rule and
wants a commit** (see the v2 section).

**Git does not back up the photos**, and that is fine as of 2026-08-23: originals and
masters are backed up in Google Cloud. The ignore is a publish guard, not a backup
question.

## Corrections to earlier entries in this log (2026-08-04)

- "In repo … in git": photos were never tracked; wording corrected to "on disk".
- "`IMG_20260801_170152054.jpg` ships to the CDN": wrong mechanism. Cloudflare builds
  from GitHub, not the local folder. Check method if it matters: `curl -sI` and read
  content-type (`image/*` = live, `text/html` = the 404 page).
- "Needs a commit": superseded, photo dirs deliberately ignored.
- Soft-404 fact (site returns 200 + 404-page HTML for nonexistent paths): known, parked.
- (08-22) Earlier notes in this log and the staging guide said Vieux Carré takes a
  cherry garnish; the live page says **lemon peel**. Corrected, the page is the spec.

## Where everything lives

Repo root: `C:\Users\zckpe\Documents\claude-projects\freezer-batch-cocktails`.

- `photos/originals/<slug>.jpg`: the camera file. Nothing done to it.
- `photos/masters/<slug>.jpg`: upright, EXIF baked, what web files are built from.
- `public/images/cocktails/<slug>*.{jpg,webp}`: four rendered sizes, jpg + webp.
- `scripts/photos/process.py`: the pipeline. One command per photo.
- `photos/README.md`: how to run it.

Run: `python3 scripts/photos/process.py <source.jpg> <slug>`

## Rules that keep 18 photos looking like one set

Same grade for every photo, no per-image tuning. Same wall, same wood, same lamp. Lamp
behind and above the camera, never off to the side. **No portrait mode** (synthetic
bokeh measurably differs; straight captures only). Pour and garnish last, frost runs
within a minute. Leave empty wall across the top of frame for headline text. **Step back
further than looks right**: the template is 47% headroom, base at 91%; the VC reshoot
keeper hit 42.6%, the project's best. Send camera files when possible; check upload
resolution per batch. **(08-22) Frost is a veil, not a curtain.** A deep-frozen thick
glass fogs over completely and hides the drink; shorter freeze, pour, shoot immediately.
Validated same night by the VC reshoot: sharpness 313 → 567 with the drink fully legible.

**New (08-23): shoot the pour before the still.** Instagram is the chosen growth channel
and still photos are its lowest-reach format. Every remaining recipe gets a short video of
the pour out of the frozen bottle, shot on the same set before the still frame: phone
propped, one take, six to fifteen seconds, no talking. A cold batch pours slow and viscous
and the glass fogs on contact, which is the most distinctive thing this project owns and
the one asset it has never captured. Plan: `claude/instagram-plan-2026-08-23.md`.

## The white balance: anchor changed 2026-08-03

v1 (top 1.5% luminance as white) died on the Old Fashioned: lit amber liquid topped the
luminance stack and the grade cooled the frame trying to neutralise whiskey. **v2 rule:
the anchor is the least-saturated quarter of the brightest 1.5%**, meaning frost, ice, rim
speculars, salt. 62% strength, black point, gamma unchanged. `process.py` warns above
0.35 anchor saturation.

Convergence evidence (same lamp → same correction):

| frame | blue gain |
|---|---|
| martini master | 1.041 |
| old fashioned (three frames) | 1.139–1.149 |
| mint julep | 1.022 |
| sazerac | 1.054 |
| margarita | 1.020 |
| negroni | 1.129 |
| manhattan | 1.023 |
| vieux carré | 1.103 |

## The white balance, frame-one record (old rule, kept for reference)

Frame one, camera original: frost read R235.1 G195.7 B156.5, gains R0.896 G1.000 B1.156,
post-grade R209.5 G194.2 B178.7 (R/B 1.173).

Frame one, retouched master (what shipped): frost read R230.9 G203.0 B177.4, gains
R0.927 G1.002 B1.092, post-grade R216.5 G202.7 B190.9 (R/B 1.134).

## The reflection on frame one

A window or light panel reflected in the curved bowl, three vertical bands, the widest
around 85px. Five repair attempts in Python, all rejected after looking at the result at 2x:

1. Blue-channel mask, too small to catch a blue-*white* reflection.
2. Horizontal-median substitution, smeared the glass texture into visible streaks.
3. Collapsing blue toward neutral, left a green cast because green already led red there.
4. Desaturating toward each pixel's own grey, removed colour but not the bands.
5. Subtracting a smooth additive light layer, dimmed the bands without removing their edges.

Root cause: it is a broad soft glow over curved glass with refracted background visible
through it, not a hard-edged stripe over flat colour. No clean automated repair exists at
that description.

**How it was actually resolved.** The user ran his own photograph through ChatGPT, which
removed the reflection. Two versions came back; the second one (04:04:49 PM) is what
shipped. It is now `photos/masters/dirty-martini.jpg`, and the whole web set is built
from it. His camera file is preserved at `photos/originals/dirty-martini.jpg`.

## Two errors I made about that retouch, both corrected by measurement

Recording these because the wrong versions were said out loud and could resurface.

**Claimed the olive/pick misalignment was an AI artifact.** Wrong. A 5x side-by-side shows
the identical pick stub at the same height and offset in his untouched original. It is his
actual pick sitting at an angle.

**Claimed the image was AI-generated from scratch: "a new picture in the same spirit,
different coupe, different wood, different wall."** Wrong. Regional diff after per-channel
exposure and WB normalisation gave wall 3.8, wood 5.0, stem 3.7 levels against bowl 15.0.
That is a localised edit on his photograph, not a new image.

The argument built on top of those claims collapsed with them. Removing a window reflection
from your own photo is ordinary retouching, and it does not undercut the site's premise.

## Measured costs of the ChatGPT route

Worth knowing before using it on the remaining ten. None of it is disqualifying for one
photo; across eighteen it is worth avoiding, and the way to avoid it is lamp position.

**The whole frame passes through the model, not only the part being fixed.** Areas with
nothing to edit came back different. Version 2 drifted further than version 1 did:

| Region | v1 drift | v2 drift (shipped) |
|---|---|---|
| Wall | 3.8 | 7.0 |
| Wood | 5.0 | 13.1 |
| Bowl (the edited part) | 15.0 | 29.3 |
| Stem | 3.7 | 15.1 |

Levels out of 255, after normalising exposure and white balance so only real change counts.

**Resolution loss.** 1503x2003 in, 1086x1448 out. The 1200px card now upscales about 10%
instead of downscaling into place.

**File size roughly doubles.** Resynthesised micro-texture compresses badly. Card webp came
out 133KB against 57KB for the same crop off the untouched original; full webp 109KB
against 48KB. At 18 cards that is real page weight.

## Open decisions

**Issue 01 hero.** Margarita hero + og EXIST; if the send hasn't gone, the image row is
on the table. Send window closes Mon Aug 24; postal address still the gate.
**Margarita prose agreement.** See session note.
**Old fashioned camera file.** Still wanted; rebuild rerenders at full res and settles
the suspect B1.149 reference.
**Alternate-frame cleanup.** sazerac1–4, julep1, julip2/3 out of the web dir pre-publish.
**Pending git commit.** `scripts/photos/process.py` (08-03 fixes + 08-22 og v2).
**Shoot order.** paper-plane is the top search-traffic recipe page and still has no photo.
**Housekeeping.** `_to_delete/` contents (4 files) still await manual deletion;
`IMG_20260801_170152054.jpg` delete or wire at leisure.
