// Renders scripts/label-sheet/label-sheet.html to public/downloads/fbc-bottle-labels.pdf.
//
// Run with: node scripts/generate-label-sheet.mjs
//
// The QR is regenerated on every run and written back into the HTML as a data URI,
// so the source file stays self-contained and prints correctly on its own. Uses the
// Chromium that already ships with the repo's Playwright install.

import { chromium } from '@playwright/test';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, 'label-sheet', 'label-sheet.html');
const OUTPUT = path.join(HERE, '..', 'public', 'downloads', 'fbc-bottle-labels.pdf');

const QR_TARGET = 'https://freezerbatchcocktails.com/?utm_source=label_sheet&utm_medium=qr';

// 1in at print resolution. Generous pixel width keeps the modules crisp rather than
// letting the PDF rasterise a small bitmap up to an inch square.
const QR_PIXELS = 600;

async function main() {
  const qrDataUri = await QRCode.toDataURL(QR_TARGET, {
    width: QR_PIXELS,
    margin: 1,
    // 'M' tolerates the ~15% loss you get from a label smudged or peeled at a corner.
    errorCorrectionLevel: 'M',
    // Ink-cheap and unambiguous in greyscale: near-black on white, no brass here.
    color: { dark: '#2b2620ff', light: '#ffffffff' },
  });

  const original = await fs.readFile(SOURCE, 'utf8');
  const updated = original.replace(
    /(<img class="qr"[^>]*\ssrc=")[^"]*(")/g,
    (_match, before, after) => `${before}${qrDataUri}${after}`,
  );

  const qrCount = (updated.match(/<img class="qr"/g) ?? []).length;
  if (qrCount !== 6) {
    throw new Error(`Expected 6 QR slots in the label sheet, found ${qrCount}`);
  }
  if (updated.includes('QR_PLACEHOLDER')) {
    throw new Error('A QR placeholder survived substitution');
  }
  if (updated !== original) await fs.writeFile(SOURCE, updated);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'networkidle' });
    // Without this the PDF can be laid out against the fallback metrics.
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUTPUT, format: 'Letter', printBackground: true });
  } finally {
    await browser.close();
  }

  const { size } = await fs.stat(OUTPUT);
  console.log(`Wrote ${path.relative(path.join(HERE, '..'), OUTPUT)} (${size} bytes)`);
  console.log(`QR target: ${QR_TARGET}`);
}

await main();
