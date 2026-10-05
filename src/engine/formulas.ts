/**
 * Every derived number in the prototype is computed here, by a pure function with a
 * unit test. Defaults come from `src/data/constants.ts`. `FORMULA_INFO` describes each
 * formula for Verify mode.
 */
import { C, type Range } from '../data/constants';
import type { CategoryRatings } from '../data/categories';

// ───────────────────────── helpers ─────────────────────────

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** Percentile with linear interpolation between closest ranks (Excel PERCENTILE.INC). `p` in 0–100. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  return a + (b - a) * (rank - lo);
}

export const median = (values: readonly number[]) => percentile(values, 50);

/** Round down to a multiple of `step` (production lots). */
export const roundDownTo = (x: number, step: number) => Math.floor(x / step) * step;

const pct = (x: number) => x / 100;

// ───────────────────────── platform ─────────────────────────

/** Blended RTO share from the COD/prepaid mix: COD share × COD fail + prepaid share × prepaid fail. */
export function blendedRto(
  codSharePct = C.COD_SHARE_PCT.value,
  codSuccessPct = C.COD_SUCCESS_PCT.value,
  prepaidSuccessPct = C.PREPAID_SUCCESS_PCT.value,
): number {
  const cod = pct(codSharePct);
  return cod * (1 - pct(codSuccessPct)) + (1 - cod) * (1 - pct(prepaidSuccessPct));
}

/** Cost of one RTO to the system: forward + reverse. */
export const costPerRto = (forward = C.RTO_FORWARD_COST.value, reverse = C.RTO_REVERSE_COST.value) => forward + reverse;

/** How many orders of Meesho contribution one avoided RTO is worth. */
export const ordersOfContributionPerAvoidedRto = (
  rtoCost = costPerRto(),
  contribution = C.CONTRIBUTION_PER_ORDER.value,
) => rtoCost / contribution;

/** Orders (crore) exposed to C2M given a category share of FY25 orders. */
export const exposureOrdersCr = (sharePct = C.YEAR_ONE_EXPOSURE_PCT.value, placedCr = C.PLACED_ORDERS_FY25_CR.value) =>
  placedCr * pct(sharePct);

/** Payout lands this many days after delivery. */
export const payoutDay = (deliveryDay: number, cycle = C.PAYMENT_CYCLE_DAYS.value) => deliveryDay + cycle;

/** TCS and TDS withheld from a payout: claimable credits, not costs. */
export function withheldCredits(grossPayout: number, tcsPct = C.GST_TCS_PCT.value, tdsPct = C.INCOME_TAX_TDS_PCT.value) {
  const tcs = grossPayout * pct(tcsPct);
  const tds = grossPayout * pct(tdsPct);
  return { tcs, tds, total: tcs + tds, netPaid: grossPayout - tcs - tds };
}

// ───────────────────────── Price Integrity Layer ─────────────────────────

export interface BListing {
  sellerId: string;
  /** Delivered price per unit, net of platform-funded coupons. */
  pricePerUnit: number;
  /** Delivered orders in the window, sale days excluded. */
  deliveredOrders: number;
  aboveQualityFloor: boolean;
  /** Same spec as the product type (like-for-like). */
  sameSpec: boolean;
  /** Orders from sale days are excluded from B. */
  saleDay?: boolean;
}

export interface BOptions {
  /** The maker whose own orders are excluded. */
  excludeSellerId?: string;
  minDeliveredOrders?: number;
  percentileP?: number;
  /** Max share of the order weight any one seller can carry. */
  sellerWeightCapPct?: number;
}

export interface BResult {
  B: number;
  included: BListing[];
  excluded: { listing: BListing; reason: string }[];
}

/**
 * Benchmark B: the order-weighted 25th-percentile delivered price per unit, same spec,
 * among listings with ≥ N delivered orders and above the quality floor, the maker's own
 * orders excluded. Each seller's weight is capped so one seller can't drag B.
 */
