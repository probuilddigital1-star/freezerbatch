/**
 * Freezer Batch Cocktail Calculator
 *
 * CORE USE CASE: User starts with a FULL bottle of base spirit and wants to know:
 * 1. How much to POUR OFF from that bottle to make room
 * 2. What ingredients to add back (including dilution water)
 * 3. End up with a full bottle of properly balanced cocktail at 22%+ ABV
 */

// ============================================
// TYPES
// ============================================

export type Unit = 'ml' | 'oz' | 'cl' | 'dash' | 'barspoon' | 'tsp' | 'tbsp';

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: Unit;
  abv: number;
  isBaseSpirit: boolean;
}

export interface IngredientToAdd {
  name: string;
  amountMl: number;
  amountOz: number;
  abv: number;
}

export interface BatchResult {
  // What to pour off from the base spirit bottle
  pourOffMl: number;
  pourOffOz: number;

  // What to add to the bottle
  ingredientsToAdd: IngredientToAdd[];
  waterToAddMl: number;
  waterToAddOz: number;

  // Final stats
  finalAbv: number;
  totalVolumeMl: number;
  totalVolumeOz: number;
  servings: number;

  // Freeze status
  freezeStatus: 'freeze' | 'slushy' | 'safe';
  freezeMessage: string;
  /** Safe, but clears the 22% line by less than NEAR_LINE_MARGIN points. */
  nearLine: boolean;

  // Base spirit info
  baseSpiritName: string;
  baseSpiritInBottleMl: number;
  baseSpiritInBottleOz: number;
}

// Legacy interface for backwards compatibility
export interface Ingredient {
  name: string;
  volumeMl: number;
  abv: number;
}

// ============================================
// CONSTANTS
// ============================================

export const ML_PER_OZ = 29.5735;
export const STANDARD_BOTTLE_ML = 750;
export const SERVING_SIZE_ML = 90; // ~3oz per serving

// ABV thresholds
export const FREEZE_THRESHOLD = 15;   // Below this = solid freeze
export const SLUSHY_THRESHOLD = 22;   // Below this = slushy (22%+ is safe)
// Above the line by less than this many points, the batch pours but thick,
// and a cold freezer will put ice flakes in it.
export const NEAR_LINE_MARGIN = 3;

// Unit conversions to ml
const UNIT_TO_ML: Record<Unit, number> = {
  'ml': 1,
  'oz': 29.5735,
  'cl': 10,
  'dash': 0.9,
  'barspoon': 5,
  'tsp': 5,
  'tbsp': 15,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function mlToOz(ml: number): number {
  return Math.round((ml / ML_PER_OZ) * 100) / 100;
}

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ);
}

export function convertToMl(amount: number, unit: Unit): number {
  return amount * (UNIT_TO_ML[unit] || 1);
}

