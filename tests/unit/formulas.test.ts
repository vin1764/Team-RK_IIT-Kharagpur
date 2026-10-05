import { describe, expect, it } from 'vitest';
import { C } from '../../src/data/constants';
import { SCORECARD } from '../../src/data/categories';
import {
  benchmarkB,
  blendedRto,
  breakEven,
  c2mContribution,
  categoryScore,
  costPerRto,
  expectedDailyPerSku,
  exposureOrdersCr,
  firstLot,
  heroCostStack,
  isCrowded,
  lift,
  likelyShare,
  listPrice,
  middlemanMargin,
  nextBatch,
  openGap,
  ordersOfContributionPerAvoidedRto,
  packPointCost,
  packPointFee,
  packPointFeeTier,
  packPointRecommended,
  payoutDay,
  percentile,
  priceBand,
  priceDropDelivered,
  priceDropPctOfB,
  reorderPoint,
  runRate,
  savingPerOrder,
  stickRate,
  storageCost,
  takeHome,
  withheldCredits,
  boostFactor,
  boostTaperDays,
  listingQualityFactor,
  priceFactor,
  launchMultiplier,
  expectedDailyDemand,
  rtoProbability,
  codFailPct,
  prepaidFailPct,
  pricesHeldShare,
  forecastAttainment,
  trendFactor,
  orderPayout,
  firstRestockCheckDay,
  firstCoachDay,
  nadBreached,
  packPointPnl,
  packPointBreakEvenMakers,
  gradeShareB,
  type BListing,
} from '../../src/engine/formulas';
import { mulberry32 } from '../../src/engine/rng';

describe("deck worked numbers: hero's cost check (1 L steel bottle)", () => {
  const stack = heroCostStack();

  it('break-even is ₹132', () => {
    expect(Math.round(breakEven(stack))).toBe(132);
  });

  it('list price is ₹148 with a ₹15 margin', () => {
    expect(listPrice(stack, C.HERO_MARGIN.value)).toBe(148);
  });

  it('take-home is ₹15 per unit at ₹148', () => {
    expect(Math.round(takeHome(148, stack))).toBe(15);
  });

  it('band is ₹132–160 and ₹148 is in band', () => {
    const band = priceBand(148, Math.round(breakEven(stack)), C.HERO_B.value);
    expect(band).toEqual({ verdict: 'in-band', low: 132, high: 160 });
    expect(priceBand(165, 132, 160).verdict).toBe('above-B');
    expect(priceBand(120, 132, 160).verdict).toBe('below-break-even');
  });

  it('hero sits at 7.5% below B', () => {
    expect(priceDropPctOfB([{ B: C.HERO_B.value, price: 148, orders: 1 }])).toBeCloseTo(7.5, 5);
  });
});

describe('deck worked numbers: demand and first lot', () => {
  it('open gap 315–455/week at 20% share → 9–13 orders/day', () => {
    const { min, max } = C.HERO_OPEN_GAP_WEEK.value;
    expect(expectedDailyPerSku(min, C.HERO_LIKELY_SHARE.value)).toBeCloseTo(9, 5);
    expect(expectedDailyPerSku(max, C.HERO_LIKELY_SHARE.value)).toBeCloseTo(13, 5);
  });

  it('first lot range 126–182 → 150', () => {
    const lot = firstLot({ min: 9, max: 13 }, C.HERO_MIN_RUN.value);
    expect(lot).toEqual({ low: 126, high: 182, suggested: 150 });
  });

  it('first lot never goes below the minimum run', () => {
    expect(firstLot({ min: 2, max: 3 }, 100).suggested).toBe(100);
  });

  it('open gap and crowded meter', () => {
    expect(openGap(1000, 600)).toBe(400);
    expect(isCrowded(360, 400)).toBe(true);
    expect(isCrowded(300, 400)).toBe(false);
  });
});

describe('deck worked numbers: restock on day 33', () => {
  it('reorder point is 77 at 11/day with 5 + 2 days', () => {
    expect(reorderPoint(C.HERO_RUN_RATE_DAY_33.value, C.HERO_LEAD_TIME_DAYS.value, C.HERO_SAFETY_DAYS.value)).toBe(77);
  });

  it('next batch is 230', () => {
    expect(nextBatch(C.HERO_RUN_RATE_DAY_33.value, C.HERO_MIN_RUN.value)).toBe(230);
  });

  it('next batch respects minimum run and open-gap cap', () => {
    expect(nextBatch(2, 100)).toBe(100);
    expect(nextBatch(11, 100, 180)).toBe(180);
  });

  it('run rate = last 7 days ÷ 7 × trend', () => {
    expect(runRate(77)).toBe(11);
    expect(runRate(70, 1.1)).toBeCloseTo(11, 5);
  });
});

