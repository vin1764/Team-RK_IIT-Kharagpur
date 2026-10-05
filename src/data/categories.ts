/**
 * Categories (CLAUDE.md section 6). Scorecard ratings: weights live in constants
 * (CATEGORY_WEIGHTS_PCT) and the score is computed by `categoryScore` in formulas.ts.
 * Launch categories carry a SKU spec so the same engine can run a 30-day launch sim.
 */
import { C } from './constants';
import { SKUS, type SkuSpec } from './personas';

export type CategoryId = 'homeKitchen' | 'fashionAccessories' | 'footwear' | 'bpc' | 'electronicsFmcg' | 'apparel' | 'kidsBaby';

export interface CategoryRatings {
  /** Spec verifiability */
  spec: number;
  /** Savings after RTO */
  savings: number;
  /** Middleman margin capturable */
  margin: number;
  /** Factories reachable */
  reach: number;
}

export interface ScoredCategory {
  id: CategoryId;
  name: string;
  ratings: CategoryRatings;
}

export const SCORECARD: ScoredCategory[] = [
  { id: 'homeKitchen', name: 'Home & Kitchen', ratings: { spec: 5, savings: 5, margin: 4, reach: 4 } },
  { id: 'fashionAccessories', name: 'Fashion Accessories', ratings: { spec: 4, savings: 4, margin: 5, reach: 4 } },
  { id: 'footwear', name: 'Footwear', ratings: { spec: 5, savings: 2, margin: 3, reach: 5 } },
  { id: 'bpc', name: 'Beauty & Personal Care', ratings: { spec: 3, savings: 5, margin: 4, reach: 3 } },
  { id: 'electronicsFmcg', name: 'Electronics & branded FMCG', ratings: { spec: 4, savings: 4, margin: 1, reach: 1 } },
  { id: 'apparel', name: 'Apparel', ratings: { spec: 1, savings: 1, margin: 3, reach: 5 } },
];

export type CategoryStatus = 'Launch M1' | 'Launch M2' | 'Launch M3' | 'Launch M4' | 'Not sized' | 'Later' | 'Excluded';

export interface CategoryCard {
  id: CategoryId;
  name: string;
  status: CategoryStatus;
  statusNote?: string;
  heroSku?: string;
  keyParameters: string;
  specialRule: string;
  /** Launch categories: the SKU the 30-day sim runs. */
  sim?: SkuSpec;
  /** Non-launch categories: the test it fails, shown instead of a sim. */
  failingTest?: string;
  gate?: string;
}

const live = C.LAUNCH_LIVE_DAYS.value.min;
const prepaidFail = 100 - C.PREPAID_SUCCESS_PCT.value;
const codFail = 100 - C.COD_SUCCESS_PCT.value;

const hairOil: SkuSpec = {
  id: 'hair-oil-100',
  name: 'Herbal hair oil, 100 ml',
  productType: 'Herbal hair oil · 100 ml',
  categoryId: 'bpc',
  stack: { makingCost: 38, packaging: 6, shippingAndFee: 28, returnsBuffer: 3 },
  margin: 26,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 135 }],
  resellerPrice: 159,
  openGapWeek: { min: 280, max: 420 },
  committedWeek: 200,
  likelyShare: 0.18,
  establishedMedianPerDay: 12,
  ctrPct: 3.4,
  typeCtr: { p25: 2.6, median: 3.5 },
  conversionPct: 5,
  returnRatePct: 3,
  returnMix: { product: 0.4, expectation: 0.4, size: 0, swap: 0.2 },
  typeReturnP75Pct: 5,
  returnFee: 30,
  codSharePct: C.COD_SHARE_PCT.value,
  codFailPct: codFail,
  prepaidFailPct: prepaidFail,
  typeRefusalP75Pct: 19,
  minRun: 200,
  leadTimeDays: 7,
  safetyDays: 2,
  packLaterLot: 0,
  fulfilment: 'selfShip',
  liveFromDay: live,
  inLaunch: true,
  demandShifts: [],
  latent: [],
  weightGrams: 140,
  gstRatePct: C.GST_RATE_HAIR_OIL_PCT.value,
};

