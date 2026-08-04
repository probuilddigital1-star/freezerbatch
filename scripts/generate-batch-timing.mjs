// Renders scripts/timing-sheet/timing-sheet.html to public/downloads/fbc-batch-timing.pdf.
//
// Run with: node scripts/generate-batch-timing.mjs
//
// Every window, label, and note comes from src/data/cocktails.json at render time —
// the same storage.* blocks the site renders from — so the sheet cannot contradict
// the site. If a storage value changes, re-running this script is the only step.
// Uses the Chromium already installed for Playwright.

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, 'timing-sheet', 'timing-sheet.html');
const DATA = path.join(HERE, '..', 'src', 'data', 'cocktails.json');
const OUTPUT = path.join(HERE, '..', 'public', 'downloads', 'fbc-batch-timing.pdf');

// Longest-keeping first. Every recipe must fall into one of these.
const WINDOW_ORDER = ['months', 'weeks', 'week'];

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function main() {
  const { cocktails } = JSON.parse(await fs.readFile(DATA, 'utf8'));

  for (const c of cocktails) {
    if (!c.storage) throw new Error(`${c.slug}: no storage block`);
    if (!WINDOW_ORDER.includes(c.storage.bestWithin)) {
      throw new Error(`${c.slug}: unknown bestWithin "${c.storage.bestWithin}"`);
    }
  }

  const groups = WINDOW_ORDER.map((key) => {
    const items = cocktails.filter((c) => c.storage.bestWithin === key);
    // The site guarantees one label per window; if that ever breaks, fail loudly
    // rather than silently printing whichever label sorted first.
    const labels = [...new Set(items.map((c) => c.storage.bestWithinLabel))];
    if (items.length && labels.length !== 1) {
      throw new Error(`window "${key}" has conflicting labels: ${labels.join(', ')}`);
    }
    return { key, label: labels[0], items };
  }).filter((g) => g.items.length);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total !== cocktails.length) throw new Error(`grouped ${total} of ${cocktails.length} recipes`);

  const html = groups
    .map((g) => {
      const rows = g.items
        .map((c) => {
          const limited = c.storage.limitedBy;
          const chip = limited
            ? `<div class="limited">${escapeHtml(limited)}</div>`
            : '<div class="limited none">&mdash;</div>';
          return `        <div class="row">
          <div class="name">${escapeHtml(c.name)}</div>
          ${chip}
          <div class="note">${escapeHtml(c.storage.note)}</div>
        </div>`;
        })
        .join('\n');
      return `      <div class="group">
        <div class="group-head">
          <span class="group-label">${escapeHtml(g.label)}</span>
          <span class="group-count">${g.items.length} recipe${g.items.length === 1 ? '' : 's'}</span>
        </div>
${rows}
      </div>`;
    })
    .join('\n');

  const shell = await fs.readFile(SOURCE, 'utf8');
  if (!shell.includes('<!-- GROUPS -->')) throw new Error('timing-sheet.html has no <!-- GROUPS --> marker');
  const rendered = shell.replace('<!-- GROUPS -->', html);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // setContent, not a file write: the shell must never hold recipe data on disk.
    await page.setContent(rendered, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUTPUT, format: 'Letter', printBackground: true });
  } finally {
    await browser.close();
  }

  const { size } = await fs.stat(OUTPUT);
  const rel = path.relative(path.join(HERE, '..'), OUTPUT);
  console.log(`Wrote ${rel} (${size} bytes)`);
  for (const g of groups) console.log(`  ${g.label}: ${g.items.length}`);
  console.log(`  total: ${total} recipes`);
}

await main();
