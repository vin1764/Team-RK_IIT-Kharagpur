/**
 * The simulation engine (CLAUDE.md section 10).
 *
 * simulate({ personaId, seed, overrides, scenario, counterfactual }) → { days, events, kpis, gates }
 *
 * A daily loop from Day −14 to Day 90. Deterministic: the same seed and settings always give
 * the same story. Weekly order totals follow the demand model; the seed only shapes day-to-day
 * noise, districts, return timing and buyer details. Every derived number goes through formulas.ts.
 */
import { C } from '../data/constants';
import { PERSONA_SPECS, type PersonaId, type PersonaSpec, type ReturnReason, type SkuSpec } from '../data/personas';
import { CATEGORY_CARDS, type CategoryId } from '../data/categories';
import { generateBTable, MAKER_SELLER_ID, type BTableRow } from '../data/generate/bTable';
import { generateDistricts, type District } from '../data/generate/districts';
import { generateCohort, cohortMetrics, type CohortMaker } from '../data/generate/cohort';
import { generateOutreach, FIRST_CONTACT, type OutreachFunnel } from '../data/generate/outreach';
import {
  benchmarkB,
  boostFactor,
  breakEven,
  channelTakeHome,
  committedPerWeekFromLot,
  expectedDailyDemand,
  expectedDailyPerSku,
  firstCoachDay,
  firstLot,
  gradeShareB,
  roundDownTo,
  firstRestockCheckDay,
  forecastAttainment,
  gstInsidePrice,
  isCrowded,
  lift,
  listingQualityFactor,
  listPrice,
  middlemanMargin,
  nadBreached,
  nextBatch,
  orderPayout,
  packPointFeeFor,
  packPointRecommended,
  priceBand,
  priceFactor,
  pricesHeldShare,
  rate,
  reorderPoint,
  rtoProbability,
  runRate,
  stickRate,
  storageCost,
  trendFactor,
  launchMultiplier,
} from './formulas';
import { mulberry32, randInt, type Rng } from './rng';
import { gate1, gate2, gate3, type Gate1Result, type Gate2Result, type Gate3Result } from './gates';
import type { ScenarioId } from './scenarios';
import { inr } from '../lib/format';

// ───────────────────────── public types ─────────────────────────

export interface Overrides {
  /** Margin the hero SKU asks for (changes list price). */
  margin?: number;
  launchMultiplier?: number;
  /** Multiplies all demand. */
  demandFactor?: number;
  /** Fixed node size for the whole run. */
  nodeMakers?: number;
}

export interface SimOptions {
  personaId: PersonaId;
  seed?: number;
  overrides?: Overrides;
  scenario?: ScenarioId;
  counterfactual?: boolean;
  /** Stop the loop early (category 30-day sims). */
  untilDay?: number;
}

export type Actor = 'maker' | 'system' | 'meesho' | 'buyer';

export type EventKind =
  | 'gapFound'
  | 'winBack'
  | 'crowded'
  | 'outreach'
  | 'costCheck'
  | 'signUp'
  | 'recordMismatch'
  | 'listingBot'
  | 'fulfilmentChoice'
  | 'orderBook'
  | 'commit'
  | 'stockIn'
  | 'live'
  | 'packLaterLinked'
  | 'stockOut'
  | 'forecastCheck'
  | 'restockPrompt'
  | 'batchArrived'
  | 'coachNudge'
  | 'fixRecheck'
  | 'kamCase'
  | 'newRule'
  | 'bMoved'
  | 'bHeld'
  | 'priceBreach'
  | 'visibilityCut'
  | 'nadFlag'
  | 'slowSeller'
  | 'switch'
  | 'switchLive'
  | 'nodeCross'
  | 'swapCaught'
  | 'slowStock'
  | 'churn'
  | 'gate';

export interface SimEvent {
  day: number;
  kind: EventKind;
  actor: Actor;
  skuId?: string;
  text: string;
  data?: Record<string, number | string | boolean>;
}

export interface SkuDay {
  day: number;
  skuId: string;
  live: boolean;
  stopped: boolean;
  price: number;
  B: number;
  inBand: boolean;
  impressions: number;
  clicks: number;
  ctrPct: number;
  demand: number;
  orders: number;
  ordersLaunch: number;
  ordersControl: number;
  byDistrict: number[];
  cod: number;
  prepaid: number;
  lostOrders: number;
  rto: number;
  delivered: number;
  /** Delivered units not returned (paid 7 days after delivery). */
  kept: number;
  /** Units paid out today. */
  paidUnits: number;
  returnRequests: number;
  returnsByReason: Record<ReturnReason, number>;
  onHand: number;
  inbound: number;
  inStockAtStart: boolean;
  codSharePct: number;
  rtoProbability: number;
  /** Returns arriving back today, graded: A as new, B after repack (Pack Point only), C write-off. */
  grades: { A: number; B: number; C: number };
  /** Customer returns physically arriving back today, by reason. */
  returnsArrived: Record<ReturnReason, number>;
  /** RTO units arriving back today. */
  rtoArrived: number;
}

export interface DayState {
  day: number;
  skus: SkuDay[];
  orders: number;
  delivered: number;
  rto: number;
  returns: number;
  onHand: number;
  money: {
    payoutNet: number;
    payoutsCum: number;
    creditsCum: number;
    takeHome: number;
    takeHomeCum: number;
    cashInStock: number;
    makingPaidCum: number;
    /** Cash in (payouts, recovered stock, claims) − cash out (stock made, packing, fees, GST remitted). Can be negative. */
    netCashCum: number;
    cashOutCum: number;
  };
  ledger: { unservedWeek: number; committedWeek: number; openGapWeek: number; crowded: boolean };
  nodeMakers: number;
  packPointFee: number;
  buyerSavedCum: number;
  buyerSavedVsResellerCum: number;
  meeshoContributionCum: number;
  kamCasesCum: number;
}

export interface Kpis {
  totalOrders: number;
  delivered: number;
  rto: number;
  rtoRatePct: number;
  returns: number;
  returnRatePct: number;
  lostOrders: number;
  stockOutDays: number;
  takeHome: number;
  payoutsNet: number;
  creditsClaimable: number;
  cashInStockEnd: number;
  unitsLeft: number;
  priceDropPctOfB: number;
  priceDropAtLaunchPct: number;
  buyerSaved: number;
  buyerSavedVsReseller: number;
  meeshoOrders: number;
  meeshoContribution: number;
  rtosAvoided: number;
  stickRateD30: number;
  liftX: number;
  sellThroughD30Pct: number;
  pricesHeldPct: number;
  forecastAttainmentD14Pct: number;
  nudgesSent: number;
  nudgesActed: number;
  fixesTried: number;
  fixesWorked: number;
  kamCases: number;
  newRules: string[];
  secondLotDay: number | null;
  /** Pack Point: average days a dispatched unit sat at the node (target ≤ 45). */
  ppDwellDays: number | null;
  ppGrades: { A: number; B: number; C: number };
  ppSlowStockUnits: number;
}

export interface Gates {
  g1?: Gate1Result;
  /** Day-30 rule re-applied after a Tighten (next Launch Week). */
  g1rerun?: Gate1Result;
  g2?: Gate2Result;
  g3?: Gate3Result & { cohort: ReturnType<typeof cohortMetrics> };
}

export interface GuardrailHit {
  day: number;
  guardrail: string;
  what: string;
  cost: string;
}

export interface SimResult {
  options: Required<Omit<SimOptions, 'scenario' | 'overrides'>> & { scenario?: ScenarioId; overrides: Overrides };
  persona: PersonaSpec;
  districts: District[];
  bTables: Record<string, BTableRow[]>;
  outreach: OutreachFunnel;
  cohort: CohortMaker[];
  days: DayState[];
  events: SimEvent[];
  kpis: Kpis;
  gates: Gates;
  guardrails: GuardrailHit[];
}

// ───────────────────────── internals ─────────────────────────

