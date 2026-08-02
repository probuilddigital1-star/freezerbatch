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
      expect([null, 'citrus', 'coffee', 'vermouth']).toContain(c.storage.limitedBy);
    }
  });

  it('retires the fields that conflated freeze safety with quality window', () => {
    for (const c of cocktails) {
      expect(c, `${c.slug} still has reliability`).not.toHaveProperty('reliability');
      expect(c, `${c.slug} still has shelfLife`).not.toHaveProperty('shelfLife');
    }
  });

  it('groups 11 / 6 / 1 by quality window', () => {
    const counts = cocktails.reduce<Record<string, number>>((acc, c) => {
      acc[c.storage.bestWithin] = (acc[c.storage.bestWithin] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ months: 11, weeks: 6, week: 1 });
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

  it('only marks a recipe citrus- or coffee-limited when it contains one', () => {
    const CITRUS = /lime|lemon|orange|grapefruit|cranberry/i;
    const COFFEE = /coffee|espresso|cold brew|kahlua/i;
    const VERMOUTH = /vermouth|lillet|cocchi|americano/i;
    for (const c of cocktails) {
      const names = (c.recipe?.single ?? []).map((i: any) => i.name).join(' ');
      if (c.storage.limitedBy === 'citrus') {
        expect(CITRUS.test(names), `${c.slug} marked citrus but has none`).toBe(true);
      }
      if (c.storage.limitedBy === 'coffee') {
        expect(COFFEE.test(names), `${c.slug} marked coffee but has none`).toBe(true);
      }
      if (c.storage.limitedBy === 'vermouth') {
        expect(VERMOUTH.test(names), `${c.slug} marked vermouth but has none`).toBe(true);
      }
    }
  });
});
