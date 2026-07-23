const MAX_EMAIL_LENGTH = 254;
const MAX_PAGE_LENGTH = 200;
const MAX_CONSENT_VERSION_LENGTH = 64;
const MAX_TURNSTILE_TOKEN_LENGTH = 2_048;
const MAX_DISPLAY_VALUE_LENGTH = 160;
const MAX_DISPLAY_AMOUNT_LENGTH = 80;

const MIN_BOTTLE_ML = 100;
const MAX_BOTTLE_ML = 3_000;
const MAX_DILUTION_PERCENT = 35;
const MAX_INGREDIENTS = 8;
const MAX_INGREDIENT_NAME_LENGTH = 60;
const MAX_INGREDIENT_AMOUNT = 100;

// Duplicated from MILK_STREET_BATCHES in src/lib/calculator.ts because Pages
// Functions are deployed separately from the static site's src/ module graph.
export const PRESET_SLUGS = new Set([
  'aviation',
  'bijou',
  'boulevardier',
  'cosmopolitan',
  'daiquiri',
  'dirty-martini',
  'espresso-martini',
  'hanky-panky',
  'manhattan',
  'margarita',
  'mint-julep',
  'moscow-mule',
  'negroni',
  'old-fashioned',
  'paper-plane',
  'sazerac',
  'vesper',
  'vieux-carre',
] as const);

export type EmailUnit = 'oz' | 'ml';

export interface CustomRecipeIngredient {
  name: string;
  amount: number;
  abv: number;
  isBaseSpirit: boolean;
}

export interface RecipeDisplay {
  name?: string;
  abv?: string;
  servings?: string;
  bottleSize?: string;
  dilution?: string;
  pourOff?: string;
  waterToAdd?: string;
  ingredients?: Array<{ name: string; amount: string }>;
}

export type RecipeEmailPayload =
  | {
      mode: 'preset';
      slug: string;
      bottleMl: number;
      unit: EmailUnit;
      display?: RecipeDisplay;
    }
  | {
      mode: 'custom';
      bottleMl: number;
      unit: EmailUnit;
      dilutionPercent: number;
      ingredients: CustomRecipeIngredient[];
      display?: RecipeDisplay;
    };

export type NormalizedEmailRequest =
  | {
      action: 'send_recipe';
      requestId: string;
      email: string;
      recipe: RecipeEmailPayload;
      marketingConsent: boolean;
      consentVersion?: string;
      page: string;
    }
  | {
      action: 'subscribe';
      requestId: string;
      email: string;
      consentVersion: string;
      page: string;
    }
  | {
      action: 'unsubscribe';
      requestId: string;
      email: string;
      page: string;
    };

export type NormalizeEmailResult =
  | { ok: true; value: NormalizedEmailRequest }
  | { ok: false; reason: string };

type JsonObject = Record<string, unknown>;

function fail(reason: string): NormalizeEmailResult {
  return { ok: false, reason };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBoundedString(
  value: unknown,
  maxLength: number,
  allowEmpty = false,
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const length = Array.from(normalized).length;
  if ((!allowEmpty && length === 0) || length > maxLength) return null;
  return normalized;
}

function normalizeEmail(value: unknown): string | null {
  const email = normalizeBoundedString(value, MAX_EMAIL_LENGTH)?.toLowerCase();
  if (!email || /[\s\u0000-\u001f\u007f]/u.test(email)) return null;

  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || domain.length > 253 || !domain.includes('.')) return null;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/iu.test(local)) return null;

  const labels = domain.split('.');
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        label.startsWith('-') ||
        label.endsWith('-') ||
        !/^[a-z0-9-]+$/iu.test(label),
    )
  ) {
    return null;
  }
  return email;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function normalizePage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PAGE_LENGTH) {
    return null;
  }
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return null;
  }

  let decoded = value;
  try {
    // Decode more than once so double-encoded traversal is not accepted as a source path.
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }

  if (
    decoded.includes('\\') ||
    decoded.includes('//') ||
    decoded.split(/[/?#]/u).some((segment) => segment === '.' || segment === '..')
  ) {
    return null;
  }
  return value;
}

function normalizeUnit(value: unknown): EmailUnit | null {
  return value === 'oz' || value === 'ml' ? value : null;
}

function normalizeBottleMl(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_BOTTLE_ML &&
    value <= MAX_BOTTLE_ML
    ? value
    : null;
}

function normalizeDisplay(value: unknown): RecipeDisplay | null | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) return null;

  const display: RecipeDisplay = {};
  for (const field of [
    'name',
    'abv',
    'servings',
    'bottleSize',
    'dilution',
    'pourOff',
    'waterToAdd',
  ] as const) {
    if (value[field] === undefined) continue;
    const normalized = normalizeBoundedString(value[field], MAX_DISPLAY_VALUE_LENGTH, true);
    if (normalized === null) return null;
    display[field] = normalized;
  }

  if (value.ingredients !== undefined) {
    if (
      !Array.isArray(value.ingredients) ||
      value.ingredients.length < 1 ||
      value.ingredients.length > MAX_INGREDIENTS
    ) {
      return null;
    }
    const ingredients: Array<{ name: string; amount: string }> = [];
    for (const ingredient of value.ingredients) {
      if (!isObject(ingredient)) return null;
      const name = normalizeBoundedString(ingredient.name, MAX_INGREDIENT_NAME_LENGTH);
      const amount = normalizeBoundedString(ingredient.amount, MAX_DISPLAY_AMOUNT_LENGTH);
      if (name === null || amount === null) return null;
      ingredients.push({ name, amount });
    }
    display.ingredients = ingredients;
  }

  return display;
}

