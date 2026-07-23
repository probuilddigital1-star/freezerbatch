import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  normalizeShareState,
  parseLegacyShareState,
  parseShareState,
  serializeShareState,
  type ShareStateV1,
} from './shareState';

const preset: ShareStateV1 = {
  v: 1,
  mode: 'preset',
  recipe: 'negroni',
  bottleMl: 750,
  unit: 'oz',
};

const custom: ShareStateV1 = {
  v: 1,
  mode: 'custom',
  bottleMl: 750,
  unit: 'ml',
  dilutionPercent: 20,
  ingredients: [
    { name: 'Ginebra añeja', amount: 60, abv: 40, isBaseSpirit: true },
    { name: 'Vermú rojo', amount: 30, abv: 16, isBaseSpirit: false },
  ],
};

function parsedState(result: ReturnType<typeof parseShareState>): ShareStateV1 {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

describe('share-state serialization and parsing', () => {
  it('round trips a preset state', () => {
    expect(parsedState(parseShareState(serializeShareState(preset)))).toEqual(preset);
  });

  it('round trips a custom state with Unicode ingredient names', () => {
    expect(parsedState(parseShareState(serializeShareState(custom)))).toEqual(custom);
  });

  it.each([
    [undefined, 'missing batch'],
    ['v2.eyJ2IjoyfQ', 'unknown version'],
    ['v1.not-base64!', 'malformed Base64'],
    ['v1.eyJ2Ijox', 'malformed JSON'],
  ])('fails closed for %s (%s)', (value, _label) => {
    expect(parseShareState(value).ok).toBe(false);
  });

  it('rejects a V1 transport whose JSON omits the required state version', () => {
    const withoutVersion = btoa(JSON.stringify({
      mode: 'preset',
      recipe: 'negroni',
      bottleMl: 750,
      unit: 'oz',
    }));
    expect(parseShareState(`v1.${withoutVersion}`).ok).toBe(false);
  });

  it('rejects unknown presets and invalid bottle boundaries', () => {
    expect(normalizeShareState({ ...preset, recipe: 'not-a-cocktail' }).ok).toBe(false);
    for (const bottleMl of [99, 100, 3_000, 3_001]) {
      expect(normalizeShareState({ ...preset, bottleMl }).ok).toBe(bottleMl >= 100 && bottleMl <= 3_000);
    }
  });

  it('enforces dilution, ingredient count, and Unicode name limits', () => {
    for (const dilutionPercent of [-1, 0, 35, 36]) {
      expect(normalizeShareState({ ...custom, dilutionPercent }).ok).toBe(dilutionPercent >= 0 && dilutionPercent <= 35);
    }

    const oneIngredient = [custom.ingredients[0]];
    const eightIngredients = Array.from({ length: 8 }, (_, index) => ({
      name: `Ingredient ${index + 1}`,
      amount: 1,
      abv: index === 0 ? 40 : 0,
      isBaseSpirit: index === 0,
    }));
    const nineIngredients = [...eightIngredients, { name: 'Nine', amount: 1, abv: 0, isBaseSpirit: false }];
    expect(normalizeShareState({ ...custom, ingredients: [] }).ok).toBe(false);
    expect(normalizeShareState({ ...custom, ingredients: oneIngredient }).ok).toBe(true);
    expect(normalizeShareState({ ...custom, ingredients: eightIngredients }).ok).toBe(true);
    expect(normalizeShareState({ ...custom, ingredients: nineIngredients }).ok).toBe(false);

    for (const name of ['', 'x', 'x'.repeat(60), 'x'.repeat(61)]) {
      const state = { ...custom, ingredients: [{ ...custom.ingredients[0], name }] };
      expect(normalizeShareState(state).ok).toBe(name.length >= 1 && name.length <= 60);
    }
  });

  it('rejects non-finite and wrong-type numeric fields', () => {
    for (const amount of [Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      const state = { ...custom, ingredients: [{ ...custom.ingredients[0], amount }] };
      expect(normalizeShareState(state).ok).toBe(false);
    }
    expect(normalizeShareState({ ...preset, bottleMl: '750' }).ok).toBe(false);
  });

  it('requires exactly one base spirit', () => {
    expect(normalizeShareState({ ...custom, ingredients: custom.ingredients.map((ingredient) => ({ ...ingredient, isBaseSpirit: false })) }).ok).toBe(false);
    expect(normalizeShareState({ ...custom, ingredients: custom.ingredients.map((ingredient) => ({ ...ingredient, isBaseSpirit: true })) }).ok).toBe(false);
  });

  it('builds canonical preset and custom URLs and rejects an overlong result', () => {
    const presetUrl = buildShareUrl(preset, 'https://freezerbatchcocktails.com/anything?ignored=true');
    expect(presetUrl).toMatchObject({ ok: true });
    if (presetUrl.ok) expect(presetUrl.url.pathname).toBe('/cocktails/negroni/');

    const customUrl = buildShareUrl(custom, 'https://freezerbatchcocktails.com');
    expect(customUrl).toMatchObject({ ok: true });
    if (customUrl.ok) expect(customUrl.url.hash).toBe('#calculator');

    const longCustom: ShareStateV1 = {
      ...custom,
      ingredients: Array.from({ length: 8 }, (_, index) => ({
        name: '😀'.repeat(60),
        amount: 1,
        abv: index === 0 ? 40 : 0,
        isBaseSpirit: index === 0,
      })),
    };
    expect(buildShareUrl(longCustom, 'https://example.test')).toEqual({ ok: false, reason: 'url_too_long' });
  });
});

describe('legacy share-state parsing', () => {
  it('parses legacy preset and custom links through the V1 validator', () => {
    const presetResult = parseLegacyShareState(new URLSearchParams('recipe=negroni&bottle=750'));
    expect(presetResult).toEqual({ ok: true, state: preset });

    const params = new URLSearchParams({
      bottle: '750',
      ingredients: JSON.stringify([
        { name: '<img src=x onerror=alert(1)>', amount: 2, abv: 40, isBaseSpirit: true, unit: 'oz' },
        { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false, unit: 'oz' },
      ]),
    });
    const result = parseLegacyShareState(params);
    expect(result).toMatchObject({ ok: true });
    if (result.ok && result.state.mode === 'custom') {
      expect(result.state.ingredients[0].name).toBe('<img src=x onerror=alert(1)>');
      expect(result.state.unit).toBe('oz');
    }
  });

  it('rejects hostile or oversized legacy input', () => {
    expect(parseLegacyShareState(new URLSearchParams('recipe=negroni&bottle=5000')).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams(`bottle=750&ingredients=${'x'.repeat(1_801)}`)).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams('bottle=750&ingredients=[]')).ok).toBe(false);
  });

  it('fails closed on invalid, mixed, or conflicting legacy units', () => {
    const ingredientsWithUnits = (units: unknown[]) => JSON.stringify(units.map((unit, index) => ({
      name: index === 0 ? 'Gin' : 'Vermouth',
      amount: index === 0 ? 2 : 1,
      abv: index === 0 ? 40 : 16,
      isBaseSpirit: index === 0,
      unit,
    })));

    expect(parseLegacyShareState(new URLSearchParams({
      bottle: '750',
      ingredients: ingredientsWithUnits(['evil', 'evil']),
    })).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams({
      bottle: '750',
      unit: 'evil',
      ingredients: ingredientsWithUnits(['oz', 'oz']),
    })).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams({
      bottle: '750',
      ingredients: ingredientsWithUnits(['oz', 'ml']),
    })).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams({
      bottle: '750',
      ingredients: JSON.stringify([
        { name: 'Gin', amount: 2, abv: 40, isBaseSpirit: true, unit: 'oz' },
        { name: 'Vermouth', amount: 1, abv: 16, isBaseSpirit: false },
      ]),
    })).ok).toBe(false);
    expect(parseLegacyShareState(new URLSearchParams({
      bottle: '750',
      unit: 'ml',
      ingredients: ingredientsWithUnits(['oz', 'oz']),
    })).ok).toBe(false);
  });
});