/** Fractional accumulator: turns expected counts into integers whose running total tracks the expectation. */
class Carry {
  private acc: number;
  constructor(offset: number) {
    this.acc = offset;
  }
  take(x: number): number {
    this.acc += Math.max(0, x);
    const n = Math.floor(this.acc);
    this.acc -= n;
    return n;
  }
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

type Trigger = 'weakListing' | 'listingFix' | 'productFix' | 'refusals';

const TRIGGER_TEXT: Record<Trigger, { cause: string; fix: string; hi: string }> = {
  weakListing: { cause: 'Weak listing: CTR below the 25th percentile', fix: 'Fix the main image and title', hi: 'मुख्य फ़ोटो बदलें' },
  listingFix: { cause: 'Returns above the 75th percentile, expectation reasons', fix: 'Fix photos and description', hi: 'फ़ोटो और विवरण सुधारें' },
  productFix: { cause: 'Returns above the 75th percentile, product reasons', fix: 'Fix it on the next batch', hi: 'अगले बैच में सुधार करें' },
  refusals: { cause: 'Refusals above the 75th percentile', fix: 'Prepaid nudge and a clearer delivery date', hi: 'प्रीपेड को बढ़ावा दें' },
};

interface Lot {
  arrival: number;
  units: number;
  fixed: boolean;
}

interface Scheduled<T> {
  day: number;
  v: T;
}

interface SkuState {
  spec: SkuSpec;
  primary: boolean;
  rng: Rng;
  price: number;
  liveFrom: number;
  stopped: boolean;
  launchEligible: boolean;
  launchSlotRemoved: boolean;
  visibility: number;
  ctrPct: number;
  codSharePct: number;
  expectationFactor: number;
  productFactor: number;
  extraProductReturnPct: number;
  productFixPending: boolean;
  productFixApplied: boolean;
  lots: Lot[];
  packLater: number;
  /** The pack-later units have been made (paid for): only then are they cash in stock. */
  packLaterMade: boolean;
  launchLot: number;
  inbound: Scheduled<{ units: number; fixed: boolean; launch?: boolean }>[];
  deliveries: Scheduled<{ count: number; unfixedShare: number; price: number; B: number }>[];
  rtoBack: Scheduled<number>[];
  returnRequests: Scheduled<{ reason: ReturnReason; rejected: boolean }>[];
  returnsBack: Scheduled<{ reason: ReturnReason; n: number }>[];
  payouts: Scheduled<{ n: number; price: number }>[];
  carries: Record<string, Carry>;
  noise: Map<string, number[]>;
  history: SkuDay[];
  activeFix?: { trigger: Trigger; fixNo: number; day: number; recheckDay: number };
  failedFixes: number;
  kamDone: boolean;
  returnsSuppressedUntil: number;
  breachDay?: number;
  slotRemovedOnBreach?: boolean;
  nadFlagged: boolean;
  bTableKey: string;
  initialRtoProb: number;
  stockOutOpen: boolean;
  churned: boolean;
  dwellSum: number;
  dwellUnits: number;
  slowStockUnits: number;
}

/** Coach rules need this many orders or deliveries in the 14-day window before they judge a rate. */
const MIN_SAMPLE = C.NAD_MIN_DELIVERIES.value;

const unitsOnHand = (s: SkuState) => s.lots.reduce((a, l) => a + l.units, 0);

function takeFifo(s: SkuState, n: number, day: number): number {
  // Returns the share of the dispatched units that came from not-yet-fixed lots.
  let left = n;
  let unfixed = 0;
  while (left > 0 && s.lots.length > 0) {
    const lot = s.lots[0]!;
    const take = Math.min(lot.units, left);
    lot.units -= take;
    left -= take;
    s.dwellSum += take * (day - lot.arrival);
    s.dwellUnits += take;
    if (!lot.fixed) unfixed += take;
    if (lot.units === 0) s.lots.shift();
  }
  return n === 0 ? 0 : unfixed / n;
}

function addLot(s: SkuState, day: number, units: number, fixed: boolean) {
  if (units > 0) s.lots.push({ arrival: day, units, fixed });
}

const carry = (s: SkuState, key: string) => {
  let c = s.carries[key];
  if (!c) {
    c = new Carry(s.rng());
    s.carries[key] = c;
  }
  return c;
};

// ───────────────────────── spec resolution (scenarios, counterfactual) ─────────────────────────

interface Flags {
  counterfactual: boolean;
  scenario?: ScenarioId;
  launchMultiplier: number;
  demandFactor: number;
  nodeMakers?: number;
  reseller: boolean;
  coachFixFails: boolean;
}

function resolveSpec(base: PersonaSpec, o: SimOptions): { spec: PersonaSpec; flags: Flags } {
  const flags: Flags = {
    counterfactual: !!o.counterfactual,
    scenario: o.scenario,
    launchMultiplier: o.overrides?.launchMultiplier ?? C.SIM_LAUNCH_MULTIPLIER.value,
    demandFactor: o.overrides?.demandFactor ?? 1,
    nodeMakers: o.overrides?.nodeMakers,
    reseller: false,
    coachFixFails: false,
  };
  let skus = base.skus.map((s) => ({ ...s, latent: [...s.latent], demandShifts: [...s.demandShifts] }));
  let switchOptions = base.switchOptions.map((s) => ({ ...s }));
  const primary = skus[0]!;
  if (o.overrides?.margin !== undefined) primary.margin = o.overrides.margin;

  switch (o.scenario) {
    case 'thinnerSteel':
      primary.stack = { ...primary.stack, makingCost: primary.stack.makingCost - 8 };
      break;
    case 'resellerSignup': {
      flags.reseller = true;
      const split = C.MIDDLEMAN_SPLIT_AT_AOV.value;
      const upstreamShare = (split.distributor + split.wholesaler) / (split.distributor + split.wholesaler + split.reseller);
      const price = listPrice(primary.stack, primary.margin);
      for (const s of skus) s.inLaunch = false;
      primary.stack = { ...primary.stack, makingCost: primary.stack.makingCost + middlemanMargin(price) * upstreamShare };
      break;
    }
    case 'crowdedGap': {
      const mid = (primary.openGapWeek.min + primary.openGapWeek.max) / 2;
      const unserved = mid + primary.committedWeek;
      const committed = unserved * C.SCN_CROWDED_COMMITTED_SHARE.value;
      primary.committedWeek = committed;
      primary.openGapWeek = { min: (unserved - committed) * 0.8, max: (unserved - committed) * 1.2 };
      break;
    }
    case 'smallNode':
      flags.nodeMakers = C.SCN_SMALL_NODE_MAKERS.value;
      break;
    case 'launchFlops':
      flags.launchMultiplier = C.SCN_FLOP_LAUNCH_MULTIPLIER.value;
      primary.demandShifts.push({ fromDay: C.LAUNCH_LIVE_DAYS.value.max + 1, factor: C.SCN_FLOP_POST_LAUNCH_FACTOR.value });
      break;
    case 'forecastOverPromise':
      primary.demandShifts.push({ fromDay: C.TIMELINE_DAYS.value.min, factor: C.SCN_OVERPROMISE_FACTOR.value });
      break;
    case 'coachFixFails':
      flags.coachFixFails = true;
      break;
    default:
      break;
  }

  if (o.counterfactual) {
    // Today's Meesho: no demand data (guessed lot), no launch, no coach, no restock loop; churns ~day 25.
    skus = [
      {
        ...primary,
        inLaunch: false,
        liveFromDay: C.CF_LIVE_DAY.value,
        packLaterLot: 0,
        demandShifts: [...primary.demandShifts, { fromDay: C.TIMELINE_DAYS.value.min, factor: C.CF_DEMAND_FACTOR.value }],
        latent: [],
      },
    ];
    switchOptions = [];
  }
  return { spec: { ...base, skus, switchOptions }, flags };
}

// ───────────────────────── the engine ─────────────────────────

export function simulate(options: SimOptions): SimResult {
  const base = PERSONA_SPECS.find((p) => p.id === options.personaId);
  if (!base) throw new Error(`Unknown persona ${options.personaId}`);
  return run(base, options);
}

/** 30-day launch simulation for a launch category, using the same engine with the category's SKU. */
export function simulateCategory(categoryId: CategoryId, seed = C.DEFAULT_SEED.value): SimResult | null {
  const card = CATEGORY_CARDS.find((c) => c.id === categoryId);
  if (!card?.sim) return null;
  const hiren = PERSONA_SPECS[0]!;
  // A typical maker in the category: no persona-specific hidden issues.
  const spec: PersonaSpec = { ...hiren, skus: [{ ...card.sim, latent: [] }], switchOptions: [], node: undefined, category: card.name, heroSku: card.sim.name };
  return run(spec, { personaId: hiren.id, seed, untilDay: C.GATE_DAYS.value[0]! });
}

function run(base: PersonaSpec, options: SimOptions): SimResult {
  const seed = options.seed ?? C.DEFAULT_SEED.value;
  const timeline = C.TIMELINE_DAYS.value;
  const untilDay = Math.min(options.untilDay ?? timeline.max, timeline.max);
  const { spec, flags } = resolveSpec(base, options);
  const districts = generateDistricts(seed ^ hash('districts'));
  const launchWeight = districts.filter((d) => d.launch).reduce((a, d) => a + d.weight, 0);
  const controlWeight = 1 - launchWeight;
  const live = C.LAUNCH_LIVE_DAYS.value;
  const events: SimEvent[] = [];
  const guardrails: GuardrailHit[] = [];
  const emit = (e: SimEvent) => events.push(e);
  const cf = flags.counterfactual;

  // B tables per SKU and B epoch (plus scenario variants).
  const bTables: Record<string, BTableRow[]> = {};
  const bCache = new Map<string, number>();
  const allSpecs = [...spec.skus, ...spec.switchOptions];
  const priceOf = (s: SkuSpec) => listPrice(s.stack, s.margin, s.gstRatePct);
  for (const s of allSpecs) {
    s.bEpochs.forEach((ep, i) => {
      const key = `${s.id}#${i}`;
      bTables[key] = generateBTable(s.productType, ep.B, priceOf(s), seed ^ hash(key));
    });
  }
  const epochIndex = (s: SkuSpec, day: number) => {
    let idx = 0;
    s.bEpochs.forEach((ep, i) => {
      if (day >= ep.fromDay) idx = i;
    });
    return idx;
  };
  const dumpRow = (B: number): BTableRow => ({
    sellerId: 'S-DUMP',
    title: 'Rival listing (dumped stock)',
    pricePerUnit: Math.round(B * C.SCN_DUMP_PRICE_SHARE_OF_B.value),
    deliveredOrders: C.SCN_DUMP_ORDERS.value,
    aboveQualityFloor: true,
    sameSpec: true,
  });
  const saleRows = (B: number): BTableRow[] =>
    [0, 1, 2].map((i) => ({
      sellerId: `S-SALE-${i}`,
      title: `Sale-day orders ${i + 1}`,
      pricePerUnit: Math.round(B * C.SCN_SALE_PRICE_SHARE_OF_B.value),
      deliveredOrders: C.B_MIN_DELIVERED_ORDERS.value * 10,
      aboveQualityFloor: true,
      sameSpec: true,
      saleDay: true,
    }));
  const scenarioActive = (id: ScenarioId, day: number) => {
    if (flags.scenario !== id) return false;
    if (id === 'rivalDump') return day >= C.SCN_DUMP_DAY.value;
    if (id === 'saleWeekB') return day >= C.SCN_SALE_DAYS.value.min && day <= C.SCN_SALE_DAYS.value.max;
    return true;
  };
  const bFor = (s: SkuState, day: number): number => {
    const idx = epochIndex(s.spec, day);
    const tableKey = `${s.spec.id}#${idx}`;
    const primary = s.primary;
    const dump = primary && scenarioActive('rivalDump', day);
    const sale = primary && scenarioActive('saleWeekB', day);
    const key = `${tableKey}|${dump}|${sale}`;
    const cached = bCache.get(key);
    if (cached !== undefined) return cached;
    let table = bTables[tableKey]!;
    const nominal = s.spec.bEpochs[idx]!.B;
    if (dump) table = [...table, dumpRow(nominal)];
    if (sale) table = [...table, ...saleRows(nominal)];
    if (dump || sale) bTables[`${tableKey}|${dump ? 'dump' : 'sale'}`] = table;
    const B = benchmarkB(table, { excludeSellerId: MAKER_SELLER_ID }).B;
    bCache.set(key, B);
    return B;
  };

  // Node size over time.
  const nodeMakersAt = (day: number) => {
    if (flags.nodeMakers !== undefined) return flags.nodeMakers;
    if (!spec.node) return 0;
    return day >= spec.node.crossDay ? spec.node.afterMakers : spec.node.startMakers;
  };

  // SKU states.
  const mkState = (s: SkuSpec, primary: boolean): SkuState => {
    const r = mulberry32(seed ^ hash(s.id) ^ (cf ? hash('cf') : 0));
    const dailyMin = expectedDailyPerSku(s.openGapWeek.min, s.likelyShare);
    const dailyMax = expectedDailyPerSku(s.openGapWeek.max, s.likelyShare);
    const launchLot = cf ? C.CF_GUESSED_LOT.value : firstLot({ min: dailyMin, max: dailyMax }, s.minRun).suggested;
    return {
      spec: s,
      primary,
      rng: r,
      price: priceOf(s),
      liveFrom: s.liveFromDay,
      stopped: false,
      launchEligible: s.inLaunch && !flags.reseller,
      launchSlotRemoved: false,
      visibility: 1,
      ctrPct: s.ctrPct,
      codSharePct: s.codSharePct,
      expectationFactor: 1,
      productFactor: 1,
      extraProductReturnPct: primary && flags.scenario === 'thinnerSteel' ? s.returnRatePct * (C.SCN_THIN_RETURN_MULTIPLE.value - 1) : 0,
      productFixPending: false,
      productFixApplied: false,
      lots: [],
      packLater: s.packLaterLot,
      packLaterMade: false,
      launchLot,
      inbound: [],
      deliveries: [],
      rtoBack: [],
      returnRequests: [],
      returnsBack: [],
      payouts: [],
      carries: {},
      noise: new Map(),
      history: [],
      failedFixes: 0,
      kamDone: false,
      returnsSuppressedUntil: -Infinity,
      nadFlagged: false,
      bTableKey: `${s.id}#0`,
      initialRtoProb: rtoProbability(s.codSharePct, s.codFailPct, s.prepaidFailPct),
      stockOutOpen: false,
      churned: false,
      dwellSum: 0,
      dwellUnits: 0,
      slowStockUnits: 0,
    };
  };
  const skus: SkuState[] = spec.skus.map((s, i) => mkState(s, i === 0));
  const prim = skus[0]!;
  const ps = prim.spec;

  // Stock-in for the launch lot (counterfactual: the guessed lot, just before go-live).
  const stockInDay = (s: SkuState) => (cf ? s.liveFrom - 1 : C.LAUNCH_STOCK_IN_DAY.value);
  for (const s of skus) if (Number.isFinite(s.liveFrom)) s.inbound.push({ day: stockInDay(s), v: { units: s.launchLot, fixed: false, launch: true } });

  // Ledger.
  const openGapMid = (s: SkuSpec) => (s.openGapWeek.min + s.openGapWeek.max) / 2;
  const unservedWeek = openGapMid(ps) + ps.committedWeek;
  let committedWeek = ps.committedWeek;

  // Money and counters.
  let payoutsCum = 0;
  let creditsCum = 0;
  let takeHomeCum = 0;
  let makingPaidCum = 0;
  let cashOutCum = 0;
  let cashInExtraCum = 0;
  let buyerSavedCum = 0;
  let buyerVsResellerCum = 0;
  let meeshoContributionCum = 0;
  let meeshoOrders = 0;
  let kamCases = 0;
  let nudgesSent = 0;
  let nudgesActed = 0;
  let fixesTried = 0;
  let fixesWorked = 0;
  let rtosAvoided = 0;
  let secondLotDay: number | null = null;
  const newRules: string[] = [];
  const priceDropRows: { B: number; price: number; orders: number }[] = [];
  const days: DayState[] = [];
  const gates: Gates = {};
  /** First live day of the rerun Launch Week after a Gate 1 Tighten. */
  let rerunFrom: number | null = null;
  let cohort: CohortMaker[] = [];

  const coachStart = firstCoachDay();
  const restockStart = firstRestockCheckDay();
  const stickWindow = C.STICK_WINDOW_DAYS.value;
  const nodeRef = C.PP_REFERENCE_MAKERS.value;

  // ── pre-launch story beats (the journey's chapters 0–6) ──
  const ch = C.CHAPTER_DAYS.value;
  const B0 = bFor(prim, timeline.min);
  const be = breakEven(ps.stack, ps.gstRatePct);
  const dMin = expectedDailyPerSku(ps.openGapWeek.min, ps.likelyShare);
  const dMax = expectedDailyPerSku(ps.openGapWeek.max, ps.likelyShare);
  const crowded = isCrowded(committedWeek, unservedWeek);
  const outreach = generateOutreach(spec.cohort, seed ^ hash('outreach'));
  if (!cf) {
    emit({
      day: ch[0]!,
      kind: 'gapFound',
      actor: 'system',
      skuId: ps.id,
      text: `Demand engine: supply gap in “${ps.productType}”: open gap ${Math.round(ps.openGapWeek.min)}–${Math.round(ps.openGapWeek.max)} orders/week, likely share ${Math.round(ps.likelyShare * 100)}% → ${Math.round(dMin)}–${Math.round(dMax)} orders/day (a forecast, not a guarantee). B = ${inr(B0)}.`,
      data: { openGapMin: ps.openGapWeek.min, openGapMax: ps.openGapWeek.max, likelyShare: ps.likelyShare, dailyMin: dMin, dailyMax: dMax, B: B0 },
    });
    if (spec.winBack) {
      const w = spec.winBack;
      emit({
        day: ch[0]!,
        kind: 'winBack',
        actor: 'system',
        text: `Win-back diagnosis of the old listing: ${w.views.toLocaleString('en-IN')} views → ${w.clicks} clicks; likely reason: ${w.likelyReason.toLowerCase()}. Refusal rate ${w.refusalPct}% vs category ${w.categoryRefusalPct}%. Old seller score (${Math.round((spec.sellerQualityScore ?? 0) * 100)}% 1–2★) stops dragging new listings: launch ratings are down-weighted and each listing builds a fresh listing-level score.`,
      });
    }
    if (crowded) {
      emit({
        day: ch[0]!,
        kind: 'crowded',
        actor: 'system',
        skuId: ps.id,
        text: `Ledger: committed supply is ${Math.round((100 * committedWeek) / unservedWeek)}% of unserved demand → crowded. Teaser paused; switch suggestions shown${spec.switchOptions[0] ? ` (e.g. ${spec.switchOptions[0].productType})` : ''}.`,
      });
      guardrails.push({ day: ch[0]!, guardrail: 'Committed-supply ledger', what: 'Gap marked crowded; teaser paused; switch suggestions', cost: 'Fewer makers sent into a gap that is already covered' });
    }
    emit({
      day: ch[1]!,
      kind: 'outreach',
      actor: 'meesho',
      text: `Outreach (${outreach.sources.join(' + ')}): first contact via ${FIRST_CONTACT}. Teaser names “${ps.productType}” and its gap, with a 5-minute cost-check link.`,
    });
    const verdict = priceBand(prim.price, be, B0).verdict;
    emit({
      day: ch[2]!,
      kind: 'costCheck',
      actor: 'maker',
      skuId: ps.id,
      text: `Cost check: making cost ${inr(ps.stack.makingCost)} → break-even ${inr(be)}; list ${inr(prim.price)} vs B ${inr(B0)}: ${verdict === 'in-band' ? 'pass' : verdict === 'above-B' ? 'not a fit at this cost' : 'below break-even'}.`,
      data: { breakEven: be, price: prim.price, B: B0 },
    });
    if (spec.id === 'ayesha') {
      const c = channelTakeHome(prim.price, C.AYESHA_AMAZON_PRICE.value, ps.stack, ps.gstRatePct);
      emit({
        day: ch[2]!,
        kind: 'costCheck',
        actor: 'system',
        skuId: ps.id,
        text: `Take-home side by side (same ex-works ${inr(c.exWorks)}): Meesho at ${inr(prim.price)} keeps ${inr(c.meesho)}/unit (0% commission, fees ${inr(c.meeshoFees)}); Amazon at ${inr(C.AYESHA_AMAZON_PRICE.value)} keeps ${inr(c.amazon)}/unit (fees ${inr(c.amazonFees)}). Meesho’s buyer (Tier 2–4, ${Math.round(C.COD_SHARE_PCT.value)}% COD) is a new order, not a moved one.`,
        data: { meesho: c.meesho, amazon: c.amazon, channel: 'compare' },
      });
    }
    if (flags.reseller) {
      emit({ day: ch[3]!, kind: 'recordMismatch', actor: 'system', text: 'Sign-up: says “manufacturer”, but GST nature of business = trader and Udyam activity = trading → records disagree → not launch-eligible.' });
      guardrails.push({ day: ch[3]!, guardrail: 'GST + Udyam record check', what: 'Record mismatch → not launch-eligible', cost: `List price ${inr(prim.price)} can’t reach B ${inr(B0)} anyway` });
    } else {
      emit({ day: ch[3]!, kind: 'signUp', actor: 'system', text: 'Sign-up: manufacturer; GST nature of business and Udyam activity agree → launch-eligible.' });
    }
    committedWeek += committedPerWeekFromLot(prim.launchLot);
    emit({
      day: ch[4]!,
      kind: 'listingBot',
      actor: 'system',
      skuId: ps.id,
      text: `Listing bot: first lot ${prim.launchLot} units (≈ ${C.FIRST_LOT_DAYS.value} days of expected sales), price ${inr(prim.price)}. Ledger: committed ${Math.round(committedWeek)}/week of ${Math.round(unservedWeek)} unserved.`,
      data: { lot: prim.launchLot, price: prim.price },
    });
    const pp = packPointRecommended(prim.price);
    const alt = spec.switchOptions.find((s) => packPointRecommended(priceOf(s)));
    emit({
      day: ch[5]!,
      kind: 'fulfilmentChoice',
      actor: 'system',
      skuId: ps.id,
      text: spec.cohort === 'Online elsewhere'
        ? `Fulfilment: self-ship (already set up for other marketplaces)${pp ? `; the Pack Point stays optional above ${inr(C.PACK_POINT_MIN_PRICE.value)}` : ''}.`
        : pp
        ? `Fulfilment: at ${inr(prim.price)} the Pack Point is recommended.`
        : `Fulfilment: at ${inr(prim.price)} the Pack Point fee eats most of your saving; we recommend self-ship for this SKU${alt ? ` and the Pack Point for your ${alt.name.replace(/^[\d.]+ ?L? ?/, '').toLowerCase() || alt.name} (${inr(priceOf(alt))})` : ''}.`,
    });
    emit({
      day: ch[6]!,
      kind: 'orderBook',
      actor: 'meesho',
      text: `Order book published: “${ps.productType}” slots, price cap B ${inr(B0)}, expected ${Math.round(dMin)}–${Math.round(dMax)} orders/day (a forecast, not a guarantee); commit by day ${C.LAUNCH_COMMIT_BY_DAY.value}, stock in by day ${C.LAUNCH_STOCK_IN_DAY.value}, live days ${live.min}–${live.max}.`,
    });
    emit({ day: C.LAUNCH_COMMIT_BY_DAY.value, kind: 'commit', actor: 'maker', skuId: ps.id, text: `Commits ${prim.launchLot} units at ${inr(prim.price)} (price locked).` });
  }

  // ── daily loop ──
  for (let d = timeline.min; d <= untilDay; d++) {
    const nodeMakers = nodeMakersAt(d);
    const fee = packPointFeeFor(nodeMakers);
    /** Accrual: margin is recognised when an order is delivered and kept; its costs with it. */
    let takeHomeToday = 0;
    /** Cash: what actually leaves the maker's account today (stock is counted at arrival). */
    let cashOutToday = 0;
    let cashInExtraToday = 0;
    let payoutToday = 0;

    if (spec.node && !cf && flags.nodeMakers === undefined && d === spec.node.crossDay) {
      emit({
        day: d,
        kind: 'nodeCross',
        actor: 'meesho',
        text: `Launch 2 offline makers move their stock into the Rajkot Pack Point: ${spec.node.startMakers} → ${nodeMakers} makers, past ${nodeRef} → fee ${inr(fee)} per delivered order.`,
      });
    }

    for (const s of skus) {
      const sp = s.spec;
      const B = bFor(s, d);
      const makeCost = sp.stack.makingCost;

      // B moves (market) and price-hold.
      if (d > timeline.min && epochIndex(sp, d) !== epochIndex(sp, d - 1) && d >= s.liveFrom && !s.churned && !s.stopped) {
        const prev = bFor(s, d - 1);
        const holds = s.price <= B;
        emit({
          day: d,
          kind: 'bMoved',
          actor: 'system',
          skuId: sp.id,
          text: `B recalculated for “${sp.productType}”: ${inr(prev)} → ${inr(B)}. Your ${inr(s.price)} ${holds ? `is still in band (${inr(breakEven(sp.stack, sp.gstRatePct))}–${inr(B)}): price holds` : 'is now above B'}.`,
          data: { from: prev, to: B, price: s.price, holds },
        });
      }
      if (s.primary && flags.scenario === 'priceRaise' && d === C.SCN_PRICE_RAISE_DAY.value && d >= s.liveFrom) {
        s.price = B + C.SCN_PRICE_RAISE_ABOVE_B.value;
        emit({ day: d, kind: 'priceBreach', actor: 'maker', skuId: sp.id, text: `After good reviews the maker raises the price to ${inr(s.price)} (B is ${inr(B)}).` });
      }
      if (s.primary && (flags.scenario === 'rivalDump' || flags.scenario === 'saleWeekB') && d >= s.liveFrom) {
        const startDay = flags.scenario === 'rivalDump' ? C.SCN_DUMP_DAY.value : C.SCN_SALE_DAYS.value.min;
        if (d === startDay) {
          const nominal = sp.bEpochs[epochIndex(sp, d)]!.B;
          const extra = flags.scenario === 'rivalDump' ? [dumpRow(nominal)] : saleRows(nominal);
          const naive = benchmarkB([...bTables[`${sp.id}#${epochIndex(sp, d)}`]!, ...extra.map((r) => ({ ...r, saleDay: false }))], {
            excludeSellerId: MAKER_SELLER_ID,
            minDeliveredOrders: 0,
            sellerWeightCapPct: 100,
          }).B;
          const what =
            flags.scenario === 'rivalDump'
              ? `A rival dumps ${C.SCN_DUMP_ORDERS.value.toLocaleString('en-IN')} orders at ${inr(dumpRow(nominal).pricePerUnit)}. Without the guardrails B would fall to ${inr(naive)}; with percentile + minimum orders + a ${C.B_SELLER_WEIGHT_CAP_PCT.value}% weight cap it stays ${inr(B)}.`
              : `Sale week: sale-day orders at ${inr(saleRows(nominal)[0]!.pricePerUnit)} would drag B to ${inr(naive)}; sale days are excluded, so B stays ${inr(B)}.`;
          emit({ day: d, kind: 'bHeld', actor: 'system', skuId: sp.id, text: what, data: { naive, B } });
          guardrails.push({
            day: d,
            guardrail: flags.scenario === 'rivalDump' ? 'B = 25th percentile, ≥ N orders, per-seller weight cap' : 'B excludes sale days',
            what,
            cost: 'None: honest makers keep their band',
          });
        }
      }
      const isLive = d >= s.liveFrom && !s.stopped;
      if (isLive && s.price > B) {
        if (s.breachDay === undefined) {
          s.breachDay = d;
          const inLaunch = s.launchEligible && d >= live.min && d <= live.max;
          s.slotRemovedOnBreach = inLaunch;
          if (inLaunch) s.launchSlotRemoved = true;
          emit({ day: d, kind: 'priceBreach', actor: 'system', skuId: sp.id, text: `Auto price-hold: ${inr(s.price)} is above B ${inr(B)}.${inLaunch ? ' Launch slot removed.' : ''} Fix within ${C.PRICE_HOLD_REVIEW_DAYS.value} days or visibility is cut.` });
        } else if (d - s.breachDay === C.PRICE_HOLD_REVIEW_DAYS.value && s.visibility === 1) {
          s.visibility = C.SIM_VISIBILITY_CUT.value;
          emit({ day: d, kind: 'visibilityCut', actor: 'system', skuId: sp.id, text: `Price still above B after ${C.PRICE_HOLD_REVIEW_DAYS.value} days → visibility cut and listing sent to review.` });
          guardrails.push({ day: d, guardrail: 'Auto price-hold', what: `Price ${inr(s.price)} > B ${inr(B)} → ${s.slotRemovedOnBreach ? 'launch slot removed, then ' : ''}visibility cut and review`, cost: `Demand × ${C.SIM_VISIBILITY_CUT.value} until the price is back in band` });
        }
      }

      // Arrivals.
      for (const a of s.inbound.filter((x) => x.day === d)) {
        addLot(s, d, a.v.units, a.v.fixed || !hasTarnish(sp));
        makingPaidCum += a.v.units * makeCost;
        if (a.v.fixed) s.productFixApplied = true;
        const isLaunchLot = !!a.v.launch;
        if (isLaunchLot) {
          if (s.packLater > 0) makingPaidCum += s.packLater * makeCost;
          s.packLaterMade = true;
          emit({
            day: d,
            kind: 'stockIn',
            actor: sp.fulfilment === 'packPoint' ? 'meesho' : 'maker',
            skuId: sp.id,
            data: { units: a.v.units, packPoint: sp.fulfilment === 'packPoint' },
            text:
              sp.fulfilment === 'packPoint'
                ? `Pack Point inbound: ${a.v.units} × “${sp.name}” counted and weighed (${sp.weightGrams} g each).`
                : `Stock ready: ${a.v.units} × “${sp.name}” linked to the listing${s.packLater > 0 ? `; ${s.packLater} more made and kept unpacked (“pack later”)` : ''}.`,
          });
        } else {
          if (s.primary && secondLotDay === null) secondLotDay = d;
          emit({ day: d, kind: 'batchArrived', actor: 'maker', skuId: sp.id, data: { units: a.v.units, packPoint: sp.fulfilment === 'packPoint' }, text: `Batch of ${a.v.units} × “${sp.name}” arrives${a.v.fixed ? ' with the product fix' : ''}.` });
        }
      }
      s.inbound = s.inbound.filter((x) => x.day !== d);
      let rtoArrived = 0;
      const returnsArrived: Record<ReturnReason, number> = { product: 0, expectation: 0, size: 0, swap: 0 };
      for (const r of s.rtoBack.filter((x) => x.day === d)) {
        rtoArrived += r.v;
        addLot(s, d, r.v, s.productFixApplied || !hasTarnish(sp));
        // The packing on a refused parcel is lost (no shipping charge when dispatched on time).
        if (sp.fulfilment === 'selfShip') takeHomeToday -= r.v * sp.stack.packaging;
      }
      s.rtoBack = s.rtoBack.filter((x) => x.day !== d);
      const grades = { A: 0, B: 0, C: 0 };
      for (const r of s.returnsBack.filter((x) => x.day === d)) {
        returnsArrived[r.v.reason] += r.v.n;
        if (r.v.reason === 'expectation' || r.v.reason === 'size') {
          // Weighed against dispatch and graded; at the node some need a repack (grade B).
          const b = sp.fulfilment === 'packPoint' ? Math.min(r.v.n, carry(s, 'grade-b').take(gradeShareB(r.v.n))) : 0;
          grades.B += b;
          grades.A += r.v.n - b;
          takeHomeToday -= b * C.PP_REPACK_COST.value;
          cashOutToday += b * C.PP_REPACK_COST.value;
          addLot(s, d, r.v.n, s.productFixApplied || !hasTarnish(sp));
        } else if (r.v.reason === 'product') {
          grades.C += r.v.n;
          takeHomeToday -= r.v.n * makeCost;
        } else {
          grades.C += r.v.n;
          // Self-ship swap: the item that came back isn't ours; a claim recovers about half.
          const recovered = r.v.n * makeCost * C.CLAIM_RECOVERY_SHARE.value;
          takeHomeToday -= r.v.n * makeCost - recovered;
          cashInExtraToday += recovered;
        }
      }
      s.returnsBack = s.returnsBack.filter((x) => x.day !== d);

      // Payouts (7 days after delivery, kept orders only).
      let paidUnits = 0;
      for (const p of s.payouts.filter((x) => x.day === d)) {
        paidUnits += p.v.n;
        const po = orderPayout(p.v.price, sp.stack.shippingAndFee, sp.gstRatePct);
        payoutToday += p.v.n * po.netPaid;
        creditsCum += p.v.n * (po.tcs + po.tds);
        // GST collected inside the price is remitted by the maker (cash, not earnings).
        cashOutToday += p.v.n * gstInsidePrice(p.v.price, sp.gstRatePct);
      }
      s.payouts = s.payouts.filter((x) => x.day !== d);

      // Return requests (fee charged unless the Pack Point caught a swap).
      for (const r of s.returnRequests.filter((x) => x.day === d)) {
        if (r.v.rejected) continue;
        takeHomeToday -= sp.returnFee + (sp.fulfilment === 'selfShip' ? sp.stack.packaging : 0);
        cashOutToday += sp.returnFee;
        s.returnsBack.push({ day: d + C.SIM_RETURN_TRANSIT_DAYS.value, v: { reason: r.v.reason, n: 1 } });
      }
      s.returnRequests = s.returnRequests.filter((x) => x.day !== d);

      // Deliveries.
      let deliveredToday = 0;
      let keptToday = 0;
      const returnsByReason: Record<ReturnReason, number> = { product: 0, expectation: 0, size: 0, swap: 0 };
      for (const dl of s.deliveries.filter((x) => x.day === d)) {
        const D = dl.v.count;
        deliveredToday += D;
        if (sp.fulfilment === 'packPoint') {
          takeHomeToday -= D * fee;
          cashOutToday += D * fee;
        }
        const rates = returnRates(s, dl.v.unfixedShare);
        let returned = 0;
        let swapsCaught = 0;
        for (const reason of ['product', 'expectation', 'size', 'swap'] as const) {
          const n = carry(s, `ret-${reason}`).take((D * rates[reason]) / 100);
          returnsByReason[reason] += n;
          for (let i = 0; i < n; i++) {
            const caught = reason === 'swap' && sp.fulfilment === 'packPoint';
            if (caught) swapsCaught++;
            else returned++;
            s.returnRequests.push({ day: d + randInt(s.rng, 1, C.RETURN_WINDOW_DAYS.value), v: { reason, rejected: caught } });
          }
        }
        if (swapsCaught > 0) {
          const gap = C.PP_SWAP_WEIGHT_GAP_G.value;
          emit({
            day: d,
            kind: 'swapCaught',
            actor: 'meesho',
            skuId: sp.id,
            text: `${swapsCaught} return weighed at the Pack Point: −${randInt(s.rng, gap.min, gap.max)} g vs dispatch (${sp.weightGrams} g) → buyer swap, claim denied, maker not charged.`,
          });
        }
        const kept = D - returned;
        keptToday += kept;
        takeHomeToday += kept * (dl.v.price - gstInsidePrice(dl.v.price, sp.gstRatePct) - sp.stack.shippingAndFee - makeCost - (sp.fulfilment === 'selfShip' ? sp.stack.packaging : 0));
        s.payouts.push({ day: d + C.PAYMENT_CYCLE_DAYS.value, v: { n: kept, price: dl.v.price } });
        buyerSavedCum += kept * (dl.v.B - dl.v.price);
        buyerVsResellerCum += kept * (sp.resellerPrice - dl.v.price);
        meeshoContributionCum += kept * C.CONTRIBUTION_PER_ORDER.value;
        meeshoOrders += kept;
        priceDropRows.push({ B: dl.v.B, price: dl.v.price, orders: kept });
      }
      s.deliveries = s.deliveries.filter((x) => x.day !== d);

      // Demand and orders.
      const onHandStart = unitsOnHand(s);
      let demand = 0;
      let orders = 0;
      let ordersLaunch = 0;
      let ordersControl = 0;
      let lost = 0;
      let cod = 0;
      let rtoCount = 0;
      const byDistrict = districts.map(() => 0);
      const rtoP = rtoProbability(s.codSharePct, sp.codFailPct, sp.prepaidFailPct);
      if (isLive && !s.churned) {
        const shift = sp.demandShifts.filter((x) => d >= x.fromDay).reduce((a, x) => a * x.factor, 1);
        const common = {
          openGapPerWeek: openGapMid(sp),
          likelyShare: sp.likelyShare,
          boost: boostFactor(d - s.liveFrom),
          quality: listingQualityFactor(s.ctrPct, sp.typeCtr.median),
          price: priceFactor(s.price, B),
          other: shift * s.visibility * flags.demandFactor,
        };
        const mult = s.launchEligible && !s.launchSlotRemoved ? flags.launchMultiplier : 1;
        const inRerun = s.primary && rerunFrom !== null && d >= rerunFrom && d <= rerunFrom + (live.max - live.min);
        const eL = expectedDailyDemand({ ...common, launch: inRerun ? mult : launchMultiplier(d, true, mult) }) * launchWeight;
        const eC = expectedDailyDemand({ ...common, launch: 1 }) * controlWeight;
        demand = carry(s, 'demand').take((eL + eC) * noiseFor(s, d));
        orders = Math.min(demand, onHandStart);
        lost = demand - orders;
        ordersLaunch = Math.min(orders, carry(s, 'launch').take(eL + eC === 0 ? 0 : (orders * eL) / (eL + eC)));
        ordersControl = orders - ordersLaunch;
        for (let i = 0; i < orders; i++) {
          const k = pickDistrict(s.rng, districts, i < ordersLaunch);
          byDistrict[k] = (byDistrict[k] ?? 0) + 1;
        }
        cod = Math.min(orders, carry(s, 'cod').take((orders * s.codSharePct) / 100));
        rtoCount = Math.min(
          orders,
          carry(s, 'rto-cod').take((cod * sp.codFailPct) / 100) + carry(s, 'rto-pre').take(((orders - cod) * sp.prepaidFailPct) / 100),
        );
        rtosAvoided += orders * (s.initialRtoProb - rtoP);
        const unfixedShare = takeFifo(s, orders, d);
        if (sp.fulfilment === 'selfShip') cashOutToday += orders * sp.stack.packaging;
        if (rtoCount > 0) s.rtoBack.push({ day: d + C.SIM_RTO_RETURN_DAYS.value, v: rtoCount });
        if (orders - rtoCount > 0) {
          s.deliveries.push({ day: d + C.SIM_DELIVERY_DAYS.value, v: { count: orders - rtoCount, unfixedShare, price: s.price, B } });
        }
        if (lost > 0 && !s.stockOutOpen) {
          s.stockOutOpen = true;
          emit({ day: d, kind: 'stockOut', actor: 'system', skuId: sp.id, text: `“${sp.name}” is out of stock: out of ranked slots; the page stays up with “notify me”.` });
        }
        if (lost === 0) s.stockOutOpen = false;
      }

      // Pack-later lot: linked when the launch lot runs low.
      if (s.packLater > 0 && isLive && unitsOnHand(s) <= Math.max(1, demand) * sp.safetyDays) {
        addLot(s, d, s.packLater, !hasTarnish(sp));
        emit({ day: d, kind: 'packLaterLinked', actor: 'maker', skuId: sp.id, text: `“Pack later” lot linked: ${s.packLater} units packed and added to stock.` });
        s.packLater = 0;
      }

      // Pack Point slow stock: anything at the node this long is decided (returned to the maker), not left to dwell.
      if (sp.fulfilment === 'packPoint') {
        const decide = C.PP_SLOW_STOCK_DECISION_DAY.value;
        const old = s.lots.filter((l) => d - l.arrival >= decide);
        const n = old.reduce((a, l) => a + l.units, 0);
        if (n > 0) {
          s.lots = s.lots.filter((l) => d - l.arrival < decide);
          s.slowStockUnits += n;
          emit({ day: d, kind: 'slowStock', actor: 'meesho', skuId: sp.id, text: `Slow stock: ${n} × “${sp.name}” at the node for ${decide} days → decided: returned to the maker (not left to dwell).` });
        }
      }

      // Storage at the Pack Point (free 30 days).
      if (sp.fulfilment === 'packPoint') {
        for (const lot of s.lots)
          if (d - lot.arrival >= C.PP_STORAGE_FREE_DAYS.value) {
            const sc = storageCost(lot.units, C.PP_STORAGE_FREE_DAYS.value + 1);
            takeHomeToday -= sc;
            cashOutToday += sc;
          }
      }

      const ctr = s.ctrPct;
      const clicks = Math.round(demand / (sp.conversionPct / 100));
      const impressions = Math.round(clicks / (ctr / 100));
      const bNow = B;
      s.history.push({
        day: d,
        skuId: sp.id,
        live: isLive,
        stopped: s.stopped,
        price: s.price,
        B: bNow,
        inBand: s.price <= bNow && s.price >= breakEven(sp.stack, sp.gstRatePct),
        impressions,
        clicks,
        ctrPct: ctr,
        demand,
        orders,
        ordersLaunch,
        ordersControl,
        byDistrict,
        cod,
        prepaid: orders - cod,
        lostOrders: lost,
        rto: rtoCount,
        delivered: deliveredToday,
        kept: keptToday,
        paidUnits,
        returnRequests: Object.values(returnsByReason).reduce((a, b) => a + b, 0),
        returnsByReason,
        onHand: unitsOnHand(s),
        inbound: s.inbound.reduce((a, x) => a + x.v.units, 0),
        inStockAtStart: onHandStart > 0,
        codSharePct: s.codSharePct,
        rtoProbability: rtoP,
        grades,
        returnsArrived,
        rtoArrived,
      });

      if (d === s.liveFrom) {
        emit({
          day: d,
          kind: d === live.min && s.launchEligible ? 'live' : 'switchLive',
          actor: 'meesho',
          skuId: sp.id,
          text:
            d === live.min && s.launchEligible
              ? `Factory Launch Week: “${sp.name}” live in the launch section (launch districts only) at ${inr(s.price)}.`
              : `“${sp.name}” is live at ${inr(s.price)}${sp.fulfilment === 'packPoint' ? ' via the Pack Point' : ''}.`,
        });
      }
    }

    // ── growth loop (not in the counterfactual) ──
    if (!cf) {
      for (const s of skus) {
        const sp = s.spec;
        if (s.stopped || d < s.liveFrom) continue;
        const h = s.history;
        const today = h[h.length - 1]!;

        // Restock.
        if (d >= restockStart && s.inbound.length === 0) {
          const postLaunch = h.filter((x) => x.day >= s.liveFrom + (live.max - live.min + 1));
          const last7 = h.slice(-C.RUN_RATE_WINDOW_DAYS.value).reduce((a, x) => a + x.demand, 0);
          const rr = runRate(last7, trendFactor(postLaunch.map((x) => x.demand)));
          const rop = reorderPoint(rr, sp.leadTimeDays, sp.safetyDays);
          const gapCap = Math.round(openGapMid(sp) * 3);
          let batch = nextBatch(rr, sp.minRun, gapCap);
          // Ahead of Gate 3 (scale or stop), don't bet new stock: land at most N days of cover on the decision day.
          const gate3Day = C.GATE_DAYS.value[2]!;
          const arrival = d + sp.leadTimeDays;
          const maxCover = C.GATE3_MAX_COVER_DAYS.value;
          let cappedForGate3 = false;
          if (arrival <= gate3Day && gate3Day - arrival < maxCover) {
            // Projected stock on Gate 3 day = on hand − sales until then + RTO/returns coming back + this batch.
            const incoming =
              s.rtoBack.filter((x) => x.day <= gate3Day).reduce((a, x) => a + x.v, 0) +
              s.returnsBack.filter((x) => x.day <= gate3Day && (x.v.reason === 'expectation' || x.v.reason === 'size')).reduce((a, x) => a + x.v.n, 0);
            const projectedWithout = Math.max(0, today.onHand - rr * (gate3Day - d)) + incoming;
            const cap = roundDownTo(rr * (maxCover - sp.safetyDays) - projectedWithout, C.LOT_ROUNDING_UNITS.value);
            if (cap < batch) {
              batch = Math.max(sp.minRun, cap);
              cappedForGate3 = true;
            }
          }
          const orderNow = rr > 0 && today.onHand <= rop + rr;
          if (d === restockStart && rr > 0) {
            // The first check is a dated plan: when to start the next batch and how big it is.
            const daysToRop = Math.max(0, Math.floor((today.onHand - rop) / rr));
            emit({
              day: d,
              kind: 'restockPrompt',
              actor: 'system',
              skuId: sp.id,
              text: `Restock (“${sp.name}”): selling ${fmt1(rr)}/day, ${today.onHand} on hand → reorder at ${rop}; next batch ${batch} units. ${orderNow ? 'Start today' : `Start by day ${d + daysToRop}`} (lead time ${sp.leadTimeDays} + ${sp.safetyDays} safety days).`,
              data: { runRate: rr, onHand: today.onHand, reorderPoint: rop, batch, startDay: orderNow ? d : d + daysToRop },
            });
          }
          if (orderNow) {
            const fixed = s.productFixPending;
            s.inbound.push({ day: d + sp.leadTimeDays, v: { units: batch, fixed } });
            if (fixed) s.productFixPending = false;
            if (d !== restockStart) {
              emit({
                day: d,
                kind: 'restockPrompt',
                actor: 'system',
                skuId: sp.id,
                text: `Restock (“${sp.name}”): ${today.onHand} on hand hits the reorder point ${rop} (${fmt1(rr)}/day) → batch of ${batch} started, ready day ${d + sp.leadTimeDays}${cappedForGate3 ? ` (capped: ≤ ${maxCover} days of cover at Gate 3)` : ''}.`,
                data: { runRate: rr, onHand: today.onHand, reorderPoint: rop, batch, startDay: d },
              });
            }
          }
        }

        // Fix re-checks (14 days after a fix).
        if (s.activeFix && d === s.activeFix.recheckDay) {
          const f = s.activeFix;
          const stillFiring = triggerFires(s, f.trigger);
          if (!stillFiring) {
            fixesWorked++;
            emit({ day: d, kind: 'fixRecheck', actor: 'system', skuId: sp.id, text: `Re-check after ${C.FIX_RECHECK_DAYS.value} days: “${TRIGGER_TEXT[f.trigger].fix}” worked; back in band.`, data: { success: true } });
            s.activeFix = undefined;
          } else {
            s.failedFixes++;
            emit({ day: d, kind: 'fixRecheck', actor: 'system', skuId: sp.id, text: `Re-check after ${C.FIX_RECHECK_DAYS.value} days: fix ${f.fixNo} did not work (${s.failedFixes} failed).`, data: { success: false } });
            if (s.failedFixes >= C.KAM_ESCALATION_FAILED_FIXES.value && !s.kamDone) {
              s.kamDone = true;
              kamCases++;
              s.activeFix = undefined;
              resolveKam(s, d);
            } else {
              issueFix(s, d, f.trigger, f.fixNo + 1);
            }
          }
        }

        // Weekly coach: one cause → one fix → one nudge → one tap.
        if (d >= coachStart && (d - coachStart) % 7 === 0 && !s.activeFix) {
          const order: Trigger[] = ['weakListing', 'listingFix', 'productFix', 'refusals'];
          const t = order.find((x) => triggerFires(s, x));
          if (t) issueFix(s, d, t, 1);
        }

        // NAD watch.
        if (!s.nadFlagged && d >= s.liveFrom + C.NAD_WATCH_DAYS.value) {
          const w = h.slice(-C.NAD_WATCH_DAYS.value);
          const delivered = w.reduce((a, x) => a + x.delivered, 0);
          const nad = w.reduce((a, x) => a + x.returnsByReason.product, 0);
          const norm = (sp.nadNormPct ?? sp.returnRatePct * sp.returnMix.product) / 100;
          if (delivered >= C.NAD_MIN_DELIVERIES.value && nadBreached(rate(nad, delivered), norm)) {
            s.nadFlagged = true;
            s.visibility = Math.min(s.visibility, C.SIM_VISIBILITY_CUT.value);
            const what = `“Not as described” returns ${fmt1(100 * rate(nad, delivered))}% of deliveries vs a ${fmt1(100 * norm)}% norm (> ${C.NAD_RETURN_MULTIPLE.value}×) → sampled test buy flagged → visibility cut.`;
            emit({ day: d, kind: 'nadFlag', actor: 'system', skuId: sp.id, text: what });
            guardrails.push({ day: d, guardrail: 'NAD return watch + sampled test buy', what, cost: `Demand × ${C.SIM_VISIBILITY_CUT.value}; returns cost the maker` });
          }
        }

        // Slow seller: below the bar on each of the last 14 in-stock days, after the launch.
        const nSlow = C.SLOW_SELLER_DAYS.value;
        if (d >= s.liveFrom + (live.max - live.min + 1) + nSlow && h.length > nSlow) {
          // The 14 full days before today.
          const w = h.slice(-nSlow - 1, -1);
          const bar = C.SLOW_SELLER_SHARE.value * sp.establishedMedianPerDay;
          if (w.every((x) => x.inStockAtStart && x.demand < bar)) {
            s.stopped = true;
            // Leftover stock goes back to the maker's existing distributor channel at ex-works (cash recovered at cost).
            const left = unitsOnHand(s);
            s.lots = [];
            cashInExtraToday += left * sp.stack.makingCost;
            emit({
              day: d,
              kind: 'slowSeller',
              actor: 'system',
              skuId: sp.id,
              text: `Slow seller: “${sp.name}” under ${fmt1(bar)} orders/day for ${nSlow} days while the type is steady → stop. ${left} units left go to his distributor channel at ex-works (${inr(left * sp.stack.makingCost)} recovered at cost).`,
              data: { unitsMoved: left },
            });
            addSwitch(d, 'switch');
          }
        }

        // Make to demand: a switched-in SKU that sells for a week triggers the next open-gap suggestion.
        if (!s.primary && s.spec.id === spec.switchOptions[0]?.id && d === s.liveFrom + C.EXPANSION_AFTER_DAYS.value && today.orders > 0) addSwitch(d, 'expand');
      }

      // Forecast attainment, 14 days after go-live.
      if (d === live.min + C.FIX_RECHECK_DAYS.value) {
        const actual = prim.history.filter((x) => x.live).reduce((a, x) => a + x.demand, 0);
        const forecast = expectedDailyPerSku(openGapMid(ps), ps.likelyShare) * C.FIX_RECHECK_DAYS.value;
        const att = 100 * forecastAttainment(actual, forecast);
        const low = att < C.T_FORECAST_ATTAINMENT_D14_PCT.value;
        emit({
          day: d,
          kind: 'forecastCheck',
          actor: 'system',
          skuId: ps.id,
          text: low
            ? `Forecast attainment ${Math.round(att)}% at day 14 (< ${C.T_FORECAST_ATTAINMENT_D14_PCT.value}%) → confidence lowered to Low; ranges widened for the next order book.`
            : `Forecast attainment ${Math.round(att)}% at day 14 (target ≥ ${C.T_FORECAST_ATTAINMENT_D14_PCT.value}%).`,
          data: { attainmentPct: att },
        });
        if (low) guardrails.push({ day: d, guardrail: 'Forecast attainment check', what: `Attainment ${Math.round(att)}% → confidence lowered, ranges widened`, cost: 'Makers see wider ranges and smaller suggested lots' });
      }
    } else if (d === C.CF_CHURN_DAY.value) {
      for (const s of skus) {
        s.churned = true;
        const left = unitsOnHand(s);
        emit({
          day: d,
          kind: 'churn',
          actor: 'maker',
          skuId: s.spec.id,
          text: `Without the solution: guessed lot of ${s.launchLot}, slow first orders, no coach → the maker stops selling with ${left} units unsold (${inr(left * s.spec.stack.makingCost)} tied up).`,
        });
      }
    }

    // Gates.
    if (!cf && d === C.GATE_DAYS.value[0]) gates.g1 = computeGate1();
    if (!cf && rerunFrom !== null && d === C.GATE_DAYS.value[0]! + C.LAUNCH_CADENCE_DAYS.value) gates.g1rerun = computeGate1Rerun(d);
    if (!cf && d === C.GATE_DAYS.value[1]) gates.g2 = computeGate2(d);
    if (!cf && d === C.GATE_DAYS.value[2]) gates.g3 = computeGate3();

    // Day state.
    takeHomeCum += takeHomeToday;
    cashOutCum += cashOutToday;
    cashInExtraCum += cashInExtraToday;
    payoutsCum += payoutToday;
    const skuDays = skus.map((s) => s.history[s.history.length - 1]!).filter(Boolean);
    days.push({
      day: d,
      skus: skuDays,
      orders: sumBy(skuDays, (x) => x.orders),
      delivered: sumBy(skuDays, (x) => x.delivered),
      rto: sumBy(skuDays, (x) => x.rto),
      returns: sumBy(skuDays, (x) => x.returnRequests),
      onHand: sumBy(skuDays, (x) => x.onHand),
      money: {
        payoutNet: payoutToday,
        payoutsCum,
        creditsCum,
        takeHome: takeHomeToday,
        takeHomeCum,
        cashInStock: skus.reduce((a, s) => a + (unitsOnHand(s) + (s.packLaterMade ? s.packLater : 0)) * s.spec.stack.makingCost, 0),
        makingPaidCum,
        netCashCum: payoutsCum + cashInExtraCum - makingPaidCum - cashOutCum,
        cashOutCum,
      },
      ledger: { unservedWeek, committedWeek, openGapWeek: unservedWeek - committedWeek, crowded: isCrowded(committedWeek, unservedWeek) },
      nodeMakers,
      packPointFee: fee,
      buyerSavedCum,
      buyerSavedVsResellerCum: buyerVsResellerCum,
      meeshoContributionCum,
      kamCasesCum: kamCases,
    });
  }

  // ───── helpers needing closure state ─────

  /** Add the next open-gap product type on the same material and process (switch after a stop, or expand). */
  function addSwitch(d: number, why: 'switch' | 'expand') {
    const option = spec.switchOptions.find((o) => !skus.some((x) => x.spec.id === o.id));
    if (!option) return;
    const liveDay = d + Math.max(option.leadTimeDays, Math.ceil(C.CATALOGUE_GO_LIVE_HOURS.value / 24));
    const ns = mkState({ ...option, liveFromDay: liveDay }, false);
    const usePP = option.fulfilment === 'packPoint' && nodeMakersAt(d) >= nodeRef;
    if (option.fulfilment === 'packPoint' && !usePP) {
      ns.spec = { ...ns.spec, fulfilment: 'selfShip', stack: { ...ns.spec.stack, packaging: C.SELF_SHIP_OWN_COST.value } };
    }
    ns.inbound.push({ day: liveDay, v: { units: ns.launchLot, fixed: true, launch: true } });
    skus.push(ns);
    committedWeek += committedPerWeekFromLot(ns.launchLot);
    const n = skus.length;
    emit({
      day: d,
      kind: 'switch',
      actor: 'system',
      skuId: option.id,
      text: `Make to demand: ${why === 'switch' ? 'switch to' : 'add'} “${option.productType}” (${Math.round(openGapMid(option))}/week unserved, same steel and process${why === 'expand' ? ', idle capacity available' : ''}). Listing ${n} built in 2 minutes; first lot ${ns.launchLot} units${usePP ? ' via the Pack Point' : ', self-ship (node not paying yet)'}; live day ${liveDay}.`,
      data: { why },
    });
  }

  function issueFix(s: SkuState, d: number, t: Trigger, fixNo: number) {
    nudgesSent++;
    nudgesActed++;
    fixesTried++;
    s.activeFix = { trigger: t, fixNo, day: d, recheckDay: d + C.FIX_RECHECK_DAYS.value };
    applyFix(s, t);
    emit({
      day: d,
      kind: 'coachNudge',
      actor: 'system',
      skuId: s.spec.id,
      text: `Coach: ${TRIGGER_TEXT[t].cause} → “${TRIGGER_TEXT[t].fix}”${fixNo > 1 ? ` (fix ${fixNo})` : ''}. Hindi nudge: “${TRIGGER_TEXT[t].hi}”. Maker taps once.`,
      data: { trigger: t, fixNo },
    });
  }

  function applyFix(s: SkuState, t: Trigger) {
    const sp = s.spec;
    if (t === 'weakListing') {
      const weak = sp.latent.find((l) => l.kind === 'weakPhoto');
      if (flags.coachFixFails && s.primary) return; // the fix doesn't address the real cause
      s.ctrPct = weak && weak.kind === 'weakPhoto' ? weak.fixedCtrPct : Math.max(s.ctrPct, sp.typeCtr.median * 0.9);
    } else if (t === 'listingFix') {
      const tarnish = sp.latent.find((l) => l.kind === 'tarnish');
      s.expectationFactor *= 1 - (tarnish && tarnish.kind === 'tarnish' ? tarnish.listingFixEffect : 0.5);
    } else if (t === 'productFix') {
      // The maker's own fix on the next batch; it can't reach a hidden process cause (e.g. plating).
      if (!sp.latent.some((l) => l.kind === 'tarnish')) s.productFixPending = true;
    } else if (t === 'refusals') {
      const r = sp.latent.find((l) => l.kind === 'highRefusals');
      s.codSharePct = r && r.kind === 'highRefusals' ? r.nudgedCodSharePct : Math.max(0, s.codSharePct - 10);
    }
  }

  function resolveKam(s: SkuState, d: number) {
    const sp = s.spec;
    const tarnish = sp.latent.find((l) => l.kind === 'tarnish');
    const weak = sp.latent.find((l) => l.kind === 'weakPhoto');
    let cause = 'Cause logged after a call with the maker';
    let rule = 'New coach rule logged';
    if (tarnish && tarnish.kind === 'tarnish') {
      cause = tarnish.cause;
      rule = tarnish.newRule;
      s.productFixPending = true;
      s.returnsSuppressedUntil = Infinity;
    } else if (weak && weak.kind === 'weakPhoto') {
      cause = weak.cause;
      rule = weak.newRule;
      s.ctrPct = weak.fixedCtrPct;
    }
    newRules.push(rule);
    emit({
      day: d,
      kind: 'kamCase',
      actor: 'meesho',
      skuId: sp.id,
      text: `Fix failed twice → Meesho KAM steps in. Cause found: ${cause}.${tarnish ? ' Product fix on the next batch.' : ''}`,
    });
    emit({ day: d, kind: 'newRule', actor: 'meesho', skuId: sp.id, text: `New coach rule created: “${rule}”. The next maker gets it from the bot, not a KAM.` });
    if (flags.coachFixFails) guardrails.push({ day: d, guardrail: 'Intervention ladder step 5 (KAM)', what: `Two failed fixes → KAM case; cause: ${cause}`, cost: 'One KAM case; the fix becomes a rule for every maker' });
  }

  function triggerFires(s: SkuState, t: Trigger): boolean {
    const sp = s.spec;
    const w = s.history.slice(-C.FIX_RECHECK_DAYS.value);
    if (t === 'weakListing') return s.ctrPct < sp.typeCtr.p25;
    if (t === 'refusals') {
      const orders = sumBy(w, (x) => x.orders);
      return orders >= MIN_SAMPLE && 100 * rate(sumBy(w, (x) => x.rto), orders) > sp.typeRefusalP75Pct;
    }
    // Returns triggers (paused while a KAM product fix is on its way).
    if (returnsSuppressed(s)) return false;
    const delivered = sumBy(w, (x) => x.delivered);
    const returns = sumBy(w, (x) => x.returnRequests);
    const product = sumBy(w, (x) => x.returnsByReason.product);
    // A product-reason bar of its own (e.g. jewellery finish): fires even when total returns are in band.
    if (t === 'productFix' && sp.typeProductReturnP75Pct !== undefined) {
      return delivered >= MIN_SAMPLE && 100 * rate(product, delivered) > sp.typeProductReturnP75Pct;
    }
    if (delivered < MIN_SAMPLE || 100 * rate(returns, delivered) <= sp.typeReturnP75Pct) return false;
    const expectation = sumBy(w, (x) => x.returnsByReason.expectation + x.returnsByReason.size);
    return t === 'productFix' ? product > expectation : expectation >= product;
  }

  function returnsSuppressed(s: SkuState) {
    const d = s.history[s.history.length - 1]?.day ?? timeline.min;
    if (s.returnsSuppressedUntil === Infinity && s.productFixApplied) s.returnsSuppressedUntil = d + C.FIX_RECHECK_DAYS.value;
    return d < s.returnsSuppressedUntil;
  }

  function computeGate1() {
    const at = (day: number) => prim.history.find((x) => x.day === day);
    const stickDays = range(stickWindow.min, stickWindow.max).map((x) => at(x)!);
    const stick = stickRate(sumBy(stickDays, (x) => x.demand) / stickDays.length, ps.establishedMedianPerDay);
    const liveDays = range(live.min, live.max).map((x) => at(x)!);
    const liftX = lift(sumBy(liveDays, (x) => x.ordersLaunch) / launchWeight, sumBy(liveDays, (x) => x.ordersControl) / controlWeight);
    const sold = sumBy(range(live.min, C.GATE_DAYS.value[0]!).map((x) => at(x)!), (x) => x.orders - x.rto);
    const sellThroughPct = 100 * Math.min(1, prim.launchLot === 0 ? 0 : sold / prim.launchLot);
    const liveSkuDays = skus.flatMap((s) => s.history.filter((x) => x.live && x.day <= C.GATE_DAYS.value[0]!));
    const held = 100 * pricesHeldShare(liveSkuDays);
    const returnsPct = returnRateOf(prim, live.min, C.GATE_DAYS.value[0]!);
    const g = gate1({ stickRate: stick, liftX, sellThroughPct, pricesHeldPct: held, returnRatePct: returnsPct, returnBandPct: ps.typeReturnP75Pct });
    emit({ day: g.day, kind: 'gate', actor: 'meesho', text: `Gate 1 (day ${g.day}): ${g.decision}. ${g.reason}.`, data: { gate: 1, decision: g.decision } });
    if (g.decision !== 'Invest') {
      guardrails.push({
        day: g.day,
        guardrail: 'Day-30 rule (fixed in advance)',
        what: `Stick ${fmt2(stick)}, lift ${fmt2(liftX)}×, returns ${fmt1(returnsPct)}% → ${g.decision}${g.decision === 'Tighten' ? ': fix, rerun once at the next Launch Week' : ''}`,
        cost: 'No further launch spend on this cohort until the rerun',
      });
      if (g.decision === 'Tighten' && untilDay >= C.GATE_DAYS.value[0]! + C.LAUNCH_CADENCE_DAYS.value) rerunFrom = live.min + C.LAUNCH_CADENCE_DAYS.value;
    }
    return g;
  }

  /** Return requests ÷ deliveries for one SKU over [from, to]. */
  function returnRateOf(s: SkuState, from: number, to: number) {
    const w = s.history.filter((x) => x.day >= from && x.day <= to);
    return 100 * rate(sumBy(w, (x) => x.returnRequests), sumBy(w, (x) => x.delivered));
  }

  /** Gate 1 rerun: the day-30 rule re-applied after the next Launch Week (Tighten → fix, rerun once). */
  function computeGate1Rerun(d: number) {
    const lastFrom = live.min + C.LAUNCH_CADENCE_DAYS.value;
    const lastTo = live.max + C.LAUNCH_CADENCE_DAYS.value;
    const win = (from: number, to: number) => prim.history.filter((x) => x.day >= from && x.day <= to);
    const stickW = win(stickWindow.min + C.LAUNCH_CADENCE_DAYS.value, stickWindow.max + C.LAUNCH_CADENCE_DAYS.value);
    const stick = stickRate(sumBy(stickW, (x) => x.demand) / Math.max(1, stickW.length), ps.establishedMedianPerDay);
    const liveW = win(lastFrom, lastTo);
    const liftX = lift(sumBy(liveW, (x) => x.ordersLaunch) / launchWeight, sumBy(liveW, (x) => x.ordersControl) / controlWeight);
    const startStock = prim.history.find((x) => x.day === lastFrom - 1)?.onHand ?? 0;
    const sold = sumBy(win(lastFrom, d), (x) => x.orders - x.rto);
    const sellThroughPct = 100 * Math.min(1, startStock === 0 ? 1 : sold / startStock);
    const held = 100 * pricesHeldShare(skus.flatMap((s) => s.history.filter((x) => x.live && x.day > C.GATE_DAYS.value[0]! && x.day <= d)));
    const returnsPct = returnRateOf(prim, d - C.FIX_RECHECK_DAYS.value, d);
    const g = gate1({ stickRate: stick, liftX, sellThroughPct, pricesHeldPct: held, returnRatePct: returnsPct, returnBandPct: ps.typeReturnP75Pct }, d);
    emit({ day: d, kind: 'gate', actor: 'meesho', text: `Gate 1 rerun (day ${d}, after the fix and the next Launch Week): ${g.decision}. ${g.reason}.`, data: { gate: 1, rerun: true, decision: g.decision } });
    return g;
  }

  function computeGate2(d: number) {
    const from = C.GATE_DAYS.value[0]! + 1;
    const liveSkuDays = skus.flatMap((s) => s.history.filter((x) => x.live && x.day >= from));
    const held = 100 * pricesHeldShare(liveSkuDays);
    const listings = skus.filter((s) => s.liveFrom <= d).length;
    const stockOuts = events.filter((e) => e.kind === 'stockOut' && e.day >= from && e.day <= d).length;
    const months = (d - from + 1) / C.DAYS_PER_MONTH.value;
    const h = prim.history;
    const w = h.slice(-(stickWindow.max - stickWindow.min + 1));
    const stick60 = stickRate(sumBy(w, (x) => x.demand) / w.length, ps.establishedMedianPerDay);
    const nm = nodeMakersAt(d);
    const g = gate2({
      pricesHeldPct: held,
      stockOutsPerListingMonth: listings === 0 ? 0 : stockOuts / listings / months,
      stickRateD60: stick60,
      nodeMakers: nm,
      fee: packPointFeeFor(nm),
      packPointApplies: !!spec.node,
    });
    emit({
      day: g.day,
      kind: 'gate',
      actor: 'meesho',
      text: `Gate 2 (day ${g.day}): ${g.decision}.${g.packPoint.applies ? ` Pack Point ${g.packPoint.verdict.toLowerCase()} (${g.packPoint.nodeMakers} makers, ${inr(g.packPoint.fee)}).` : ''}`,
      data: { gate: 2, decision: g.decision },
    });
    if (flags.scenario === 'smallNode' && g.packPoint.verdict === 'Waits') {
      guardrails.push({ day: g.day, guardrail: 'Pack Point pays-or-waits (Gate 2)', what: `${nm} makers → fee ${inr(g.packPoint.fee)}; node waits; self-ship continues`, cost: 'Casserole self-ships until the node fills' });
    }
    return g;
  }

  function computeGate3() {
    const g1 = gates.g1;
    const activeIn = (from: number, to: number) => skus.some((s) => s.history.some((x) => x.day >= from && x.day <= to && x.orders > 0));
    const ownDrop = (100 * (bFor(prim, live.min) - prim.price)) / bFor(prim, live.min);
    const members = PERSONA_SPECS.filter((p) => p.launchNo === spec.launchNo).map((p) => {
      const s0 = p.skus[0]!;
      const isSelf = p.id === spec.id;
      const price = listPrice(s0.stack, s0.margin, s0.gstRatePct);
      const B = s0.bEpochs[0]!.B;
      return {
        persona: p.id,
        name: `${p.name} (${p.business})`,
        cluster: p.city,
        productType: s0.productType,
        priceDropPct: Math.round((isSelf ? ownDrop : (100 * (B - price)) / B) * 10) / 10,
        activeD30: isSelf ? activeIn(24, 30) : true,
        activeD60: isSelf ? activeIn(54, 60) : true,
        activeD90: isSelf ? activeIn(84, 90) : true,
        secondLotByD45: isSelf ? secondLotDay !== null && secondLotDay <= 45 : true,
      };
    });
    cohort = generateCohort(spec.launchNo, seed ^ hash(`cohort-${spec.launchNo}`), members);
    const m = cohortMetrics(cohort);
    const g = gate3({
      makersActiveD90Pct: m.activeD90Pct,
      cohortPriceDropPct: m.priceDropAvgPct,
      secondLotByD45Pct: m.secondLotByD45Pct,
      makersActiveD60Pct: m.activeD60Pct,
    });
    emit({
      day: g.day,
      kind: 'gate',
      actor: 'meesho',
      text: `Gate 3 (day ${g.day}): ${g.decision}. Cohort of ${m.makers}: ${Math.round(m.activeD90Pct)}% active, price drop ${fmt1(m.priceDropAvgPct)}% of B.${g1 ? '' : ''}`,
      data: { gate: 3, decision: g.decision },
    });
    return { ...g, cohort: m };
  }

  // ───── KPIs ─────
  const allDays = skus.flatMap((s) => s.history);
  const isPP = (id: string) => skus.some((s) => s.spec.id === id && s.spec.fulfilment === 'packPoint');
  const ppDwell = skus.filter((s) => s.spec.fulfilment === 'packPoint').reduce((a, s) => ({ sum: a.sum + s.dwellSum, units: a.units + s.dwellUnits }), { sum: 0, units: 0 });
  const totalOrders = sumBy(allDays, (x) => x.orders);
  const delivered = sumBy(allDays, (x) => x.delivered);
  const rtoTotal = sumBy(allDays, (x) => x.rto);
  const returnsTotal = sumBy(allDays, (x) => x.returnRequests);
  const keptOrders = sumBy(priceDropRows, (r) => r.orders);
  const g1 = gates.g1;
  const firstLive = prim.history.filter((x) => x.live && x.day < live.min + C.FIX_RECHECK_DAYS.value);
  const forecast = expectedDailyPerSku(openGapMid(ps), ps.likelyShare) * C.FIX_RECHECK_DAYS.value;
  const lastDay = days[days.length - 1]!;
  const kpis: Kpis = {
    totalOrders,
    delivered,
    rto: rtoTotal,
    rtoRatePct: 100 * rate(rtoTotal, totalOrders),
    returns: returnsTotal,
    returnRatePct: 100 * rate(returnsTotal, delivered),
    lostOrders: sumBy(allDays, (x) => x.lostOrders),
    stockOutDays: allDays.filter((x) => x.lostOrders > 0).length,
    takeHome: takeHomeCum,
    payoutsNet: payoutsCum,
    creditsClaimable: creditsCum,
    cashInStockEnd: lastDay.money.cashInStock,
    unitsLeft: lastDay.onHand + skus.reduce((a, s) => a + s.packLater, 0),
    priceDropPctOfB: keptOrders === 0 ? 0 : (100 * sumBy(priceDropRows, (r) => ((r.B - r.price) / r.B) * r.orders)) / keptOrders,
    priceDropAtLaunchPct: (100 * (B0 - prim.price)) / B0,
    buyerSaved: buyerSavedCum,
    buyerSavedVsReseller: buyerVsResellerCum,
    meeshoOrders,
    meeshoContribution: meeshoContributionCum,
    rtosAvoided,
    stickRateD30: g1 ? g1.inputs[0]!.value : 0,
    liftX: g1 ? g1.inputs[1]!.value : 0,
    sellThroughD30Pct: g1 ? g1.inputs[2]!.value : 0,
    pricesHeldPct: 100 * pricesHeldShare(allDays.filter((x) => x.live)),
    forecastAttainmentD14Pct: 100 * forecastAttainment(sumBy(firstLive, (x) => x.demand), forecast),
    nudgesSent,
    nudgesActed,
    fixesTried,
    fixesWorked,
    kamCases,
    newRules,
    secondLotDay,
    ppDwellDays: ppDwell.units === 0 ? null : ppDwell.sum / ppDwell.units,
    ppGrades: { A: sumBy(allDays, (x) => (isPP(x.skuId) ? x.grades.A : 0)), B: sumBy(allDays, (x) => (isPP(x.skuId) ? x.grades.B : 0)), C: sumBy(allDays, (x) => (isPP(x.skuId) ? x.grades.C : 0)) },
    ppSlowStockUnits: skus.reduce((a, s) => a + s.slowStockUnits, 0),
  };

  events.sort((a, b) => a.day - b.day);
  return {
    options: { personaId: options.personaId, seed, counterfactual: cf, untilDay, scenario: options.scenario, overrides: options.overrides ?? {} },
    persona: spec,
    districts,
    bTables,
    outreach,
    cohort,
    days,
    events,
    kpis,
    gates,
    guardrails,
  };
}


// ───────────────────────── pure helpers ─────────────────────────

function hasTarnish(sp: SkuSpec) {
  return sp.latent.some((l) => l.kind === 'tarnish');
}

/** Return rates (%) by reason for units dispatched with `unfixedShare` from not-yet-fixed lots. */
function returnRates(s: SkuState, unfixedShare: number): Record<ReturnReason, number> {
  const sp = s.spec;
  const base = sp.returnRatePct;
  const tarnish = sp.latent.find((l) => l.kind === 'tarnish');
  const tarnishPct = tarnish && tarnish.kind === 'tarnish' ? tarnish.extraReturnPct * unfixedShare : 0;
  return {
    product: base * sp.returnMix.product * s.productFactor + s.extraProductReturnPct + tarnishPct,
    expectation: base * sp.returnMix.expectation * s.expectationFactor,
    size: base * sp.returnMix.size,
    swap: base * sp.returnMix.swap,
  };
}

function noiseFor(s: SkuState, day: number): number {
  const launchLen = C.LAUNCH_LIVE_DAYS.value.max - C.LAUNCH_LIVE_DAYS.value.min + 1;
  const sinceLive = day - s.liveFrom;
  const inFirst = sinceLive < launchLen;
  const key = inFirst ? 'L' : String(Math.floor((sinceLive - launchLen) / 7));
  const len = inFirst ? launchLen : 7;
  let block = s.noise.get(key);
  if (!block) {
    const amp = C.SIM_DAILY_NOISE.value;
    const raw = Array.from({ length: len }, () => 1 - amp + 2 * amp * s.rng());
    const mean = raw.reduce((a, b) => a + b, 0) / len;
    block = raw.map((x) => x / mean);
    s.noise.set(key, block);
  }
  const idx = inFirst ? sinceLive : (sinceLive - launchLen) % 7;
  return block[Math.max(0, idx)] ?? 1;
}

function pickDistrict(rng: Rng, districts: District[], launch: boolean): number {
  const group = districts.map((d, i) => ({ d, i })).filter((x) => x.d.launch === launch);
  const total = group.reduce((a, x) => a + x.d.weight, 0);
  let r = rng() * total;
  for (const x of group) {
    r -= x.d.weight;
    if (r <= 0) return x.i;
  }
  return group[group.length - 1]!.i;
}

function sumBy<T>(xs: readonly T[], f: (x: T) => number) {
  return xs.reduce((a, x) => a + f(x), 0);
}

function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function fmt2(n: number) {
  return (Math.round(n * 100) / 100).toString();
}

function fmt1(n: number) {
  return (Math.round(n * 10) / 10).toString();
}
