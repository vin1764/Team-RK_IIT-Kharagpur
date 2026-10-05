/**
 * The three manufacturer personas (CLAUDE.md section 5). All synthetic.
 *
 * Hero numbers quoted in the deck live in constants.ts (HERO_*). The other personas'
 * numbers are synthetic persona data, chosen to match the deck's story (e.g. Sunita's
 * ₹60 + ₹49 + ₹13 + ₹28 = ₹150 split) and shown in Verify mode as "Synthetic persona data".
 */
import { C, type Range } from './constants';
import type { CategoryId } from './categories';
import type { CostStack } from '../engine/formulas';

export type PersonaId = 'hiren' | 'ayesha' | 'sunita';

export const PERSONA_DATA_SOURCE = 'Synthetic persona data (src/data/personas.ts)';

export interface PersonaSummary {
  id: PersonaId;
  name: string;
  business: string;
  city: string;
  category: string;
  cohort: 'Offline only' | 'Online elsewhere' | 'Churned from Meesho';
  mainAsk: string;
  heroSku: string;
  isHero: boolean;
}

export type ReturnReason = 'product' | 'expectation' | 'size' | 'swap';
export type ReturnMix = Record<ReturnReason, number>;

/** A hidden cause the coach and the KAM work on. */
export type LatentIssue =
  | { kind: 'weakPhoto'; fixedCtrPct: number; cause: string; newRule: string }
  | { kind: 'highRefusals'; nudgedCodSharePct: number; cause: string }
  | {
      kind: 'tarnish';
      /** Extra return rate (pp), product reasons (finish changes colour); only the KAM's plating fix removes it. */
      extraReturnPct: number;
      /** Share of the visible expectation returns each listing fix removes. */
      listingFixEffect: number;
      cause: string;
      newRule: string;
    };

export interface SkuSpec {
  id: string;
  name: string;
  productType: string;
  categoryId: CategoryId;
  stack: CostStack;
  margin: number;
  /** Benchmark B over time (market moves). */
  bEpochs: { fromDay: number; B: number }[];
  resellerPrice: number;
  openGapWeek: Range;
  committedWeek: number;
  likelyShare: number;
  establishedMedianPerDay: number;
  ctrPct: number;
  typeCtr: { p25: number; median: number };
  conversionPct: number;
  returnRatePct: number;
  returnMix: ReturnMix;
  typeReturnP75Pct: number;
  returnFee: number;
  codSharePct: number;
  codFailPct: number;
  prepaidFailPct: number;
  typeRefusalP75Pct: number;
  minRun: number;
  leadTimeDays: number;
  safetyDays: number;
  /** Units made now but kept unpacked, linked to stock when the launch lot runs low. */
  packLaterLot: number;
  fulfilment: 'selfShip' | 'packPoint';
  liveFromDay: number;
  inLaunch: boolean;
  /** Market shifts in this listing's demand (e.g. rivals take the sipper's buyers). */
  demandShifts: { fromDay: number; factor: number }[];
  latent: LatentIssue[];
  weightGrams: number;
  /** Product-reason return rate above which the coach suggests a product fix (pp). */
  typeProductReturnP75Pct?: number;
  /** Category norm for "not as described" (product-reason) returns, if not the SKU's own base mix (pp). */
  nadNormPct?: number;
  /** GST rate if not the 5% default (steel kitchenware, imitation jewellery, mass footwear). */
  gstRatePct?: number;
}

export interface PersonaSpec extends PersonaSummary {
  launchNo: 1 | 2;
  /** Which monthly Factory Launch Week the maker joins in the MVP (display). */
  launchWeekNo: number;
  /** Seller-level quality score (share of 1–2★ ratings) inherited by unrated listings. */
  sellerQualityScore?: number;
  skus: SkuSpec[];
  /** Open-gap product types on the same material and process (make-to-demand switch). */
  switchOptions: SkuSpec[];
  node?: { startMakers: number; crossDay: number; afterMakers: number };
  /** Churned makers: what their old listing showed (win-back diagnosis). */
  winBack?: { views: number; clicks: number; likelyReason: string; refusalPct: number; categoryRefusalPct: number; listingsBefore: string };
}

const live = C.LAUNCH_LIVE_DAYS.value.min;
const codFail = 100 - C.COD_SUCCESS_PCT.value;
const prepaidFail = 100 - C.PREPAID_SUCCESS_PCT.value;

// ───────────────────────── Persona 1: Hiren Patel (hero) ─────────────────────────

