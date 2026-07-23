import { expect, test, type Page } from '@playwright/test';

type SharedData = {
  title?: string;
  text?: string;
  url?: string;
};

async function captureWebShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: SharedData) => {
        (window as Window & { __lastShare?: SharedData }).__lastShare = data;
      },
    });
  });
}

async function sharedData(page: Page): Promise<SharedData> {
  return page.evaluate(() => {
    const data = (window as Window & { __lastShare?: SharedData }).__lastShare;
    if (!data) throw new Error('The page did not invoke navigator.share');
    return data;
  });
}

function batchValue(state: unknown): string {
  return `v1.${Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')}`;
}

async function fillIngredient(
  page: Page,
  index: number,
  ingredient: { name: string; amount: string; abv: string },
) {
  const row = page.locator('.ingredient-row').nth(index);
  await row.getByPlaceholder('Ingredient name').fill(ingredient.name);
  await row.getByPlaceholder('2').fill(ingredient.amount);
  await row.getByPlaceholder('40').fill(ingredient.abv);
}

test.describe('versioned calculator shares', () => {
  test('keeps the original homepage defaults when no share parameters are present', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#share-state-status')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Recipe' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#recipe-select')).toHaveValue('');
    await expect(page.locator('#bottle-size')).toHaveValue('750');
    await expect(page.locator('.unit-btn[data-unit="oz"]')).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Custom' }).click();
    await expect(page.locator('.ingredient-row')).toHaveCount(2);
  });

  test('shares a homepage Negroni to its canonical page and restores bottle and unit', async ({ page }) => {
    await captureWebShare(page);
    await page.goto('/');

    await page.locator('.recipe-tile[data-recipe="negroni"]').click();
    await page.getByRole('radio', { name: '1L' }).click();
    await page.getByRole('radio', { name: 'ml', exact: true }).click();
    await page.locator('.preset-share-btn').click();

    const share = await sharedData(page);
    const url = new URL(share.url!);
    expect(url.pathname).toBe('/cocktails/negroni/');
    expect(url.searchParams.get('batch')).toMatch(/^v1\./);
    expect(share.title).toBe('Negroni Freezer Batch');
    expect(share.text).toContain('responsibly');

    await page.goto(url.toString());
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.locator('#recipe-select')).toHaveValue('negroni');
    await expect(page.locator('#bottle-size')).toHaveValue('1000');
    await expect(page.locator('.unit-btn[data-unit="ml"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#preset-batch-instructions')).toContainText('Negroni');
  });

  test('shares a non-default bottle from a recipe page and restores it', async ({ page }) => {
    await captureWebShare(page);
    await page.goto('/cocktails/margarita/');

    await page.getByRole('radio', { name: '375ml' }).click();
    await page.locator('.preset-share-btn').click();

    const share = await sharedData(page);
    const url = new URL(share.url!);
    expect(url.pathname).toBe('/cocktails/margarita/');

    await page.goto(url.toString());
    await expect(page.locator('#bottle-size')).toHaveValue('375');
    await expect(page.locator('.bottle-size-btn[data-size="375"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#preset-batch-instructions')).toContainText('375ml batch');
  });

  test('shares and hydrates a custom recipe with the same visible results', async ({ page }) => {
    await captureWebShare(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();

    await fillIngredient(page, 0, { name: 'Rye Whiskey', amount: '2', abv: '45' });
    await fillIngredient(page, 1, { name: 'Sweet Vermouth', amount: '1', abv: '16' });
    await page.locator('#bottle-size').fill('900');
    await page.locator('.unit-btn[data-unit="ml"]').click();
    await page.locator('.dilution-btn[data-dilution="25"]').click();

    const before = await page.locator('#results-panel').evaluate((panel) => ({
      abv: panel.querySelector('#final-abv')?.textContent,
      volume: panel.querySelector('#total-volume')?.textContent,
      servings: panel.querySelector('#servings')?.textContent,
      pourOff: panel.querySelector('#pour-off')?.textContent,
      water: panel.querySelector('#water-add')?.textContent,
    }));

    await page.locator('#share-btn').click();
    const share = await sharedData(page);
    const url = new URL(share.url!);
    expect(url.pathname).toBe('/');
    expect(url.hash).toBe('#calculator');

    await page.goto(url.toString());
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.ingredient-row')).toHaveCount(2);
    await expect(page.locator('.ingredient-row').nth(0).getByPlaceholder('Ingredient name')).toHaveValue('Rye Whiskey');
    await expect(page.locator('#bottle-size')).toHaveValue('900');
    await expect(page.locator('.unit-btn[data-unit="ml"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.dilution-btn[data-dilution="25"]')).toHaveAttribute('aria-checked', 'true');

    const after = await page.locator('#results-panel').evaluate((panel) => ({
      abv: panel.querySelector('#final-abv')?.textContent,
      volume: panel.querySelector('#total-volume')?.textContent,
      servings: panel.querySelector('#servings')?.textContent,
      pourOff: panel.querySelector('#pour-off')?.textContent,
      water: panel.querySelector('#water-add')?.textContent,
    }));
    expect(after).toEqual(before);
  });

  test('renders a malicious shared ingredient name as inert text', async ({ page }) => {
    const payload = '<img src=x onerror="window.__pwned=1">';
    const batch = batchValue({
      v: 1,
      mode: 'custom',
      bottleMl: 750,
      unit: 'oz',
      dilutionPercent: 20,
      ingredients: [
        { name: payload, amount: 2, abv: 40, isBaseSpirit: true },
        { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false },
      ],
    });

    await page.goto(`/?batch=${encodeURIComponent(batch)}#calculator`);
    await expect(page.locator('.ingredient-row').first().getByPlaceholder('Ingredient name')).toHaveValue(payload);
    await expect(page.locator('#composition-bar').getByText(payload, { exact: true })).toBeVisible();
    await expect(page.locator('batch-calculator img')).toHaveCount(0);
    await expect.poll(
      () => page.evaluate(() => (window as Window & { __pwned?: number }).__pwned),
    ).toBeUndefined();
  });

  test('malformed state fails closed and leaves the default calculator usable', async ({ page }) => {
    await page.goto('/?batch=v1.not-valid!!!#calculator');

    await expect(page.getByRole('status')).toHaveText("Couldn't load the shared recipe — showing defaults");
    await expect(page.getByRole('button', { name: 'Recipe' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByRole('button', { name: /Try a sample/ }).click();
    await expect(page.locator('#final-abv')).not.toHaveText('0');
  });

  test('shares the newly selected preset instead of the recipe page preset', async ({ page }) => {
    await captureWebShare(page);
    await page.goto('/cocktails/negroni/');

    await page.locator('.recipe-tile[data-recipe="margarita"]').click();
    await page.locator('.preset-share-btn').click();

    const url = new URL((await sharedData(page)).url!);
    expect(url.pathname).toBe('/cocktails/margarita/');
  });

  test('hydrates both legacy preset and custom links through the validated state path', async ({ page }) => {
    await page.goto('/?recipe=negroni&bottle=750&unit=ml');
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.locator('#recipe-select')).toHaveValue('negroni');
    await expect(page.locator('.unit-btn[data-unit="ml"]')).toHaveAttribute('aria-checked', 'true');

    const ingredients = JSON.stringify([
      { name: 'Gin', amount: 2, abv: 40, isBaseSpirit: true, unit: 'oz' },
      { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false, unit: 'oz' },
    ]);
    await page.goto(`/?ingredients=${encodeURIComponent(ingredients)}&bottle=800&dilution=20#calculator`);
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.ingredient-row').nth(0).getByPlaceholder('Ingredient name')).toHaveValue('Gin');
    await expect(page.locator('#bottle-size')).toHaveValue('800');
    await expect(page.locator('#final-abv')).not.toHaveText('0');
  });

  test('copies the recipe instead of sharing an overlong URL', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: SharedData) => {
          (window as Window & { __lastShare?: SharedData }).__lastShare = data;
        },
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as Window & { __copiedText?: string }).__copiedText = text;
          },
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();

    const addButton = page.getByRole('button', { name: 'Add Ingredient' });
    for (let count = 2; count < 8; count += 1) await addButton.click();
    for (let index = 0; index < 8; index += 1) {
      await fillIngredient(page, index, {
        name: `${index}${'🍸'.repeat(29)}`,
        amount: '1',
        abv: index === 0 ? '40' : '0',
      });
    }

    await page.locator('#share-btn').click();
    await expect(page.locator('.toast')).toHaveText('Share link was too long, so the recipe was copied instead.');
    const captured = await page.evaluate(() => ({
      shared: (window as Window & { __lastShare?: SharedData }).__lastShare,
      copied: (window as Window & { __copiedText?: string }).__copiedText,
    }));
    expect(captured.shared).toBeUndefined();
    expect(captured.copied).toContain('Freezer Batch');
  });
});
