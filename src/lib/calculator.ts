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
} {
  if (abv < FREEZE_THRESHOLD) {
    return {
      status: 'freeze',
      message: `${abv.toFixed(1)}% ABV will freeze solid. Add more spirits or reduce mixers.`
    };
  }
  if (abv < SLUSHY_THRESHOLD) {
    return {
      status: 'slushy',
      message: `${abv.toFixed(1)}% ABV will be thick/slushy. Still drinkable but not ideal.`
    };
  }
  return {
    status: 'safe',
    message: `${abv.toFixed(1)}% ABV will stay perfectly pourable.`
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

  // Step 3: Calculate dilution water
  const waterToAddMl = Math.round(bottleSizeMl * (dilutionPercent / 100));

  // Step 4: Calculate volume available for actual ingredients
  const volumeForIngredients = bottleSizeMl - waterToAddMl;

  // Step 5: Calculate scale factor and scaled amounts
  const scaleFactor = volumeForIngredients / totalRecipeMl;

  const scaledIngredients = ingredientsWithMl.map(ing => ({
    ...ing,
    scaledMl: Math.round(ing.recipeMl * scaleFactor)
  }));

  // Step 6: Find the base spirit's scaled amount
  const baseSpiritScaled = scaledIngredients.find(ing => ing.isBaseSpirit)!;
  const baseSpiritInBottleMl = baseSpiritScaled.scaledMl;

  // Step 7: Calculate pour-off (how much to remove from full bottle)
  // We start with a FULL bottle (750ml), we need to make room for other ingredients + water
  const pourOffMl = bottleSizeMl - baseSpiritInBottleMl;

  // Step 8: Get ingredients to add (everything except base spirit)
  const ingredientsToAdd: IngredientToAdd[] = scaledIngredients
    .filter(ing => !ing.isBaseSpirit)
    .map(ing => ({
      name: ing.name,
      amountMl: ing.scaledMl,
      amountOz: mlToOz(ing.scaledMl),
      abv: ing.abv
    }));

  // Step 9: Calculate final ABV
  let totalAlcoholMl = 0;
  scaledIngredients.forEach(ing => {
    totalAlcoholMl += ing.scaledMl * (ing.abv / 100);
  });
  // Water adds no alcohol
  const finalAbv = (totalAlcoholMl / bottleSizeMl) * 100;

  // Step 10: Get freeze status
  const { status: freezeStatus, message: freezeMessage } = getFreezeStatus(finalAbv);

  // Step 11: Calculate servings
  const servings = Math.floor(bottleSizeMl / SERVING_SIZE_ML);

  return {
    pourOffMl,
    pourOffOz: mlToOz(pourOffMl),
    ingredientsToAdd,
    waterToAddMl,
    waterToAddOz: mlToOz(waterToAddMl),
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: bottleSizeMl,
    totalVolumeOz: mlToOz(bottleSizeMl),
    servings,
    freezeStatus,
    freezeMessage,
    baseSpiritName: baseSpiritScaled.name,
    baseSpiritInBottleMl,
    baseSpiritInBottleOz: mlToOz(baseSpiritInBottleMl)
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
  servings: number;
} {
  if (!ingredients || ingredients.length === 0) {
    return {
      finalAbv: 0,
      totalVolumeMl: 0,
      totalVolumeOz: 0,
      freezeStatus: 'freeze',
      freezeMessage: 'Add ingredients to calculate',
      servings: 0
    };
  }

  const totalVolumeMl = ingredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
  const totalAlcoholMl = ingredients.reduce((sum, ing) => sum + (ing.volumeMl * ing.abv / 100), 0);
  const finalAbv = totalVolumeMl > 0 ? (totalAlcoholMl / totalVolumeMl) * 100 : 0;
  const { status: freezeStatus, message: freezeMessage } = getFreezeStatus(finalAbv);

  return {
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: Math.round(totalVolumeMl),
    totalVolumeOz: mlToOz(totalVolumeMl),
    freezeStatus,
    freezeMessage,
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
    pourOffOz: 1.33,
    addBack: [
      { name: 'Agave/Simple Syrup', oz: 1, abv: 0 }
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
    waterOz: 2.5,
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
    extras: 'Equal parts cocktail - will be slushy due to ~20% ABV'
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

  // Calculate final ABV using ml values
  let totalAlcoholMl = baseSpiritMl * (recipe.baseSpiritAbv / 100);
  ingredientsToAdd.forEach(ing => {
    totalAlcoholMl += ing.amountMl * (ing.abv / 100);
  });
  const finalAbv = (totalAlcoholMl / bottleSizeMl) * 100;

  // Get freeze status
  const { status: freezeStatus, message: freezeMessage } = getFreezeStatus(finalAbv);

  return {
    pourOffMl,
    pourOffOz,
    ingredientsToAdd,
    waterToAddMl: waterMl,
    waterToAddOz: waterOz,
    finalAbv: Math.round(finalAbv * 10) / 10,
    totalVolumeMl: bottleSizeMl,
    totalVolumeOz: mlToOz(bottleSizeMl),
    servings: Math.floor(bottleSizeMl / SERVING_SIZE_ML),
    freezeStatus,
    freezeMessage,
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
    { name: 'Angostura Bitters', amount: 2, unit: 'dash', abv: 45, isBaseSpirit: false }
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

export const ABV_DEFAULTS: Record<string, number> = {
  // Spirits
  'vodka': 40,
  'gin': 40,
  'bourbon': 45,
  'rye': 45,
  'rye whiskey': 45,
  'whiskey': 40,
  'scotch': 43,
  'rum': 40,
  'white rum': 40,
  'dark rum': 40,
  'tequila': 40,
  'mezcal': 43,
  'brandy': 40,
  'cognac': 40,

  // Liqueurs
  'cointreau': 40,
  'triple sec': 30,
  'grand marnier': 40,
  'campari': 25,
  'aperol': 11,
  'kahlua': 20,
  'amaretto': 28,
  'st germain': 20,
  'maraschino': 32,
  'amaro': 30,
  'amaro nonino': 35,
  'fernet': 39,

  // Fortified
  'sweet vermouth': 16,
  'dry vermouth': 18,

  // Bitters (high ABV but used in dashes)
  'angostura': 45,
  'angostura bitters': 45,
  'bitters': 45,

  // Mixers (0%)
  'lime juice': 0,
  'lemon juice': 0,
  'orange juice': 0,
  'cranberry juice': 0,
  'simple syrup': 0,
  'honey syrup': 0,
  'ginger syrup': 0,
  'olive brine': 0,
  'water': 0,
  'cold brew': 0,
  'cold brew concentrate': 0,
  'espresso': 0
};

export function suggestABV(name: string): number | null {
  const normalized = name.toLowerCase().trim();

  // Direct match
  if (ABV_DEFAULTS[normalized] !== undefined) {
    return ABV_DEFAULTS[normalized];
  }

  // Partial match
  for (const [key, value] of Object.entries(ABV_DEFAULTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}