const slippers: SkuSpec = {
  id: 'eva-slippers',
  name: 'EVA slippers, men',
  productType: 'EVA slippers · men',
  categoryId: 'footwear',
  stack: { makingCost: 55, packaging: 5, shippingAndFee: 38, returnsBuffer: 18 },
  margin: 26,
  bEpochs: [{ fromDay: C.TIMELINE_DAYS.value.min, B: 165 }],
  resellerPrice: 199,
  openGapWeek: { min: 420, max: 560 },
  committedWeek: 400,
  likelyShare: 0.15,
  establishedMedianPerDay: 14,
  ctrPct: 3.8,
  typeCtr: { p25: 2.8, median: 3.8 },
  conversionPct: 5,
  returnRatePct: 28,
  returnMix: { product: 0.15, expectation: 0.2, size: 0.55, swap: 0.1 },
  typeReturnP75Pct: 32,
  returnFee: 40,
  codSharePct: C.COD_SHARE_PCT.value,
  codFailPct: codFail,
  prepaidFailPct: prepaidFail,
  typeRefusalP75Pct: 19,
  minRun: 150,
  leadTimeDays: 5,
  safetyDays: 2,
  packLaterLot: 0,
  fulfilment: 'selfShip',
  liveFromDay: live,
  inLaunch: true,
  demandShifts: [],
  latent: [],
  weightGrams: 300,
};

export const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: 'homeKitchen',
    name: 'Home & Kitchen',
    status: 'Launch M1',
    statusNote: 'Full lifecycle',
    heroSku: '1 L steel bottle',
    keyParameters: `Returns 6–9%; Pack Point above ₹${C.PACK_POINT_MIN_PRICE.value}`,
    specialRule: 'BIS/ISI mark favours certified makers',
    sim: SKUS.bottle,
  },
  {
    id: 'fashionAccessories',
    name: 'Fashion Accessories',
    status: 'Launch M2',
    heroSku: 'Jewellery set ₹150',
    keyParameters: `Returns 18–22%; self-ship below ₹${C.PACK_POINT_MIN_PRICE.value}`,
    specialRule: 'High copy risk: the answer is speed and price-hold, not copyright (dropped at G4)',
    sim: SKUS.jewellery,
  },
  {
    id: 'bpc',
    name: 'Beauty & Personal Care',
    status: 'Launch M3',
    heroSku: 'Herbal hair oil 100 ml',
    keyParameters: 'Low returns',
    specialRule: 'Order book opens only once verification covers formulation (licence check)',
    gate: 'Formulation licence check',
    sim: hairOil,
  },
  {
    id: 'footwear',
    name: 'Footwear',
    status: 'Launch M4',
    heroSku: 'EVA slippers',
    keyParameters: 'Returns 22–35%',
    specialRule: 'Size-fit returns drive listing-fix rules',
    gate: 'Go/no-go after ~10 weeks of Home & Kitchen return data',
    sim: slippers,
  },
  {
    id: 'kidsBaby',
    name: 'Kids & Baby',
    status: 'Not sized',
    keyParameters: `${C.ORDER_MIX_PCT.value.kidsBaby}% of orders`,
    specialRule: 'Needs its own quality/safety standard first',
    failingTest: 'No quality and safety standard to verify specs against yet',
  },
  {
    id: 'apparel',
    name: 'Apparel',
    status: 'Later',
    keyParameters: `${Math.round(C.ORDER_MIX_PCT.value.apparel)}% of orders, largest pool`,
    specialRule: 'Fails both buyer tests',
    failingTest: 'Spec verifiability (fit, fabric) and savings after 18–32% returns',
  },
  {
    id: 'electronicsFmcg',
    name: 'Electronics & branded FMCG',
    status: 'Excluded',
    keyParameters: '—',
    specialRule: 'Margin belongs to the brand, MRP-capped, mostly imported; integrated makers rare',
    failingTest: 'Middleman margin capturable and factories reachable',
  },
];

export const CATEGORY_SKUS = { hairOil, slippers };