export function benchmarkB(listings: readonly BListing[], opts: BOptions = {}): BResult {
  const {
    excludeSellerId,
    minDeliveredOrders = C.B_MIN_DELIVERED_ORDERS.value,
    percentileP = C.B_PERCENTILE.value,
    sellerWeightCapPct = C.B_SELLER_WEIGHT_CAP_PCT.value,
  } = opts;
  const included: BListing[] = [];
  const excluded: BResult['excluded'] = [];
  for (const l of listings) {
    if (l.sellerId === excludeSellerId) excluded.push({ listing: l, reason: "Maker's own orders" });
    else if (l.saleDay) excluded.push({ listing: l, reason: 'Sale days excluded' });
    else if (!l.sameSpec) excluded.push({ listing: l, reason: 'Different spec' });
    else if (!l.aboveQualityFloor) excluded.push({ listing: l, reason: 'Below quality floor' });
    else if (l.deliveredOrders < minDeliveredOrders) excluded.push({ listing: l, reason: `Fewer than ${minDeliveredOrders} delivered orders` });
    else included.push(l);
  }
  if (included.length === 0) return { B: NaN, included, excluded };

  // Per-seller weight cap: no seller carries more than cap% of the capped total,
  // i.e. a seller's weight ≤ cap ÷ (1 − cap) × everyone else's weight.
  const raw = new Map<string, number>();
  for (const l of included) raw.set(l.sellerId, (raw.get(l.sellerId) ?? 0) + l.deliveredOrders);
  const capped = new Map(raw);
  // With fewer sellers than 1 ÷ cap, the cap can't be met; fall back to an equal share.
  const share = Math.max(pct(sellerWeightCapPct), 1 / raw.size);
  for (let pass = 0; pass < raw.size; pass++) {
    const total = sum([...capped.values()]);
    let changed = false;
    for (const [seller, w] of capped) {
      const limit = (share / (1 - share)) * (total - w);
      if (w > limit + 1e-9) {
        capped.set(seller, limit);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const weighted = included.map((l) => ({
    price: l.pricePerUnit,
    w: l.deliveredOrders * (capped.get(l.sellerId)! / raw.get(l.sellerId)!),
  }));

  return { B: weightedPercentile(weighted, percentileP), included, excluded };
}

/** Weighted percentile: the lowest price at which cumulative weight reaches p% of the total. */
export function weightedPercentile(points: readonly { price: number; w: number }[], p: number): number {
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const total = sum(sorted.map((x) => x.w));
  const target = total * pct(p);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= target) return x.price;
  }
  return sorted[sorted.length - 1]?.price ?? NaN;
}

export type BandVerdict = 'in-band' | 'below-break-even' | 'above-B';

/** Price band check: breakEven ≤ price ≤ B. */
export function priceBand(price: number, breakEven: number, B: number): { verdict: BandVerdict; low: number; high: number } {
  const verdict: BandVerdict = price < breakEven ? 'below-break-even' : price > B ? 'above-B' : 'in-band';
  return { verdict, low: breakEven, high: B };
}

/** Price drop per delivered order, ₹: Σ(B − price) × orders ÷ Σ orders. */
export function priceDropDelivered(rows: readonly { B: number; price: number; orders: number }[]): number {
  const orders = sum(rows.map((r) => r.orders));
  return orders === 0 ? 0 : sum(rows.map((r) => (r.B - r.price) * r.orders)) / orders;
}

/** Price drop as % of B, order-weighted (the cohort north star). */
export function priceDropPctOfB(rows: readonly { B: number; price: number; orders: number }[]): number {
  const orders = sum(rows.map((r) => r.orders));
  return orders === 0 ? 0 : (100 * sum(rows.map((r) => ((r.B - r.price) / r.B) * r.orders))) / orders;
}

// ───────────────────────── cost stack ─────────────────────────

export interface CostStack {
  makingCost: number;
  packaging: number;
  shippingAndFee: number;
  returnsBuffer: number;
}

export const heroCostStack = (): CostStack => ({
  makingCost: C.HERO_MAKING_COST.value,
  packaging: C.HERO_PACKAGING.value,
  shippingAndFee: C.HERO_SHIPPING_AND_FEE.value,
  returnsBuffer: C.HERO_RETURNS_BUFFER.value,
});

const stackTotal = (s: CostStack) => s.makingCost + s.packaging + s.shippingAndFee + s.returnsBuffer;

/** GST contained in a GST-inclusive price. */
export const gstInsidePrice = (price: number, gstRatePct = C.GST_RATE_PCT.value) => (price * pct(gstRatePct)) / (1 + pct(gstRatePct));

/** Break-even list price: the price at which take-home is zero (GST inside the price). */
export const breakEven = (stack: CostStack, gstRatePct = C.GST_RATE_PCT.value) => stackTotal(stack) * (1 + pct(gstRatePct));

/** List price from cost stack + margin, GST added on top; rounded to the rupee. */
export const listPrice = (stack: CostStack, margin: number, gstRatePct = C.GST_RATE_PCT.value) =>
  Math.round((stackTotal(stack) + margin) * (1 + pct(gstRatePct)));

export type CostVerdict = 'pass' | 'nearMiss' | 'notFit';

/**
 * Cost check verdict against B: pass (list price ≤ B), near miss (break-even ≤ B but the asked margin
 * pushes price above B: lower the margin to `maxMargin`), not a fit (break-even above B).
 */
export function costCheck(stack: CostStack, margin: number, B: number, gstRatePct = C.GST_RATE_PCT.value) {
  const be = breakEven(stack, gstRatePct);
  const price = listPrice(stack, margin, gstRatePct);
  const maxMargin = Math.floor(B / (1 + pct(gstRatePct)) - stackTotal(stack));
  const verdict: CostVerdict = be > B ? 'notFit' : price > B ? 'nearMiss' : 'pass';
  return { verdict, breakEven: be, price, maxMargin, takeHome: takeHome(price, stack, gstRatePct) };
}

/** What the maker keeps per unit at a list price. */
export const takeHome = (price: number, stack: CostStack, gstRatePct = C.GST_RATE_PCT.value) =>
  price - gstInsidePrice(price, gstRatePct) - stackTotal(stack);

/**
 * Take-home per unit on Meesho vs Amazon for the same product and the same ex-works cost:
 * only the fee stack differs (Meesho: 0% commission, shipping & fixed fee; Amazon: referral %, closing fee, shipping).
 */
export function channelTakeHome(
  meeshoPrice: number,
  amazonPrice: number,
  stack: CostStack,
  gstRatePct = C.GST_RATE_PCT.value,
) {
  const own = stack.makingCost + stack.packaging + stack.returnsBuffer;
  const meeshoFees = meeshoPrice * pct(C.COMMISSION_PCT.value) + stack.shippingAndFee;
  const amazonFees = amazonPrice * pct(C.AMZ_REFERRAL_PCT.value) + C.AMZ_CLOSING_FEE.value + C.AMZ_SHIPPING_FEE.value;
  const meesho = meeshoPrice - gstInsidePrice(meeshoPrice, gstRatePct) - meeshoFees - own;
  const amazon = amazonPrice - gstInsidePrice(amazonPrice, gstRatePct) - amazonFees - own;
  return { meesho, amazon, meeshoFees, amazonFees, exWorks: stack.makingCost };
}

// ───────────────────────── Demand Intelligence Engine ─────────────────────────

export const openGap = (unservedDemand: number, committedSupply: number) => unservedDemand - committedSupply;

export type Confidence = 'High' | 'Medium' | 'Low';

export interface LikelyShare {
  median: number;
  low: number;
  high: number;
  confidence: Confidence;
}

/**
 * likelyShare = median over past launches of (first-28-day orders ÷ open gap at launch),
 * adjusted for price position and number of entrants; range is the 25th–75th percentile.
 */
export function likelyShare(
  history: readonly { firstOrders28: number; openGapAtLaunch: number }[],
  adjust: { pricePosition?: number; entrants?: number } = {},
): LikelyShare {
  const factor = (adjust.pricePosition ?? 1) * (adjust.entrants ?? 1);
  const ratios = history.filter((h) => h.openGapAtLaunch > 0).map((h) => (h.firstOrders28 / h.openGapAtLaunch) * factor);
  const minHistory = C.LIKELY_SHARE_MIN_HISTORY.value;
  const confidence: Confidence = ratios.length < minHistory ? 'Low' : ratios.length < 2 * minHistory ? 'Medium' : 'High';
  if (ratios.length === 0) return { median: 0, low: 0, high: 0, confidence: 'Low' };
  return {
    median: median(ratios),
    low: percentile(ratios, C.LIKELY_SHARE_LOW_PCT.value),
    high: percentile(ratios, C.LIKELY_SHARE_HIGH_PCT.value),
    confidence,
  };
}

/** Expected daily orders per SKU = open gap (per week) ÷ 7 × likely share. */
export const expectedDailyPerSku = (openGapPerWeek: number, share: number) => (openGapPerWeek / 7) * share;

/** Committed supply ≥ 90% of the gap → crowded. */
export const isCrowded = (committed: number, gap: number, threshold = C.CROWDED_SHARE.value) => gap <= 0 || committed >= threshold * gap;

/**
 * Suggested first lot ≈ 14 days of expected sales, picked from the range, rounded down to
 * the lot step, never below the minimum run. No cash question.
 */
export function firstLot(
  daily: Range,
  minRun: number,
  days = C.FIRST_LOT_DAYS.value,
  step = C.LOT_ROUNDING_UNITS.value,
): { low: number; high: number; suggested: number } {
  const low = Math.round(daily.min * days);
  const high = Math.round(daily.max * days);
  const suggested = Math.max(minRun, roundDownTo((low + high) / 2, step));
  return { low, high, suggested };
}

// ───────────────────────── Growth loop ─────────────────────────

/** Run rate = last 7 days ÷ 7, times a trend factor from the 28-day slope (1 = flat). */
export const runRate = (last7DaysOrders: number, trendFactor = 1, window = C.RUN_RATE_WINDOW_DAYS.value) =>
  (last7DaysOrders / window) * trendFactor;

/** Reorder point = run rate × (lead time + safety days). */
export const reorderPoint = (rate: number, leadTimeDays: number, safetyDays: number) => Math.round(rate * (leadTimeDays + safetyDays));

/** Next batch ≈ run rate × 21, rounded down to the lot step, never below minimum run, capped by the open gap. */
export function nextBatch(
  rate: number,
  minRun: number,
  openGapCap = Infinity,
  days = C.NEXT_BATCH_DAYS.value,
  step = C.LOT_ROUNDING_UNITS.value,
): number {
  return Math.min(Math.max(minRun, roundDownTo(rate * days, step)), openGapCap);
}

/** Stick rate = launched SKU orders/day (days 26–30) ÷ established SKU median orders/day, same type and days. */
export const stickRate = (launchedPerDay: number, establishedMedianPerDay: number) =>
  establishedMedianPerDay === 0 ? 0 : launchedPerDay / establishedMedianPerDay;

/** Demand lift = orders in launch districts ÷ orders in control districts (normalised per district). */
export const lift = (launchOrdersPerDistrict: number, controlOrdersPerDistrict: number) =>
  controlOrdersPerDistrict === 0 ? 0 : launchOrdersPerDistrict / controlOrdersPerDistrict;

export const sellThrough = (sold: number, stocked: number) => (stocked === 0 ? 0 : sold / stocked);

// ───────────────────────── Pack Point ─────────────────────────

export interface PackPointCost {
  makers: number;
  ordersPerMonth: number;
  ordersPerDay: number;
  packers: number;
  handlers: number;
  staff: number;
  areaSqft: number;
  monthlyCost: number;
  costPerOrder: number;
}

/** Monthly cost and cost per order handled for a node with `makers` pooled. */
export function packPointCost(makers: number): PackPointCost {
  const ordersPerMonth = makers * C.PP_ORDERS_PER_MAKER_MONTH.value;
  const ordersPerDay = ordersPerMonth / C.PP_WORKING_DAYS.value;
  const packers = Math.max(1, Math.ceil(ordersPerDay / C.PP_ORDERS_PER_PACKER_DAY.value));
  const handlers = Math.max(1, Math.ceil(ordersPerDay / C.PP_ORDERS_PER_HANDLER_DAY.value));
  const staffCost = packers * C.PP_PACKER_SALARY.value + handlers * C.PP_HANDLER_SALARY.value + C.PP_SUPERVISOR_SALARY.value;
  const areaSqft = C.PP_FIXED_AREA_SQFT.value + (makers * C.PP_UNITS_ON_HAND_PER_MAKER.value) / C.PP_UNITS_PER_SQFT.value;
  const rent = areaSqft * C.PP_RENT_PER_SQFT.value;
  const consumables = ordersPerMonth * C.PP_CONSUMABLES_PER_ORDER.value;
  const equipment = C.PP_EQUIPMENT_COST.value / C.PP_EQUIPMENT_MONTHS.value;
  const monthlyCost = staffCost + rent + consumables + equipment + C.PP_UTILITIES.value;
  return {
    makers,
    ordersPerMonth,
    ordersPerDay,
    packers,
    handlers,
    staff: packers + handlers + 1,
    areaSqft,
    monthlyCost,
    costPerOrder: ordersPerMonth === 0 ? NaN : monthlyCost / ordersPerMonth,
  };
}

/** Fee per order handled (cost + partner margin) and per delivered order (÷ (1 − RTO)). */
export function packPointFee(makers: number, rto = blendedRto()) {
  const perHandled = packPointCost(makers).costPerOrder * (1 + pct(C.PP_PARTNER_MARGIN_PCT.value));
  return { perHandled, perDelivered: perHandled / (1 - rto) };
}

/** The published fee a maker pays: steps at each tier (20/40/60/80 makers); below 20 the 20-maker fee. */
export function packPointFeeTier(makers: number): { tierMakers: number; fee: number } {
  const tiers = C.PP_FEE_TIER_MAKERS.value;
  let tier = tiers[0]!;
  for (const t of tiers) if (makers >= t) tier = t;
  return { tierMakers: tier, fee: Math.round(packPointFee(tier).perDelivered) };
}

/** Storage charge: free for 30 days, then ₹0.29 per unit per day. */
export const storageCost = (units: number, daysStored: number) =>
  units * Math.max(0, daysStored - C.PP_STORAGE_FREE_DAYS.value) * C.PP_STORAGE_PER_UNIT_DAY.value;

// ───────────────────────── buyer saving ─────────────────────────

/** Middleman margin at an order price, interpolated between the team's reference points. */
export function middlemanMargin(price: number): number {
  const pts = C.MIDDLEMAN_MARGIN_BY_PRICE.value;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (price <= first.price) return (first.margin / first.price) * price;
  if (price >= last.price) return (last.margin / last.price) * price;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (price <= b.price) return a.margin + ((b.margin - a.margin) * (price - a.price)) / (b.price - a.price);
  }
  return last.margin;
}