describe('deck worked numbers: Pack Point', () => {
  it('cost per order ₹30.8 / ₹21.1 / ₹17.8 / ₹16.2 at 20/40/60/80 makers', () => {
    expect(packPointCost(20).costPerOrder).toBeCloseTo(30.8, 1);
    expect(packPointCost(40).costPerOrder).toBeCloseTo(21.1, 1);
    expect(packPointCost(60).costPerOrder).toBeCloseTo(17.8, 1);
    expect(packPointCost(80).costPerOrder).toBeCloseTo(16.2, 1);
  });

  it('fee per delivered order ₹44 / ₹30 / ₹26 / ₹23', () => {
    expect([20, 40, 60, 80].map((m) => packPointFeeTier(m).fee)).toEqual([44, 30, 26, 23]);
  });

  it('₹24.9 per order handled at 40 makers', () => {
    expect(packPointFee(40).perHandled).toBeCloseTo(24.9, 1);
  });

  it('reference node: ~6,000 orders/month, ~1,200 sq ft, 4 staff at 40 makers', () => {
    const n = packPointCost(40);
    expect(n.ordersPerMonth).toBe(6000);
    expect(Math.round(n.areaSqft / 100) * 100).toBe(1200);
    expect(n.staff).toBe(4);
  });

  it('fee steps: 34 makers pay ₹44, 47 pay ₹30, below 20 pay ₹44', () => {
    expect(packPointFeeTier(34).fee).toBe(44);
    expect(packPointFeeTier(47).fee).toBe(30);
    expect(packPointFeeTier(12).fee).toBe(44);
  });

  it('storage is free for 30 days then ₹0.29/unit/day', () => {
    expect(storageCost(100, 30)).toBe(0);
    expect(storageCost(100, 40)).toBeCloseTo(290, 5);
  });

  it('recommended only above ₹175', () => {
    expect(packPointRecommended(148)).toBe(false);
    expect(packPointRecommended(265)).toBe(true);
  });
});

describe('deck worked numbers: saving per order', () => {
  it('middleman margin ₹33 / ₹72 / ₹105 at ₹150 / ₹265 / ₹360', () => {
    expect(middlemanMargin(150)).toBe(33);
    expect(middlemanMargin(265)).toBe(72);
    expect(middlemanMargin(360)).toBe(105);
  });

  it('self-ship saves ₹60 (23%) on a ₹265 order', () => {
    const s = savingPerOrder(265, 'selfShip');
    expect(s.saving).toBe(60);
    expect(Math.round(s.pctOfPrice)).toBe(23);
  });

  it('Pack Point saves ₹42 (16%) on a ₹265 order', () => {
    const s = savingPerOrder(265, 'packPoint');
    expect(s.saving).toBe(42);
    expect(Math.round(s.pctOfPrice)).toBe(16);
  });
});

describe('deck worked numbers: category scores', () => {
  it('91 / 85 / 75 / 75 / 53 / 46', () => {
    expect(SCORECARD.map((c) => Math.round(categoryScore(c.ratings)))).toEqual([91, 85, 75, 75, 53, 46]);
  });

  it('weights change the score', () => {
    const apparel = SCORECARD.find((c) => c.id === 'apparel')!;
    const lessReturns = { spec: 30, savings: 5, margin: 25, reach: 40 };
    expect(categoryScore(apparel.ratings, lessReturns)).toBeGreaterThan(categoryScore(apparel.ratings));
  });
});

describe('deck worked numbers: platform', () => {
  it('183.4 Cr × 39.8% ≈ 73 Cr orders', () => {
    expect(Math.round(exposureOrdersCr())).toBe(73);
  });

  it('₹170 per RTO ÷ ₹8.09 ≈ 21 orders of contribution', () => {
    expect(costPerRto()).toBe(170);
    expect(Math.round(ordersOfContributionPerAvoidedRto())).toBe(21);
  });

  it('blended RTO is 17.8%', () => {
    expect(blendedRto() * 100).toBeCloseTo(17.8, 1);
  });

  it('payout lands 7 days after delivery; TCS/TDS withheld as credits', () => {
    expect(payoutDay(24)).toBe(31);
    const w = withheldCredits(1000);
    expect(w.tcs).toBeCloseTo(5, 5);
    expect(w.tds).toBeCloseTo(1, 5);
    expect(w.netPaid).toBeCloseTo(994, 5);
  });

  it('steady state ≈ 81 Cr; with apparel ≈ 147 Cr', () => {
    const m = C.ORDER_MIX_PCT.value;
    const steady = m.homeKitchen + m.footwearAccessories + m.bpc;
    expect(Math.round(exposureOrdersCr(steady))).toBe(81);
    expect(Math.round(exposureOrdersCr(steady + m.apparel))).toBe(147);
  });
});

