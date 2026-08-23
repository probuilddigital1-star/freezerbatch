/**
 * One source of truth for link-preview images and page type.
 *
 * Three places need the same answer: `Layout.astro` for og:image and
 * twitter:image, and the recipe page's Recipe JSON-LD, which must point at the
 * same file Google will already have fetched as the link preview. Two call
 * sites building the same string independently is precisely how they drift.
 *
 * Every recipe has a 1200x630 JPEG at the same filename — a photograph where
 * one has been shot, a generated typographic card otherwise
 * (scripts/generate-og-images.mjs writes to the same name `process.py` does).
 * So shooting a recipe swaps its preview and its structured-data image at once,
 * with no change here.
 */

/** Every preview render is this size; the og tags advertise it to crawlers. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Used by every page that is not a single recipe. */
export const OG_DEFAULT_IMAGE = '/images/og-default.jpg';

/**
 * JPEG deliberately, never the WebP sibling: crawler WebP support is uneven and
 * this is the one place where the safe format beats the smaller bytes.
 */
export const OG_IMAGE_TYPE = 'image/jpeg';

/** The recipe slug a path belongs to, or null when the path is not a recipe page. */
export function recipeSlugFromPath(pathname: string): string | null {
  // Deliberately excludes /cocktails/ itself, which is the index, not a recipe.
  return pathname.match(/^\/cocktails\/([^/]+?)\/?$/)?.[1] ?? null;
}

/** The 1200x630 preview render for one recipe. */
export function recipeOgImage(slug: string): string {
  return `/images/cocktails/${slug}-og.jpg`;
}

/** The preview image a given page should advertise. */
export function ogImageForPath(pathname: string): string {
  const slug = recipeSlugFromPath(pathname);
  return slug ? recipeOgImage(slug) : OG_DEFAULT_IMAGE;
}

/**
 * Open Graph object type. The guides under /blog/ are articles; everything
 * else, including the /blog/ index itself, is a listing or a tool rather than
 * a piece of writing, and stays `website`.
 */
export function ogTypeForPath(pathname: string): 'article' | 'website' {
  return /^\/blog\/[^/]+\/?$/.test(pathname) ? 'article' : 'website';
}