/** Saving per order a maker can pass on: middleman margin minus own packing/returns (self-ship) or the Pack Point fee. */
export function savingPerOrder(price = C.AOV.value, mode: 'selfShip' | 'packPoint', packPointMakers = C.PP_REFERENCE_MAKERS.value) {
  const fulfilment = mode === 'selfShip' ? C.SELF_SHIP_OWN_COST.value : packPointFeeTier(packPointMakers).fee;
  const saving = middlemanMargin(price) - fulfilment;
  return { saving, pctOfPrice: (100 * saving) / price };
}

/** Pack Point recommended only above the price threshold. */
export const packPointRecommended = (price: number) => price > C.PACK_POINT_MIN_PRICE.value;

// ───────────────────────── categories and the organising formula ─────────────────────────

/** Category score = Σ (rating / 5 × weight). */
export function categoryScore(ratings: CategoryRatings, weights: CategoryRatings = C.CATEGORY_WEIGHTS_PCT.value): number {
  const max = C.CATEGORY_RATING_MAX.value;
  return (
    (ratings.spec / max) * weights.spec +
    (ratings.savings / max) * weights.savings +
    (ratings.margin / max) * weights.margin +
    (ratings.reach / max) * weights.reach
  );
}

export interface C2MTerms {
  makersOnboarded: number;
  activeShareD30: number;
  ordersPerMaker: number;
  priceDropPerOrder: number;
  retainedShareD90: number;
}