describe('Price Integrity Layer', () => {
  const listing = (sellerId: string, pricePerUnit: number, deliveredOrders = 50, extra: Partial<BListing> = {}): BListing => ({
    sellerId,
    pricePerUnit,
    deliveredOrders,
    aboveQualityFloor: true,
    sameSpec: true,
    ...extra,
  });

  it('B is the order-weighted 25th percentile and applies exclusions', () => {
    const r = benchmarkB(
      [
        listing('a', 150),
        listing('b', 160),
        listing('c', 170),
        listing('d', 180),
        listing('hero', 120),
        listing('e', 100, 5),
        listing('f', 90, 50, { aboveQualityFloor: false }),
        listing('g', 80, 50, { sameSpec: false }),
      ],
      { excludeSellerId: 'hero' },
    );
    expect(r.B).toBe(150);
    expect(r.included).toHaveLength(4);
    expect(r.excluded.map((x) => x.listing.sellerId).sort()).toEqual(['e', 'f', 'g', 'hero']);
  });

  it('a rival dumping big volume at a low price is capped and does not drag B', () => {
    const base = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((s, i) => listing(s, 150 + 2 * i));
    const before = benchmarkB(base).B;
    const after = benchmarkB([...base, listing('dumper', 99, 5000)]).B;
    // Uncapped, the dumper's 5,000 orders would set B at ₹99.
    expect(benchmarkB([...base, listing('dumper', 99, 5000)], { sellerWeightCapPct: 100 }).B).toBe(99);
    expect(after).toBeGreaterThanOrEqual(150);
    expect(before - after).toBeLessThanOrEqual(0.05 * before);
  });

  it('price drop delivered: Σ(B − price) × orders ÷ Σ orders', () => {
    expect(priceDropDelivered([
      { B: 160, price: 148, orders: 10 },
      { B: 160, price: 140, orders: 10 },
    ])).toBe(16);
    expect(priceDropDelivered([])).toBe(0);
  });
});

describe('launch metrics and the organising formula', () => {
  it('stick rate and lift', () => {
    expect(stickRate(6, 10)).toBe(0.6);
    expect(stickRate(6, 0)).toBe(0);
    expect(lift(15, 10)).toBe(1.5);
  });

  it('likely share: median and p25–p75, Low confidence when history is thin', () => {
    const hist = [0.1, 0.15, 0.2, 0.25, 0.3].map((r) => ({ firstOrders28: r * 100, openGapAtLaunch: 100 }));
    const s = likelyShare(hist);
    expect(s.median).toBeCloseTo(0.2, 5);
    expect(s.low).toBeCloseTo(0.15, 5);
    expect(s.high).toBeCloseTo(0.25, 5);
    expect(s.confidence).toBe('Medium');
    expect(likelyShare(hist.slice(0, 2)).confidence).toBe('Low');
  });

  it('C2M contribution multiplies the five terms', () => {
    expect(
      c2mContribution({ makersOnboarded: 100, activeShareD30: 0.5, ordersPerMaker: 10, priceDropPerOrder: 12, retainedShareD90: 0.6 }),
    ).toBeCloseTo(3600, 5);
  });

  it('percentile interpolates', () => {
    expect(percentile([1, 2, 3, 4, 5], 25)).toBe(2);
    expect(percentile([10, 20], 50)).toBe(15);
  });
});

