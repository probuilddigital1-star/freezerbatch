import { MILK_STREET_BATCHES } from './calculator';

export type ShareUnit = 'oz' | 'ml';

export interface ShareIngredient {
  name: string;
  amount: number;
  abv: number;
  isBaseSpirit: boolean;
}

export type ShareStateV1 =
  | { v: 1; mode: 'preset'; recipe: string; bottleMl: number; unit: ShareUnit }
  | {
      v: 1;
      mode: 'custom';
      bottleMl: number;
      unit: ShareUnit;
      dilutionPercent: number;
      ingredients: ShareIngredient[];
    };

export type ParseResult =
  | { ok: true; state: ShareStateV1 }
  | { ok: false; reason: string };

export type BuildShareUrlResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

const MAX_BATCH_PARAM_LENGTH = 1_800;
const MAX_URL_LENGTH = 1_800;
const DEFAULT_LEGACY_DILUTION_PERCENT = 20;
const VALID_UNITS = new Set<ShareUnit>(['oz', 'ml']);

function fail(reason: string): ParseResult {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function unicodeLength(value: string): number {
  return Array.from(value).length;
}

function normalizeIngredient(value: unknown): ShareIngredient | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['name', 'amount', 'abv', 'isBaseSpirit'])) {
    return null;
  }

  if (
    typeof value.name !== 'string' ||
    !isFiniteNumber(value.amount) ||
    !isFiniteNumber(value.abv) ||
    typeof value.isBaseSpirit !== 'boolean'
  ) {
    return null;
  }

  const name = value.name.trim();
  if (
    unicodeLength(name) < 1 ||
    unicodeLength(name) > 60 ||
    value.amount <= 0 ||
    value.amount > 100 ||
    value.abv < 0 ||
    value.abv > 100
  ) {
    return null;
  }

  return {
    name,
    amount: value.amount,
    abv: value.abv,
    isBaseSpirit: value.isBaseSpirit,
  };
}

/**
 * Validates and returns a new, normalized share state. The input is never mutated.
 */
export function normalizeShareState(value: unknown): ParseResult {
  if (!isRecord(value) || !isFiniteNumber(value.v) || value.v !== 1) {
    return fail('unsupported_version');
  }

  if (value.mode === 'preset') {
    if (!hasOnlyKeys(value, ['v', 'mode', 'recipe', 'bottleMl', 'unit'])) {
      return fail('invalid_preset_fields');
    }

    if (
      typeof value.recipe !== 'string' ||
      !Object.prototype.hasOwnProperty.call(MILK_STREET_BATCHES, value.recipe) ||
      !isValidBottleMl(value.bottleMl) ||
      !isShareUnit(value.unit)
    ) {
      return fail('invalid_preset');
    }

    return {
      ok: true,
      state: { v: 1, mode: 'preset', recipe: value.recipe, bottleMl: value.bottleMl, unit: value.unit },
    };
  }

  if (value.mode !== 'custom') {
    return fail('unsupported_mode');
  }

  if (!hasOnlyKeys(value, ['v', 'mode', 'bottleMl', 'unit', 'dilutionPercent', 'ingredients'])) {
    return fail('invalid_custom_fields');
  }

  if (
    !isValidBottleMl(value.bottleMl) ||
    !isShareUnit(value.unit) ||
    !isValidDilutionPercent(value.dilutionPercent) ||
    !Array.isArray(value.ingredients) ||
    value.ingredients.length < 1 ||
    value.ingredients.length > 8
  ) {
    return fail('invalid_custom');
  }

  const ingredients = value.ingredients.map(normalizeIngredient);
  if (ingredients.some((ingredient) => ingredient === null)) {
    return fail('invalid_ingredient');
  }

  const normalizedIngredients = ingredients as ShareIngredient[];
  if (normalizedIngredients.filter((ingredient) => ingredient.isBaseSpirit).length !== 1) {
    return fail('invalid_base_spirit');
  }

  return {
    ok: true,
    state: {
      v: 1,
      mode: 'custom',
      bottleMl: value.bottleMl,
      unit: value.unit,
      dilutionPercent: value.dilutionPercent,
      ingredients: normalizedIngredients,
    },
  };
}

export function isValidBottleMl(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 100 && value <= 3_000;
}

export function isValidDilutionPercent(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 35;
}

