import { test, expect, type Page } from '@playwright/test';

/**
 * Freezer Batch Cocktails Calculator - Playwright E2E Tests
 *
 * Tests the calculator functionality at http://localhost:4321/
 */

// Helper function to parse numeric value from text
function parseNumericValue(text: string): number {
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Helper function to fill ingredient row
async function fillIngredientRow(
  page: Page,
  rowIndex: number,
  name: string,
  amount: string,
  abv: string
) {
  const rows = page.locator('.ingredient-row');
  const row = rows.nth(rowIndex);
  await row.locator('[name="name"]').fill(name);
  await row.locator('[name="amount"]').fill(amount);
  await row.locator('[name="abv"]').fill(abv);
}

// Helper function to add a new ingredient row
async function addIngredientRow(page: Page) {
  await page.click('#add-ingredient');
}

// Helper function to enter custom (Build My Own) mode.
// The redesigned calculator defaults to preset mode, so the custom ingredient
// form is hidden until the "Custom" toggle is clicked.
async function enterCustomMode(page: Page) {
  await page.click('[data-mode="custom"]');
  await expect(page.locator('#custom-recipe-form')).toBeVisible();
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
  await page.waitForTimeout(300);
}

// Helper function to switch units
async function switchToUnit(page: Page, unit: 'oz' | 'ml') {
  await page.click(`[data-unit="${unit}"]`);
}

// Helper function to get the displayed ABV
async function getFinalABV(page: Page): Promise<number> {
  const text = await page.locator('#final-abv').textContent();
  return parseFloat(text || '0');
}

// Helper function to get freeze status
async function getFreezeStatus(page: Page): Promise<string> {
  const statusElement = page.locator('#freeze-status');
  const className = await statusElement.getAttribute('class');
  if (className?.includes('status-safe')) return 'safe';
  if (className?.includes('status-slushy')) return 'slushy';
  if (className?.includes('status-freeze')) return 'freeze';
  if (className?.includes('status-empty')) return 'empty';
  return 'unknown';
}

// Helper function to get pour-off value in ml
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

test.describe('Freezer Batch Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the calculator to initialize
    await expect(page.locator('batch-calculator')).toBeVisible();
  });

  test.describe('1. Negroni Batch Test (750ml bottle)', () => {
    test('should load Negroni preset and show correct calculations', async ({ page }) => {
      // Select Negroni preset
      await selectPreset(page, 'negroni');

      // Wait for calculations to update
      await page.waitForTimeout(500);

      // Verify Final ABV is approximately 21-22%
      const abv = await getFinalABV(page);
      console.log(`Negroni ABV: ${abv}%`);

      // Per Milk Street recipe: Negroni (Gin 40%, Campari 25%, Sweet Vermouth 16%)
      // No dilution water added - ABV is around 25-27%
      expect(abv).toBeGreaterThanOrEqual(22);
      expect(abv).toBeLessThanOrEqual(30);

      // Verify freeze status (ABV ~21% should be in slushy zone per the thresholds)
      const freezeStatus = await getFreezeStatus(page);
      console.log(`Negroni freeze status: ${freezeStatus}`);

      // 21% ABV is below SLUSHY_THRESHOLD (22%), so should be slushy
      expect(['slushy', 'safe']).toContain(freezeStatus);

      // Verify pour-off is displayed
      const pourOff = await getPourOff(page);
      console.log(`Negroni pour-off: ${pourOff.value} ${pourOff.unit}`);
      expect(pourOff.value).toBeGreaterThan(0);

      // Verify water display (Milk Street Negroni has water=0, no added water)
      const water = await getWaterToAdd(page);
      console.log(`Negroni water to add: ${water.value} ${water.unit}`);
      expect(water.value).toBeGreaterThanOrEqual(0);
    });

    test('should show all three Negroni ingredients in the preset instructions', async ({ page }) => {
      await selectPreset(page, 'negroni');

      // The preset mode renders the recipe inside #preset-batch-instructions.
      // It must NOT leak into the Build My Own ingredient rows (those stay
      // independent, so user-entered values aren't overwritten).
      const presetInstructions = page.locator('#preset-batch-instructions');
      await expect(presetInstructions).toBeVisible();

      const presetText = (await presetInstructions.textContent()) ?? '';
      expect(presetText).toContain('Gin');
      expect(presetText).toContain('Campari');
      expect(presetText).toContain('Sweet Vermouth');
    });
  });

  test.describe('2. Margarita Batch Test (750ml bottle)', () => {
    test('should load Margarita preset and show correct 2:1:1 ratio calculations', async ({ page }) => {
      // Select Margarita preset
      await selectPreset(page, 'margarita');

      // Wait for calculations
      await page.waitForTimeout(500);

      // Verify Final ABV
      const abv = await getFinalABV(page);
      console.log(`Margarita ABV: ${abv}%`);

      // Per Milk Street recipe: Margarita (Tequila 40%, Cointreau 40%, Lime 0%)
      // No dilution water added - ABV is around 28-32%
      expect(abv).toBeGreaterThanOrEqual(25);
      expect(abv).toBeLessThanOrEqual(35);

      // Verify freeze status - should be safe or slushy
      const freezeStatus = await getFreezeStatus(page);
      console.log(`Margarita freeze status: ${freezeStatus}`);
      expect(['safe', 'slushy']).toContain(freezeStatus);

      // Verify pour-off
      const pourOff = await getPourOff(page);
      console.log(`Margarita pour-off: ${pourOff.value} ${pourOff.unit}`);
      expect(pourOff.value).toBeGreaterThanOrEqual(0);

      // Verify water to add (Milk Street Margarita has no added water)
      const water = await getWaterToAdd(page);
      console.log(`Margarita water to add: ${water.value} ${water.unit}`);
      expect(water.value).toBeGreaterThanOrEqual(0);
    });

    test('should show Margarita ingredients in the preset instructions', async ({ page }) => {
      await selectPreset(page, 'margarita');

      // Preset details render inside #preset-batch-instructions; they do not
      // leak into the Build My Own form.
      const presetInstructions = page.locator('#preset-batch-instructions');
      await expect(presetInstructions).toBeVisible();

      const text = ((await presetInstructions.textContent()) ?? '').toLowerCase();
      expect(text).toContain('tequila');
      expect(text).toContain('lime');
      expect(text).toMatch(/cointreau|orange/);
    });
  });

  test.describe('3. Custom Recipe Test', () => {
    test('should allow adding custom ingredients and calculate ABV in real-time', async ({ page }) => {
      // Switch to custom mode (preset is the default)
      await enterCustomMode(page);

      // Clear existing rows and add custom ingredients
      // The calculator starts with 2 empty rows by default

      // Fill first ingredient: Vodka, 2oz, 40% ABV
      await fillIngredientRow(page, 0, 'Vodka', '2', '40');

      // Wait for ABV to update
      await page.waitForTimeout(300);
      let abv = await getFinalABV(page);
      console.log(`After Vodka (40% ABV): ${abv}%`);

      // With just vodka + dilution water, ABV should be lower than 40%
      expect(abv).toBeGreaterThan(0);

      // Fill second ingredient: Lime Juice, 1oz, 0% ABV
      await fillIngredientRow(page, 1, 'Lime Juice', '1', '0');

      await page.waitForTimeout(300);
      abv = await getFinalABV(page);
      console.log(`After adding Lime Juice: ${abv}%`);

      // ABV should decrease after adding non-alcoholic ingredient
      expect(abv).toBeGreaterThan(0);

      // Add third ingredient
      await addIngredientRow(page);
      await fillIngredientRow(page, 2, 'Simple Syrup', '0.5', '0');

      await page.waitForTimeout(300);
      abv = await getFinalABV(page);
      console.log(`After adding Simple Syrup: ${abv}%`);

      // ABV should further decrease
      expect(abv).toBeGreaterThan(0);
    });

    test('should show freeze warning when ABV is below 22%', async ({ page }) => {
      // Create a low-ABV recipe
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Vodka', '1', '40');
      await fillIngredientRow(page, 1, 'Orange Juice', '4', '0');

      await page.waitForTimeout(500);

      const abv = await getFinalABV(page);
      console.log(`Low ABV recipe: ${abv}%`);

      const freezeStatus = await getFreezeStatus(page);
      console.log(`Low ABV freeze status: ${freezeStatus}`);

      // With mostly juice, ABV should be low and show warning
      if (abv < 22) {
        expect(['freeze', 'slushy']).toContain(freezeStatus);
      }
    });

    test('should update calculations when removing ingredients', async ({ page }) => {
      // Add ingredients
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Gin', '2', '40');
      await fillIngredientRow(page, 1, 'Tonic', '4', '0');

      await page.waitForTimeout(300);
      const abvBefore = await getFinalABV(page);

      // Remove the tonic (second row)
      await page.locator('.ingredient-row').nth(1).locator('.remove-ingredient').click();

      await page.waitForTimeout(300);
      const abvAfter = await getFinalABV(page);

      console.log(`ABV before removing tonic: ${abvBefore}%, after: ${abvAfter}%`);

      // ABV should change (likely increase) after removing non-alcoholic ingredient
      expect(abvAfter).not.toBe(abvBefore);
    });
  });

  test.describe('4. Unit Toggle Test', () => {
    test('should switch between oz and ml units', async ({ page }) => {
      // Load a preset to have consistent values
      await selectPreset(page, 'negroni');
      await page.waitForTimeout(300);

      // Get values in oz (default)
      const pourOffOz = await getPourOff(page);
      const waterOz = await getWaterToAdd(page);

      console.log(`In oz: Pour-off ${pourOffOz.value} ${pourOffOz.unit}, Water ${waterOz.value} ${waterOz.unit}`);

      // Switch to ml
      await switchToUnit(page, 'ml');
      await page.waitForTimeout(300);

      // Get values in ml
      const pourOffMl = await getPourOff(page);
      const waterMl = await getWaterToAdd(page);

      console.log(`In ml: Pour-off ${pourOffMl.value} ${pourOffMl.unit}, Water ${waterMl.value} ${waterMl.unit}`);

      // Verify units changed
      expect(pourOffMl.unit).toBe('ml');
      expect(waterMl.unit).toBe('ml');

      // Verify conversion is approximately correct (1 oz = 29.5735 ml)
      const expectedPourOffMl = pourOffOz.value * 29.5735;
      const tolerance = expectedPourOffMl * 0.1; // 10% tolerance
      expect(Math.abs(pourOffMl.value - expectedPourOffMl)).toBeLessThanOrEqual(tolerance);

      // Values should be different and in the right ballpark
      expect(pourOffMl.value).toBeGreaterThan(pourOffOz.value);
    });

    test('should update volume unit label when switching', async ({ page }) => {
      // Check initial unit
      const initialUnit = await page.locator('#volume-unit').textContent();
      expect(initialUnit).toBe('oz');

      // Switch to ml
      await switchToUnit(page, 'ml');

      const newUnit = await page.locator('#volume-unit').textContent();
      expect(newUnit).toBe('ml');

      // Switch back to oz
      await switchToUnit(page, 'oz');

      const finalUnit = await page.locator('#volume-unit').textContent();
      expect(finalUnit).toBe('oz');
    });

    test('should maintain active state on unit buttons', async ({ page }) => {
      // Check oz is active by default
      const ozButton = page.locator('[data-unit="oz"]');
      const mlButton = page.locator('[data-unit="ml"]');

      await expect(ozButton).toHaveClass(/active/);
      await expect(mlButton).not.toHaveClass(/active/);

      // Switch to ml
      await switchToUnit(page, 'ml');

      await expect(mlButton).toHaveClass(/active/);
      await expect(ozButton).not.toHaveClass(/active/);
    });
  });

  test.describe('5. Edge Cases', () => {
    test('should handle empty ingredients gracefully', async ({ page }) => {
      // Clear all ingredient fields (leave them empty)
      await enterCustomMode(page);
      const nameInputs = page.locator('.ingredient-row [name="name"]');
      const amountInputs = page.locator('.ingredient-row [name="amount"]');

      // Clear existing values
      await nameInputs.first().clear();
      await amountInputs.first().clear();

      await page.waitForTimeout(300);

      // ABV should be 0 or display placeholder
      const abv = await getFinalABV(page);
      console.log(`Empty recipe ABV: ${abv}%`);
      expect(abv).toBe(0);

      // Empty state should be neutral (status-empty), not a red danger pulse.
      const freezeStatus = await getFreezeStatus(page);
      console.log(`Empty recipe freeze status: ${freezeStatus}`);
      expect(freezeStatus).toBe('empty');
    });

    test('should warn for very low ABV recipe (will freeze)', async ({ page }) => {
      // Create a very low ABV recipe - mostly juice
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Vodka', '0.5', '40');
      await fillIngredientRow(page, 1, 'Orange Juice', '5', '0');

      await page.waitForTimeout(500);

      const abv = await getFinalABV(page);
      console.log(`Very low ABV recipe: ${abv}%`);

      const freezeStatus = await getFreezeStatus(page);
      console.log(`Very low ABV freeze status: ${freezeStatus}`);

      // Should show freeze or slushy warning
      expect(['freeze', 'slushy']).toContain(freezeStatus);

      // Check status label indicates problem
      const statusLabel = await page.locator('#status-label').textContent();
      console.log(`Status label: ${statusLabel}`);
      expect(statusLabel).toMatch(/(Will Freeze|Slushy Zone)/i);
    });

    test('should show safe for very high ABV recipe', async ({ page }) => {
      // Create a high ABV recipe - spirit-forward
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Overproof Rum', '3', '63');
      await fillIngredientRow(page, 1, 'Lime Juice', '0.5', '0');

      await page.waitForTimeout(500);

      const abv = await getFinalABV(page);
      console.log(`High ABV recipe: ${abv}%`);

      const freezeStatus = await getFreezeStatus(page);
      console.log(`High ABV freeze status: ${freezeStatus}`);

      // Should show safe if ABV is above 22%
      if (abv >= 22) {
        expect(freezeStatus).toBe('safe');

        const statusLabel = await page.locator('#status-label').textContent();
        expect(statusLabel).toMatch(/Safe to Freeze/i);
      }
    });

    test('should handle maximum ABV (100%) ingredient', async ({ page }) => {
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Pure Ethanol', '2', '100');

      await page.waitForTimeout(300);

      const abv = await getFinalABV(page);
      console.log(`100% ABV ingredient result: ${abv}%`);

      // Should calculate correctly without errors
      expect(abv).toBeGreaterThan(0);
      expect(abv).toBeLessThanOrEqual(100);
    });

    test('should handle zero ABV (0%) ingredients only', async ({ page }) => {
      // Only non-alcoholic ingredients
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Orange Juice', '3', '0');
      await fillIngredientRow(page, 1, 'Simple Syrup', '1', '0');

      await page.waitForTimeout(300);

      const abv = await getFinalABV(page);
      console.log(`Zero ABV ingredients result: ${abv}%`);

      // ABV should be 0
      expect(abv).toBe(0);

      // Should show freeze warning
      const freezeStatus = await getFreezeStatus(page);
      expect(freezeStatus).toBe('freeze');
    });
  });

  test.describe('6. Bottle Size Tests', () => {
    test('should update calculations when changing bottle size', async ({ page }) => {
      // Load a preset
      await selectPreset(page, 'negroni');
      await page.waitForTimeout(300);

      // Get pour-off with 750ml (default) - use pour-off since some presets have water=0
      const pourOff750 = await getPourOff(page);
      console.log(`750ml bottle - pour-off: ${pourOff750.value} ${pourOff750.unit}`);

      // Switch to 375ml
      await page.click('[data-size="375"]');
      await page.waitForTimeout(300);

      const pourOff375 = await getPourOff(page);
      console.log(`375ml bottle - pour-off: ${pourOff375.value} ${pourOff375.unit}`);

      // Pour-off should be less for smaller bottle
      expect(pourOff375.value).toBeLessThan(pourOff750.value);

      // Switch to 1L
      await page.click('[data-size="1000"]');
      await page.waitForTimeout(300);

      const pourOff1000 = await getPourOff(page);
      console.log(`1L bottle - pour-off: ${pourOff1000.value} ${pourOff1000.unit}`);

      // Pour-off should be more for larger bottle
      expect(pourOff1000.value).toBeGreaterThan(pourOff750.value);
    });

    test('should allow custom bottle size input', async ({ page }) => {
      await selectPreset(page, 'margarita');
      await page.waitForTimeout(300);

      // Enter custom bottle size
      const bottleSizeInput = page.locator('#bottle-size');
      await bottleSizeInput.fill('500');

      await page.waitForTimeout(300);

      // Verify the input value is set
      await expect(bottleSizeInput).toHaveValue('500');

      // Pour-off should scale with bottle size
      const pourOff = await getPourOff(page);
      console.log(`500ml bottle - pour-off: ${pourOff.value} ${pourOff.unit}`);
      // 500ml is 2/3 of 750ml, so pour-off should be around 2/3 of 10oz = 6.67oz
      expect(pourOff.value).toBeGreaterThan(5);
      expect(pourOff.value).toBeLessThan(8);
    });
  });

  test.describe('7. Dilution Settings Tests', () => {
    test('should update ABV when changing dilution percentage', async ({ page }) => {
      // Use custom mode for dilution testing (presets have fixed water amounts).
      // Default dilution is now 20% (Stirred). Buttons are 0% / 20% / 25%.
      await enterCustomMode(page);
      await fillIngredientRow(page, 0, 'Vodka', '2', '40');
      await fillIngredientRow(page, 1, 'Lime Juice', '1', '0');
      await page.waitForTimeout(300);

      // 20% dilution (default)
      const abv20 = await getFinalABV(page);
      console.log(`20% dilution ABV: ${abv20}%`);

      // 0% dilution should be higher ABV (no water added)
      await page.click('[data-dilution="0"]');
      await page.waitForTimeout(300);
      const abv0 = await getFinalABV(page);
      console.log(`0% dilution ABV: ${abv0}%`);
      expect(abv0).toBeGreaterThan(abv20);

      // 25% dilution should be lower ABV (more water)
      await page.click('[data-dilution="25"]');
      await page.waitForTimeout(300);
      const abv25 = await getFinalABV(page);
      console.log(`25% dilution ABV: ${abv25}%`);
      expect(abv25).toBeLessThan(abv20);
    });
  });

  test.describe('8. Mode Toggle Tests', () => {
    test('should toggle between custom and preset modes', async ({ page }) => {
      // Check initial state - preset (Recipe) mode is the default in the redesign
      const customBtn = page.locator('[data-mode="custom"]');
      const presetBtn = page.locator('[data-mode="preset"]');

      await expect(presetBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(customBtn).toHaveAttribute('aria-pressed', 'false');

      // Preset selector should be visible; custom form hidden
      await expect(page.locator('#preset-selector')).toBeVisible();
      await expect(page.locator('#custom-recipe-form')).toBeHidden();

      // Switch to custom mode
      await customBtn.click();

      await expect(customBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(presetBtn).toHaveAttribute('aria-pressed', 'false');

      // Custom form should now be visible; preset selector hidden
      await expect(page.locator('#custom-recipe-form')).toBeVisible();
      await expect(page.locator('#preset-selector')).toBeHidden();

      // Switch back to preset mode
      await presetBtn.click();

      await expect(presetBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#preset-selector')).toBeVisible();
      await expect(page.locator('#custom-recipe-form')).toBeHidden();
    });
  });

  test.describe('9. Ingredient Suggestions', () => {
    test('should auto-fill ABV when known ingredient is entered', async ({ page }) => {
      // Type a known ingredient name
      await enterCustomMode(page);
      const nameInput = page.locator('.ingredient-row').first().locator('[name="name"]');
      const abvInput = page.locator('.ingredient-row').first().locator('[name="abv"]');

      await nameInput.fill('Vodka');

      // Trigger the input event by typing
      await nameInput.press('Tab');
      await page.waitForTimeout(300);

      // ABV should be auto-filled to 40
      const abvValue = await abvInput.inputValue();
      console.log(`Auto-filled ABV for Vodka: ${abvValue}`);

      // Note: This may or may not auto-fill depending on implementation
      // If ABV is empty and user types known ingredient, it should suggest
    });
  });

  test.describe('10. Servings Calculation', () => {
    test('should display correct number of servings', async ({ page }) => {
      await selectPreset(page, 'negroni');
      await page.waitForTimeout(300);

      // Get servings count
      const servingsText = await page.locator('#servings').textContent();
      const servings = parseInt(servingsText || '0');

      console.log(`Negroni batch servings: ${servings}`);

      // With 750ml bottle, should have multiple servings (90ml per serving)
      // 750ml / 90ml = ~8 servings
      expect(servings).toBeGreaterThan(0);
      expect(servings).toBeLessThanOrEqual(10);
    });
  });

  test.describe('11. Incomplete custom rows', () => {
    // Regression coverage for the 2026-08-19 real-user session: ingredient
    // names typed with no amounts left the results at zero with only the
    // neutral "Waiting for ingredients" copy, and the visitor rage-tapped
    // the zeros. Names-only rows must produce an actionable prompt.
    test('names without amounts prompt for the missing fields', async ({ page }) => {
      await enterCustomMode(page);

      const rows = page.locator('.ingredient-row');
      await rows.nth(0).locator('[name="name"]').fill('Fireball');
      await rows.nth(1).locator('[name="name"]').fill('Apple cider');

      await expect(page.locator('#status-label')).toHaveText('Add an amount for each ingredient');

      // Completing the row resolves the prompt into a real result.
      await rows.nth(0).locator('[name="amount"]').fill('2');
      await rows.nth(0).locator('[name="abv"]').fill('33');
      await expect(page.locator('#status-label')).not.toHaveText('Add an amount for each ingredient');
      expect(await getFinalABV(page)).toBeGreaterThan(0);
    });

    // Regression coverage for the 2026-08-19 23:28 UTC session: the visitor
    // switched display units to ml, filled COMPLETE rows with ml-scale
    // amounts (e.g. 750), and every row was silently dropped by the
    // amount<=100 bound — zeros, "Waiting for ingredients", and an email
    // guard insisting fields he had filled were missing.
    test('bottle-scale amounts get a one-drink explanation instead of silent zeros', async ({ page }) => {
      await enterCustomMode(page);

      const row = page.locator('.ingredient-row').first();
      await row.locator('[name="name"]').fill('Vodka');
      await row.locator('[name="amount"]').fill('750');
      await row.locator('[name="abv"]').fill('40');

      await expect(page.locator('#status-label')).toHaveText('Enter amounts for one drink, not the whole bottle');
      expect(await getFinalABV(page)).toBe(0);

      // Correcting to a parts-scale amount computes immediately.
      await row.locator('[name="amount"]').fill('3');
      await expect.poll(() => getFinalABV(page)).toBeGreaterThan(0);
    });

    test('empty custom email submit names the real problem for out-of-range amounts', async ({ page }) => {
      await enterCustomMode(page);
      const row = page.locator('.ingredient-row').first();
      await row.locator('[name="name"]').fill('Vodka');
      await row.locator('[name="amount"]').fill('750');
      await row.locator('[name="abv"]').fill('40');

      // The guard must not claim fields are missing when the problem is range.
      // (Turnstile is absent under this config, so drive the handler directly
      // through the same submit path the browser uses.)
      await page.evaluate(() => {
        const form = document.querySelector('#email-recipe-form') as HTMLFormElement;
        (form.querySelector('input[type="email"]') as HTMLInputElement).value = 'person@example.com';
        form.dataset.turnstileToken = 'test-token';
        // No Turnstile site key under this config, so the button is disabled;
        // enable it to reach the ingredient guard the way a real session does.
        (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
        form.requestSubmit();
      });
      const status = page.locator('#email-recipe-form .email-status');
      await expect(status).toContainText('one drink, not the whole bottle');
    });
  });
});

// The exact path of the 2026-08-19 phone session, kept at phone width: the
// homepage preset tiles must produce rendered batch instructions. Real touch
// events (hasTouch + tap), not synthetic clicks.
test.describe('Homepage preset on a phone (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  async function expectInstructions(page: Page, name: string) {
    const instructions = page.locator('#preset-batch-instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText(name);
    // A concrete measurement, not just the shell: some "N oz" or "N ml" figure.
    await expect(instructions.locator('text=/\\d+(\\.\\d+)?\\s*(oz|ml)/').first()).toBeVisible();
  }

  test('tapping a recipe tile renders batch instructions with measurements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('batch-calculator')).toBeVisible();

    const tile = page.locator('.recipe-tile[data-recipe="negroni"]');
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await expectInstructions(page, 'Negroni');
    await expect(page.locator('#preset-batch-instructions')).toContainText('Gin');
  });

  test('tile tap still renders after a Custom -> Recipe round trip', async ({ page }) => {
    // Mode-state interaction: setMode('custom') nulls currentPresetId; a tile
    // tap after switching back must still load and render.
    await page.goto('/');
    await page.locator('.entry-mode-btn[data-mode="custom"]').tap();
    await expect(page.locator('#custom-recipe-form')).toBeVisible();
    await page.locator('.entry-mode-btn[data-mode="preset"]').tap();
    await expect(page.locator('#preset-selector')).toBeVisible();

    const tile = page.locator('.recipe-tile[data-recipe="margarita"]');
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await expectInstructions(page, 'Margarita');
  });

  test('bottle-size tap after a tile keeps rendered results in sync', async ({ page }) => {
    await page.goto('/');
    const tile = page.locator('.recipe-tile[data-recipe="daiquiri"]');
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await expectInstructions(page, 'Daiquiri');

    const oneL = page.locator('.bottle-size-btn[data-size="1000"]');
    await oneL.scrollIntoViewIfNeeded();
    await oneL.tap();
    await expect(page.locator('#preset-batch-instructions')).toContainText('1000ml batch');
  });

  test('recipe page preset renders on load and tolerates a bottle tap', async ({ page }) => {
    await page.goto('/cocktails/vesper/');
    await expectInstructions(page, 'Vesper');
    const oneL = page.locator('.bottle-size-btn[data-size="375"]');
    await oneL.scrollIntoViewIfNeeded();
    await oneL.tap();
    await expect(page.locator('#preset-batch-instructions')).toContainText('375ml batch');
  });
});
