/**
 * ABV, servings, freeze status and the near-line flag as the site actually
 * displays them.
 *
 * `cocktails.json` stores `finalAbv`, `servings` and `freezeStatus`, and those
 * stored values have drifted from what the site computes. Every visible surface
 * derives them from `calculateMilkStreetBatch()` instead — the same calculator
 * the reader interacts with on the page — so the stored fields are effectively
 * stale defaults, not the truth.
 *
 * Before this module the derivation was copy-pasted into the homepage and the
 * /cocktails index, and two other places read the raw fields and were wrong on
 * production as a result: the Recipe JSON-LD's `recipeYield` (5 of 18 recipes
 * disagreed with their own page) and the "You might also like" cards, which
 * advertised a different ABV for a drink than that drink's own page did.
 *
 * One function, so a fifth call site cannot quietly reintroduce it.
 */
import cocktailsData from '../data/cocktails.json';
import { calculateMilkStreetBatch, MILK_STREET_BATCHES } from './calculator';

export interface RecipeStats {
  /** Whole-percent ABV, matching how every card and stat block renders it. */
  finalAbv: number;
  servings: number;
  freezeStatus: string;
  /** Safe, but clears the 22% line by less than NEAR_LINE_MARGIN points. */
  nearLine: boolean;
}

type StoredCocktail = (typeof cocktailsData.cocktails)[number];

/**
 * Derive one recipe's displayed stats. Falls back to the stored values only for
 * a cocktail with no Milk Street batch defined — currently none, since all 18
 * have one, but the fallback keeps a newly added recipe rendering rather than
 * throwing.
 */
export function recipeStats(cocktail: StoredCocktail): RecipeStats {
  const batch = MILK_STREET_BATCHES[cocktail.slug] ? calculateMilkStreetBatch(cocktail.slug, 750) : null;
  return {
    finalAbv: batch ? Math.round(batch.finalAbv) : cocktail.finalAbv,
    servings: batch ? batch.servings : cocktail.servings,
    freezeStatus: batch ? batch.freezeStatus : cocktail.freezeStatus,
    nearLine: batch ? batch.nearLine : false,
  };
}

/** A cocktail record with its displayed stats substituted for the stored ones. */
export function withRecipeStats<T extends StoredCocktail>(cocktail: T): T & RecipeStats {
  return { ...cocktail, ...recipeStats(cocktail) };
}

/** Every recipe, stats-corrected, in data order. */
export function allWithRecipeStats(): Array<StoredCocktail & RecipeStats> {
  return cocktailsData.cocktails.map(withRecipeStats);
}

/**
 * The Recipe JSON-LD `recipeYield`. Structured data has to agree with the
 * visible page or it is the kind of mismatch Google penalises, so it is built
 * from the same number the page renders rather than from the stored field.
 */
export function recipeYield(cocktail: StoredCocktail): string {
  return `${recipeStats(cocktail).servings} servings`;
}
