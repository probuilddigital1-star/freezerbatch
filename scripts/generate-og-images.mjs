// Renders a typographic 1200x630 link-preview card for every recipe that has no
// photograph yet, to public/images/cocktails/<slug>-og.jpg.
//
// Run with: node scripts/generate-og-images.mjs
//
// Why this exists rather than a one-off design pass: the numbers on these cards
// have to agree with the numbers the site shows, and the site does NOT show
// cocktails.json's `finalAbv` / `servings`. Both /cocktails and the recipe pages
// derive them from calculateMilkStreetBatch(), and the stored fields have drifted
// — 7 of the 10 unphotographed recipes disagree, cosmopolitan by ten points. So
// this reads the same calculator the pages read, and re-running it is the only
// step needed when a recipe changes.
//
// The filename is deliberately the one process.py writes. Shooting a recipe and
// running the photo pipeline overwrites that recipe's placeholder in place, and
// no template or metadata change is ever needed.
//
// Uses the Chromium already installed for Playwright, and loads the real webfonts
// so the type matches the site rather than a fallback.

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateMilkStreetBatch, MILK_STREET_BATCHES } from '../src/lib/calculator.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DATA = path.join(ROOT, 'src', 'data', 'cocktails.json');
const MASTERS = path.join(ROOT, 'photos', 'masters');
const OUTDIR = path.join(ROOT, 'public', 'images', 'cocktails');

const WIDTH = 1200;
const HEIGHT = 630;
// process.py writes its JPEGs at 88; matching it keeps the whole og set on one
// quality setting whether a card came from this script or from a photograph.
const QUALITY = 88;

// The Study palette, from tailwind.config.cjs. Kept as literals rather than
// parsed out of the config so this script has no build-time coupling.
const C = {
  bg: '#0c0a08',
  border: '#2e2720',
  accent: '#c8a55c',
  cream: '#f0e8da',
  text: '#e8e0d4',
  // cognac 700/600 — the original card steps the neutrals down from the
  // headline rather than using one flat text colour.
  soft: '#c8bca9',
  muted: '#b5a99a',
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "gin,vodka" -> "gin". The card has room for one word, and the first is the lead spirit. */
const leadSpirit = (base) => String(base).split(',')[0].trim();

function card({ name, tagline, abv, servings, base }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500;1,600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
  body {
    background: ${C.bg};
    font-family: Outfit, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .frame {
    position: absolute; inset: 22px;
    border: 1px solid ${C.border};
  }
  .stack { position: absolute; left: 0; right: 0; text-align: center; }

  .kicker {
    top: 30px;
    font-size: 16px; font-weight: 500; letter-spacing: 0.26em;
    text-transform: uppercase; color: ${C.accent};
  }
  .name {
    top: 99px;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic; font-weight: 500; font-size: 82px;
    line-height: 1; color: ${C.cream};
  }
  .tag {
    top: 196px;
    font-size: 20px; font-weight: 300; color: ${C.soft};
  }
  .rule {
    top: 235px;
    display: flex; justify-content: center;
  }
  .rule i { display: block; width: 106px; height: 3px; background: ${C.accent}; }

  .stats {
    top: 264px;
    display: flex; align-items: stretch; justify-content: center;
  }
  /* 349px columns put the three centres on 251 / 600 / 951 and the dividers
     exactly midway, matching the card this replaces. */
  .stat { width: 349px; }
  .stat .v {
    display: block;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic; font-weight: 500; font-size: 46px;
    line-height: 1.12; color: ${C.accent};
  }
  .stat .v.base { text-transform: uppercase; letter-spacing: 0.02em; }
  .stat .l {
    display: block; margin-top: 0;
    font-size: 13px; font-weight: 400; letter-spacing: 0.2em;
    text-transform: uppercase; color: ${C.soft};
  }
  .sep { width: 1px; background: ${C.border}; margin: 6px 0 24px; }

  .foot {
    top: 532px;
    font-size: 15px; font-weight: 400; letter-spacing: 0.2em;
    text-transform: uppercase; color: ${C.muted};
  }
</style></head>
<body><div class="frame">
  <div class="stack kicker">Freezer Batch Cocktails</div>
  <div class="stack name">${escapeHtml(name)}</div>
  <div class="stack tag">${escapeHtml(tagline)}</div>
  <div class="stack rule"><i></i></div>
  <div class="stack stats">
    <div class="stat"><span class="v">${abv}%</span><span class="l">ABV</span></div>
    <div class="sep"></div>
    <div class="stat"><span class="v">${servings}</span><span class="l">Drinks</span></div>
    <div class="sep"></div>
    <div class="stat"><span class="v base">${escapeHtml(base)}</span><span class="l">Base</span></div>
  </div>
  <div class="stack foot">freezerbatchcocktails.com</div>
</div></body></html>`;
}

async function photographedSlugs() {
  // A recipe counts as photographed when its master exists. That is the same
  // signal process.py writes, so a placeholder stops being generated the moment
  // a photo is shot — without anyone maintaining a list.
  let entries;
  try {
    entries = await fs.readdir(MASTERS);
  } catch {
    // Fail closed. photos/ is gitignored, so on a fresh clone this directory is
    // absent — and generating "placeholders" over eight real photographs would
    // be silent, irreversible damage.
    throw new Error(
      `photos/masters/ not found. Refusing to run: without it every recipe looks unphotographed ` +
        `and this script would overwrite real photo renders with typographic cards.`,
    );
  }
  return new Set(entries.filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)));
}

async function main() {
  const { cocktails } = JSON.parse(await fs.readFile(DATA, 'utf8'));
  const shot = await photographedSlugs();
  const targets = cocktails.filter((c) => !shot.has(c.slug));

  console.log(`${cocktails.length} recipes, ${shot.size} photographed, ${targets.length} need a card`);
  await fs.mkdir(OUTDIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    for (const c of targets) {
      if (!MILK_STREET_BATCHES[c.slug]) throw new Error(`${c.slug}: no Milk Street batch to derive numbers from`);
      const batch = calculateMilkStreetBatch(c.slug, 750);
      const abv = Math.round(batch.finalAbv);
      const servings = batch.servings;

      await page.setContent(card({
        name: c.name,
        tagline: c.tagline,
        abv,
        servings,
        base: leadSpirit(c.baseSpirit),
      }), { waitUntil: 'load' });
      // Without this the card can be captured against fallback metrics.
      await page.evaluate(() => document.fonts.ready);

      const out = path.join(OUTDIR, `${c.slug}-og.jpg`);
      await page.screenshot({ path: out, type: 'jpeg', quality: QUALITY });
      const { size } = await fs.stat(out);
      console.log(`  ${c.slug.padEnd(18)} ${String(abv + '%').padEnd(4)} ${servings} drinks  ${leadSpirit(c.baseSpirit).padEnd(8)} ${(size >> 10)}KB`);
    }
  } finally {
    await browser.close();
  }
  console.log('done');
}

await main();
