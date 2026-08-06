# Recipe photography — 18 shots, multiple days

> **Canonical copy. Lives in the repo as of 2026-08-06; the claude.ai project-storage
> copy is frozen — do not update it.**

Started 2026-08-02. This doc is the memory across sessions. A chat session forgets;
this does not.

## Status

4 of 18 shot.

| # | Slug | Recipe | Shot | Notes |
|---|---|---|---|---|
| 1 | `dirty-martini` | Dirty Martini | 2026-08-02 | On disk. Master is a ChatGPT retouch, see below. |
| 2 | `negroni` | Negroni | | Welcome email's image row waits on this one (row removed 08-01; CC will restore it when the photo exists). |
| 3 | `manhattan` | Manhattan | | |
| 4 | `old-fashioned` | Old Fashioned | 2026-08-03 | On disk. Master built from a chat-downscaled upload — see note below. |
| 5 | `boulevardier` | Boulevardier | | |
| 6 | `margarita` | Margarita | | Wanted for Cold Open Issue 01; due ~Aug 18 (issue ships text-only if missed). |
| 7 | `cosmopolitan` | Cosmopolitan | | |
| 8 | `moscow-mule` | Moscow Mule | | |
| 9 | `espresso-martini` | Espresso Martini | | |
| 10 | `paper-plane` | Paper Plane | | Issue 01 alternate hero. |
| 11 | `daiquiri` | Daiquiri | | |
| 12 | `vesper` | Vesper | | |
| 13 | `mint-julep` | Mint Julep | 2026-08-06 | On disk. Master built from the camera file at full resolution (3072×4096). |
| 14 | `vieux-carre` | Vieux Carré | | |
| 15 | `hanky-panky` | Hanky-Panky | | |
| 16 | `aviation` | Aviation | | |
| 17 | `sazerac` | Sazerac | 2026-08-06 | On disk. Master built from the camera file at full resolution (3072×4096). |
| 18 | `bijou` | Bijou | | |

Slugs verified against `src/data/cocktails.json` on 2026-08-02. Filenames must use
these exact strings.

Nothing is wired into a page yet, and that is deliberate. One photographed card next to
seventeen blanks reads as broken. The grid changes in a single commit when the set is done.

## Git state changed 2026-08-02/04: photos are now IGNORED, not just untracked

Per Claude Code's session (commit `503d29a`, pushed; relayed by the user 2026-08-04):
Cloudflare builds from the GitHub repo, so nothing untracked was ever at risk of going
live — but `git add .` would have published the in-progress set. The guard is now in
`.gitignore`:

```gitignore
/photos/
/public/images/cocktails/
/_to_delete/
/public/images/IMG_*.jpg
/public/images/IMG_*.jpeg
```

Verified there with `git check-ignore`; after the rule, `git add .` can stage only
`.gitignore`, two `.claude/` files, and `scripts/photos/process.py`. The loose
`public/images/IMG_20260801_170152054.jpg` (944KB phone photo, referenced nowhere) is
caught by the IMG_* rule.