/** C2M price contribution = makers × active share d30 × orders per maker × price drop per order × retained share d90. */
export const c2mContribution = (t: C2MTerms) =>
  t.makersOnboarded * t.activeShareD30 * t.ordersPerMaker * t.priceDropPerOrder * t.retainedShareD90;

// ───────────────────────── simulation demand and fulfilment ─────────────────────────

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Days over which the onboarding boost tapers to zero (midpoint of 3–6 months). */
export const boostTaperDays = () =>
  ((C.ONBOARDING_BOOST_MONTHS.value.min + C.ONBOARDING_BOOST_MONTHS.value.max) / 2) * C.DAYS_PER_MONTH.value;

/** Meesho's existing onboarding boost: 1 + amplitude at go-live, tapering linearly to 1. */
export const boostFactor = (daysSinceLive: number, amplitude = C.SIM_BOOST_AMPLITUDE.value, taperDays = boostTaperDays()) =>
  daysSinceLive < 0 ? 1 : 1 + amplitude * Math.max(0, 1 - daysSinceLive / taperDays);

/** Listing quality from CTR vs the product-type median: 1 − w + w × ctr ÷ median. */
export const listingQualityFactor = (ctrPct: number, typeMedianCtrPct: number, weight = C.SIM_LISTING_QUALITY_WEIGHT.value) =>
  clamp(1 - weight + (weight * ctrPct) / typeMedianCtrPct, 0.3, 1.3);