export function getFreezeStatus(abv: number): {
  status: 'freeze' | 'slushy' | 'safe';
  message: string;
  nearLine: boolean;
} {
  if (abv < FREEZE_THRESHOLD) {
    return {
      status: 'freeze',
      message: `${abv.toFixed(1)}% ABV will freeze solid. Add more spirits or reduce mixers.`,
      nearLine: false
    };
  }
  if (abv < SLUSHY_THRESHOLD) {
    return {
      status: 'slushy',
      message: `${abv.toFixed(1)}% ABV will be thick/slushy. Still drinkable but not ideal.`,
      nearLine: false
    };
  }
  // Not a fourth status: the three-value enum is read in about ten places and
  // the e2e suite reads status-* class names. nearLine qualifies 'safe'.
  if (abv < SLUSHY_THRESHOLD + NEAR_LINE_MARGIN) {
    return {
      status: 'safe',
      message: `${abv.toFixed(1)}% ABV clears the line, but only just. Expect a thick pour with some ice flakes. A higher-proof base spirit, or a lighter hand with the citrus, adds margin.`,
      nearLine: true
    };
  }
  return {
    status: 'safe',
    message: `${abv.toFixed(1)}% ABV will stay perfectly pourable.`,
    nearLine: false
  };
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate a full bottle batch from a single-serving recipe.
 *
 * EXAMPLE: Negroni (1:1:1 ratio) for 750ml bottle with 20% dilution
 *
 * 1. Dilution water = 750 * 0.20 = 150ml
 * 2. Volume for ingredients = 750 - 150 = 600ml
 * 3. Each ingredient = 600 / 3 = 200ml (equal parts)
 * 4. Pour off = 750 - 200 = 550ml (make room for Campari, Vermouth, Water)
 * 5. Add: 200ml Campari, 200ml Vermouth, 150ml Water
 *
 * @param recipe - Array of ingredients with amounts, ABV, and isBaseSpirit flag
 * @param bottleSizeMl - Target bottle size (default 750ml)
 * @param dilutionPercent - Dilution water as % of total (default 20 for stirred, 25 for shaken)
 */
export function calculateBatchFromBottle(
  recipe: RecipeIngredient[],
  bottleSizeMl: number = STANDARD_BOTTLE_ML,
  dilutionPercent: number = 20
): BatchResult {

  // Validate inputs
  if (!recipe || recipe.length === 0) {
    return emptyResult();
  }

  // Find the base spirit (or mark highest ABV as base)
  let baseSpirit = recipe.find(ing => ing.isBaseSpirit);
  if (!baseSpirit) {
    const sorted = [...recipe].sort((a, b) => b.abv - a.abv);
    if (sorted.length > 0 && sorted[0].abv > 0) {
      baseSpirit = sorted[0];
      baseSpirit.isBaseSpirit = true;
    } else {
      return emptyResult();
    }
  }

  // Step 1: Convert all recipe ingredients to ml
  const ingredientsWithMl = recipe.map(ing => ({
    ...ing,
    recipeMl: convertToMl(ing.amount, ing.unit)
  }));

  // Step 2: Calculate total recipe volume (single serving)
  const totalRecipeMl = ingredientsWithMl.reduce((sum, ing) => sum + ing.recipeMl, 0);

  if (totalRecipeMl === 0) {
    return emptyResult();
  }

  // Step 3: Calculate dilution water (rounded to clean quarter-ounce)
  const targetWaterMl = bottleSizeMl * (dilutionPercent / 100);
  const waterToAddOz = roundToQuarter(targetWaterMl / ML_PER_OZ);
  const waterToAddMl = Math.round(waterToAddOz * ML_PER_OZ);

  // Step 4: Calculate volume available for actual ingredients
  const volumeForIngredients = bottleSizeMl - waterToAddMl;

  // Step 5: Calculate scale factor and scaled amounts.
  // Round every ingredient to quarter-ounce increments so users get clean
  // jigger-friendly numbers (matches the Milk Street preset path).
  const scaleFactor = volumeForIngredients / totalRecipeMl;

  const scaledIngredients = ingredientsWithMl.map(ing => {
    const idealOz = (ing.recipeMl * scaleFactor) / ML_PER_OZ;
    const cleanOz = roundToQuarter(idealOz);
    return {
      ...ing,
      scaledOz: cleanOz,
      scaledMl: Math.round(cleanOz * ML_PER_OZ),
    };
  });

  // Step 6: Find the base spirit's scaled amount
  const baseSpiritScaled = scaledIngredients.find(ing => ing.isBaseSpirit)!;
  const baseSpiritInBottleMl = baseSpiritScaled.scaledMl;
  const baseSpiritInBottleOz = baseSpiritScaled.scaledOz;

  // Step 7: Calculate pour-off (how much to remove from full bottle).
  // Pour-off is bottle minus the rounded base spirit ml — so it lands on a
  // clean quarter-ounce too (since the base spirit amount is clean).
  const bottleSizeOzClean = roundToQuarter(bottleSizeMl / ML_PER_OZ);
  const pourOffOz = bottleSizeOzClean - baseSpiritInBottleOz;
  const pourOffMl = Math.round(pourOffOz * ML_PER_OZ);

  // Step 8: Get ingredients to add (everything except base spirit)
  const ingredientsToAdd: IngredientToAdd[] = scaledIngredients
    .filter(ing => !ing.isBaseSpirit)
    .map(ing => ({
      name: ing.name,
      amountMl: ing.scaledMl,
      amountOz: ing.scaledOz,
      abv: ing.abv
    }));

  // Step 9: Compute the actual final liquid volume (rounding may leave a
  // small gap or overflow vs the nominal bottle size).
  const addBackMl = ingredientsToAdd.reduce((sum, ing) => sum + ing.amountMl, 0);
  const actualVolumeMl = Math.max(1, baseSpiritInBottleMl + addBackMl + waterToAddMl);

  // Step 10: Calculate final ABV from the real volume
  let totalAlcoholMl = 0;
  scaledIngredients.forEach(ing => {
    totalAlcoholMl += ing.scaledMl * (ing.abv / 100);
  });
  const finalAbv = (totalAlcoholMl / actualVolumeMl) * 100;

  // Step 11: Get freeze status
  const { status: freezeStatus, message: freezeMessage, nearLine } = getFreezeStatus(finalAbv);

  // Step 12: Calculate servings from the actual volume
  const servings = Math.floor(actualVolumeMl / SERVING_SIZE_ML);

  return {
    pourOffMl,
    pourOffOz,
    ingredientsToAdd,
    waterToAddMl,
    waterToAddOz,
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: actualVolumeMl,
    totalVolumeOz: mlToOz(actualVolumeMl),
    servings,
    freezeStatus,
    freezeMessage,
    nearLine,
    baseSpiritName: baseSpiritScaled.name,
    baseSpiritInBottleMl,
    baseSpiritInBottleOz
  };
}

function emptyResult(): BatchResult {
  return {
    pourOffMl: 0,
    pourOffOz: 0,
    ingredientsToAdd: [],
    waterToAddMl: 0,
    waterToAddOz: 0,
    finalAbv: 0,
    totalVolumeMl: 0,
    totalVolumeOz: 0,
    servings: 0,
    freezeStatus: 'freeze',
    freezeMessage: 'Add ingredients to calculate',
    nearLine: false,
    baseSpiritName: '',
    baseSpiritInBottleMl: 0,
    baseSpiritInBottleOz: 0
  };
}

// Legacy function for backwards compatibility
export function calculateBatch(ingredients: Ingredient[]): {
  finalAbv: number;
  totalVolumeMl: number;
  totalVolumeOz: number;
  freezeStatus: 'freeze' | 'slushy' | 'safe';
  freezeMessage: string;
  nearLine: boolean;
  servings: number;
} {
  if (!ingredients || ingredients.length === 0) {
    return {
      finalAbv: 0,
      totalVolumeMl: 0,
      totalVolumeOz: 0,
      freezeStatus: 'freeze',
      freezeMessage: 'Add ingredients to calculate',
      nearLine: false,
      servings: 0
    };
  }

  const totalVolumeMl = ingredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
  const totalAlcoholMl = ingredients.reduce((sum, ing) => sum + (ing.volumeMl * ing.abv / 100), 0);
  const finalAbv = totalVolumeMl > 0 ? (totalAlcoholMl / totalVolumeMl) * 100 : 0;
  const { status: freezeStatus, message: freezeMessage, nearLine } = getFreezeStatus(finalAbv);

  return {
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: Math.round(totalVolumeMl),
    totalVolumeOz: mlToOz(totalVolumeMl),
    freezeStatus,
    freezeMessage,
    nearLine,
    servings: Math.floor(totalVolumeMl / SERVING_SIZE_ML)
  };
}

// ============================================
// PRESET RECIPES (single serving)
// ============================================

// ============================================
// MILK STREET EXACT BATCH RECIPES
// From 177milkstreet.com - EXACT measurements for 750ml bottles
// DO NOT SCALE - these are the precise amounts
// ============================================

export interface MilkStreetBatch {
  baseSpirit: string;
  baseSpiritAbv: number;
  pourOffOz: number;
  addBack: Array<{
    name: string;
    oz: number;
    abv: number;
  }>;
  waterOz: number;
  /**
   * Rendered verbatim as "Also add: ..." under the ingredients. Only
   * ingredient or serve instructions belong here — never notes about texture
   * or ABV, which the calculator now derives (see getFreezeStatus/nearLine).
   */
  extras?: string;
}

export const MILK_STREET_BATCHES: Record<string, MilkStreetBatch> = {
  margarita: {
    baseSpirit: 'Tequila Blanco',
    baseSpiritAbv: 40,
    pourOffOz: 10,
    addBack: [
      { name: 'Fresh Lime Juice', oz: 5, abv: 0 },
      { name: 'Orange Liqueur (Cointreau)', oz: 4, abv: 40 },
      { name: 'Agave Syrup', oz: 1.5, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Pinch of salt'
  },
  negroni: {
    baseSpirit: 'Gin',
    baseSpiritAbv: 40,
    pourOffOz: 16,
    addBack: [
      { name: 'Sweet Vermouth', oz: 7, abv: 16 },
      { name: 'Campari', oz: 7, abv: 25 }
    ],
    waterOz: 0,
    extras: 'Few dashes orange bitters'
  },
  manhattan: {
    baseSpirit: 'Rye Whiskey',
    baseSpiritAbv: 45,
    pourOffOz: 4.5,
    addBack: [
      { name: 'Sweet Vermouth', oz: 4, abv: 16 },
      { name: 'Maraschino Cherry Syrup', oz: 0.5, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Dash or two Angostura bitters'
  },
  'old-fashioned': {
    baseSpirit: 'Bourbon',
    baseSpiritAbv: 45,
    pourOffOz: 1.5,
    addBack: [
      { name: 'Rich Simple Syrup', oz: 1.5, abv: 0 }
    ],
    waterOz: 0,
    extras: '½ tbsp Angostura bitters'
  },
  daiquiri: {
    baseSpirit: 'White Rum',
    baseSpiritAbv: 40,
    pourOffOz: 7,
    addBack: [
      { name: 'Fresh Lime Juice', oz: 3.5, abv: 0 },
      { name: 'Agave/Simple Syrup', oz: 1.75, abv: 0 }
    ],
    waterOz: 2,
    extras: 'Dash or two Peychaud\'s bitters'
  },
  'dirty-martini': {
    baseSpirit: 'Vodka',
    baseSpiritAbv: 40,
    pourOffOz: 6,
    addBack: [
      { name: 'Dry Vermouth', oz: 4, abv: 18 },
      { name: 'Green Olive Brine', oz: 1.5, abv: 0 }
    ],
    waterOz: 0.5,
    extras: undefined
  },
  cosmopolitan: {
    baseSpirit: 'Vodka',
    baseSpiritAbv: 40,
    pourOffOz: 9,
    addBack: [
      { name: 'Orange Liqueur (Cointreau)', oz: 3, abv: 40 },
      { name: 'Agave/Simple Syrup', oz: 1.5, abv: 0 },
      { name: 'Cranberry Juice Concentrate', oz: 1, abv: 0 },
      { name: 'Fresh Lime Juice', oz: 0.25, abv: 0 }
    ],
    waterOz: 2,
    extras: '½ tsp orange bitters'
  },
  'espresso-martini': {
    baseSpirit: 'Vodka',
    baseSpiritAbv: 40,
    pourOffOz: 10,
    addBack: [
      { name: 'Kahlúa', oz: 9, abv: 20 }
    ],
    waterOz: 1,
    extras: '3½ tbsp instant espresso powder'
  },
  vesper: {
    baseSpirit: 'Gin',
    baseSpiritAbv: 40,
    pourOffOz: 10,
    addBack: [
      { name: 'Vodka', oz: 2.5, abv: 40 },
      { name: 'Cocchi Americano', oz: 5, abv: 16.5 }
    ],
    waterOz: 0,
    extras: undefined
  },
  'mint-julep': {
    baseSpirit: 'Bourbon',
    baseSpiritAbv: 45,
    pourOffOz: 3.25,
    addBack: [
      { name: 'Mint Syrup', oz: 3, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Mint syrup: 2 cups fresh mint + ½ cup sugar + water'
  },
  'paper-plane': {
    baseSpirit: 'Bourbon',
    baseSpiritAbv: 45,
    pourOffOz: 19,
    addBack: [
      { name: 'Aperol', oz: 6.25, abv: 11 },
      { name: 'Amaro Nonino', oz: 6.25, abv: 35 },
      { name: 'Fresh Lemon Juice', oz: 6.25, abv: 0 }
    ],
    waterOz: 0,
    extras: undefined
  },
  'moscow-mule': {
    baseSpirit: 'Vodka',
    baseSpiritAbv: 40,
    pourOffOz: 6.5,
    addBack: [
      { name: 'Fresh Lime Juice', oz: 3.25, abv: 0 },
      { name: 'Ginger Syrup', oz: 3.25, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Add 2oz ginger beer per drink when serving (do NOT batch the ginger beer)'
  },
  boulevardier: {
    baseSpirit: 'Bourbon',
    baseSpiritAbv: 45,
    pourOffOz: 14,
    addBack: [
      { name: 'Sweet Vermouth', oz: 6, abv: 16 },
      { name: 'Campari', oz: 6, abv: 25 }
    ],
    waterOz: 0,
    extras: 'Few dashes orange bitters'
  },
  'vieux-carre': {
    baseSpirit: 'Rye Whiskey',
    baseSpiritAbv: 45,
    pourOffOz: 17.5,
    addBack: [
      { name: 'Cognac', oz: 7.75, abv: 40 },
      { name: 'Sweet Vermouth', oz: 7.75, abv: 16 },
      { name: 'Bénédictine', oz: 2, abv: 40 }
    ],
    waterOz: 0,
    extras: 'Few dashes Peychaud\'s and Angostura bitters'
  },
  'hanky-panky': {
    baseSpirit: 'Gin',
    baseSpiritAbv: 40,
    pourOffOz: 12.75,
    addBack: [
      { name: 'Sweet Vermouth', oz: 12.5, abv: 16 },
      { name: 'Fernet-Branca', oz: 0.25, abv: 39 }
    ],
    waterOz: 0,
    extras: 'Express orange peel over the glass at serve'
  },
  aviation: {
    baseSpirit: 'Gin',
    baseSpiritAbv: 40,
    pourOffOz: 10.75,
    addBack: [
      { name: 'Maraschino Liqueur', oz: 3.5, abv: 32 },
      { name: 'Crème de Violette', oz: 1.75, abv: 20 },
      { name: 'Fresh Lemon Juice', oz: 5.5, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Garnish with a brandied cherry'
  },
  sazerac: {
    baseSpirit: 'Rye Whiskey',
    baseSpiritAbv: 45,
    pourOffOz: 2.75,
    addBack: [
      { name: 'Rich Simple Syrup', oz: 2.75, abv: 0 }
    ],
    waterOz: 0,
    extras: 'Peychaud\'s bitters batched in (3 dashes per drink); absinthe rinse the glass at serve'
  },
  bijou: {
    baseSpirit: 'Gin',
    baseSpiritAbv: 40,
    pourOffOz: 17,
    addBack: [
      { name: 'Sweet Vermouth', oz: 8.5, abv: 16 },
      { name: 'Green Chartreuse', oz: 8.5, abv: 55 }
    ],
    waterOz: 0,
    extras: 'Dash orange bitters at serve'
  }
};

/**
 * Round to clean, practical measurements for bartending
 * Uses 0.25 oz increments (standard jigger markings)
 */
function roundToQuarter(oz: number): number {
  return Math.round(oz * 4) / 4;
}

/**
 * Calculate batch using EXACT Milk Street measurements
 * Scales proportionally for different bottle sizes
 * Returns CLEAN numbers rounded to quarter-ounce increments
 */
export function calculateMilkStreetBatch(
  recipeId: string,
  bottleSizeMl: number = STANDARD_BOTTLE_ML
): BatchResult | null {
  const recipe = MILK_STREET_BATCHES[recipeId];
  if (!recipe) return null;

  // Scale factor for non-750ml bottles
  const scaleFactor = bottleSizeMl / STANDARD_BOTTLE_ML;

  // Calculate scaled amounts - round to clean quarter-ounce increments
  const pourOffOz = roundToQuarter(recipe.pourOffOz * scaleFactor);
  const pourOffMl = Math.round(pourOffOz * ML_PER_OZ);

  // Base spirit remaining in bottle (bottle size minus pour-off)
  const bottleSizeOz = roundToQuarter(bottleSizeMl / ML_PER_OZ);
  const baseSpiritOz = bottleSizeOz - pourOffOz;
  const baseSpiritMl = Math.round(baseSpiritOz * ML_PER_OZ);

  // Scale ingredients to add - round to clean measurements
  const ingredientsToAdd: IngredientToAdd[] = recipe.addBack.map(ing => {
    const scaledOz = roundToQuarter(ing.oz * scaleFactor);
    return {
      name: ing.name,
      amountOz: scaledOz,
      amountMl: Math.round(scaledOz * ML_PER_OZ),
      abv: ing.abv
    };
  });

  // Water to add - round to clean measurement
  const waterOz = roundToQuarter(recipe.waterOz * scaleFactor);
  const waterMl = Math.round(waterOz * ML_PER_OZ);

  // Compute the ACTUAL final liquid volume in the bottle.
  // Some Milk Street recipes intentionally leave headspace (bottle won't be full),
  // so we must not use the nominal bottle size as the ABV denominator.
  const addBackMl = ingredientsToAdd.reduce((sum, ing) => sum + ing.amountMl, 0);
  const actualVolumeMl = Math.max(1, baseSpiritMl + addBackMl + waterMl);

  // Calculate final ABV from the real volume
  let totalAlcoholMl = baseSpiritMl * (recipe.baseSpiritAbv / 100);
  ingredientsToAdd.forEach(ing => {
    totalAlcoholMl += ing.amountMl * (ing.abv / 100);
  });
  const finalAbv = (totalAlcoholMl / actualVolumeMl) * 100;

  // Get freeze status
  const { status: freezeStatus, message: freezeMessage, nearLine } = getFreezeStatus(finalAbv);

  return {
    pourOffMl,
    pourOffOz,
    ingredientsToAdd,
    waterToAddMl: waterMl,
    waterToAddOz: waterOz,
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: actualVolumeMl,
    totalVolumeOz: mlToOz(actualVolumeMl),
    servings: Math.floor(actualVolumeMl / SERVING_SIZE_ML),
    freezeStatus,
    freezeMessage,
    nearLine,
    baseSpiritName: recipe.baseSpirit,
    baseSpiritInBottleMl: baseSpiritMl,
    baseSpiritInBottleOz: baseSpiritOz
  };
}

// Single-serve recipes (converted from Milk Street batch ratios)
export const RECIPES: Record<string, RecipeIngredient[]> = {
  // Milk Street: 750ml gin - 16oz = ~9.4oz gin, + 7oz vermouth + 7oz Campari
  // Ratio: ~1.3:1:1 (slightly gin-forward)
  negroni: [
    { name: 'Gin', amount: 1.25, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Campari', amount: 1, unit: 'oz', abv: 25, isBaseSpirit: false },
    { name: 'Sweet Vermouth', amount: 1, unit: 'oz', abv: 16, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 10oz = 15.4oz tequila, + 5oz lime + 4oz liqueur + 1.5oz agave
  // Per drink (~8 servings): 1.9:0.6:0.5:0.2
  margarita: [
    { name: 'Tequila', amount: 2, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Fresh Lime Juice', amount: 0.625, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Orange Liqueur', amount: 0.5, unit: 'oz', abv: 40, isBaseSpirit: false },
    { name: 'Agave Syrup', amount: 0.2, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 4.5oz = 21oz rye, + 4oz vermouth + 0.5oz cherry syrup
  // Per drink: ~2.6:0.5:0.06 - VERY spirit-forward
  manhattan: [
    { name: 'Rye Whiskey', amount: 2.5, unit: 'oz', abv: 45, isBaseSpirit: true },
    { name: 'Sweet Vermouth', amount: 0.5, unit: 'oz', abv: 16, isBaseSpirit: false },
    { name: 'Cherry Syrup', amount: 0.1, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 1.33oz = ~24oz bourbon, + 1oz syrup + bitters
  // Per drink: 3oz bourbon, 0.125oz syrup - almost pure bourbon
  'old-fashioned': [
    { name: 'Bourbon', amount: 3, unit: 'oz', abv: 45, isBaseSpirit: true },
    { name: 'Agave Syrup', amount: 0.125, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Angostura Bitters', amount: 2, unit: 'dash', abv: 44, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 6oz = 19.4oz vodka, + 4oz vermouth + 2.5oz water + 1.5oz brine
  'dirty-martini': [
    { name: 'Vodka', amount: 2.4, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Dry Vermouth', amount: 0.5, unit: 'oz', abv: 18, isBaseSpirit: false },
    { name: 'Olive Brine', amount: 0.2, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Keep traditional for Boulevardier (not in Milk Street)
  boulevardier: [
    { name: 'Bourbon', amount: 1.5, unit: 'oz', abv: 45, isBaseSpirit: true },
    { name: 'Campari', amount: 1, unit: 'oz', abv: 25, isBaseSpirit: false },
    { name: 'Sweet Vermouth', amount: 1, unit: 'oz', abv: 16, isBaseSpirit: false }
  ],
  // Milk Street: Very vodka-forward with cranberry concentrate
  cosmopolitan: [
    { name: 'Vodka', amount: 2, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Orange Liqueur', amount: 0.375, unit: 'oz', abv: 40, isBaseSpirit: false },
    { name: 'Cranberry Concentrate', amount: 0.125, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Agave Syrup', amount: 0.2, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Lime Juice', amount: 0.03, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Keep for Moscow Mule (not in Milk Street - they do Mint Julep instead)
  'moscow-mule': [
    { name: 'Vodka', amount: 2, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Lime Juice', amount: 0.5, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Ginger Syrup', amount: 0.5, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 10oz = 15.4oz vodka, + 9oz Kahlua + 1oz water + espresso powder
  'espresso-martini': [
    { name: 'Vodka', amount: 2, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Kahlua', amount: 1.125, unit: 'oz', abv: 20, isBaseSpirit: false },
    { name: 'Instant Espresso', amount: 0.5, unit: 'tsp', abv: 0, isBaseSpirit: false }
  ],
  // Keep Paper Plane (not in Milk Street)
  'paper-plane': [
    { name: 'Bourbon', amount: 0.75, unit: 'oz', abv: 45, isBaseSpirit: true },
    { name: 'Aperol', amount: 0.75, unit: 'oz', abv: 11, isBaseSpirit: false },
    { name: 'Amaro Nonino', amount: 0.75, unit: 'oz', abv: 35, isBaseSpirit: false },
    { name: 'Lemon Juice', amount: 0.75, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // Milk Street: 750ml - 7oz = 18.4oz rum, + 3.5oz lime + 2oz water + 1.75oz agave
  daiquiri: [
    { name: 'White Rum', amount: 2.3, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Fresh Lime Juice', amount: 0.44, unit: 'oz', abv: 0, isBaseSpirit: false },
    { name: 'Agave Syrup', amount: 0.22, unit: 'oz', abv: 0, isBaseSpirit: false }
  ],
  // NEW: Vesper from Milk Street
  vesper: [
    { name: 'Gin', amount: 2, unit: 'oz', abv: 40, isBaseSpirit: true },
    { name: 'Vodka', amount: 0.33, unit: 'oz', abv: 40, isBaseSpirit: false },
    { name: 'Cocchi Americano', amount: 0.625, unit: 'oz', abv: 16.5, isBaseSpirit: false }
  ],
  // NEW: Mint Julep from Milk Street
  'mint-julep': [
    { name: 'Bourbon', amount: 2.75, unit: 'oz', abv: 45, isBaseSpirit: true },
    { name: 'Mint Syrup', amount: 0.375, unit: 'oz', abv: 0, isBaseSpirit: false }
  ]
};

// Dilution recommendations by cocktail type
// Based on Milk Street methodology - much lower than traditional bar dilution
// Freezer temperature smooths the alcohol, reducing need for water
export const DILUTION_RECOMMENDATIONS: Record<string, number> = {
  // Spirit-forward stirred drinks: 0-5% (Milk Street uses no water)
  'negroni': 0,
  'manhattan': 0,
  'old-fashioned': 0,
  'boulevardier': 0,
  'vesper': 0,
  'mint-julep': 0,

  // Martinis: ~8-10% (small amount of water)
  'dirty-martini': 10,

  // Citrus drinks: 5-10% (Milk Street uses minimal water)
  'margarita': 0,       // No water - lime provides liquid
  'daiquiri': 8,        // Small amount of water
  'cosmopolitan': 8,    // Small amount of water
  'paper-plane': 0,     // No water

  // Coffee drinks: ~5%
  'espresso-martini': 4,

  // Carbonated (add at serve): 0%
  'moscow-mule': 0
};

// ============================================
// ABV SUGGESTIONS
// ============================================

export interface IngredientABV {
  /** Title-cased display name. This is the value offered in the datalist. */
  name: string;
  /** Alcohol by volume, percent. */
  abv: number;
  /**
   * Extra lowercase spellings that resolve to the same number — dropped
   * accents, shortened brand names, a fuller name for the same bottle — but
   * that do not deserve their own datalist row.
   */
  aliases?: string[];
}

/**
 * The single source for both the ingredient datalist in Calculator.astro and
 * the `ABV_DEFAULTS` lookup below. These used to be two hand-kept lists and
 * they drifted; drift between hand-kept lists has already cost this repo the
 * og cards and the Recipe `recipeYield` (claude/photo-shoot-log.md), so the
 * display order lives here and everything else is derived from it.
 *
 * Every number an actual recipe uses is pinned to src/data/cocktails.json and
 * guarded by a test in calculator.test.ts.
 */
export const INGREDIENT_ABVS: IngredientABV[] = [
  // Spirits
  { name: 'Vodka', abv: 40 },
  { name: 'Gin', abv: 40, aliases: ['london dry gin'] },
  { name: 'Sloe Gin', abv: 26 },
  { name: 'Bourbon', abv: 45 },
  { name: 'Rye Whiskey', abv: 45, aliases: ['rye'] },
  { name: 'Whiskey', abv: 40 },
  { name: 'Scotch', abv: 43 },
  { name: 'Rum', abv: 40 },
  { name: 'White Rum', abv: 40 },
  { name: 'Dark Rum', abv: 40 },
  { name: 'Spiced Rum', abv: 35 },
  { name: 'Coconut Rum', abv: 21 },
  { name: 'Tequila', abv: 40 },
  { name: 'Mezcal', abv: 43 },
  { name: 'Brandy', abv: 40 },
  { name: 'Cognac', abv: 40 },

  // Liqueurs
  { name: 'Cointreau', abv: 40 },
  { name: 'Triple Sec', abv: 30 },
  { name: 'Orange Liqueur', abv: 40 },
  { name: 'Grand Marnier', abv: 40 },
  { name: 'Campari', abv: 25 },
  { name: 'Aperol', abv: 11 },
  { name: 'Kahlua', abv: 20 },
  { name: 'Coffee Liqueur', abv: 20 },
  { name: 'Amaretto', abv: 28 },
  { name: 'St-Germain', abv: 20, aliases: ['st germain'] },
  { name: 'Maraschino Liqueur', abv: 32, aliases: ['maraschino'] },
  { name: 'Melon Liqueur', abv: 20 },
  { name: 'Irish Cream', abv: 17 },
  { name: 'Crème de Cacao', abv: 24, aliases: ['creme de cacao'] },
  { name: 'Crème de Violette', abv: 20, aliases: ['creme de violette'] },
  { name: 'Amaro', abv: 30 },
  { name: 'Amaro Nonino', abv: 35 },
  { name: 'Fernet-Branca', abv: 39, aliases: ['fernet', 'fernet branca'] },
  { name: 'Bénédictine', abv: 40, aliases: ['benedictine'] },
  { name: 'Green Chartreuse', abv: 55 },
  { name: 'Yellow Chartreuse', abv: 40 },
  { name: 'Chartreuse', abv: 55 },

  // Fortified
  { name: 'Sweet Vermouth', abv: 16 },
  { name: 'Dry Vermouth', abv: 18 },
  { name: 'Bianco Vermouth', abv: 16, aliases: ['blanc vermouth'] },
  { name: 'Cocchi Americano', abv: 16.5 },
  { name: 'Sherry', abv: 17 },
  { name: 'Dry Sherry', abv: 17 },

  // Bitters (high ABV, but used in dashes). 44 rather than the round 45 this
  // used to carry, because 44 is what cocktails.json bills Angostura at. There
  // is deliberately no bare `Bitters` row: Angostura is 44 and Peychaud's is
  // 35, so a generic answer would be picking one of them and sounding sure.
  { name: 'Angostura Bitters', abv: 44, aliases: ['angostura'] },

  // Mixers (0%)
  { name: 'Lime Juice', abv: 0 },
  { name: 'Lemon Juice', abv: 0 },
  { name: 'Orange Juice', abv: 0 },
  { name: 'Pineapple Juice', abv: 0 },
  { name: 'Grapefruit Juice', abv: 0 },
  { name: 'Cranberry Juice', abv: 0 },
  { name: 'Tomato Juice', abv: 0 },
  { name: 'Simple Syrup', abv: 0 },
  { name: 'Honey Syrup', abv: 0 },
  { name: 'Ginger Syrup', abv: 0 },
  { name: 'Mint Syrup', abv: 0 },
  { name: 'Cherry Syrup', abv: 0 },
  { name: 'Agave Syrup', abv: 0, aliases: ['agave'] },
  { name: 'Maple Syrup', abv: 0 },
  { name: 'Grenadine', abv: 0 },
  { name: 'Olive Brine', abv: 0 },
  { name: 'Cream of Coconut', abv: 0 },
  { name: 'Coconut Cream', abv: 0 },
  { name: 'Coconut Milk', abv: 0 },
  { name: 'Cream', abv: 0 },
  { name: 'Half and Half', abv: 0 },
  { name: 'Milk', abv: 0 },
  { name: 'Water', abv: 0 },
  { name: 'Club Soda', abv: 0 },
  { name: 'Soda Water', abv: 0 },
  { name: 'Tonic Water', abv: 0, aliases: ['tonic'] },
  { name: 'Ginger Beer', abv: 0 },
  { name: 'Ginger Ale', abv: 0 },
  { name: 'Cold Brew Concentrate', abv: 0, aliases: ['cold brew'] },
  { name: 'Espresso', abv: 0 },
  { name: 'Coffee', abv: 0 }
];

function buildAbvLookup(entries: IngredientABV[]): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const { name, abv, aliases } of entries) {
    lookup[name.toLowerCase()] = abv;
    for (const alias of aliases ?? []) {
      lookup[alias] = abv;
    }
  }
  return lookup;
}

/** Lowercase name (and alias) to ABV, derived from `INGREDIENT_ABVS`. */
export const ABV_DEFAULTS: Record<string, number> = buildAbvLookup(INGREDIENT_ABVS);

/**
 * Split a name into lowercase word tokens so matching happens on whole words:
 * `gin` must not match inside `ginger`, nor `rum` inside `rumchata`. Splitting
 * on everything that is not a letter or digit also makes `fernet-branca` and
 * `fernet branca` the same two words, and the Unicode classes keep `crème` a
 * single token.
 */
function wordsOf(name: string): string[] {
  return name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Index at which `needle` appears as a run of whole words in `haystack`, or -1. */
function phraseIndex(haystack: string[], needle: string[]): number {
  if (needle.length === 0) return -1;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let hit = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        hit = false;
        break;
      }
    }
    if (hit) return i;
  }
  return -1;
}

/** Keys pre-tokenised, longest first, so the first phrase hit is also the
 *  longest key: `irish cream` beats `cream`, `green chartreuse` beats
 *  `chartreuse`. Declaration order must not decide this — spirits are declared
 *  first, which is how every modified spirit used to inherit a base proof. */
const ABV_MATCH_KEYS: { key: string; words: string[] }[] = Object.keys(ABV_DEFAULTS)
  .map(key => ({ key, words: wordsOf(key) }))
  .sort((a, b) => b.key.length - a.key.length);

/**
 * Best-guess ABV for a typed ingredient name, or null where the table cannot
 * answer honestly.
 *
 * Null is the safe answer here and a wrong number is not. This autofills the
 * ABV box directly, and an overstated ABV makes the calculator report a batch
 * as clearing the 22% freezer line when it will in fact set to slush. That is
 * the one number this site exists to get right, so the matcher only answers
 * when it is confident.
 */
export function suggestABV(name: string): number | null {
  const normalized = name.toLowerCase().trim();

  // Exact match
  if (ABV_DEFAULTS[normalized] !== undefined) {
    return ABV_DEFAULTS[normalized];
  }

  // Whole-word match on the longest key. Qualifiers around a phrase the table
  // knows are fine: `rich simple syrup` is still simple syrup.
  const typed = wordsOf(normalized);
  const match = ABV_MATCH_KEYS
    .map(entry => ({ entry, at: phraseIndex(typed, entry.words) }))
    .find(candidate => candidate.at !== -1);
  if (!match) return null;

  // A modifier the table does not know, sitting in front of a base spirit
  // (`sloe gin`, `coconut rum`), names a different product at a different
  // proof. Blank the box rather than inherit the base spirit's number: a blank
  // makes the user think, a confident wrong number does not.
  const bareBaseWord = typed.length > 1 && match.entry.words.length === 1 && match.at > 0;
  if (bareBaseWord && typed.slice(0, match.at).every(word => ABV_DEFAULTS[word] === undefined)) {
    return null;
  }

  return ABV_DEFAULTS[match.entry.key];
}

/** What the ABV autofill is allowed to do to a box on this keystroke. */
export type AbvAutofillAction =
  | { action: 'write'; value: number }
  | { action: 'clear' }
  | { action: 'leave' };

/**
 * Decide whether the ABV autofill may touch a box when the ingredient name
 * changes.
 *
 * The autofill owns a box only while the box is empty or still holds the exact
 * number the autofill last put there. Anything else is a number the user typed,
 * and their number is never overwritten.
 *
 * The old wiring only ever filled an empty box, so the suggestion from the
 * previous name survived a rename: Gin, then Ginger Syrup, still read 40. A
 * stale spirit proof on a syrup overstates the batch, and overstating is the
 * direction that reports an unsafe batch as freezer-safe.
 *
 * @param currentValue  what the ABV box reads now
 * @param lastSuggested what the autofill last wrote there, if anything
 * @param suggestion    what the new name suggests, or null for "will not guess"
 */
export function abvAutofillAction(
  currentValue: string,
  lastSuggested: string | undefined,
  suggestion: number | null
): AbvAutofillAction {
  const ownedByAutofill = currentValue === '' || currentValue === lastSuggested;
  if (!ownedByAutofill) return { action: 'leave' };

  // Null means the table will not guess. Clearing is the whole point of that:
  // a blank box makes the user think, a leftover number does not.
  if (suggestion === null) return { action: 'clear' };

  return { action: 'write', value: suggestion };
}
