import { describe, expect, it } from 'vitest';
import cocktailsData from '../data/cocktails.json';
import { hasPhoto, photoSources } from './recipePhotos';

/**
 * hasPhoto checks the committed `-card.jpg`, not `photos/masters/` — that
 * directory is gitignored and absent on a fresh clone, which is exactly the
 * mismatch this module exists to prevent. See recipeStats.test.ts for the
 * same class of guard.
 */
describe('recipe photo availability', () => {
  const PHOTOGRAPHED = [
    'boulevardier',
    'dirty-martini',
    'manhattan',
    'margarita',
    'mint-julep',
    'negroni',
    'old-fashioned',
    'sazerac',
    'vesper',
    'vieux-carre',
  ];

  it('is true for every recipe with a committed card render', () => {
    for (const slug of PHOTOGRAPHED) {
      expect(hasPhoto(slug), slug).toBe(true);
    }
  });

  it('is false for a recipe with no card render', () => {
    expect(hasPhoto('aviation')).toBe(false);
    expect(hasPhoto('not-a-real-recipe')).toBe(false);
  });

  it('returns null sources for an unphotographed recipe', () => {
    expect(photoSources('aviation')).toBeNull();
  });

  it('returns the four card paths for a photographed recipe', () => {
    expect(photoSources('boulevardier')).toEqual({
      jpg: '/images/cocktails/boulevardier-card.jpg',
      webp: '/images/cocktails/boulevardier-card.webp',
      jpg760: '/images/cocktails/boulevardier-card-760.jpg',
      webp760: '/images/cocktails/boulevardier-card-760.webp',
    });
  });

  it('agrees with the photographed count against every recipe in the data', () => {
    const photographed = cocktailsData.cocktails.filter((c) => hasPhoto(c.slug));
    expect(photographed.map((c) => c.slug).sort()).toEqual([...PHOTOGRAPHED].sort());
  });
});