/** Price factor: listing below B sells more, above B sells less. */
export const priceFactor = (price: number, B: number, elasticity = C.SIM_PRICE_ELASTICITY.value) =>
  clamp(1 + (elasticity * (B - price)) / B, 0.2, 1.5);

/** Launch multiplier: launch districts only, live days only. */
export function launchMultiplier(day: number, isLaunchDistrict: boolean, multiplier = C.SIM_LAUNCH_MULTIPLIER.value): number {
  const live = C.LAUNCH_LIVE_DAYS.value;
  return isLaunchDistrict && day >= live.min && day <= live.max ? multiplier : 1;
}

/** Expected daily orders = open gap ÷ 7 × likely share × launch × boost × listing quality × price × other factors. */
export const expectedDailyDemand = (f: {
  openGapPerWeek: number;
  likelyShare: number;
  launch: number;
  boost: number;
  quality: number;
  price: number;
  other?: number;
}) => expectedDailyPerSku(f.openGapPerWeek, f.likelyShare) * f.launch * f.boost * f.quality * f.price * (f.other ?? 1);

/** RTO probability from the COD/prepaid mix and each mode's failure rate (all in %). */
export const rtoProbability = (codSharePct: number, codFailPct: number, prepaidFailPct: number) =>
  pct(codSharePct) * pct(codFailPct) + (1 - pct(codSharePct)) * pct(prepaidFailPct);