function normalizeRecipe(value: unknown): RecipeEmailPayload | null {
  if (!isObject(value)) return null;

  const bottleMl = normalizeBottleMl(value.bottleMl);
  const unit = normalizeUnit(value.unit);
  const display = normalizeDisplay(value.display);
  if (bottleMl === null || unit === null || display === null) return null;

  if (value.mode === 'preset') {
    if (typeof value.slug !== 'string' || !PRESET_SLUGS.has(value.slug as never)) return null;
    return {
      mode: 'preset',
      slug: value.slug,
      bottleMl,
      unit,
      ...(display === undefined ? {} : { display }),
    };
  }

  if (value.mode !== 'custom') return null;
  if (
    typeof value.dilutionPercent !== 'number' ||
    !Number.isFinite(value.dilutionPercent) ||
    value.dilutionPercent < 0 ||
    value.dilutionPercent > MAX_DILUTION_PERCENT ||
    !Array.isArray(value.ingredients) ||
    value.ingredients.length < 1 ||
    value.ingredients.length > MAX_INGREDIENTS
  ) {
    return null;
  }

  const ingredients: CustomRecipeIngredient[] = [];
  let baseSpiritCount = 0;
  for (const ingredient of value.ingredients) {
    if (!isObject(ingredient)) return null;
    const name = normalizeBoundedString(ingredient.name, MAX_INGREDIENT_NAME_LENGTH);
    if (
      name === null ||
      typeof ingredient.amount !== 'number' ||
      !Number.isFinite(ingredient.amount) ||
      ingredient.amount <= 0 ||
      ingredient.amount > MAX_INGREDIENT_AMOUNT ||
      typeof ingredient.abv !== 'number' ||
      !Number.isFinite(ingredient.abv) ||
      ingredient.abv < 0 ||
      ingredient.abv > 100 ||
      typeof ingredient.isBaseSpirit !== 'boolean'
    ) {
      return null;
    }
    if (ingredient.isBaseSpirit) baseSpiritCount += 1;
    ingredients.push({
      name,
      amount: ingredient.amount,
      abv: ingredient.abv,
      isBaseSpirit: ingredient.isBaseSpirit,
    });
  }
  if (baseSpiritCount !== 1) return null;

  return {
    mode: 'custom',
    bottleMl,
    unit,
    dilutionPercent: value.dilutionPercent,
    ingredients,
    ...(display === undefined ? {} : { display }),
  };
}

/**
 * Validates the public request and returns only fields safe to forward upstream.
 * Turnstile and honeypot fields are deliberately consumed at the Pages boundary.
 */
export function normalizeEmailPayload(value: unknown): NormalizeEmailResult {
  if (!isObject(value) || typeof value.action !== 'string') return fail('invalid_action');

  const requestId = isUuid(value.requestId) ? value.requestId.toLowerCase() : null;
  const email = normalizeEmail(value.email);
  const page = normalizePage(value.page);
  const turnstileToken = normalizeBoundedString(
    value.turnstileToken,
    MAX_TURNSTILE_TOKEN_LENGTH,
  );
  if (!requestId || !email || !page || !turnstileToken) return fail('invalid_common_fields');

  if (value.action === 'send_recipe') {
    const recipe = normalizeRecipe(value.recipe);
    if (!recipe || typeof value.marketingConsent !== 'boolean') {
      return fail('invalid_send_recipe');
    }

    let consentVersion: string | undefined;
    if (value.consentVersion !== undefined) {
      consentVersion =
        normalizeBoundedString(value.consentVersion, MAX_CONSENT_VERSION_LENGTH) ?? undefined;
      if (!consentVersion) return fail('invalid_consent_version');
    }

    return {
      ok: true,
      value: {
        action: 'send_recipe',
        requestId,
        email,
        recipe,
        marketingConsent: value.marketingConsent,
        ...(consentVersion === undefined ? {} : { consentVersion }),
        page,
      },
    };
  }

  if (value.action === 'subscribe') {
    const consentVersion = normalizeBoundedString(
      value.consentVersion,
      MAX_CONSENT_VERSION_LENGTH,
    );
    if (!consentVersion) return fail('invalid_consent_version');
    return {
      ok: true,
      value: { action: 'subscribe', requestId, email, consentVersion, page },
    };
  }

  if (value.action === 'unsubscribe') {
    return {
      ok: true,
      value: { action: 'unsubscribe', requestId, email, page },
    };
  }

  return fail('invalid_action');
}