const bottle: SkuSpec = {
  id: 'bottle-1l',
  name: '1 L stainless steel bottle',
  productType: 'Steel bottle · 1 L',
  categoryId: 'homeKitchen',
  stack: {
    makingCost: C.HERO_MAKING_COST.value,
    packaging: C.HERO_PACKAGING.value,
    shippingAndFee: C.HERO_SHIPPING_AND_FEE.value,
    returnsBuffer: C.HERO_RETURNS_BUFFER.value,
  },
  margin: C.HERO_MARGIN.value,
  bEpochs: [
    { fromDay: C.TIMELINE_DAYS.value.min, B: C.HERO_B.value },
    { fromDay: C.HERO_B_MOVES_DAY.value, B: C.HERO_B_DAY_52.value },
  ],
  resellerPrice: 180,
  openGapWeek: C.HERO_OPEN_GAP_WEEK.value,
  committedWeek: C.HERO_COMMITTED_SUPPLY.value,
  likelyShare: C.HERO_LIKELY_SHARE.value,
  establishedMedianPerDay: C.HERO_ESTABLISHED_MEDIAN.value,
  ctrPct: C.HERO_CTR_BEFORE_PCT.value,
  typeCtr: { p25: 3.0, median: C.HERO_CTR_TYPE_MEDIAN_PCT.value },
  conversionPct: 6,
  returnRatePct: 7.5,
  returnMix: { product: 0.35, expectation: 0.45, size: 0, swap: 0.2 },
  typeReturnP75Pct: 9,
  returnFee: 40,
  codSharePct: C.COD_SHARE_PCT.value,
  codFailPct: codFail,
  prepaidFailPct: prepaidFail,
  typeRefusalP75Pct: 19,
  minRun: C.HERO_MIN_RUN.value,
  leadTimeDays: C.HERO_LEAD_TIME_DAYS.value,
  safetyDays: C.HERO_SAFETY_DAYS.value,
  packLaterLot: C.HERO_PACK_LATER_LOT.value,
  fulfilment: 'selfShip',
  liveFromDay: live,
  inLaunch: true,
  demandShifts: [],
  latent: [
    {
      kind: 'weakPhoto',
      fixedCtrPct: C.HERO_CTR_AFTER_PCT.value,
      cause: 'Main photo shot on a dark shop counter; the bottle is hard to see',
      newRule: 'Dark-background main photo → reshoot on white with a scale object',
    },
  ],
  weightGrams: 260,
};

const sipper: SkuSpec = {
  ...bottle,
  id: 'sipper-750',
  name: '750 ml steel sipper',
  productType: 'Steel sipper · 750 ml',
  stack: { makingCost: 66, packaging: 6, shippingAndFee: 30, returnsBuffer: 7 },
  margin: 13,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 138 }],
  resellerPrice: 160,
  openGapWeek: { min: 140, max: 210 },
  committedWeek: 300,
  establishedMedianPerDay: 10,
  ctrPct: 4.0,
  packLaterLot: 60,
  demandShifts: [{ fromDay: C.HERO_SIPPER_SLOWS_DAY.value, factor: 0.12 }],
  latent: [],
  weightGrams: 210,
};

const lunchBox: SkuSpec = {
  ...bottle,
  id: 'lunchbox-3tier',
  name: '3-tier steel lunch box',
  productType: 'Steel lunch box · 3 tier',
  // Packaging slot holds the Pack Point fee at ≥ 40 makers: the node packs.
  stack: { makingCost: 120, packaging: C.T_PACK_POINT_FEE.value, shippingAndFee: 45, returnsBuffer: 9 },
  margin: 18,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 255 }],
  resellerPrice: 299,
  openGapWeek: { min: 160, max: 200 },
  committedWeek: 60,
  establishedMedianPerDay: 8,
  ctrPct: 4.0,
  returnFee: 50,
  packLaterLot: 0,
  fulfilment: 'packPoint',
  liveFromDay: Infinity,
  inLaunch: false,
  latent: [],
  weightGrams: 540,
};

const casserole: SkuSpec = {
  ...bottle,
  id: 'casserole-1500',
  name: '1.5 L steel casserole',
  productType: 'Steel casserole · 1.5 L',
  // Packaging slot holds the Pack Point fee at ≥ 40 makers: the node packs.
  stack: { makingCost: 150, packaging: C.T_PACK_POINT_FEE.value, shippingAndFee: 48, returnsBuffer: 10 },
  margin: 14,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 290 }],
  resellerPrice: 340,
  openGapWeek: { min: C.HERO_CASSEROLE_GAP_WEEK.value, max: C.HERO_CASSEROLE_GAP_WEEK.value },
  committedWeek: 0,
  establishedMedianPerDay: 8,
  ctrPct: 4.0,
  returnFee: 55,
  packLaterLot: 0,
  fulfilment: 'packPoint',
  liveFromDay: Infinity,
  inLaunch: false,
  latent: [],
  weightGrams: 620,
};

// ───────────────────────── Persona 2: Ayesha Siddiqui ─────────────────────────