**Publish flow when the set is done:** delete the `/public/images/cocktails/` line from
`.gitignore` and commit the finished renders in one go. `scripts/photos/process.py`
stays trackable (can't publish an image) — committed in `e200b6d` on 2026-08-04.

**Consequence worth stating plainly: git no longer backs up the photos.** The original
design intent in this log ("outside `public/`, so git keeps them") is dead — `/photos/`
being ignored means originals and masters exist only on the user's disk until the ignore
is lifted or they're backed up elsewhere. Four shot days of work currently have no second
copy beyond the Downloads folder on the same machine. Worth a cloud/drive backup of
`photos/` before the set grows much larger.

## Corrections to earlier entries in this log (2026-08-04)

- "In repo … in git" (status table, storage section): the photos were never tracked, so
  they were on disk but not in git, and still aren't — now by explicit rule. Wording
  above updated to "on disk".
- "`IMG_20260801_170152054.jpg` … ships to the CDN on every deploy": wrong mechanism —
  Cloudflare builds from GitHub, not the local folder, so an untracked file in `public/`
  never deployed. (CC's message also contained a garbled line suggesting it *was* live
  at camera resolution — but the same message says the push was a content no-op, and an
  untracked file can't have been in the GitHub build. If it matters, the check is:
  `curl -sI https://freezerbatchcocktails.com/images/IMG_20260801_170152054.jpg` and
  look at content-type — `image/*` = it's live, `text/html` = it's the 404 page.)
- "Needs a commit" (open decisions): superseded — the photo dirs are deliberately
  ignored; only `scripts/photos/process.py` still wanted committing (done in `e200b6d`,
  2026-08-04).
- Related soft-404 fact, independently confirmed by CC: the site returns HTTP 200 with
  the 404 page's HTML (71,480 bytes, `text/html`) for nonexistent paths. Already in the
  critical-fixes corrections log ("health checks must assert content-type"); Google
  treats it as soft 404. Unfixed, known, parked.

## Where everything lives

On the user's machine, on disk. Not in a chat session and not in this project, because
project storage rejects image uploads. NOT in git — see the git-state section above.

- `photos/originals/<slug>.jpg` — the camera file. Nothing done to it.
- `photos/masters/<slug>.jpg` — what the web files were built from. Upright, EXIF rotation
  baked into pixels. May be the original or a retouched version of it.
- `public/images/cocktails/<slug>*.{jpg,webp}` — four rendered sizes, jpg plus webp.
- `scripts/photos/process.py` — the pipeline. One command per photo. Committed (`e200b6d`).
- `photos/README.md` — how to run it and why it works the way it was.

Run: `python3 scripts/photos/process.py <source.jpg> <slug>`

The originals/masters split exists so a retouch is never destructive. If a cleanup ages
badly, the camera file is still there to start over from. Both folders sit outside
`public/`, so Cloudflare never ships them — and since 503d29a git ignores them too
(see the backup consequence above).

## Rules that keep 18 photos looking like one set

Same grade for every photo, no per-image tuning. A photo corrected into matching the
others looks corrected. Shot into matching, it just looks like a set. If one frame needs
different treatment, reshoot it rather than forking the script.

Same wall, same wood, same lamp, every session. Indoor light is the asset here: unlike a
window it does not shift with the weather or the hour, so day one and day six match.

Lamp behind and above the camera, never off to the side. Side light lands in the glass as
a bright vertical band.

**No portrait mode.** Learned 2026-08-03: one of the three Old Fashioned frames was shot
in portrait mode. The synthetic background blur is measurable (background wood detail
crushed to 0.40 against 2.06 in the straight frames) and computational bokeh next to
seventeen straight captures reads as a different camera. Straight captures only.

Pour and garnish last. Frost beads and starts running inside about a minute out of the
freezer.

Leave the empty wall across the top of frame. That is where headline text goes.

Step back further than looks right and crop in later. Frame one had the foot of the glass
tight to the bottom edge, which left the crop nowhere to move. One of the 2026-08-03
Old Fashioned frames repeated exactly this mistake (base on the bottom edge) and was
rejected for it. The frame that was used had 47% headroom above the rim and the base at
91% — that framing is the template.

Send camera files, not chat uploads, when possible. The chat pipeline downscaled two of
the three Old Fashioned frames from the camera's ~3054px to ~1946px and recompressed
them. Enough for the 1200px renders, but the master should be the camera file. See the
open item below. (The 2026-08-06 session did this right: both originals arrived as
full-resolution camera files and were verified 4096×3072 and >2.5MB before processing.)

## The white balance: anchor changed 2026-08-03

The original rule — top 1.5% of luminance is the white reference, applied at 62% — rested
on "frost is the brightest thing in frame and frost is neutral." That premise died on the
Old Fashioned: in a clear rocks glass, the brightest thing in frame is the lit whiskey.
The anchor measured saturation 0.51, R/B 2.07 — the script took half-saturated amber as
white and asked for blue gain 1.36, turning the whole frame cold. It also failed to
converge: the harder it corrected, the further from the martini it landed. Most of the
remaining set is amber or red (Negroni, Manhattan, Boulevardier, Sazerac, Vieux Carré),
so this was going to misfire on over half the set. Frame one's frost was itself only
marginally neutral (sat 0.33); the 62% damping had been hiding it.

**New rule, in the repo as of 2026-08-03:** the anchor is the least-saturated quarter of
the brightest 1.5%. On a frosted glass that is the frost; on a clear glass it is the ice
and the rim specular, which carry the lamp's colour rather than the drink's. Everything
else (62% strength, black point, gamma) unchanged.

Evidence it converges — same lamp should mean same correction, and now it does:

| frame | blue gain, old rule | blue gain, new rule |
|---|---|---|
| martini original (logged 2026-08-02) | 1.156 | — |
| martini master (shipped) | 1.092 | 1.041 |
| old fashioned, all three frames | 1.33–1.36 | 1.139–1.149 |

The three Old Fashioned frames, shot minutes apart, agree within 0.010 under the new
rule. Validation: the test harness reproduced the 2026-08-02 logged martini numbers to
the decimal before any comparison was trusted.

The martini web renders were rebuilt under the new rule so the whole set is on one grade:
global drift 1.5 levels out of 255 (a tenth of what the ChatGPT round-trip did to
untouched regions). `photos/masters/dirty-martini.jpg` and
`photos/originals/dirty-martini.jpg` were not touched.

`process.py` now prints the anchor's saturation and warns above 0.35 — a frame with
nothing neutral in it announces itself instead of grading wrong silently.

**Also fixed in the same edit:** `process.py` wrote its outputs relative to its own
directory (`scripts/photos/masters/`, `scripts/photos/web/`), not to `photos/masters/`
and `public/images/cocktails/` where the README, this log, and frame one's actual files
live. Frame one's files evidently reached the right places by hand. Output paths are now
repo-rooted and match the README.

## The white balance, frame-one record (old rule, kept for reference)

Frame one, camera original: frost read R235.1 G195.7 B156.5, gains R0.896 G1.000 B1.156,
post-grade R209.5 G194.2 B178.7 (R/B 1.173).

Frame one, retouched master (what shipped): frost read R230.9 G203.0 B177.4, gains
R0.927 G1.002 B1.092, post-grade R216.5 G202.7 B190.9 (R/B 1.134).

## The old fashioned session, 2026-08-03

Three frames sent through chat. The one used: `IMG_20260803_172407968` — straight
capture, 47% headroom, base at 91%, clean background. Rejected: `IMG_20260803_172406533`
(base on the bottom edge, frame one's mistake repeated) and the `_PORTRAIT` frame
(synthetic bokeh, see rules). Processed with the new anchor: anchor sat 0.29, gains
R0.923 G0.969 B1.149. Master and all eight renders on disk.

## The mint julep and sazerac session, 2026-08-06

Two camera originals came off the phone at full resolution — the first session where
the "send camera files, not chat uploads" rule was followed from the start. Both
verified 4096×3072 (3.00 MB / 2.88 MB) before processing, copied to
`photos/originals/`, Downloads copies retained as the second on-machine copy.

Processed with the 08-03 anchor rule:

| | anchor before | anchor sat | gains |
|---|---|---|---|
| mint-julep | R253.8 G251.6 B240.4 | 0.06 | R0.987 G0.993 B1.021 |
| sazerac | R248.2 G244.5 B218.0 | 0.12 | R0.972 G0.981 B1.054 |

Both anchors far under the 0.35 warning line. The julep barely needed correction —
crushed ice over a silver cup is the friendliest anchor the rule will ever see.

The sazerac was the second real test of the anchor rule on amber-in-clear-glass, the
case it was built for. Result: correction in the same direction as the old fashioned
(R down, B up) but about half the magnitude — B gain 1.054 against the old fashioned's
1.149 under the same lamp. **The old fashioned's B1.149 reference is suspect until its
camera original turns up**: those numbers were measured on the chat-downscaled master,
and chat recompression plausibly shifted the measured cast. Re-measure when the camera
file arrives and the master rebuilds.

Renders inspected visually at card size: amber reads amber, wood keeps its warmth, wall
stays neutral, julep ice is clean white. No reshoot indicated. Masters and all eight
renders per slug on disk.

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

Worth knowing before using it on the remaining 14. None of it is disqualifying for one
photo; across eighteen it is worth avoiding, and the way to avoid it is lamp position.

**The whole frame passes through the model, not just the part being fixed.** Areas with
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

**Cold Open Issue 01 hero.** Currently drafted around the Margarita. That was a drafting
choice made on 2026-08-02 for Labor Day timing plus the "fresh lime holds two to three
weeks" hook, not a decision the user made. Nothing is locked. The Old Fashioned now has a
photograph, which changes the calculus if leading with a photographed drink matters — as
do the Mint Julep and Sazerac as of 08-06. Awaiting his call. Margarita shoot due
~Aug 18 either way; the issue ships text-only if missed.

**Old fashioned camera file.** `photos/originals/old-fashioned.jpg` does not exist yet,
and the master was built from a chat-downscaled upload (1459x1946 against the camera's
~2290x3054). When the camera file comes off the phone: drop it in `photos/originals/`,
rerun `python3 scripts/photos/process.py photos/originals/old-fashioned.jpg old-fashioned`,
and the master and all renders rebuild at full resolution. Nothing else to redo — that
rebuild-from-one-command property is why masters exist. Its logged gains
(R0.923 G0.969 B1.149) are also suspect until then — see the 08-06 session note.

**Photo backup.** Now that `/photos/` is gitignored, originals and masters live only on
the user's disk. Decide a second copy (external drive, cloud folder) before the set grows.
Four of eighteen shot as of 08-06; the only second copies are the camera-file duplicates
still sitting in Downloads on the same machine.

**Housekeeping.** `_to_delete/` is now gitignored and holds (verified still present
2026-08-06): `fbc-photos-drop.zip`, `fbc-repo-snapshot.tar.gz`, `stale-index.lock`,
`tmp_obj_sfdt3B` — all waiting on the user to delete; the device bridge cannot remove
files. `public/images/IMG_20260801_170152054.jpg` is caught by the IMG_* ignore rule;
delete or wire it up at leisure.
