import { describe, expect, it } from 'vitest';
import { normalizeEmailPayload } from './emailPayload';

const requestId = '123e4567-e89b-42d3-a456-426614174000';

function subscribePayload(overrides: Record<string, unknown> = {}) {
  return {
    action: 'subscribe',
    requestId,
    email: 'person@example.com',
    consentVersion: '2026-07',
    page: '/newsletter',
    turnstileToken: 'verified-token',
    website: '',
    ...overrides,
  };
}

function customRecipe(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'custom',
    bottleMl: 750,
    unit: 'ml',
    dilutionPercent: 20,
    ingredients: [
      { name: 'Gin', amount: 60, abv: 40, isBaseSpirit: true },
      { name: 'Vermouth', amount: 30, abv: 16, isBaseSpirit: false },
    ],
    display: {
      name: 'Freezer Martini',
      abv: '31.2%',
      servings: '8',
      pourOff: '420 ml',
      waterToAdd: '150 ml',
      ingredients: [{ name: 'Vermouth', amount: '180 ml' }],
    },
    ...overrides,
  };
}

function sendRecipePayload(recipe: unknown, overrides: Record<string, unknown> = {}) {
  return {
    action: 'send_recipe',
    requestId,
    email: 'person@example.com',
    recipe,
    marketingConsent: false,
    page: '/calculator',
    turnstileToken: 'verified-token',
    website: '',
    ...overrides,
  };
}

describe('normalizeEmailPayload action handling', () => {
  it('discriminates and normalizes all three actions', () => {
    const sendRecipe = normalizeEmailPayload(
      sendRecipePayload({
        mode: 'preset',
        slug: 'negroni',
        bottleMl: 750,
        unit: 'oz',
      }),
    );
    const subscribe = normalizeEmailPayload(subscribePayload());
    const unsubscribe = normalizeEmailPayload({
      action: 'unsubscribe',
      requestId,
      email: 'person@example.com',
      page: '/unsubscribe',
      turnstileToken: 'verified-token',
    });

    expect(sendRecipe.ok && sendRecipe.value.action).toBe('send_recipe');
    expect(subscribe.ok && subscribe.value.action).toBe('subscribe');
    expect(unsubscribe.ok && unsubscribe.value.action).toBe('unsubscribe');
  });

  it('rejects unknown actions', () => {
    expect(normalizeEmailPayload(subscribePayload({ action: 'welcome' })).ok).toBe(false);
  });

  it('strips unknown and boundary-only fields before forwarding', () => {
    const result = normalizeEmailPayload(
      sendRecipePayload(
        {
          mode: 'preset',
          slug: 'negroni',
          bottleMl: 750,
          unit: 'ml',
          injected: 'drop me',
          display: {
            name: 'Negroni',
            abv: '28%',
            injected: 'drop me too',
          },
        },
        { unexpected: 'drop me', website: '', turnstileToken: 'consume at boundary' },
      ),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        action: 'send_recipe',
        requestId,
        email: 'person@example.com',
        recipe: {
          mode: 'preset',
          slug: 'negroni',
          bottleMl: 750,
          unit: 'ml',
          display: { name: 'Negroni', abv: '28%' },
        },
        marketingConsent: false,
        page: '/calculator',
      },
    });
  });
});
describe('normalizeEmailPayload common fields', () => {
  it('trims and lowercases email addresses', () => {
    const result = normalizeEmailPayload(
      subscribePayload({ email: '  Person.Name+Batch@Example.COM  ' }),
    );
    expect(result.ok && result.value.email).toBe('person.name+batch@example.com');
  });

  it('accepts a structurally valid 254-character email and rejects 255 characters', () => {
    const local = 'a'.repeat(64);
    const domain254 = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
    const valid = `${local}@${domain254}`;
    expect(valid).toHaveLength(254);
    expect(normalizeEmailPayload(subscribePayload({ email: valid })).ok).toBe(true);
    expect(
      normalizeEmailPayload(subscribePayload({ email: `${local}x@${domain254}` })).ok,
    ).toBe(false);
  });

  it.each([
    'not-an-email',
    'a@localhost',
    '.leading@example.com',
    'double..dot@example.com',
    'person@-example.com',
  ])('rejects structurally invalid email %s', (email) => {
    expect(normalizeEmailPayload(subscribePayload({ email })).ok).toBe(false);
  });

  it.each([
    '',
    '123e4567-e89b-12d3-a456-42661417400z',
    '123e4567e89b42d3a456426614174000',
  ])('rejects invalid UUID %s', (invalidRequestId) => {
    expect(
      normalizeEmailPayload(subscribePayload({ requestId: invalidRequestId })).ok,
    ).toBe(false);
  });

  it.each([
    ['protocol', 'https://evil.example/path'],
    ['protocol-relative', '//evil.example/path'],
    ['double slash', '/safe//evil'],
    ['plain traversal', '/safe/../private'],
    ['encoded traversal', '/safe/%2e%2e/private'],
    ['double-encoded traversal', '/safe/%252e%252e/private'],
    ['backslash traversal', '/safe\\..\\private'],
    ['too long', `/${'a'.repeat(200)}`],
  ])('rejects invalid page paths: %s', (_label, page) => {
    expect(normalizeEmailPayload(subscribePayload({ page })).ok).toBe(false);
  });

  it('accepts a bounded same-site page path', () => {
    expect(
      normalizeEmailPayload(subscribePayload({ page: '/cocktails/negroni/' })).ok,
    ).toBe(true);
  });
});