export function isShareUnit(value: unknown): value is ShareUnit {
  return typeof value === 'string' && VALID_UNITS.has(value as ShareUnit);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Serializes a validated V1 state to the transport value used by the batch query parameter. */
export function serializeShareState(state: ShareStateV1): string {
  const normalized = normalizeShareState(state);
  if (!normalized.ok) {
    throw new TypeError(`Cannot serialize invalid share state: ${normalized.reason}`);
  }

  return `v1.${encodeBase64Url(JSON.stringify(normalized.state))}`;
}

/** Parses a batch query parameter without throwing or returning partial state. */
export function parseShareState(value: string | null | undefined): ParseResult {
  if (typeof value !== 'string' || !value) return fail('missing_batch');
  if (value.length > MAX_BATCH_PARAM_LENGTH) return fail('batch_too_large');
  if (!value.startsWith('v1.')) return fail('unsupported_version');

  const decoded = decodeBase64Url(value.slice(3));
  if (decoded === null) return fail('malformed_base64');

  try {
    return normalizeShareState(JSON.parse(decoded));
  } catch {
    return fail('malformed_json');
  }
}

function parseLegacyNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveLegacyUnit(searchParams: URLSearchParams, ingredients: unknown[]): ShareUnit | null {
  const paramUnit = searchParams.get('unit');
  if (paramUnit !== null && !isShareUnit(paramUnit)) return null;

  const embeddedUnits = ingredients.map((ingredient) => {
    if (!isRecord(ingredient) || !Object.prototype.hasOwnProperty.call(ingredient, 'unit')) {
      return undefined;
    }
    return ingredient.unit;
  });
  const hasEmbeddedUnit = embeddedUnits.some((unit) => unit !== undefined);

  // Older links did not always include a unit. Default only when none of their
  // ingredients provides one; partial, invalid, or mixed embedded units could
  // otherwise silently change the recipe's meaning.
  if (!hasEmbeddedUnit) return paramUnit ?? 'oz';
  if (embeddedUnits.some((unit) => !isShareUnit(unit))) return null;

  const units = embeddedUnits as ShareUnit[];
  if (new Set(units).size !== 1) return null;
  return paramUnit === null || paramUnit === units[0] ? units[0] : null;
}

/**
 * Parses the one-release-cycle legacy recipe/ingredients query format through the V1 validator.
 */
export function parseLegacyShareState(searchParams: URLSearchParams): ParseResult {
  const recipe = searchParams.get('recipe');
  const ingredientsValue = searchParams.get('ingredients');
  if (recipe !== null && ingredientsValue !== null) return fail('ambiguous_legacy_state');
  if (recipe === null && ingredientsValue === null) return fail('missing_legacy_state');

  const bottleMl = parseLegacyNumber(searchParams.get('bottle'));
  if (!isValidBottleMl(bottleMl)) return fail('invalid_bottle');

  if (recipe !== null) {
    const unit = searchParams.get('unit') ?? 'oz';
    return normalizeShareState({ v: 1, mode: 'preset', recipe, bottleMl, unit });
  }

  if (ingredientsValue === null || ingredientsValue.length > MAX_BATCH_PARAM_LENGTH) {
    return fail('legacy_ingredients_too_large');
  }

  try {
    const rawIngredients: unknown = JSON.parse(ingredientsValue);
    if (!Array.isArray(rawIngredients)) return fail('invalid_legacy_ingredients');

    const unit = resolveLegacyUnit(searchParams, rawIngredients);
    const dilutionValue = searchParams.has('dilution')
      ? parseLegacyNumber(searchParams.get('dilution'))
      : DEFAULT_LEGACY_DILUTION_PERCENT;
    if (!unit || !isValidDilutionPercent(dilutionValue)) return fail('invalid_legacy_options');

    const ingredients = rawIngredients.map((ingredient) => {
      if (!isRecord(ingredient)) return ingredient;
      return {
        name: ingredient.name,
        amount: ingredient.amount,
        abv: ingredient.abv,
        isBaseSpirit: ingredient.isBaseSpirit,
      };
    });

    return normalizeShareState({
      v: 1,
      mode: 'custom',
      bottleMl,
      unit,
      dilutionPercent: dilutionValue,
      ingredients,
    });
  } catch {
    return fail('malformed_legacy_ingredients');
  }
}

/** Builds the canonical URL for a V1 state, rejecting fragile URLs over the contract limit. */
export function buildShareUrl(state: ShareStateV1, origin: string | URL): BuildShareUrlResult {
  const normalized = normalizeShareState(state);
  if (!normalized.ok) return normalized;

  try {
    const path = normalized.state.mode === 'preset'
      ? `/cocktails/${encodeURIComponent(normalized.state.recipe)}/`
      : '/';
    const url = new URL(path, origin);
    url.searchParams.set('batch', serializeShareState(normalized.state));
    if (normalized.state.mode === 'custom') url.hash = 'calculator';

    return url.toString().length <= MAX_URL_LENGTH
      ? { ok: true, url }
      : { ok: false, reason: 'url_too_long' };
  } catch {
    return { ok: false, reason: 'invalid_origin' };
  }
}