/** COD failure rate implied by the filing (100 − COD success). */
export const codFailPct = () => 100 - C.COD_SUCCESS_PCT.value;
export const prepaidFailPct = () => 100 - C.PREPAID_SUCCESS_PCT.value;

/** Share of SKU-days where price stayed at or below B. */
export function pricesHeldShare(days: readonly { price: number; B: number }[]): number {
  return days.length === 0 ? 1 : days.filter((d) => d.price <= d.B).length / days.length;
}

/** Forecast attainment = actual orders ÷ forecast orders. */
export const forecastAttainment = (actual: number, forecast: number) => (forecast === 0 ? 0 : actual / forecast);

/** Run-rate trend: √(last 14 days ÷ prior 14 days), clamped; 1 when there isn't 28 days of post-launch history. */
export function trendFactor(postLaunchOrders: readonly number[]): number {
  if (postLaunchOrders.length < 28) return 1;
  const last = sum(postLaunchOrders.slice(-14));
  const prior = sum(postLaunchOrders.slice(-28, -14));
  return prior === 0 ? 1 : clamp(Math.sqrt(last / prior), 0.8, 1.25);
}

/** Rate of an event per base (refusals ÷ orders, returns ÷ deliveries), 0 when the base is empty. */
export const rate = (events: number, base: number) => (base === 0 ? 0 : events / base);

/** "Not as described" watch: NAD returns rate above 1.5 × the category norm. */
export const nadBreached = (nadRate: number, normRate: number, multiple = C.NAD_RETURN_MULTIPLE.value) => nadRate > multiple * normRate;

/** Pack Point fee a maker pays per delivered order for the node's current size. */
export const packPointFeeFor = (nodeMakers: number) => packPointFeeTier(nodeMakers).fee;

/** Payout on a kept order: price − shipping & fixed fee, with TCS/TDS withheld on the taxable value. */
export function orderPayout(price: number, shippingAndFee: number, gstRatePct = C.GST_RATE_PCT.value) {
  const gross = price - shippingAndFee;
  const taxable = price - gstInsidePrice(price, gstRatePct);
  const credits = withheldCredits(taxable);
  return { gross, tcs: credits.tcs, tds: credits.tds, netPaid: gross - credits.tcs - credits.tds };
}

/** Committed weekly supply from a lot (a first lot ≈ 14 days of sales). */
export const committedPerWeekFromLot = (lot: number, lotDays = C.FIRST_LOT_DAYS.value) => (lot * 7) / lotDays;

/** First day of growth-loop restock checks: needs one full post-launch week of run rate. */
export const firstRestockCheckDay = () => C.LAUNCH_LIVE_DAYS.value.max + C.RUN_RATE_WINDOW_DAYS.value + 1;