const bowls: SkuSpec = {
  id: 'bowl-set',
  name: 'Brass-finish steel serving bowl set (3)',
  productType: 'Steel serving bowl set · 3 pc',
  categoryId: 'homeKitchen',
  stack: { makingCost: 190, packaging: 12, shippingAndFee: 52, returnsBuffer: 14 },
  margin: 64,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 379 }],
  resellerPrice: 449,
  openGapWeek: { min: 210, max: 280 },
  committedWeek: 240,
  likelyShare: 0.2,
  establishedMedianPerDay: 10,
  ctrPct: 4.1,
  typeCtr: { p25: 3.0, median: 4.0 },
  conversionPct: 4,
  returnRatePct: 6.5,
  returnMix: { product: 0.3, expectation: 0.5, size: 0, swap: 0.2 },
  typeReturnP75Pct: 9,
  returnFee: 55,
  codSharePct: 88,
  codFailPct: codFail,
  prepaidFailPct: prepaidFail,
  typeRefusalP75Pct: 19,
  minRun: 60,
  leadTimeDays: 4,
  safetyDays: 2,
  packLaterLot: 60,
  fulfilment: 'selfShip',
  liveFromDay: live,
  inLaunch: true,
  demandShifts: [],
  latent: [{ kind: 'highRefusals', nudgedCodSharePct: 68, cause: 'COD-heavy orders with a vague delivery date' }],
  weightGrams: 540,
};

// ───────────────────────── Persona 3: Sunita Das ─────────────────────────

const jewellery: SkuSpec = {
  id: 'jewellery-set',
  name: 'Imitation jewellery set (necklace + earrings)',
  productType: 'Imitation jewellery set · necklace + earrings',
  categoryId: 'fashionAccessories',
  // ₹60 factory + ₹49 shipping, fees & GST + ₹13 packing, return buffer & taxes + ₹28 kept = ₹150.
  stack: { makingCost: 60, packaging: 4, shippingAndFee: 42, returnsBuffer: 9 },
  margin: 28,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 165 }],
  resellerPrice: 190,
  openGapWeek: { min: 350, max: 490 },
  committedWeek: 300,
  likelyShare: 0.18,
  establishedMedianPerDay: 14,
  ctrPct: 3.5,
  typeCtr: { p25: 2.5, median: 3.6 },
  conversionPct: 5,
  returnRatePct: 20,
  returnMix: { product: 0.2, expectation: 0.55, size: 0, swap: 0.25 },
  typeReturnP75Pct: 22,
  typeProductReturnP75Pct: 6,
  nadNormPct: 7,
  returnFee: 35,
  codSharePct: 80,
  codFailPct: 31,
  prepaidFailPct: prepaidFail,
  typeRefusalP75Pct: 24,
  minRun: 100,
  leadTimeDays: 6,
  safetyDays: 2,
  packLaterLot: 0,
  fulfilment: 'selfShip',
  liveFromDay: live,
  inLaunch: true,
  demandShifts: [],
  latent: [
    {
      kind: 'tarnish',
      extraReturnPct: 5,
      listingFixEffect: 0.6,
      cause: 'Plating tarnishes within days (returned as "colour changed"); the maker’s own lacquer fixes don’t reach the plating step',
      newRule: 'Tarnish complaints → plating check',
    },
    { kind: 'highRefusals', nudgedCodSharePct: 62, cause: 'Fake COD orders and refusals on a COD-heavy base' },
  ],
  weightGrams: 120,
};

export const PERSONA_SPECS: PersonaSpec[] = [
  {
    id: 'hiren',
    name: 'Hiren Patel',
    business: 'Shree Ganesh Steelware',
    city: 'Rajkot',
    category: 'Home & Kitchen',
    cohort: 'Offline only',
    mainAsk: 'Will it sell? Who packs it?',
    heroSku: '1 L stainless steel bottle',
    isHero: true,
    launchNo: 1,
    launchWeekNo: 2,
    skus: [bottle, sipper],
    switchOptions: [casserole, lunchBox],
    node: {
      startMakers: C.HERO_NODE_START_MAKERS.value,
      crossDay: C.HERO_NODE_CROSS_DAY.value,
      afterMakers: C.HERO_NODE_MAKERS_AFTER_WEEK_7.value,
    },
  },
  {
    id: 'ayesha',
    name: 'Ayesha Siddiqui',
    business: 'Siddiqui Metal Crafts',
    city: 'Moradabad',
    category: 'Home & Kitchen',
    cohort: 'Online elsewhere',
    mainAsk: "What's my net after fees and RTOs?",
    heroSku: 'Brass-finish steel serving bowl set',
    isHero: false,
    launchNo: 1,
    launchWeekNo: 1,
    skus: [bowls],
    switchOptions: [],
  },
  {
    id: 'sunita',
    name: 'Sunita Das',
    business: 'Shree Durga Imitation Jewellery',
    city: 'Kolkata',
    category: 'Fashion Accessories',
    cohort: 'Churned from Meesho',
    mainAsk: 'Will anyone see my listings this time?',
    heroSku: 'Imitation jewellery set',
    isHero: false,
    launchNo: 2,
    launchWeekNo: 2,
    sellerQualityScore: 0.18,
    winBack: { views: 2400, clicks: 38, likelyReason: 'Main photo', refusalPct: 31, categoryRefusalPct: 22, listingsBefore: '20–30' },
    skus: [jewellery],
    switchOptions: [],
  },
];

export const PERSONAS: PersonaSummary[] = PERSONA_SPECS;

export const personaById = (id: string | undefined) => PERSONA_SPECS.find((p) => p.id === id);

export const SKUS = { bottle, sipper, casserole, lunchBox, bowls, jewellery };
