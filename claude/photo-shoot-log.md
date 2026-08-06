# Photo shoot log

> Recreated 2026-08-06. The original log (referenced by the Issue-01 plan) never synced to
> this machine — the same failure class that ate four other planning docs. Rebuilt from
> what is verifiable on disk: file timestamps in `photos/originals/` and `photos/masters/`,
> the pipeline's printed numbers, and `scripts/photos/process.py` itself. If the original
> file surfaces, merge its session notes above the 2026-08-06 entry rather than replacing
> this one.

Pipeline: every photo goes through `scripts/photos/process.py`, unchanged, no per-photo
tuning — if a photo needs different treatment, reshoot it. Outputs: full-res master in
`photos/masters/`, 8 render files (4 sizes × jpg/webp) in `public/images/cocktails/`.
Both output dirs and `photos/` are **gitignored by design** until the full set ships;
`photos/` has no other backup, so originals also stay in Downloads until a cloud backup
exists.

## Status — 4 of 18 shot

| # | Recipe | Status |
|---|--------|--------|
| 1 | Negroni | — |
| 2 | Manhattan | — |
| 3 | Old Fashioned | shot 2026-08-03 · ⚠ master is chat-downscaled; camera original still missing |
| 4 | Boulevardier | — |
| 5 | Dirty Martini | shot 2026-08-02 · master from camera file |
| 6 | Margarita | — · due ~Aug 18 (Issue 01 hero; ships text-only if missed) |
| 7 | Cosmopolitan | — |
| 8 | Moscow Mule | — |
| 9 | Espresso Martini | — |
| 10 | Paper Plane | — |
| 11 | Daiquiri | — |
| 12 | Vesper | — |
| 13 | Mint Julep | **shot 2026-08-06 · master built from camera file at full resolution (3072×4096)** |
| 14 | Vieux Carré | — |
| 15 | Hanky-Panky | — |
| 16 | Aviation | — |
| 17 | Sazerac | **shot 2026-08-06 · master built from camera file at full resolution (3072×4096)** |
| 18 | Bijou | — |

## Session notes

### 2026-08-06 — mint julep (#13), sazerac (#17)

Camera originals (4096×3072, 3.00 MB / 2.88 MB) verified full-res before processing,
copied to `photos/originals/`, Downloads copies retained as the second backup.

Pipeline numbers:

| | anchor before | anchor sat | gains |
|---|---|---|---|
| mint-julep | R253.8 G251.6 B240.4 | **0.06** | R0.987 G0.993 B1.021 |
| sazerac | R248.2 G244.5 B218.0 | **0.12** | R0.972 G0.981 B1.054 |

Both anchors comfortably under the 0.35 warning line. The julep barely needed correction —
crushed ice over a silver cup is the friendliest anchor the rule will ever see.

The sazerac was the second real test of the 2026-08-03 highlight-referenced anchor rule
(amber liquid in a clear glass — the case the rule was built for after the old fashioned).
Result: directionally identical to the old fashioned's correction (R down, B up) but about
half the magnitude — B gain 1.054 vs the old fashioned's 1.149. Same lamp, so some gap is
worth noting; the likeliest explanation is that the old fashioned's numbers were measured
on its chat-downscaled master (its camera original is still missing), and chat recompression
plausibly shifted the measured cast. Renders visually inspected: amber reads amber, wood
keeps its warmth, wall stays neutral. No reshoot indicated.

Outputs verified: 8/8 render files per slug, cards at 1200×1500.
