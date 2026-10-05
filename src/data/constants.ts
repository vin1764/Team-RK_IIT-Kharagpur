/**
 * The single source of truth for every number in the prototype (CLAUDE.md section 3).
 *
 * Each constant carries its value, unit, label, source and status. Verify mode reads
 * `source` and `status` from here. Components never hard-code business numbers: they
 * read a constant or call a function in `src/engine/formulas.ts`.
 */

export const STATUSES = [
  'Meesho filing',
  'Public policy (seller guides)',
  'Mentor input',
  'Team model',
  'Team estimate',
  'Synthetic',
] as const;

export type Status = (typeof STATUSES)[number];

export interface Constant<T = unknown> {
  value: T;
  unit: string;
  label: string;
  source: string;
  status: Status;
  /** Caveat shown in Verify mode (e.g. a conflict between sources, or an inferred value). */
  note?: string;
}

export interface Range {
  min: number;
  max: number;
}

function k<T>(value: T, unit: string, label: string, source: string, status: Status, note?: string): Constant<T> {
  return note === undefined ? { value, unit, label, source, status } : { value, unit, label, source, status, note };
}

const SELLER_GUIDES = 'Meesho public seller guides (supplier.meesho.com)';
const FILING = 'Meesho filing (FY25 DRHP / annual results)';
const MENTOR = 'Meesho mentor call';
const PACK_POINT_MODEL = "Team model (Rajkot Pack Point), cross-checked with Shiprocket's published ₹24 per order";
const TARGET = 'Team target: a starting value, tuned in the pilot';
const HERO = 'Deck worked example, Persona 1 (Hiren Patel, synthetic)';

