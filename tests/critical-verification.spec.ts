import { expect, test, type Page } from '@playwright/test';

type ShareIngredient = {
  name: string;
  amount: number;
  abv: number;
  isBaseSpirit: boolean;
};

type CustomShareState = {
  v: 1;
  mode: 'custom';
  bottleMl: number;
  unit: 'oz' | 'ml';
  dilutionPercent: number;
  ingredients: ShareIngredient[];
};

type SharedData = {
  url?: string;
};

const scriptPayload = '<script>window.__fbcPwned=1</script>';

function customState(overrides: Partial<CustomShareState> = {}): CustomShareState {
  return {
    v: 1,
    mode: 'custom',
    bottleMl: 750,
    unit: 'oz',
    dilutionPercent: 20,
    ingredients: [
      { name: scriptPayload, amount: 2, abv: 40, isBaseSpirit: true },
      { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false },
    ],
    ...overrides,
  };
}

function encodedState(state: unknown, version = 'v1'): string {
  return `${version}.${Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')}`;
}

async function expectRejectedWithoutPartialHydration(page: Page) {
  await expect(page.getByRole('status')).toContainText("Couldn't load the shared recipe");
  await expect(page.getByRole('button', { name: 'Recipe' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#recipe-select')).toHaveValue('');
  await expect(page.locator('#bottle-size')).toHaveValue('750');
  await expect(page.locator('.unit-btn[data-unit="oz"]')).toHaveAttribute('aria-checked', 'true');

  const names = await page.locator('.ingredient-row [name="name"]').evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );
  expect(names).not.toContain(scriptPayload);
  await expect(page.locator('#composition-bar').getByText(scriptPayload, { exact: true })).toHaveCount(0);
  await expect.poll(
    () => page.evaluate(() => (window as Window & { __fbcPwned?: number }).__fbcPwned),
  ).toBeUndefined();
}

test.describe('A8 adversarial share verification', () => {
  test('treats a script-tag ingredient name as inert text data', async ({ page }) => {
    const batch = encodedState(customState());

    await page.goto(`/?batch=${encodeURIComponent(batch)}#calculator`);

    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.locator('.ingredient-row').first().getByPlaceholder('Ingredient name')).toHaveValue(
      scriptPayload,
    );
    await expect(page.locator('#composition-bar').getByText(scriptPayload, { exact: true })).toBeVisible();
    await expect(page.locator('batch-calculator script')).toHaveCount(0);
    await expect.poll(
      () => page.evaluate(() => (window as Window & { __fbcPwned?: number }).__fbcPwned),
    ).toBeUndefined();
  });

  test('fails closed for every invalid versioned state without partial hydration', async ({ page }) => {
    const nineIngredients = Array.from({ length: 9 }, (_, index) => ({
      name: index === 0 ? scriptPayload : `Ingredient ${index + 1}`,
      amount: 1,
      abv: index === 0 ? 40 : 10,
      isBaseSpirit: index === 0,
    }));
    const valid = customState();
    const completeBatch = encodedState(valid);
    const cases = [
      { name: 'nine ingredients', batch: encodedState(customState({ ingredients: nineIngredients })) },
      { name: '5000ml bottle', batch: encodedState(customState({ bottleMl: 5_000 })) },
      { name: '90 percent dilution', batch: encodedState(customState({ dilutionPercent: 90 })) },
      { name: 'unknown v2 version', batch: encodedState(valid, 'v2') },
      { name: 'truncated Base64URL payload', batch: completeBatch.slice(0, -11) },
    ];

    for (const hostileCase of cases) {
      await test.step(hostileCase.name, async () => {
        await page.goto(`/?batch=${encodeURIComponent(hostileCase.batch)}#calculator`);
        await expectRejectedWithoutPartialHydration(page);
      });
    }

    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByRole('button', { name: /Try a sample/ }).click();
    await expect(page.locator('#final-abv')).not.toHaveText('0');
  });

  test('hydrates exact legacy preset and valid custom links', async ({ page }) => {
    await page.goto('/?recipe=negroni&bottle=750');
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.locator('#recipe-select')).toHaveValue('negroni');
    await expect(page.locator('#bottle-size')).toHaveValue('750');
    await expect(page.locator('.unit-btn[data-unit="oz"]')).toHaveAttribute('aria-checked', 'true');

    const ingredients = JSON.stringify([
      { name: 'Gin', amount: 2, abv: 40, isBaseSpirit: true, unit: 'oz' },
      { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false, unit: 'oz' },
    ]);
    await page.goto(`/?ingredients=${encodeURIComponent(ingredients)}&bottle=800&dilution=20#calculator`);
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await expect(page.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.ingredient-row').first().getByPlaceholder('Ingredient name')).toHaveValue('Gin');
    await expect(page.locator('#bottle-size')).toHaveValue('800');
    await expect(page.locator('#final-abv')).not.toHaveText('0');
  });

  test('rejects hostile legacy ingredients without rendering their payload', async ({ page }) => {
    const ingredients = JSON.stringify(
      Array.from({ length: 9 }, (_, index) => ({
        name: index === 0 ? scriptPayload : `Ingredient ${index + 1}`,
        amount: 1,
        abv: index === 0 ? 40 : 10,
        isBaseSpirit: index === 0,
        unit: 'oz',
      })),
    );

    await page.goto(`/?ingredients=${encodeURIComponent(ingredients)}&bottle=750#calculator`);
    await expectRejectedWithoutPartialHydration(page);
  });

  test('preserves the explicit base-spirit selection in a valid custom share', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: SharedData) => {
          (window as Window & { __lastShare?: SharedData }).__lastShare = data;
        },
      });
    });
    const state = customState({
      ingredients: [
        { name: 'Overproof modifier', amount: 1, abv: 50, isBaseSpirit: false },
        { name: 'Base whiskey', amount: 2, abv: 40, isBaseSpirit: true },
        { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false },
      ],
    });

    await page.goto(`/?batch=${encodeURIComponent(encodedState(state))}#calculator`);
    await expect(page.getByRole('status')).toContainText('Shared recipe loaded');
    await page.locator('#share-btn').click();

    const sharedUrl = await page.evaluate(() => {
      const url = (window as Window & { __lastShare?: SharedData }).__lastShare?.url;
      if (!url) throw new Error('The hydrated recipe did not invoke navigator.share');
      return url;
    });
    const emittedBatch = new URL(sharedUrl).searchParams.get('batch');
    expect(emittedBatch).toMatch(/^v1\./);
    const emittedState = JSON.parse(
      Buffer.from(emittedBatch!.slice(3), 'base64url').toString('utf8'),
    ) as CustomShareState;

    expect(emittedState.ingredients.map(({ isBaseSpirit }) => isBaseSpirit)).toEqual([
      false,
      true,
      false,
    ]);
  });
});
