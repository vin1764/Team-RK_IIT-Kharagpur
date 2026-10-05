import { describe, expect, it } from 'vitest';
import { C } from '../../src/data/constants';
import { PERSONA_SPECS } from '../../src/data/personas';
import { simulate } from '../../src/engine/simulate';
import { daysOfCover, scaleBridge } from '../../src/engine/formulas';
import snapshotRaw from '../../src/data/snapshot.json?raw';

/** MVP.md section 6: engine and number fixes. */
describe('section 6 fixes', () => {
  const END = C.TIMELINE_DAYS.value.max;
  for (const p of PERSONA_SPECS) {
    const r = simulate({ personaId: p.id });
    const cf = simulate({ personaId: p.id, counterfactual: true });
    it(`${p.name}: nothing before it exists (no stock or cash in stock before the commit)`, () => {
      for (const d of r.days.filter((x) => x.day < C.LAUNCH_COMMIT_BY_DAY.value)) {
        expect(d.money.cashInStock).toBe(0);
        expect(d.onHand).toBe(0);
      }
    });
    it(`${p.name}: day-90 stock ≤ ${C.GATE3_MAX_COVER_DAYS.value} days of cover and below the counterfactual`, () => {
      const last = r.days.at(-1)!;
      const rr = r.days.filter((d) => d.day > END - 7).reduce((a, d) => a + d.orders, 0) / 7;
      expect(daysOfCover(last.onHand, rr)!).toBeLessThanOrEqual(C.GATE3_MAX_COVER_DAYS.value);
      expect(last.onHand).toBeLessThan(cf.days.at(-1)!.onHand);
    });
    it(`${p.name}: Gate 2 follows the rule (stick rate < 1.0 → Tighten)`, () => {
      const g2 = r.gates.g2!;
      const stick = g2.durability.find((x) => /stick/i.test(x.label))!;
      if (stick.value < C.T_STICK_RATE_D60.value) expect(g2.decision).toBe('Tighten');
      expect(g2.reason.length).toBeGreaterThan(10);
    });
  }
  it('Sunita: Tighten at Gate 1, then Invest after the rerun', () => {
    const g = simulate({ personaId: 'sunita' }).gates;
    expect(g.g1!.decision).toBe('Tighten');
    expect(g.g1rerun!.decision).toBe('Invest');
  });
  it('cohort metrics clear targets with real margin (≥ 1 point)', () => {
    for (const p of PERSONA_SPECS) {
      const c = simulate({ personaId: p.id }).gates.g3!.cohort;
      expect(c.priceDropAvgPct - C.PRICE_DROP_TARGET_PCT_OF_B.value).toBeGreaterThanOrEqual(1);
      expect(c.activeD90Pct - C.T_MAKERS_ACTIVE_D90_PCT.value).toBeGreaterThanOrEqual(1);
      expect(c.activeD60Pct - C.T_MAKERS_ACTIVE_D60_PCT.value).toBeGreaterThanOrEqual(1);
      expect(c.secondLotByD45Pct - C.T_SECOND_LOT_BY_D45_PCT.value).toBeGreaterThanOrEqual(1);
    }
  });
  it('scale bridge reaches the deck’s ₹657 Cr', () => {
    const h = simulate({ personaId: 'hiren' });
    const last30 = h.days.filter((d) => d.day > END - 30).reduce((a, d) => a + d.orders, 0);
    const b = scaleBridge({ unitsLast30: last30, liveSkus: h.days.at(-1)!.skus.filter((s) => s.live).length });
    expect(b.deckCr).toBe(C.DECK_C2M_SAVING_CR.value);
    expect(Math.abs(b.atScaleTargetCr - b.deckCr)).toBeLessThan(5);
  });
  it('problem breakdown sums to ₹265', () => {
    const split = C.PROBLEM_SPLIT_AT_AOV.value as Record<string, number>;
    expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(C.AOV.value);
  });
  it('the shipped snapshot matches a fresh run', () => {
    const snap = JSON.parse(snapshotRaw) as { personas: Record<string, { base: unknown }> };
    for (const p of PERSONA_SPECS) expect(snap.personas[p.id]!.base, p.id).toEqual(JSON.parse(JSON.stringify(simulate({ personaId: p.id }))));
  });
});
