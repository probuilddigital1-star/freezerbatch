import { test, expect, type Page } from '@playwright/test';

/**
 * Margarita Milk Street Recipe Verification Tests
 *
 * Per Milk Street article, expected values for 750ml bottle:
 * - Pour off from bottle: 10 oz (exactly)
 * - Fresh Lime Juice: 5 oz
 * - Orange Liqueur (Cointreau): 4 oz
 * - Agave Syrup: 1.5 oz
 * - Water to add: 0 oz (no water)
 * - Final ABV should be around 28-30%
 */

// Helper function to parse numeric value from text
function parseNumericValue(text: string): number {
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Helper function to select preset recipe
async function selectPreset(page: Page, presetValue: string) {
  // Click "Start with Recipe" mode button
  await page.click('[data-mode="preset"]');

  // Wait for preset selector to be visible
  await expect(page.locator('#preset-selector')).toBeVisible();

  // Select the preset
  await page.selectOption('#recipe-select', presetValue);

  // Wait for recalculation
  await page.waitForTimeout(500);
}

// Helper function to get the displayed ABV
async function getFinalABV(page: Page): Promise<number> {
  const text = await page.locator('#final-abv').textContent();
  return parseFloat(text || '0');
}

// Helper function to get pour-off value
async function getPourOff(page: Page): Promise<{ value: number; unit: string }> {
  const text = await page.locator('#pour-off').textContent();
  const value = parseNumericValue(text || '0');
  const unit = text?.includes('ml') ? 'ml' : 'oz';
  return { value, unit };
}

// Helper function to get water to add
async function getWaterToAdd(page: Page): Promise<{ value: number; unit: string }> {
  const text = await page.locator('#water-add').textContent();
  const value = parseNumericValue(text || '0');
  const unit = text?.includes('ml') ? 'ml' : 'oz';
  return { value, unit };
}

// Helper function to get all ingredient outputs
async function getIngredientsOutput(page: Page): Promise<Array<{ name: string; value: number; unit: string }>> {
  const items = await page.locator('#ingredients-output > div').all();
  const ingredients: Array<{ name: string; value: number; unit: string }> = [];

  for (const item of items) {
    const nameText = await item.locator('.text-gray-600').textContent();
    const valueText = await item.locator('.font-mono').textContent();

    if (nameText && valueText) {
      ingredients.push({
        name: nameText.trim(),
        value: parseNumericValue(valueText),
        unit: valueText.includes('ml') ? 'ml' : 'oz'
      });
    }
  }

  return ingredients;
}

test.describe('Margarita Milk Street Recipe Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the margarita page directly
    await page.goto('/cocktails/margarita');
    // Wait for the calculator to initialize
    await expect(page.locator('batch-calculator')).toBeVisible();
  });

  test.describe('750ml Bottle - Milk Street Expected Values', () => {
    test('should have 750ml selected by default', async ({ page }) => {
      // Check that 750ml button is active
      const button750 = page.locator('[data-size="750"]');
      await expect(button750).toHaveClass(/active/);

      // Check the input value
      const bottleInput = page.locator('#bottle-size');
      await expect(bottleInput).toHaveValue('750');
    });

    test('should show pour-off of exactly 10 oz for 750ml', async ({ page }) => {
      // Select margarita preset
      await selectPreset(page, 'margarita');

      const pourOff = await getPourOff(page);
      console.log(`Pour off: ${pourOff.value} ${pourOff.unit}`);

      // Expected: 10 oz
      expect(pourOff.value).toBeCloseTo(10, 1);
      expect(pourOff.unit).toBe('oz');
    });

    test('should show correct ingredient amounts for 750ml', async ({ page }) => {
      await selectPreset(page, 'margarita');

      const ingredients = await getIngredientsOutput(page);
      console.log('Ingredients to add:', JSON.stringify(ingredients, null, 2));

      // Expected ingredients (from Milk Street):
      // - Fresh Lime Juice: 5 oz
      // - Orange Liqueur (Cointreau): 4 oz
      // - Agave Syrup: 1.5 oz

      // Find each ingredient and check values
      const limeJuice = ingredients.find(i => i.name.toLowerCase().includes('lime'));
      const orangeLiqueur = ingredients.find(i =>
        i.name.toLowerCase().includes('orange') ||
        i.name.toLowerCase().includes('cointreau')
      );
      const agave = ingredients.find(i => i.name.toLowerCase().includes('agave'));

      // Verify lime juice: 5 oz
      expect(limeJuice).toBeDefined();
      if (limeJuice) {
        console.log(`Fresh Lime Juice: ${limeJuice.value} ${limeJuice.unit} (expected: 5 oz)`);
        expect(limeJuice.value).toBeCloseTo(5, 1);
      }

      // Verify orange liqueur: 4 oz
      expect(orangeLiqueur).toBeDefined();
      if (orangeLiqueur) {
        console.log(`Orange Liqueur: ${orangeLiqueur.value} ${orangeLiqueur.unit} (expected: 4 oz)`);
        expect(orangeLiqueur.value).toBeCloseTo(4, 1);
      }

      // Verify agave syrup: 1.5 oz
      expect(agave).toBeDefined();
      if (agave) {
        console.log(`Agave Syrup: ${agave.value} ${agave.unit} (expected: 1.5 oz)`);
        expect(agave.value).toBeCloseTo(1.5, 1);
      }
    });

    test('should show 0 oz water to add for 750ml', async ({ page }) => {
      await selectPreset(page, 'margarita');

      const water = await getWaterToAdd(page);
      console.log(`Water to add: ${water.value} ${water.unit}`);

      // Expected: 0 oz (no water)
      expect(water.value).toBe(0);
    });

    test('should show final ABV around 28-30%', async ({ page }) => {
      await selectPreset(page, 'margarita');

      const abv = await getFinalABV(page);
      console.log(`Final ABV: ${abv}%`);

      // Expected: ~28-30% ABV
      expect(abv).toBeGreaterThanOrEqual(26);
      expect(abv).toBeLessThanOrEqual(32);
    });

    test('should show safe freeze status', async ({ page }) => {
      await selectPreset(page, 'margarita');

      const statusEl = page.locator('#freeze-status');
      const className = await statusEl.getAttribute('class');

      console.log(`Freeze status class: ${className}`);

      // With 28-30% ABV, should be "safe" (above 22% threshold)
      expect(className).toContain('status-safe');

      const statusLabel = await page.locator('#status-label').textContent();
      expect(statusLabel).toMatch(/Safe to Freeze/i);
    });
  });

  test.describe('375ml Bottle - Half Amounts', () => {
    test('should halve all amounts for 375ml bottle', async ({ page }) => {
      // First select the preset
      await selectPreset(page, 'margarita');

      // Then change to 375ml
      await page.click('[data-size="375"]');
      await page.waitForTimeout(500);

      // Pour off should be 5 oz (half of 10)
      const pourOff = await getPourOff(page);
      console.log(`Pour off (375ml): ${pourOff.value} ${pourOff.unit}`);
      expect(pourOff.value).toBeCloseTo(5, 1);

      // Get ingredients
      const ingredients = await getIngredientsOutput(page);
      console.log('Ingredients (375ml):', JSON.stringify(ingredients, null, 2));

      // Lime juice should be 2.5 oz (half of 5)
      const limeJuice = ingredients.find(i => i.name.toLowerCase().includes('lime'));
      if (limeJuice) {
        console.log(`Fresh Lime Juice (375ml): ${limeJuice.value} ${limeJuice.unit} (expected: 2.5 oz)`);
        expect(limeJuice.value).toBeCloseTo(2.5, 1);
      }

      // Orange liqueur should be 2 oz (half of 4)
      const orangeLiqueur = ingredients.find(i =>
        i.name.toLowerCase().includes('orange') ||
        i.name.toLowerCase().includes('cointreau')
      );
      if (orangeLiqueur) {
        console.log(`Orange Liqueur (375ml): ${orangeLiqueur.value} ${orangeLiqueur.unit} (expected: 2 oz)`);
        expect(orangeLiqueur.value).toBeCloseTo(2, 1);
      }

      // Agave should be 0.75 oz (half of 1.5)
      const agave = ingredients.find(i => i.name.toLowerCase().includes('agave'));
      if (agave) {
        console.log(`Agave Syrup (375ml): ${agave.value} ${agave.unit} (expected: 0.75 oz)`);
        expect(agave.value).toBeCloseTo(0.75, 1);
      }

      // Water should still be 0
      const water = await getWaterToAdd(page);
      expect(water.value).toBe(0);

      // ABV should remain the same (ratios are preserved)
      const abv = await getFinalABV(page);
      console.log(`ABV (375ml): ${abv}%`);
      expect(abv).toBeGreaterThanOrEqual(26);
      expect(abv).toBeLessThanOrEqual(32);
    });
  });

  test.describe('1L Bottle - Scaled Up Amounts', () => {
    test('should scale amounts proportionally for 1L bottle', async ({ page }) => {
      // First select the preset
      await selectPreset(page, 'margarita');

      // Then change to 1L (1000ml)
      await page.click('[data-size="1000"]');
      await page.waitForTimeout(500);

      // Scale factor: 1000/750 = 1.333...
      const scaleFactor = 1000 / 750;

      // Pour off should be ~13.33 oz (10 * 1.333), with rounding to quarter-ounce
      const pourOff = await getPourOff(page);
      console.log(`Pour off (1L): ${pourOff.value} ${pourOff.unit}`);
      // Use precision 0 (allows 0.5 deviation) to account for quarter-ounce rounding
      expect(pourOff.value).toBeCloseTo(10 * scaleFactor, 0);

      // Get ingredients
      const ingredients = await getIngredientsOutput(page);
      console.log('Ingredients (1L):', JSON.stringify(ingredients, null, 2));

      // Lime juice should be ~6.67 oz (5 * 1.333), with quarter-ounce rounding
      const limeJuice = ingredients.find(i => i.name.toLowerCase().includes('lime'));
      if (limeJuice) {
        console.log(`Fresh Lime Juice (1L): ${limeJuice.value} ${limeJuice.unit} (expected: ${5 * scaleFactor} oz)`);
        // Use precision 0 to account for quarter-ounce rounding
        expect(limeJuice.value).toBeCloseTo(5 * scaleFactor, 0);
      }

      // Orange liqueur should be ~5.33 oz (4 * 1.333)
      const orangeLiqueur = ingredients.find(i =>
        i.name.toLowerCase().includes('orange') ||
        i.name.toLowerCase().includes('cointreau')
      );
      if (orangeLiqueur) {
        console.log(`Orange Liqueur (1L): ${orangeLiqueur.value} ${orangeLiqueur.unit} (expected: ${4 * scaleFactor} oz)`);
        expect(orangeLiqueur.value).toBeCloseTo(4 * scaleFactor, 0);
      }

      // Agave should be ~2 oz (1.5 * 1.333)
      const agave = ingredients.find(i => i.name.toLowerCase().includes('agave'));
      if (agave) {
        console.log(`Agave Syrup (1L): ${agave.value} ${agave.unit} (expected: ${1.5 * scaleFactor} oz)`);
        expect(agave.value).toBeCloseTo(1.5 * scaleFactor, 0);
      }

      // Water should still be 0
      const water = await getWaterToAdd(page);
      expect(water.value).toBe(0);

      // ABV should remain the same (ratios are preserved)
      const abv = await getFinalABV(page);
      console.log(`ABV (1L): ${abv}%`);
      expect(abv).toBeGreaterThanOrEqual(26);
      expect(abv).toBeLessThanOrEqual(32);
    });
  });

  test.describe('Complete Summary Test', () => {
    test('should verify all Milk Street values for Margarita', async ({ page }) => {
      await selectPreset(page, 'margarita');

      console.log('\n=== MARGARITA MILK STREET VERIFICATION ===\n');

      // Collect all values
      const pourOff = await getPourOff(page);
      const water = await getWaterToAdd(page);
      const abv = await getFinalABV(page);
      const ingredients = await getIngredientsOutput(page);

      console.log('EXPECTED VALUES (Milk Street for 750ml):');
      console.log('- Pour off: 10 oz');
      console.log('- Fresh Lime Juice: 5 oz');
      console.log('- Orange Liqueur (Cointreau): 4 oz');
      console.log('- Agave Syrup: 1.5 oz');
      console.log('- Water: 0 oz');
      console.log('- Final ABV: ~28-30%');
      console.log('');

      console.log('ACTUAL VALUES:');
      console.log(`- Pour off: ${pourOff.value} ${pourOff.unit}`);

      const limeJuice = ingredients.find(i => i.name.toLowerCase().includes('lime'));
      const orangeLiqueur = ingredients.find(i =>
        i.name.toLowerCase().includes('orange') ||
        i.name.toLowerCase().includes('cointreau')
      );
      const agave = ingredients.find(i => i.name.toLowerCase().includes('agave'));

      if (limeJuice) console.log(`- Fresh Lime Juice: ${limeJuice.value} ${limeJuice.unit}`);
      if (orangeLiqueur) console.log(`- Orange Liqueur: ${orangeLiqueur.value} ${orangeLiqueur.unit}`);
      if (agave) console.log(`- Agave Syrup: ${agave.value} ${agave.unit}`);
      console.log(`- Water: ${water.value} ${water.unit}`);
      console.log(`- Final ABV: ${abv}%`);
      console.log('');

      // Calculate discrepancies
      console.log('DISCREPANCIES:');

      const pourOffDiff = Math.abs(pourOff.value - 10);
      console.log(`- Pour off: ${pourOffDiff > 0.1 ? 'FAIL' : 'PASS'} (diff: ${pourOffDiff.toFixed(2)} oz)`);

      if (limeJuice) {
        const limeDiff = Math.abs(limeJuice.value - 5);
        console.log(`- Lime Juice: ${limeDiff > 0.1 ? 'FAIL' : 'PASS'} (diff: ${limeDiff.toFixed(2)} oz)`);
      }

      if (orangeLiqueur) {
        const orangeDiff = Math.abs(orangeLiqueur.value - 4);
        console.log(`- Orange Liqueur: ${orangeDiff > 0.1 ? 'FAIL' : 'PASS'} (diff: ${orangeDiff.toFixed(2)} oz)`);
      }

      if (agave) {
        const agaveDiff = Math.abs(agave.value - 1.5);
        console.log(`- Agave: ${agaveDiff > 0.1 ? 'FAIL' : 'PASS'} (diff: ${agaveDiff.toFixed(2)} oz)`);
      }

      console.log(`- Water: ${water.value === 0 ? 'PASS' : 'FAIL'}`);
      console.log(`- ABV: ${abv >= 26 && abv <= 32 ? 'PASS' : 'FAIL'} (${abv}%)`);

      console.log('\n=========================================\n');

      // Final assertions
      expect(pourOff.value).toBeCloseTo(10, 1);
      expect(water.value).toBe(0);
      expect(abv).toBeGreaterThanOrEqual(26);
      expect(abv).toBeLessThanOrEqual(32);
    });
  });
});