export const C = {
  // ───────────────────────── Meesho platform and policy ─────────────────────────
  COMMISSION_PCT: k(0, '%', 'Commission charged to sellers', 'Meesho supplier portal', 'Public policy (seller guides)'),
  SHIPPING_RULE: k(
    'Charged by packed-weight slab and delivery zone, deducted from settlement; sellers cannot edit it',
    'rule',
    'Shipping charge',
    SELLER_GUIDES,
    'Public policy (seller guides)',
  ),
  GST_ON_LOGISTICS_PCT: k(18, '%', 'GST on logistics fees', SELLER_GUIDES, 'Public policy (seller guides)'),
  PAYMENT_CYCLE_DAYS: k(
    7,
    'days after delivery',
    'Payment cycle (prepaid and COD)',
    SELLER_GUIDES,
    'Public policy (seller guides)',
    'Confirm on Supplier Panel.',
  ),
  RETURN_WINDOW_DAYS: k(7, 'days after delivery', 'Buyer return window', SELLER_GUIDES, 'Public policy (seller guides)'),
  RTO_RULE: k(
    'No reverse shipping charged to the seller when dispatched on time',
    'rule',
    'RTO (buyer refuses or unreachable)',
    `${MENTOR} + ${SELLER_GUIDES}`,
    'Mentor input',
  ),
  CUSTOMER_RETURN_RULE: k(
    'Seller pays a return shipping fee by weight and zone',
    'rule',
    'Customer return',
    SELLER_GUIDES,
    'Public policy (seller guides)',
  ),
  CLAIM_RECOVERY_SHARE: k(
    0.5,
    'share of claim value',
    'Recovery on swapped/damaged-return claims (needs unboxing evidence)',
    `${SELLER_GUIDES} (evidence rule) + team calls (about half recovered)`,
    'Team estimate',
  ),
  DISPATCH_SLA_HOURS: k<Range>(
    { min: 24, max: 48 },
    'hours',
    'Dispatch SLA, 24–48 h (Meesho mentor); auto-cancel after, no pre-orders',
    MENTOR,
    'Mentor input',
    'Public seller guides say 2–3 days; we show the stricter mentor figure.',
  ),
  CATALOGUE_GO_LIVE_HOURS: k(72, 'hours', 'Catalogue go-live after upload (about)', SELLER_GUIDES, 'Public policy (seller guides)'),
  ONBOARDING_BOOST_MONTHS: k<Range>({ min: 3, max: 6 }, 'months', 'Onboarding visibility boost tapers over', MENTOR, 'Mentor input'),
  SWAP_RULE: k(
    "A cheaper equivalent moves into a ranked slot if its quality score is at least the pricier listing's. Quality score = share of 1–2★ ratings; unrated listings inherit the seller-level score.",
    'rule',
    'Cheaper-equivalent swap',
    MENTOR,
    'Mentor input',
  ),
  VALMO_SCOPE: k('Pickup and delivery only, no storage', 'rule', 'Valmo (Meesho logistics)', MENTOR, 'Mentor input'),
  DEMAND_DATA_ACCESS: k('Must be open to all sellers', 'rule', 'Demand data access', MENTOR, 'Mentor input'),
  VOLUME_GUARANTEES: k('None allowed', 'rule', 'Volume commitments to sellers', MENTOR, 'Mentor input'),
  PRICING_PREFERENCE: k('Sellers prefer per-order fees to subscriptions', 'rule', 'Seller pricing preference', MENTOR, 'Mentor input'),
  GST_TCS_PCT: k(
    0.5,
    '%',
    'GST TCS (s.52), withheld from payouts, claimable credit, not a cost',
    'CBIC notification, effective 10 Jul 2024',
    'Public policy (seller guides)',
  ),
  INCOME_TAX_TDS_PCT: k(
    0.1,
    '%',
    'Income-tax TDS (s.194-O), withheld from payouts, claimable',
    'Finance Act 2024, effective 1 Oct 2024',
    'Public policy (seller guides)',
  ),
  GST_RATE_PCT: k(
    5,
    '%',
    'GST on steel kitchenware, imitation jewellery, mass footwear',
    'PIB factsheet, GST rate rationalisation, effective 22 Sep 2025',
    'Public policy (seller guides)',
  ),
  GST_RATE_HAIR_OIL_PCT: k(
    18,
    '%',
    'GST on herbal hair oil (BPC simulation only)',
    'Team estimate',
    'Team estimate',
    'Not in the verified facts list; confirm the HSN rate before showing it to judges.',
  ),
  AMZ_REFERRAL_PCT: k(
    15,
    '% of price',
    'Amazon referral fee used in the take-home comparison (kitchen category, typical)',
    'Team estimate from public Amazon seller fee pages',
    'Team estimate',
    'Rates vary by category and price band; confirm before showing to judges.',
  ),
  AMZ_CLOSING_FEE: k(20, '₹ per order', 'Amazon fixed closing fee used in the comparison', 'Team estimate', 'Team estimate', 'Varies by price band.'),
  AMZ_SHIPPING_FEE: k(62, '₹ per order', 'Amazon shipping fee (Easy Ship, regional, ~500 g) used in the comparison', 'Team estimate', 'Team estimate'),
  AYESHA_AMAZON_PRICE: k(399, '₹', "Ayesha's bowl set price on Amazon", 'Synthetic persona data', 'Synthetic'),
  PLACED_ORDERS_FY25_CR: k(183.4, 'crore orders', 'Placed orders FY25', FILING, 'Meesho filing'),
  CONTRIBUTION_PER_ORDER: k(8.09, '₹ per order', 'Meesho contribution per order', FILING, 'Meesho filing'),
  CHARGED_TO_SELLER_PER_ORDER: k(51.17, '₹ per order', 'Average charged to seller per order', FILING, 'Meesho filing'),
  ATTRIBUTABLE_COST_PER_ORDER: k(43.1, '₹ per order', 'Attributable cost per order', FILING, 'Meesho filing'),
  COD_SHARE_PCT: k(76.95, '%', 'COD share of shipped orders', FILING, 'Meesho filing'),
  COD_SUCCESS_PCT: k(77.7, '%', 'COD delivery success', FILING, 'Meesho filing'),
  PREPAID_SUCCESS_PCT: k(97.28, '%', 'Prepaid delivery success', FILING, 'Meesho filing'),
  AOV: k(265, '₹', 'Average order value (FY26 results)', FILING, 'Meesho filing', 'FY25 filing shows ₹274.27; we use ₹265.'),
  AOV_FY25: k(274.27, '₹', 'Average order value (FY25 filing)', FILING, 'Meesho filing'),
  RTO_FORWARD_COST: k(50, '₹ per failed order', 'Forward cost of a failed order', 'Team estimate from Meesho filing', 'Team estimate'),
  RTO_REVERSE_COST: k(120, '₹ per failed order', 'Reverse cost of a failed order', 'Team estimate from Meesho filing', 'Team estimate'),

  // ───────────────────────── Market and categories ─────────────────────────
  MSMES_TOTAL: k(47_200_000, 'enterprises', 'MSMEs in India (4.72 Cr)', 'Udyam / MSME ministry; team funnel', 'Team model'),
  MSMES_SMALL: k(491_064, 'enterprises', 'Small enterprises', 'Udyam / MSME ministry; team funnel', 'Team model'),
  MAKERS_MANUFACTURING: k(152_000, 'enterprises', 'Small manufacturing enterprises (~31%)', 'Team funnel', 'Team model'),
  MAKERS_MANUFACTURING_SHARE_PCT: k(31, '%', 'Manufacturing share of small enterprises', 'Team funnel', 'Team model'),
  MAKERS_TAM: k(114_000, 'makers', 'Manufacturers in ₹5–25 Cr turnover (TAM)', 'Team funnel', 'Team model'),
  MAKERS_LAUNCH_CATEGORIES: k(66_000, 'makers', 'TAM makers in the 4 launch categories', 'Team funnel', 'Team model'),
  MAKERS_SAM: k(43_000, 'makers', 'Integrated makers (SAM)', 'Team funnel', 'Team model'),
  ORDER_MIX_PCT: k(
    {
      apparel: 36.17,
      homeKitchen: 17.24,
      footwearAccessories: 16.78,
      kidsBaby: 10.48,
      bpc: 9.98,
      others: 9.35,
    },
    '% of FY25 orders',
    'Order mix FY25',
    FILING,
    'Meesho filing',
  ),
  FOOTWEAR_SHARE_OF_FOOTWEAR_ACCESSORIES: k(
    0.4,
    'share',
    'Footwear share of "Footwear + accessories" (rest is accessories)',
    'Team split',
    'Team estimate',
    '16.78% × 40% = 6.7% (the deck rounds to ~6.8%).',
  ),
  YEAR_ONE_EXPOSURE_PCT: k(
    39.8,
    '% of orders',
    'Year-one category exposure',
    'Derived by the team from the order mix',
    'Team model',
    'Stored as given; the category split behind 39.8% is not itemised in the brief.',
  ),
  MIDDLEMAN_MARGIN_BY_PRICE: k(
    [
      { price: 150, margin: 33 },
      { price: 265, margin: 72 },
      { price: 360, margin: 105 },
    ],
    '₹ per order',
    'Middleman margin captured between ex-works and the buyer price',
    'Team model (channel calls)',
    'Team model',
    'Deck labels this "≈52% on top of ex-works"; the rupee values imply ~27% of price (~37% on ex-works). We use the rupee values.',
  ),
  MIDDLEMAN_SPLIT_AT_AOV: k(
    { distributor: 9, wholesaler: 18, reseller: 45 },
    '₹ per ₹265 order',
    'Who takes the ₹72 on a ₹265 order',
    'Team model (channel calls)',
    'Team model',
  ),
  SELF_SHIP_OWN_COST: k(12, '₹ per order', "Self-ship maker's own packing and returns handling", 'Team model', 'Team model'),
  PACK_POINT_MIN_PRICE: k(175, '₹', 'Pack Point recommended only above this list price', 'Team model', 'Team model'),
  MAKER_RAMP_YEAR_ONE: k([120, 320, 620], 'makers', 'Maker ramp, year one', 'Team plan', 'Team model'),
  SCALE_TARGET_CONVERSION_PCT: k(15, '%', 'Conversion assumed for the scale target', 'Team model', 'Team model'),
  MAKERS_SCALE_TARGET: k(3_050, 'makers', 'Makers needed at 15% conversion (scale target, not year one)', 'Derived by the team', 'Team model'),

  // ───────────────────────── Pack Point model (Rajkot) ─────────────────────────
  PP_ORDERS_PER_MAKER_MONTH: k(150, 'orders / maker / month', 'Orders per maker per month', PACK_POINT_MODEL, 'Team model'),
  PP_WORKING_DAYS: k(26, 'days / month', 'Working days per month', PACK_POINT_MODEL, 'Team model'),
  PP_UNITS_ON_HAND_PER_MAKER: k(50, 'units', 'Units on hand per maker', PACK_POINT_MODEL, 'Team model'),
  PP_UNITS_PER_SQFT: k(3, 'units / sq ft', 'Storage density', PACK_POINT_MODEL, 'Team model'),
  PP_FIXED_AREA_SQFT: k(500, 'sq ft', 'Fixed area (packing, inbound, QC)', PACK_POINT_MODEL, 'Team model'),
  PP_RENT_PER_SQFT: k(15, '₹ / sq ft / month', 'Rent', PACK_POINT_MODEL, 'Team model'),
  PP_PACKER_SALARY: k(14_000, '₹ / month', 'Packer salary', PACK_POINT_MODEL, 'Team model'),
  PP_HANDLER_SALARY: k(14_000, '₹ / month', 'Handler salary', PACK_POINT_MODEL, 'Team model'),
  PP_SUPERVISOR_SALARY: k(22_000, '₹ / month', 'Supervisor salary', PACK_POINT_MODEL, 'Team model'),
  PP_ORDERS_PER_PACKER_DAY: k(180, 'orders / packer / day', 'Packer throughput', PACK_POINT_MODEL, 'Team model'),
  PP_ORDERS_PER_HANDLER_DAY: k(
    250,
    'orders / handler / day',
    'Handler throughput',
    'Team model (inferred)',
    'Team model',
    'Not stated in the brief; inferred so the model reproduces ₹30.8 / ₹21.1 / ₹17.8 / ₹16.2 exactly.',
  ),
  PP_CONSUMABLES_PER_ORDER: k(5, '₹ / order', 'Consumables', PACK_POINT_MODEL, 'Team model'),
  PP_EQUIPMENT_COST: k(250_000, '₹', 'Equipment (₹2.5 L)', PACK_POINT_MODEL, 'Team model'),
  PP_EQUIPMENT_MONTHS: k(36, 'months', 'Equipment depreciation period', PACK_POINT_MODEL, 'Team model'),
  PP_UTILITIES: k(8_000, '₹ / month', 'Utilities', PACK_POINT_MODEL, 'Team model'),
  PP_PARTNER_MARGIN_PCT: k(18, '%', '3PL partner margin on cost', PACK_POINT_MODEL, 'Team model'),
  PP_FEE_TIER_MAKERS: k(
    [20, 40, 60, 80],
    'makers pooled',
    'Pack Point fee tiers (fee steps at each tier; below 20 the 20-maker fee applies)',
    PACK_POINT_MODEL,
    'Team model',
    'Fee steps between tiers, so 34 makers pay the 20-maker fee (₹44), as in the deck.',
  ),
  PP_STORAGE_FREE_DAYS: k(30, 'days', 'Free storage days', PACK_POINT_MODEL, 'Team model'),
  PP_STORAGE_PER_UNIT_DAY: k(0.29, '₹ / unit / day', 'Storage after the free days', PACK_POINT_MODEL, 'Team model'),
  PP_SLOW_STOCK_DECISION_DAY: k(60, 'day', 'Slow stock decided by', PACK_POINT_MODEL, 'Team model'),
  PP_SHIPROCKET_BENCHMARK: k(24, '₹ / order', "Shiprocket's published fulfilment price (cross-check)", 'Shiprocket public pricing', 'Team estimate'),
  PP_REFERENCE_MAKERS: k(40, 'makers', 'Reference node size', PACK_POINT_MODEL, 'Team model'),

  // ───────────────────────── Engine rules ─────────────────────────
  B_PERCENTILE: k(25, 'percentile', 'Benchmark B = this percentile of delivered price per unit', 'Price Integrity Layer design', 'Team model'),
  B_WINDOW_DAYS: k(28, 'days', 'Benchmark B window (sale days excluded)', 'Price Integrity Layer design', 'Team model'),
  B_MIN_DELIVERED_ORDERS: k(
    20,
    'delivered orders',
    'Minimum delivered orders for a listing to count toward B (N)',
    'Team estimate',
    'Team estimate',
    'N is not fixed in the brief; assumed 20, tuned in the pilot.',
  ),
  B_SELLER_WEIGHT_CAP_PCT: k(
    20,
    '% of orders',
    'Per-seller weight cap in the B calculation',
    'Team estimate',
    'Team estimate',
    'Cap value not fixed in the brief; assumed 20%, tuned in the pilot.',
  ),
  LIKELY_SHARE_LOW_PCT: k(25, 'percentile', 'Likely share range, low end', 'Demand engine design', 'Team model'),
  LIKELY_SHARE_HIGH_PCT: k(75, 'percentile', 'Likely share range, high end', 'Demand engine design', 'Team model'),
  LIKELY_SHARE_MIN_HISTORY: k(
    5,
    'past launches',
    'Fewer past launches than this → Low confidence',
    'Team estimate',
    'Team estimate',
    'Threshold not fixed in the brief; assumed 5.',
  ),
  FIRST_LOT_DAYS: k(14, 'days of expected sales', 'Suggested first lot', 'Listing bot design', 'Team model'),
  NEXT_BATCH_DAYS: k(21, 'days of run-rate', 'Next batch size', 'Growth loop design', 'Team model'),
  LOT_ROUNDING_UNITS: k(
    10,
    'units',
    'Lots and batches are rounded down to a multiple of this',
    'Team model',
    'Team model',
    'Rounding rule chosen so 11/day × 21 = 231 → 230 and the 126–182 range → 150, as in the deck.',
  ),
  RUN_RATE_WINDOW_DAYS: k(7, 'days', 'Run-rate window (trend-adjusted on 28 days)', 'Growth loop design', 'Team model'),
  CROWDED_SHARE: k(0.9, 'share of open gap', 'Committed supply at or above this share of the gap → Crowded', 'Demand engine design', 'Team model'),
  PROVISIONAL_SUPPLY_DAYS: k(7, 'days', 'New listings in this window count as provisional supply', 'Demand engine design', 'Team model'),
  NAD_RETURN_MULTIPLE: k(1.5, '× category norm', '"Not as described" returns above this trigger a test buy', 'Price Integrity Layer design', 'Team model'),
  LAUNCH_COMMIT_BY_DAY: k(7, 'day', 'Makers commit by', 'Launch Week design', 'Team model'),
  LAUNCH_STOCK_IN_DAY: k(18, 'day', 'Stock in by', 'Launch Week design', 'Team model'),
  LAUNCH_LIVE_DAYS: k<Range>({ min: 21, max: 25 }, 'days', 'Launch Week live days', 'Launch Week design', 'Team model'),
  STICK_WINDOW_DAYS: k<Range>({ min: 26, max: 30 }, 'days', 'Stick-rate measurement window', 'Launch Week design', 'Team model'),
  MAKERS_PER_LAUNCH: k<Range>({ min: 30, max: 50 }, 'makers', 'Makers per Launch Week', 'Launch Week design', 'Team model'),
  DISTRICTS: k(12, 'districts', 'Districts in the launch experiment (half control)', 'Launch Week design', 'Synthetic'),
  GATE_DAYS: k([30, 60, 90], 'day', 'Decision gates (Invest / Tighten / Stop at day 30; Gate 2 at 60; scale or stop at 90)', 'Launch Week + Growth Loop design', 'Team model'),
  DEFAULT_SEED: k(2026, 'seed', 'Default simulation seed (same seed + settings → same story)', 'Prototype setting', 'Synthetic'),
  TIMELINE_DAYS: k<Range>({ min: -14, max: 90 }, 'days', 'Journey timeline', 'Prototype design', 'Team model'),
  CATEGORY_WEIGHTS_PCT: k(
    { spec: 30, savings: 25, margin: 25, reach: 20 },
    '% weight',
    'Category scorecard weights (spec verifiability, savings after RTO, middleman margin capturable, factories reachable)',
    'Team model',
    'Team model',
  ),
  CATEGORY_RATING_MAX: k(5, 'points', 'Top of the category rating scale', 'Team model', 'Team model'),
  KAM_ESCALATION_FAILED_FIXES: k(2, 'failed fixes', 'KAM steps in after this many failed fixes on one SKU', 'Growth loop design', 'Team model'),
  KAM_ESCALATION_IGNORED_NUDGES: k(2, 'ignored nudges', '…or this many ignored nudges', 'Growth loop design', 'Team model'),
  FIX_RECHECK_DAYS: k(14, 'days', 'Re-check after a fix', 'Growth loop design', 'Team model'),

  CHAPTER_DAYS: k(
    [-14, -10, -9, -8, -7, -6, 0, 21, 22, 30, 31, 46, 61, 90],
    'day',
    'Journey chapters 0–13 start on these days',
    'Journey design (CLAUDE.md section 8)',
    'Team model',
  ),
  CHAPTER_FOCUS_DAYS: k(
    [-14, -10, -9, -8, -7, -6, 18, 23, 27, 30, 38, 52, 64, 90],
    'day',
    'Day each journey chapter opens on (Prev/Next)',
    'Journey design (CLAUDE.md section 8)',
    'Team model',
  ),
  DAYS_PER_MONTH: k(30, 'days', 'Days per month (for month-based rules)', 'Convention', 'Team model'),
  SLOW_SELLER_DAYS: k(14, 'days', 'Slow seller: below the bar on each of the last 14 days (2+ weeks)', 'Growth loop design', 'Team model'),
  SLOW_SELLER_SHARE: k(
    0.25,
    'share of type median orders/day',
    'Slow-seller bar (proxy for sell-through below the 25th percentile)',
    'Growth loop design',
    'Team model',
  ),
  NAD_WATCH_DAYS: k(14, 'days', '"Not as described" watch window', 'Price Integrity Layer design', 'Team model'),
  NAD_MIN_DELIVERIES: k(60, 'deliveries', 'Minimum deliveries in the window before the NAD watch can fire', 'Team estimate', 'Team estimate'),
  PRICE_HOLD_REVIEW_DAYS: k(3, 'days', 'A price-hold breach not fixed within this many days goes to review', 'Price Integrity Layer design', 'Team estimate'),

  // ───────────────────────── Simulation assumptions (synthetic; tuned so the deck story holds) ─────────────────────────
  SIM_LAUNCH_MULTIPLIER: k(
    2.2,
    '× demand',
    'Launch-section demand multiplier, launch districts only, live days 21–25',
    'Simulation assumption',
    'Team estimate',
  ),
  SIM_BOOST_AMPLITUDE: k(
    0.26,
    '× demand at go-live',
    "Meesho's existing onboarding boost at go-live; tapers to zero over 3–6 months (midpoint used)",
    'Simulation assumption; taper from mentor input',
    'Team estimate',
  ),
  SIM_PRICE_ELASTICITY: k(2, 'demand change per unit of (B − price) ÷ B', 'Price factor elasticity', 'Simulation assumption', 'Team estimate'),
  SIM_LISTING_QUALITY_WEIGHT: k(
    0.5,
    'weight',
    'How much CTR vs the type median moves demand (0 = not at all, 1 = proportionally)',
    'Simulation assumption',
    'Team estimate',
  ),
  SIM_DAILY_NOISE: k(0.25, '± share', 'Day-to-day demand noise within a week (weekly totals follow the model)', 'Simulation assumption', 'Synthetic'),
  SIM_DELIVERY_DAYS: k(4, 'days', 'Order to delivery', 'Simulation assumption', 'Team estimate'),
  SIM_RTO_RETURN_DAYS: k(11, 'days', 'Dispatch to the RTO unit arriving back (attempts + return transit)', 'Simulation assumption', 'Team estimate'),
  SIM_RETURN_TRANSIT_DAYS: k(4, 'days', 'Return request to the unit arriving back', 'Simulation assumption', 'Team estimate'),
  SIM_VISIBILITY_CUT: k(0.3, '× demand', 'Demand left after a visibility cut (price-hold breach, NAD flag)', 'Simulation assumption', 'Team estimate'),
  SIM_LAUNCH_DISTRICT_SHARE: k(0.5, 'share of districts', 'Districts that see the launch section (rest are control)', 'Launch Week design', 'Team model'),
  CF_GUESSED_LOT: k(500, 'units', 'Counterfactual: lot guessed without demand data', 'Deck counterfactual', 'Team model'),
  CF_DEMAND_FACTOR: k(0.35, '× demand', 'Counterfactual: slow first orders (no launch, no ratings, weak listing)', 'Deck counterfactual', 'Team estimate'),
  CF_LIVE_DAY: k(0, 'day', 'Counterfactual: listing goes live (no order book, no launch)', 'Deck counterfactual', 'Team model'),
  CF_CHURN_DAY: k(25, 'day', 'Counterfactual: maker churns (~day 25) with unsold stock', 'Deck counterfactual', 'Team model'),

  // ───────────────────────── Synthetic generators ─────────────────────────
  GEN_B_TABLE_ELIGIBLE: k(6, 'listings', 'Eligible listings in each 10-listing B table (4 more are shown excluded)', 'Synthetic generator', 'Synthetic'),
  GEN_B_BELOW_FLOOR_SHARE: k(0.97, '× B', 'Eligible listings priced below B sit at or above this share of B', 'Synthetic generator', 'Synthetic'),
  GEN_COHORT_PRICE_DROP_MEAN_PCT: k(9.5, '% of B', 'Cohort makers: mean generated price drop', 'Synthetic generator', 'Synthetic'),
  GEN_COHORT_PRICE_DROP_SPREAD_PCT: k(3, '± pp', 'Cohort makers: spread of the price drop', 'Synthetic generator', 'Synthetic'),
  GEN_COHORT_ACTIVE_PCT: k(
    { d30: 86, d60: 76, d90: 68 },
    '% of cohort',
    'Cohort makers active at day 30 / 60 / 90 (generation odds)',
    'Synthetic generator',
    'Synthetic',
  ),
  GEN_COHORT_SECOND_LOT_PCT: k(56, '% of cohort', 'Cohort makers with a second lot by day 45 (generation odds)', 'Synthetic generator', 'Synthetic'),
  GEN_OUTREACH_FOUND: k(240, 'makers', 'Makers found per cohort per launch', 'Synthetic generator', 'Synthetic'),
  GEN_OUTREACH_RATES_PCT: k(
    { contacted: 80, optedIn: 38, costCheck: 62, signedUp: 58, live: 55 },
    '% of previous step',
    'Outreach funnel step rates',
    'Synthetic generator',
    'Synthetic',
  ),
  GEN_DISTRICT_WEIGHT_SPREAD: k(0.3, '± share', 'District demand weights vary by', 'Synthetic generator', 'Synthetic'),

  // ───────────────────────── Break-it lab settings (synthetic) ─────────────────────────
  SCN_PRICE_RAISE_DAY: k(40, 'day', 'Scenario 1: maker raises price after reviews on', 'Break-it scenario', 'Synthetic'),
  SCN_PRICE_RAISE_ABOVE_B: k(10, '₹ above B', 'Scenario 1: new price is this far above B', 'Break-it scenario', 'Synthetic'),
  SCN_THIN_RETURN_MULTIPLE: k(2.2, '× return rate', 'Scenario 2: thinner steel multiplies returns (product reasons)', 'Break-it scenario', 'Synthetic'),
  SCN_DUMP_DAY: k(40, 'day', 'Scenario 4: rival dumps stock from', 'Break-it scenario', 'Synthetic'),
  SCN_DUMP_PRICE_SHARE_OF_B: k(0.62, '× B', 'Scenario 4: dump price', 'Break-it scenario', 'Synthetic'),
  SCN_DUMP_ORDERS: k(5000, 'orders', 'Scenario 4: dumped orders in the B window', 'Break-it scenario', 'Synthetic'),
  SCN_CROWDED_COMMITTED_SHARE: k(0.95, 'share of unserved demand', 'Scenario 5: committed supply', 'Break-it scenario', 'Synthetic'),
  SCN_SMALL_NODE_MAKERS: k(25, 'makers', 'Scenario 6: makers at the node', 'Break-it scenario', 'Synthetic'),
  SCN_FLOP_LAUNCH_MULTIPLIER: k(1.1, '× demand', 'Scenario 7: launch multiplier', 'Break-it scenario', 'Synthetic'),
  SCN_FLOP_POST_LAUNCH_FACTOR: k(0.4, '× demand', 'Scenario 7: demand after the launch', 'Break-it scenario', 'Synthetic'),
  SCN_OVERPROMISE_FACTOR: k(0.35, '× forecast', 'Scenario 8: actual demand vs forecast', 'Break-it scenario', 'Synthetic'),
  SCN_SALE_DAYS: k<Range>({ min: 44, max: 50 }, 'days', 'Scenario 10: sale week inside the B window', 'Break-it scenario', 'Synthetic'),
  SCN_SALE_PRICE_SHARE_OF_B: k(0.7, '× B', 'Scenario 10: sale-day prices', 'Break-it scenario', 'Synthetic'),

  // ───────────────────────── Targets (starting values, tuned in the pilot) ─────────────────────────
  T_CONTACT_TO_LIVE_DAYS: k(14, 'days (max)', 'Contact → live', TARGET, 'Team model'),
  T_SIGNUP_TO_LIVE_PCT: k(50, '% (min)', 'Sign-up → live conversion', TARGET, 'Team model'),
  T_HEALTH_CHECK_FIRST_PASS_PCT: k(80, '% (min)', 'Health check first pass', TARGET, 'Team model'),
  T_FORECAST_ATTAINMENT_D14_PCT: k(60, '% (min)', 'Forecast attainment at day 14', TARGET, 'Team model'),
  T_FORECAST_ATTAINMENT_D30_PCT: k(80, '% (min)', 'Forecast attainment at day 30', TARGET, 'Team model'),
  T_STICK_RATE_D30: k(0.5, 'ratio (min)', 'Stick rate at day 30', TARGET, 'Team model'),
  T_STICK_RATE_D60: k(1.0, 'ratio (min)', 'Stick rate at day 60', TARGET, 'Team model'),
  T_DEMAND_LIFT: k(1.5, '× (min)', 'Demand lift, launch vs control districts', TARGET, 'Team model'),
  T_SELL_THROUGH_PCT: k(60, '% (min)', 'Sell-through', TARGET, 'Team model'),
  T_PRICES_HELD_PCT: k(95, '% (min)', 'Prices held', TARGET, 'Team model'),
  T_NAD_SHARE_OF_RETURNS_PCT: k(2, '% (max)', '"Not as described" share of returns', TARGET, 'Team model'),
  T_MAKERS_ACTIVE_D60_PCT: k(70, '% (min)', 'Makers active at day 60', TARGET, 'Team model'),
  T_MAKERS_ACTIVE_D90_PCT: k(60, '% (min)', 'Makers active at day 90', TARGET, 'Team model'),
  T_SECOND_LOT_BY_D45_PCT: k(50, '% (min)', 'Second lot by day 45', TARGET, 'Team model'),
  T_FIX_SUCCESS_PCT: k(50, '% (min)', 'Fix success (back in band within 14 days)', TARGET, 'Team model'),
  T_NUDGES_ACTED_ON_PCT: k(40, '% (min)', 'Nudges acted on', TARGET, 'Team model'),
  T_STOCKOUTS_PER_LISTING_MONTH: k(1, 'per listing per month (max)', 'Stock-outs', TARGET, 'Team model'),
  T_PACK_POINT_FEE: k(30, '₹ (max) at ≥ 40 makers', 'Pack Point fee', TARGET, 'Team model'),
  T_PACK_POINT_DWELL_DAYS: k(45, 'days (max)', 'Pack Point stock dwell', TARGET, 'Team model'),
  PRICE_DROP_TARGET_PCT_OF_B: k(8, '% of B, cohort level', 'Price drop delivered (north star), cohort average', TARGET, 'Team model'),

  // ───────────────────────── Hero worked example (Persona 1) ─────────────────────────
  HERO_MAKING_COST: k(80, '₹ / unit', 'Making cost, 1 L steel bottle', HERO, 'Synthetic'),
  HERO_PACKAGING: k(6, '₹ / unit', 'Packaging', HERO, 'Synthetic'),
  HERO_SHIPPING_AND_FEE: k(32, '₹ / unit', 'Shipping + fixed fee', HERO, 'Synthetic'),
  HERO_RETURNS_BUFFER: k(8, '₹ / unit', 'Returns buffer', HERO, 'Synthetic'),
  HERO_MARGIN: k(15, '₹ / unit', 'Margin the maker asks for', HERO, 'Synthetic'),
  HERO_B: k(160, '₹', 'Benchmark B, 1 L steel bottle', HERO, 'Synthetic'),
  HERO_B_DAY_52: k(155, '₹', 'Benchmark B after it moves on day 52', HERO, 'Synthetic'),
  HERO_OPEN_GAP_WEEK: k<Range>(
    { min: 315, max: 455 },
    'orders / week',
    'Open gap, 1 L steel bottle (deck: "300–450")',
    HERO,
    'Synthetic',
    'Interpreted as the open gap after the 600 committed units, so 9–13/day follows at a ~20% likely share.',
  ),
  HERO_COMMITTED_SUPPLY: k(600, 'orders / week', 'Committed supply already on the ledger', HERO, 'Synthetic'),
  HERO_PACK_LATER_LOT: k(
    100,
    'units',
    '"Pack later" lot: a minimum run made from idle capacity, kept unpacked, linked when the launch lot runs low',
    HERO,
    'Synthetic',
    'Added so the deck’s day-33 stock (84 on hand at 11/day) is reachable from a 150-unit first lot.',
  ),
  HERO_ESTABLISHED_MEDIAN: k(14, 'orders / day', 'Established 1 L steel bottle, median orders/day (stick-rate base)', HERO, 'Synthetic'),
  HERO_NODE_MAKERS_AFTER_WEEK_7: k(41, 'makers', 'Rajkot node makers after week 7', HERO, 'Synthetic'),
  HERO_NODE_CROSS_DAY: k(45, 'day', 'Rajkot node crosses 40 makers (week 7)', HERO, 'Synthetic'),
  HERO_TURNOVER_CR: k(8, '₹ Cr', 'Shree Ganesh Steelware turnover', HERO, 'Synthetic'),
  HERO_WORKERS: k(45, 'workers', 'Shree Ganesh Steelware workers', HERO, 'Synthetic'),
  HERO_IDLE_CAPACITY_PCT: k(25, '%', 'Idle capacity (approx.)', HERO, 'Synthetic'),
  HERO_DISTRIBUTORS: k(2, 'distributors', 'Distributors Hiren sells through today', HERO, 'Synthetic'),
  AYESHA_TURNOVER_CR: k(14, '₹ Cr', 'Siddiqui Metal Crafts turnover', 'Synthetic persona data', 'Synthetic'),
  TARGET_TURNOVER_CR: k<Range>({ min: 5, max: 25 }, '₹ Cr', 'Target maker turnover band', 'Team model (maker funnel)', 'Team model'),
  TRADER_EXAMPLE_TURNOVER_CR: k(50, '₹ Cr', 'Example trader turnover in the Type × Turnover lesson', 'Team model', 'Team model'),
  HERO_B_MOVES_DAY: k(52, 'day', 'Benchmark B for the 1 L bottle moves to ₹155 on', HERO, 'Synthetic'),
  HERO_SIPPER_SLOWS_DAY: k(50, 'day', '750 ml sipper demand drops (rivals) from', HERO, 'Synthetic'),
  HERO_LIKELY_SHARE: k(0.2, 'share', 'Likely share (median of past launches)', HERO, 'Synthetic'),
  HERO_MIN_RUN: k(100, 'units', 'Minimum production run', HERO, 'Synthetic'),
  HERO_LEAD_TIME_DAYS: k(5, 'days', 'Production lead time', HERO, 'Synthetic'),
  HERO_SAFETY_DAYS: k(2, 'days', 'Safety days', HERO, 'Synthetic'),
  HERO_RESTOCK_DAY: k(33, 'day', 'First restock prompt', HERO, 'Synthetic'),
  HERO_RUN_RATE_DAY_33: k(11, 'orders / day', 'Run rate on day 33', HERO, 'Synthetic'),
  HERO_ON_HAND_DAY_33: k(84, 'units', 'Stock on hand on day 33', HERO, 'Synthetic'),
  HERO_NODE_START_MAKERS: k(34, 'makers', 'Rajkot node makers at start', HERO, 'Synthetic'),
  HERO_CASSEROLE_PRICE: k(265, '₹', '1.5 L steel casserole list price (second SKU)', HERO, 'Synthetic'),
  HERO_CASSEROLE_GAP_WEEK: k(200, 'orders / week', 'Casserole unserved demand', HERO, 'Synthetic'),
  HERO_CTR_BEFORE_PCT: k(1.6, '%', 'CTR before the photo fix (day 38)', HERO, 'Synthetic'),
  HERO_CTR_TYPE_MEDIAN_PCT: k(4.2, '%', 'CTR, product-type median', HERO, 'Synthetic'),
  HERO_CTR_AFTER_PCT: k(3.9, '%', 'CTR after the photo fix', HERO, 'Synthetic'),
} as const;

export type ConstantKey = keyof typeof C;

/** Look up a constant's value with its type preserved. */
export function v<K extends ConstantKey>(key: K): (typeof C)[K]['value'] {
  return C[key].value;
}