describe('normalizeEmailPayload recipes', () => {
  it('requires an allow-listed preset slug and C2 bottle/unit limits', () => {
    const base = { mode: 'preset', slug: 'negroni', bottleMl: 750, unit: 'ml' };
    expect(normalizeEmailPayload(sendRecipePayload(base)).ok).toBe(true);
    expect(
      normalizeEmailPayload(sendRecipePayload({ ...base, slug: 'unknown-recipe' })).ok,
    ).toBe(false);

    for (const bottleMl of [99, 100, 3_000, 3_001]) {
      expect(
        normalizeEmailPayload(sendRecipePayload({ ...base, bottleMl })).ok,
      ).toBe(bottleMl >= 100 && bottleMl <= 3_000);
    }
    expect(
      normalizeEmailPayload(sendRecipePayload({ ...base, bottleMl: 750.5 })).ok,
    ).toBe(false);
    expect(
      normalizeEmailPayload(sendRecipePayload({ ...base, unit: 'cl' })).ok,
    ).toBe(false);
  });

  it.each([
    ['dilution below minimum', { dilutionPercent: -1 }],
    ['dilution above maximum', { dilutionPercent: 36 }],
    ['dilution not finite', { dilutionPercent: Number.POSITIVE_INFINITY }],
    ['zero ingredients', { ingredients: [] }],
    [
      'nine ingredients',
      {
        ingredients: Array.from({ length: 9 }, (_, index) => ({
          name: `Ingredient ${index}`,
          amount: 1,
          abv: 10,
          isBaseSpirit: index === 0,
        })),
      },
    ],
    [
      'empty name',
      { ingredients: [{ name: ' ', amount: 1, abv: 40, isBaseSpirit: true }] },
    ],
    [
      'name over 60 Unicode characters',
      { ingredients: [{ name: '🍸'.repeat(61), amount: 1, abv: 40, isBaseSpirit: true }] },
    ],
    [
      'zero amount',
      { ingredients: [{ name: 'Gin', amount: 0, abv: 40, isBaseSpirit: true }] },
    ],
    [
      'amount above maximum',
      { ingredients: [{ name: 'Gin', amount: 101, abv: 40, isBaseSpirit: true }] },
    ],
    [
      'amount not finite',
      {
        ingredients: [
          { name: 'Gin', amount: Number.NaN, abv: 40, isBaseSpirit: true },
        ],
      },
    ],
    [
      'ABV below minimum',
      { ingredients: [{ name: 'Gin', amount: 1, abv: -1, isBaseSpirit: true }] },
    ],
    [
      'ABV above maximum',
      { ingredients: [{ name: 'Gin', amount: 1, abv: 101, isBaseSpirit: true }] },
    ],
    [
      'base spirit flag not boolean',
      { ingredients: [{ name: 'Gin', amount: 1, abv: 40, isBaseSpirit: 1 }] },
    ],
    [
      'no base spirit',
      { ingredients: [{ name: 'Gin', amount: 1, abv: 40, isBaseSpirit: false }] },
    ],
    [
      'multiple base spirits',
      {
        ingredients: [
          { name: 'Gin', amount: 1, abv: 40, isBaseSpirit: true },
          { name: 'Rum', amount: 1, abv: 40, isBaseSpirit: true },
        ],
      },
    ],
  ])('rejects a custom recipe with %s', (_label, overrides) => {
    expect(
      normalizeEmailPayload(sendRecipePayload(customRecipe(overrides))).ok,
    ).toBe(false);
  });

  it('accepts C2 boundaries and trims Unicode ingredient names', () => {
    const ingredients = Array.from({ length: 8 }, (_, index) => ({
      name: index === 0 ? `  ${'é'.repeat(60)}  ` : `Ingredient ${index}`,
      amount: index === 0 ? 100 : 0.1,
      abv: index === 0 ? 100 : 0,
      isBaseSpirit: index === 0,
    }));
    const result = normalizeEmailPayload(
      sendRecipePayload(customRecipe({ bottleMl: 3_000, dilutionPercent: 35, ingredients })),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.value.action === 'send_recipe') {
      expect(result.value.recipe.mode).toBe('custom');
      if (result.value.recipe.mode === 'custom') {
        expect(result.value.recipe.ingredients[0].name).toBe('é'.repeat(60));
      }
    }
  });

  it('caps presentation strings instead of interpreting them as numbers', () => {
    const valid = normalizeEmailPayload(
      sendRecipePayload(
        customRecipe({ display: { abv: '<b>not a number</b>', servings: 'many-ish' } }),
      ),
    );
    const oversized = normalizeEmailPayload(
      sendRecipePayload(customRecipe({ display: { abv: 'x'.repeat(161) } })),
    );
    expect(valid.ok).toBe(true);
    expect(oversized.ok).toBe(false);
  });
});