/** First weekly coach review: one week after the growth loop starts (the day after Gate 1). */
export const firstCoachDay = () => C.GATE_DAYS.value[0]! + 1 + C.RUN_RATE_WINDOW_DAYS.value;

// ───────────────────────── Verify-mode descriptions ─────────────────────────

export interface FormulaInfo {
  label: string;
  expression: string;
}

export const FORMULA_INFO = {
  blendedRto: { label: 'Blended RTO', expression: 'COD share × (1 − COD success) + prepaid share × (1 − prepaid success)' },
  costPerRto: { label: 'Cost of one RTO', expression: 'forward cost + reverse cost' },
  ordersPerAvoidedRto: { label: 'Orders of contribution per avoided RTO', expression: 'cost per RTO ÷ contribution per order' },
  exposure: { label: 'Year-one order exposure', expression: 'placed orders FY25 × year-one exposure %' },
  benchmarkB: {
    label: 'Benchmark B',
    expression: '25th-percentile delivered price per unit, same spec, ≥ N delivered orders, above quality floor, own orders excluded, 28 days, sale days excluded, per-seller weight cap',
  },
  priceBand: { label: 'Price band', expression: 'break-even ≤ price ≤ B' },
  breakEven: { label: 'Break-even price', expression: '(making + packaging + shipping & fee + returns buffer) × (1 + GST)' },
  listPrice: { label: 'List price', expression: '(cost stack + margin) × (1 + GST)' },
  takeHome: { label: 'Take-home per unit', expression: 'price − GST inside price − cost stack' },
  openGap: { label: 'Open gap', expression: 'unserved demand − committed supply' },
  likelyShare: { label: 'Likely share', expression: 'median of (first-28-day orders ÷ open gap at launch), adjusted; range p25–p75' },
  expectedDaily: { label: 'Expected daily orders per SKU', expression: 'open gap ÷ 7 × likely share' },
  firstLot: { label: 'Suggested first lot', expression: '14 days × expected daily (midpoint of range), rounded down to 10, ≥ minimum run' },
  reorderPoint: { label: 'Reorder point', expression: 'run rate × (lead time + safety days)' },
  nextBatch: { label: 'Next batch', expression: 'run rate × 21, rounded down to 10, ≥ minimum run, ≤ open gap' },
  stickRate: { label: 'Stick rate', expression: 'launched SKU orders/day (days 26–30) ÷ established SKU median orders/day' },
  lift: { label: 'Demand lift', expression: 'launch-district orders ÷ control-district orders' },
  priceDropDelivered: { label: 'Price drop delivered', expression: 'Σ (B − price) × orders ÷ Σ orders' },
  packPointCost: { label: 'Pack Point cost per order', expression: '(staff + rent + consumables + equipment + utilities) ÷ orders per month' },
  packPointFee: { label: 'Pack Point fee per delivered order', expression: 'cost per order × (1 + partner margin) ÷ (1 − RTO)' },
  storageCost: { label: 'Storage cost', expression: 'units × max(0, days − 30) × ₹0.29' },
  savingPerOrder: { label: 'Saving per order', expression: 'middleman margin − own packing/returns (self-ship) or Pack Point fee' },
  categoryScore: { label: 'Category score', expression: 'Σ (rating ÷ 5 × weight)' },
  expectedDailyDemand: {
    label: 'Expected daily orders (simulation)',
    expression: 'open gap ÷ 7 × likely share × launch multiplier × onboarding boost × listing quality × price factor',
  },
  rtoProbability: { label: 'RTO probability', expression: 'COD share × COD fail + prepaid share × prepaid fail' },
  pricesHeld: { label: 'Prices held', expression: 'SKU-days with price ≤ B ÷ live SKU-days' },
  forecastAttainment: { label: 'Forecast attainment', expression: 'actual orders ÷ forecast orders' },
  sellThrough: { label: 'Sell-through', expression: 'units sold ÷ units stocked' },
  orderPayout: { label: 'Payout per kept order', expression: 'price − shipping & fixed fee, TCS 0.5% and TDS 0.1% withheld as credits; paid 7 days after delivery' },
  c2m: {
    label: 'C2M price contribution',
    expression: 'makers onboarded × share active at day 30 × orders per maker × price drop per order × share retained at day 90',
  },
} satisfies Record<string, FormulaInfo>;

export type FormulaId = keyof typeof FORMULA_INFO;
