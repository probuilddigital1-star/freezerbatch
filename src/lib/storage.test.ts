import { describe, expect, it } from 'vitest';
import cocktailsData from '../data/cocktails.json';

// storage.* is the single source of truth for how long a batch is at its best.
// freezeStatus answers the separate question of whether it freezes solid; the two
// must stay independent, which is the whole point of splitting them.
const cocktails = cocktailsData.cocktails as Array<Record<string, any>>;

describe('recipe storage claims', () => {
  it('gives every recipe a complete storage object', () => {
    for (const c of cocktails) {
      expect(c.storage, `${c.slug} has no storage`).toBeDefined();
      expect(['months', 'weeks', 'week']).toContain(c.storage.bestWithin);
      expect(c.storage.bestWithinLabel, `${c.slug} label`).toBeTruthy();
      expect(c.storage.note, `${c.slug} note`).toBeTruthy();
      expect([null, 'citrus', 'coffee', 'vermouth', 'mint']).toContain(c.storage.limitedBy);
    }
  });

  it('retires the fields that conflated freeze safety with quality window', () => {
    for (const c of cocktails) {
      expect(c, `${c.slug} still has reliability`).not.toHaveProperty('reliability');
      expect(c, `${c.slug} still has shelfLife`).not.toHaveProperty('shelfLife');
    }
  });

  it('groups 10 / 7 / 1 by quality window', () => {
    // Mint Julep moved months -> weeks: a strained fresh-herb syrup is not in the
    // same durability class as fortified wine, even at high proof in a freezer.
    const counts = cocktails.reduce<Record<string, number>>((acc, c) => {
      acc[c.storage.bestWithin] = (acc[c.storage.bestWithin] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ months: 10, weeks: 7, week: 1 });
  });

  it('uses one label per window, so no two recipes in a group can disagree', () => {
    const byWindow = new Map<string, Set<string>>();
    for (const c of cocktails) {
      if (!byWindow.has(c.storage.bestWithin)) byWindow.set(c.storage.bestWithin, new Set());
      byWindow.get(c.storage.bestWithin)!.add(c.storage.bestWithinLabel);
    }
    expect([...byWindow.get('months')!]).toEqual(['3+ months']);
    expect([...byWindow.get('weeks')!]).toEqual(['2-3 weeks']);
    expect([...byWindow.get('week')!]).toEqual(['5-7 days']);
  });

  it('keeps freezeStatus independent of the quality window', () => {
    // Aviation is the only slushy recipe and the only one-week recipe, but those
    // are unrelated facts: 17 safe recipes span all three windows.
    const safeWindows = new Set(
      cocktails.filter((c) => c.freezeStatus === 'safe').map((c) => c.storage.bestWithin),
    );
    expect(safeWindows.size).toBeGreaterThan(1);
  });

  it('only marks a recipe limited by an ingredient it actually contains', () => {
    const IN_INGREDIENTS: Record<string, RegExp> = {
      citrus: /lime|lemon|orange|grapefruit|cranberry/i,
      coffee: /coffee|espresso|cold brew|kahlua/i,
      vermouth: /vermouth|lillet|cocchi|americano/i,
      mint: /mint/i,
    };
    for (const c of cocktails) {
      const names = (c.recipe?.single ?? []).map((i: any) => i.name).join(' ');
      const rx = IN_INGREDIENTS[c.storage.limitedBy];
      if (rx) {
        expect(rx.test(names), `${c.slug} marked ${c.storage.limitedBy} but has none`).toBe(true);
      }
    }
  });
});
