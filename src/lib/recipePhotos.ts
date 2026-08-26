/**
 * One answer to "does this recipe have a photo", checked at build time.
 *
 * `scripts/generate-og-images.mjs` derives this from `photos/masters/`, which
 * is correct for that script but wrong here: `photos/` is gitignored, so it
 * does not exist on Cloudflare's fresh clone of the repo. The committed
 * `-card.jpg` render is what is actually present at build time, so that is
 * the file this module checks. One function, so a second call site cannot
 * check the wrong directory. See src/lib/recipeStats.ts for the same shape
 * of problem.
 */
import fs from 'node:fs';
import path from 'node:path';

const CARD_DIR = path.join(process.cwd(), 'public', 'images', 'cocktails');

/** True when `<slug>-card.jpg` has been committed to the repo. */
export function hasPhoto(slug: string): boolean {
  return fs.existsSync(path.join(CARD_DIR, `${slug}-card.jpg`));
}

export interface PhotoSources {
  /** Full-size grid render — kept for pages that need more than a card. */
  jpg: string;
  webp: string;
  /** What CocktailCard actually ships: cards render around 380px wide. */
  jpg760: string;
  webp760: string;
}

/** The card image paths for a photographed recipe, or null if it has none. */
export function photoSources(slug: string): PhotoSources | null {
  if (!hasPhoto(slug)) return null;
  return {
    jpg: `/images/cocktails/${slug}-card.jpg`,
    webp: `/images/cocktails/${slug}-card.webp`,
    jpg760: `/images/cocktails/${slug}-card-760.jpg`,
    webp760: `/images/cocktails/${slug}-card-760.webp`,
  };
}
