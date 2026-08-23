import { describe, expect, it } from 'vitest';
import cocktailsData from '../data/cocktails.json';
import { calculateMilkStreetBatch, MILK_STREET_BATCHES } from './calculator';
import { allWithRecipeStats, recipeStats, recipeYield, withRecipeStats } from './recipeStats';

/**
 * The stored `finalAbv` / `servings` in cocktails.json have drifted from what
 * the site computes. These guards exist because that drift reached production
 * three separate times: the generated og cards, the Recipe JSON-LD's
 * recipeYield, and the "You might also like" cards.
 */
describe('displayed recipe stats', () => {
  const cocktails = cocktailsData.cocktails;

  /** The batch the page renders from. Asserts rather than `!` so a recipe with
   *  no Milk Street batch fails by name instead of throwing on a null. */
  function renderedBatch(slug: string) {
    const batch = calculateMilkStreetBatch(slug, 750);
    expect(batch, `${slug}: no Milk Street batch`).not.toBeNull();
    return batch as NonNullable<typeof batch>;
  }

  it('derives every recipe from the calculator, not the stored fields', () => {
    // Independent path to the same number: if recipeStats ever reverts to
    // reading cocktail.servings, this diverges rather than agreeing with itself.
    for (const cocktail of cocktails) {
      const batch = renderedBatch(cocktail.slug);
      expect(recipeStats(cocktail), cocktail.slug).toMatchObject({
        finalAbv: Math.round(batch.finalAbv),
        servings: batch.servings,
        freezeStatus: batch.freezeStatus,
      });
    }
  });

  it('every recipe has a Milk Street batch, so the stored fallback never fires', () => {
    const missing = cocktails.filter((c) => !MILK_STREET_BATCHES[c.slug]).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it('JSON-LD recipeYield equals the servings the page renders, for every recipe', () => {
    for (const cocktail of cocktails) {
      const rendered = renderedBatch(cocktail.slug).servings;
      expect(recipeYield(cocktail), cocktail.slug).toBe(`${rendered} servings`);
      // And it must parse back to a number a page actually shows.
      expect(Number(recipeYield(cocktail).split(' ')[0]), cocktail.slug).toBe(rendered);
    }
  });

  it('recipeYield does not fall back to the stored field where the two disagree', () => {
    // The five that were wrong in production on 2026-08-23. Spelled out so a
    // revert to `cocktail.servings` fails loudly here rather than shipping
    // structured data that contradicts the visible page.
    const drifted = cocktails.filter((c) => c.servings !== renderedBatch(c.slug).servings);
    expect(drifted.map((c) => c.slug).sort()).toEqual(
      ['aviation', 'boulevardier', 'cosmopolitan', 'negroni', 'vesper'].sort(),
    );
    for (const cocktail of drifted) {
      expect(recipeYield(cocktail), cocktail.slug).not.toBe(`${cocktail.servings} servings`);
    }
  });

  it('cards and structured data cannot disagree: one recipe, one set of numbers', () => {
    // A drink's own page, its card in the grid, and its card in another page's
    // "You might also like" all read through here, so they cannot diverge.
    const byslug = new Map(allWithRecipeStats().map((c) => [c.slug, c]));
    expect(byslug.size).toBe(cocktails.length);
    for (const cocktail of cocktails) {
      const card = byslug.get(cocktail.slug)!;
      const own = recipeStats(cocktail);
      expect(card.finalAbv, cocktail.slug).toBe(own.finalAbv);
      expect(card.servings, cocktail.slug).toBe(own.servings);
      expect(card.freezeStatus, cocktail.slug).toBe(own.freezeStatus);
      expect(recipeYield(cocktail), cocktail.slug).toBe(`${card.servings} servings`);
    }
  });

  it('keeps every other field of the record intact when substituting stats', () => {
    const cocktail = cocktails.find((c) => c.slug === 'negroni')!;
    const merged = withRecipeStats(cocktail);
    expect(merged.slug).toBe('negroni');
    expect(merged.name).toBe(cocktail.name);
    expect(merged.storage).toEqual(cocktail.storage);
    expect(merged.relatedCocktails).toEqual(cocktail.relatedCocktails);
  });
});
