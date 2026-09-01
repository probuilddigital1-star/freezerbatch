import { describe, expect, it } from 'vitest';
import cocktailsData from '../data/cocktails.json';
import { getFreezeStatus, NEAR_LINE_MARGIN, SLUSHY_THRESHOLD, suggestABV } from './calculator';

/**
 * The three-value status enum is load-bearing (about ten readers, plus e2e
 * assertions on status-* class names), so "close to the line" is a qualifier
 * on 'safe', never a fourth status. These pin the band's edges.
 */
describe('getFreezeStatus', () => {
  it('freezes below 15', () => {
    expect(getFreezeStatus(14.9).status).toBe('freeze');
  });

  it('is slushy below the line, with nearLine false — the band only qualifies safe', () => {
    expect(getFreezeStatus(21.9)).toMatchObject({ status: 'slushy', nearLine: false });
  });

  it('is safe but near the line from exactly 22 up to just under 25', () => {
    expect(getFreezeStatus(22.0)).toMatchObject({ status: 'safe', nearLine: true });
    expect(getFreezeStatus(24.9)).toMatchObject({ status: 'safe', nearLine: true });
  });

  it('leaves the band at exactly the margin', () => {
    expect(getFreezeStatus(25.0)).toMatchObject({ status: 'safe', nearLine: false });
    expect(getFreezeStatus(40)).toMatchObject({ status: 'safe', nearLine: false });
  });

  it('band edges derive from the exported constants', () => {
    expect(getFreezeStatus(SLUSHY_THRESHOLD).nearLine).toBe(true);
    expect(getFreezeStatus(SLUSHY_THRESHOLD + NEAR_LINE_MARGIN).nearLine).toBe(false);
  });

  it('says so in the message for the near-line case', () => {
    expect(getFreezeStatus(22.7).message).toContain('clears the line, but only just');
    expect(getFreezeStatus(40).message).not.toContain('clears the line');
  });
});

/**
 * `suggestABV` fills the ABV box the moment a name is typed, so a wrong guess
 * is worse than no guess: an overstated ABV can report a batch as clearing the
 * 22% freezer line when it will actually set to slush. The old matcher was a
 * bare substring test returning the first hit in declaration order, and spirits
 * are declared first — so `gin` matched inside `ginger`, and every modified
 * spirit inherited its base spirit's proof.
 */
describe('suggestABV', () => {
  /** The five names measured against the old matcher. The first three
   *  overstated, which is the direction that can call a slushy batch safe. */
  it.each<[string, number | null, string]>([
    ['Ginger Liqueur', null, 'matched `gin` inside `ginger`'],
    ['Sloe Gin', 26, 'inherited gin at 40'],
    ['Coconut Rum', 21, 'inherited rum at 40'],
    ['Irish Cream', 17, 'matched bare `cream` at 0'],
    ['Cream Sherry', 17, 'matched bare `cream` at 0'],
  ])('%s suggests %s (previously %s)', (name, expected, _previously) => {
    expect(suggestABV(name)).toBe(expected);
  });

  it('never suggests a base spirit proof for a modified spirit', () => {
    expect(suggestABV('Ginger Liqueur')).not.toBe(40);
    expect(suggestABV('Sloe Gin')).not.toBe(40);
    expect(suggestABV('Coconut Rum')).not.toBe(40);
  });

  it('matches whole words only, so a key cannot hide inside a longer word', () => {
    expect(suggestABV('Rumchata')).toBeNull();
    expect(suggestABV('Ginger Liqueur')).toBeNull();
  });

  it('says nothing while the user is still typing', () => {
    // The autofill writes only into an empty ABV box, so the first non-null
    // answer is the one that sticks. The old matcher compared the typed text
    // against whole keys too, so a lone 'S' returned 45 — 'rye whiskey'
    // contains an s — and stayed 45 while the user finished typing Simple
    // Syrup. A prefix has to resolve to nothing.
    expect(suggestABV('S')).toBeNull();
    expect(suggestABV('Si')).toBeNull();
    expect(suggestABV('Simple')).toBeNull();
    expect(suggestABV('Simple Syrup')).toBe(0);
  });

  it('still matches a known key sitting inside a longer name', () => {
    // The conservative rules must not cost us the qualifier-plus-known-phrase
    // shape, which is most of what people actually type.
    expect(suggestABV('Rich Simple Syrup')).toBe(0);
    expect(suggestABV('Fresh Lime Juice')).toBe(0);
    expect(suggestABV('Tequila Blanco')).toBe(40);
  });

  it('prefers the longest matching key, not the first declared', () => {
    expect(suggestABV('Green Chartreuse')).toBe(55);
    expect(suggestABV('Yellow Chartreuse')).toBe(40);
    expect(suggestABV('Chartreuse')).toBe(55);
  });

  it('blanks rather than guesses when an unknown modifier fronts a base spirit', () => {
    // A blank box makes the user think; a confident wrong number does not.
    expect(suggestABV('Damson Gin')).toBeNull();
    expect(suggestABV('Aged Rum')).toBeNull();
  });

  it('resolves the named variants the table carries outright', () => {
    // The rule above is a fallback, not a preference: where the table knows the
    // real number, a correct number beats a blank.
    expect(suggestABV('London Dry Gin')).toBe(40);
    expect(suggestABV('Spiced Rum')).toBe(35);
    expect(suggestABV('Dry Sherry')).toBe(17);
  });

  it('leaves the genuinely ambiguous names blank on purpose', () => {
    // Bare `Bitters` spans Angostura at 44 and Peychaud's at 35; bare
    // `Vermouth` is 16 sweet or 18 dry. Answering either means picking one and
    // sounding certain. `Ginger Liqueur` has no entry at all and must not fall
    // back to gin.
    expect(suggestABV('Bitters')).toBeNull();
    expect(suggestABV('Vermouth')).toBeNull();
    expect(suggestABV('Ginger Liqueur')).toBeNull();
  });

  it('returns null for a name it does not know at all', () => {
    expect(suggestABV('Xyzzy Cordial')).toBeNull();
  });

  it('is case- and whitespace-insensitive', () => {
    expect(suggestABV('  SWEET VERMOUTH  ')).toBe(16);
  });

  /**
   * The guard against the drift that has already bitten this repo three times.
   * cocktails.json is the source of truth for these numbers — the suggestion
   * table must agree with it for every ingredient the site's own recipes use.
   */
  it('agrees with cocktails.json on every ingredient the recipes use', () => {
    for (const cocktail of cocktailsData.cocktails) {
      for (const ingredient of cocktail.recipe.single ?? []) {
        expect(suggestABV(ingredient.name), `${cocktail.slug}: ${ingredient.name}`)
          .toBe(ingredient.abv);
      }
    }
  });
});
