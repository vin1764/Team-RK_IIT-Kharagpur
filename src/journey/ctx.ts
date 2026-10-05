import { createContext, useContext } from 'react';
import type { PersonaSpec, SkuSpec } from '../data/personas';
import type { DayState, SimEvent, SimResult, SkuDay } from '../engine/simulate';
import { breakEven, listPrice } from '../engine/formulas';

export interface JourneyCtx {
  p: PersonaSpec;
  r: SimResult;
  cf: SimResult;
  chapter: number;
  day: number;
  ds: DayState;
  sku: SkuSpec;
  skuDay: SkuDay;
  price: number;
  B: number;
  breakEven: number;
  /** Events up to and including the current day. */
  past: SimEvent[];
  /** Latest event of a kind up to the current day (optionally for one SKU). */
  last: (kind: SimEvent['kind'], skuId?: string) => SimEvent | undefined;
  /** First event of a kind anywhere in the run. */
  first: (kind: SimEvent['kind'], skuId?: string) => SimEvent | undefined;
  /** Sum a per-SKU-day field over days in [from, to] (all SKUs). */
  sumSku: (f: (s: SkuDay) => number, from: number, to: number) => number;
  dayState: (day: number) => DayState;
}

export function buildCtx(p: PersonaSpec, r: SimResult, cf: SimResult, chapter: number, day: number): JourneyCtx {
  const ds = r.days.find((x) => x.day === day) ?? r.days[r.days.length - 1]!;
  const sku = r.persona.skus[0]!;
  const skuDay = ds.skus.find((s) => s.skuId === sku.id) ?? ds.skus[0]!;
  const past = r.events.filter((e) => e.day <= day);
  return {
    p,
    r,
    cf,
    chapter,
    day,
    ds,
    sku,
    skuDay,
    price: listPrice(sku.stack, sku.margin, sku.gstRatePct),
    B: skuDay.B,
    breakEven: breakEven(sku.stack, sku.gstRatePct),
    past,
    last: (kind, skuId) => [...past].reverse().find((e) => e.kind === kind && (!skuId || e.skuId === skuId)),
    first: (kind, skuId) => r.events.find((e) => e.kind === kind && (!skuId || e.skuId === skuId)),
    sumSku: (f, from, to) =>
      r.days.filter((x) => x.day >= from && x.day <= to).reduce((a, x) => a + x.skus.reduce((b, s) => b + f(s), 0), 0),
    dayState: (d) => r.days.find((x) => x.day === d) ?? r.days[0]!,
  };
}

export const JourneyContext = createContext<JourneyCtx | null>(null);
export const useJourney = () => useContext(JourneyContext)!;
