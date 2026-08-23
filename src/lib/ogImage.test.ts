import { describe, expect, it } from 'vitest';
import cocktailsData from '../data/cocktails.json';
import {
  OG_DEFAULT_IMAGE,
  ogImageForPath,
  ogTypeForPath,
  recipeOgImage,
  recipeSlugFromPath,
} from './ogImage';

describe('link-preview resolution', () => {
  it('reads a recipe slug out of a recipe path, with or without a trailing slash', () => {
    expect(recipeSlugFromPath('/cocktails/negroni/')).toBe('negroni');
    expect(recipeSlugFromPath('/cocktails/negroni')).toBe('negroni');
    expect(recipeSlugFromPath('/cocktails/vieux-carre/')).toBe('vieux-carre');
  });

  it('does not mistake the index, a nested path, or another section for a recipe', () => {
    // /cocktails/ is the grid, not a drink — it must get the site default.
    expect(recipeSlugFromPath('/cocktails/')).toBeNull();
    expect(recipeSlugFromPath('/cocktails')).toBeNull();
    expect(recipeSlugFromPath('/cocktails/negroni/extra/')).toBeNull();
    expect(recipeSlugFromPath('/blog/dilution-guide/')).toBeNull();
    expect(recipeSlugFromPath('/')).toBeNull();
  });

  it('gives every recipe page its own image and everything else the default', () => {
    expect(ogImageForPath('/cocktails/margarita/')).toBe('/images/cocktails/margarita-og.jpg');
    expect(ogImageForPath('/')).toBe(OG_DEFAULT_IMAGE);
    expect(ogImageForPath('/cocktails/')).toBe(OG_DEFAULT_IMAGE);
    expect(ogImageForPath('/blog/batch-ahead-for-labor-day/')).toBe(OG_DEFAULT_IMAGE);
    expect(ogImageForPath('/privacy/')).toBe(OG_DEFAULT_IMAGE);
  });

  it('resolves an image for every recipe in the data, by the path the site actually serves', () => {
    // The guard that matters: a new recipe cannot ship without a preview, and
    // the Recipe JSON-LD and the og tag must land on the same file.
    for (const cocktail of cocktailsData.cocktails) {
      const fromPath = ogImageForPath(`/cocktails/${cocktail.slug}/`);
      expect(fromPath).toBe(recipeOgImage(cocktail.slug));
      expect(fromPath).toMatch(/^\/images\/cocktails\/[a-z0-9-]+-og\.jpg$/);
    }
  });

  it('marks only the individual guides as articles', () => {
    expect(ogTypeForPath('/blog/batch-ahead-for-labor-day/')).toBe('article');
    expect(ogTypeForPath('/blog/dilution-guide')).toBe('article');
    // The listing page is not a piece of writing.
    expect(ogTypeForPath('/blog/')).toBe('website');
    expect(ogTypeForPath('/blog')).toBe('website');
    expect(ogTypeForPath('/')).toBe('website');
    expect(ogTypeForPath('/cocktails/negroni/')).toBe('website');
  });
});
