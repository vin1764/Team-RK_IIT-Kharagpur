import { describe, expect, it } from 'vitest';
import { C } from '../../src/data/constants';
import { generateBTable, MAKER_SELLER_ID } from '../../src/data/generate/bTable';
import { generateDistricts } from '../../src/data/generate/districts';
import { generateBuyers } from '../../src/data/generate/buyers';
import { generateOutreach } from '../../src/data/generate/outreach';
import { generateCohort, cohortMetrics } from '../../src/data/generate/cohort';
import { benchmarkB } from '../../src/engine/formulas';

describe('B tables', () => {
  it.each([160, 155, 165, 290, 379])('10 listings whose B is exactly ₹%i', (B) => {
    for (const seed of [1, 2, 3]) {
      const t = generateBTable('Test type', B, 148, seed);
      expect(t).toHaveLength(C.GEN_B_TABLE_ELIGIBLE.value + 4);
      const r = benchmarkB(t, { excludeSellerId: MAKER_SELLER_ID });
      expect(r.B).toBe(B);
      expect(r.excluded.map((x) => x.reason).sort()).toEqual(
        ['Below quality floor', 'Different spec', `Fewer than ${C.B_MIN_DELIVERED_ORDERS.value} delivered orders`, "Maker's own orders"].sort(),
      );
    }
  });
});

describe('districts', () => {
  it('12 districts, half launch, equal demand weight per group', () => {
    const d = generateDistricts(7);
    expect(d).toHaveLength(C.DISTRICTS.value);
    expect(d.filter((x) => x.launch)).toHaveLength(C.DISTRICTS.value / 2);
    const w = (l: boolean) => d.filter((x) => x.launch === l).reduce((a, x) => a + x.weight, 0);
    expect(w(true)).toBeCloseTo(0.5, 9);
    expect(w(false)).toBeCloseTo(0.5, 9);
    expect(generateDistricts(7)).toEqual(d);
  });
});

describe('buyers and outreach', () => {
  it('buyers are seeded and live in the districts', () => {
    const d = generateDistricts(1);
    const b = generateBuyers(5, d, 20);
    expect(b).toHaveLength(20);
    expect(b.every((x) => d.some((y) => y.name === x.district))).toBe(true);
    expect(generateBuyers(5, d, 20)).toEqual(b);
  });

  it('outreach funnel narrows at every step and uses the cohort’s sources', () => {
    const f = generateOutreach('Churned from Meesho', 3);
    expect(f.sources).toEqual(['Meesho exit records']);
    for (let i = 1; i < f.stages.length; i++) expect(f.stages[i]!.count).toBeLessThanOrEqual(f.stages[i - 1]!.count);
  });
});

describe('cohort generator', () => {
  it('lifts synthetic makers when persona rows drag the average below target', () => {
    const members = [
      { persona: 'x', name: 'X', cluster: 'Rajkot', productType: 't', priceDropPct: 2, activeD30: true, activeD60: true, activeD90: true, secondLotByD45: true },
    ];
    for (const seed of [1, 2, 3, 4, 5]) {
      const c = generateCohort(1, seed, members);
      expect(cohortMetrics(c).priceDropAvgPct).toBeGreaterThanOrEqual(C.PRICE_DROP_TARGET_PCT_OF_B.value);
      expect(c.find((m) => m.persona === 'x')!.priceDropPct).toBe(2);
    }
  });
});