describe('simulation formulas', () => {
  it('onboarding boost tapers from 1 + amplitude to 1 over the 3–6 month midpoint', () => {
    const amp = C.SIM_BOOST_AMPLITUDE.value;
    expect(boostTaperDays()).toBe(135);
    expect(boostFactor(-1)).toBe(1);
    expect(boostFactor(0)).toBeCloseTo(1 + amp, 9);
    expect(boostFactor(135)).toBe(1);
    expect(boostFactor(200)).toBe(1);
  });

  it('listing quality: CTR at the median = 1; the hero’s 1.6% vs 4.2% ≈ 0.69', () => {
    expect(listingQualityFactor(4.2, 4.2)).toBeCloseTo(1, 9);
    expect(listingQualityFactor(1.6, 4.2)).toBeCloseTo(0.690, 3);
  });

  it('price factor: at B = 1, below B > 1, above B < 1', () => {
    expect(priceFactor(160, 160)).toBe(1);
    expect(priceFactor(148, 160)).toBeCloseTo(1.15, 9);
    expect(priceFactor(170, 160)).toBeLessThan(1);
  });

  it('launch multiplier applies in launch districts on live days only', () => {
    expect(launchMultiplier(21, true, 2)).toBe(2);
    expect(launchMultiplier(25, true, 2)).toBe(2);
    expect(launchMultiplier(26, true, 2)).toBe(1);
    expect(launchMultiplier(22, false, 2)).toBe(1);
  });

  it('expected daily demand multiplies the factors', () => {
    expect(expectedDailyDemand({ openGapPerWeek: 385, likelyShare: 0.2, launch: 1, boost: 1, quality: 1, price: 1 })).toBeCloseTo(11, 9);
    expect(expectedDailyDemand({ openGapPerWeek: 385, likelyShare: 0.2, launch: 2, boost: 1.5, quality: 0.5, price: 1, other: 2 })).toBeCloseTo(33, 9);
  });

  it('RTO probability reproduces the blended 17.8% from the filing', () => {
    expect(100 * rtoProbability(C.COD_SHARE_PCT.value, codFailPct(), prepaidFailPct())).toBeCloseTo(17.8, 1);
  });

  it('prices held, forecast attainment, trend', () => {
    expect(pricesHeldShare([{ price: 148, B: 160 }, { price: 170, B: 160 }])).toBe(0.5);
    expect(forecastAttainment(90, 150)).toBeCloseTo(0.6, 9);
    expect(trendFactor(Array(20).fill(10))).toBe(1);
    expect(trendFactor([...Array(14).fill(10), ...Array(14).fill(10)])).toBe(1);
    expect(trendFactor([...Array(14).fill(10), ...Array(14).fill(40)])).toBe(1.25);
  });

  it('payout per kept order: price − shipping & fee, TCS/TDS withheld on the taxable value', () => {
    const p = orderPayout(148, 32);
    expect(p.gross).toBe(116);
    expect(p.tcs).toBeCloseTo((148 / 1.05) * 0.005, 9);
    expect(p.tds).toBeCloseTo((148 / 1.05) * 0.001, 9);
  });

  it('first restock check on day 33, first coach review on day 38', () => {
    expect(firstRestockCheckDay()).toBe(C.HERO_RESTOCK_DAY.value);
    expect(firstCoachDay()).toBe(38);
  });

  it('NAD breach above 1.5× norm; B excludes sale days', () => {
    expect(nadBreached(0.04, 0.026)).toBe(true);
    expect(nadBreached(0.03, 0.026)).toBe(false);
    const r = benchmarkB([
      { sellerId: 'a', pricePerUnit: 160, deliveredOrders: 50, aboveQualityFloor: true, sameSpec: true },
      { sellerId: 's', pricePerUnit: 100, deliveredOrders: 500, aboveQualityFloor: true, sameSpec: true, saleDay: true },
    ]);
    expect(r.B).toBe(160);
    expect(r.excluded[0]!.reason).toBe('Sale days excluded');
  });
});

describe('Pack Point partner economics', () => {
  it('cost breakdown adds up to the monthly cost', () => {
    for (const m of [20, 40, 60, 80]) {
      const c = packPointCost(m);
      const b = c.breakdown;
      expect(b.staff + b.rent + b.consumables + b.equipment + b.utilities).toBeCloseTo(c.monthlyCost, 6);
    }
  });

  it('at each published tier the partner earns about its 18% margin on cost', () => {
    for (const m of [20, 40, 60, 80]) {
      const p = packPointPnl(m);
      expect(p.profit).toBeGreaterThan(0);
      expect(p.revenue / p.cost - 1).toBeGreaterThan(0.15);
      expect(p.revenue / p.cost - 1).toBeLessThan(0.21);
    }
  });

  it('break-even node size exists and is below the reference node', () => {
    const be = packPointBreakEvenMakers();
    expect(be).not.toBeNull();
    expect(be!).toBeLessThanOrEqual(C.PP_REFERENCE_MAKERS.value);
    expect(packPointPnl(be!).profit).toBeGreaterThanOrEqual(0);
  });

  it('grade B share of resellable returns', () => {
    expect(gradeShareB(10)).toBeCloseTo(10 * C.PP_GRADE_B_SHARE.value, 9);
  });
});

describe('seeded RNG', () => {
  it('same seed → same sequence; different seed → different', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
