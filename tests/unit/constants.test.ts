import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C, STATUSES } from '../../src/data/constants';

describe('constants integrity', () => {
  const entries = Object.entries(C);

  it('has every section 3 constant group', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it.each(entries)('%s has value, unit, label, source and a valid status', (_key, c) => {
    expect(c.value).not.toBeUndefined();
    expect(c.value).not.toBeNull();
    expect(c.unit.length).toBeGreaterThan(0);
    expect(c.label.length).toBeGreaterThan(0);
    expect(c.source.length).toBeGreaterThan(0);
    expect(STATUSES).toContain(c.status);
    if (typeof c.value === 'number') expect(Number.isFinite(c.value)).toBe(true);
  });

  it('matches the verified facts exactly', () => {
    expect(C.COMMISSION_PCT.value).toBe(0);
    expect(C.PAYMENT_CYCLE_DAYS.value).toBe(7);
    expect(C.GST_TCS_PCT.value).toBe(0.5);
    expect(C.INCOME_TAX_TDS_PCT.value).toBe(0.1);
    expect(C.GST_RATE_PCT.value).toBe(5);
    expect(C.PLACED_ORDERS_FY25_CR.value).toBe(183.4);
    expect(C.CONTRIBUTION_PER_ORDER.value).toBe(8.09);
    expect(C.AOV.value).toBe(265);
    expect(C.PACK_POINT_MIN_PRICE.value).toBe(175);
    expect(C.PRICE_DROP_TARGET_PCT_OF_B.value).toBe(8);
    expect(C.MAKER_RAMP_YEAR_ONE.value).toEqual([120, 320, 620]);
  });

  it('order mix sums to 100%', () => {
    const total = Object.values(C.ORDER_MIX_PCT.value).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 1);
  });

  it('the ₹72 middleman split adds up', () => {
    const s = C.MIDDLEMAN_SPLIT_AT_AOV.value;
    expect(s.distributor + s.wholesaler + s.reseller).toBe(72);
  });
});

describe('repo rules', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const srcFiles = walk(join(__dirname, '../../src')).filter((f) => /\.(ts|tsx)$/.test(f));

  it('Math.random is used nowhere (seeded RNG only)', () => {
    const hits = srcFiles.filter((f) => readFileSync(f, 'utf8').includes('Math.random('));
    expect(hits).toEqual([]);
  });

  it('the 1,020 maker figure appears nowhere', () => {
    const hits = srcFiles.filter((f) => /1,?020/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('buyer-facing UI has no forbidden claims', () => {
    const forbidden = /lowest price|cheapest|best price|direct from factory|verified factory|(?<!not a )guarantee/i;
    const buyerFacing = srcFiles.filter((f) => /Buyer/.test(f));
    expect(buyerFacing.length).toBeGreaterThan(0);
    const hits = buyerFacing.filter((f) => forbidden.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
