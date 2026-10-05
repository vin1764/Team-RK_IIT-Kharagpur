/**
 * The 39 levers considered (CLAUDE.md section 2, "Gates"): 12 kept, 6 merged, 1 deferred, 20 dropped.
 * Gates don't average: one "no" eliminates a lever. Enabler exception: a lever that fails only G3 is
 * kept when tied to a lever that passes all four.
 */

export type Gate = 'G1' | 'G2' | 'G3' | 'G4';
export type LeverStatus = 'Kept' | 'Merged' | 'Deferred' | 'Dropped';

export interface LeverRow {
  id: number;
  name: string;
  area: 'Find & onboard' | 'Launch' | 'Grow & retain' | 'Price integrity' | 'Fulfilment' | 'Demand data';
  status: LeverStatus;
  fails: Gate[];
  reason: string;
  enabler?: boolean;
}

export const GATES: { id: Gate; name: string; test: string }[] = [
  { id: 'G1', name: 'Subsidy-free', test: 'No per-order cost once built (Meesho keeps ~₹8.09 per order)' },
  { id: 'G2', name: 'Scalable', test: 'Works for hundreds of factories with no one assigned to each' },
  { id: 'G3', name: 'Price-reducing', test: "Directly lowers the buyer's price" },
  { id: 'G4', name: 'Durable', test: 'The saving survives price rises, stock-outs and spec swaps' },
];

export const ENABLER_RULE = 'A lever that fails only G3 is kept when it is tied to a lever that passes all four.';

const L = (id: number, name: string, area: LeverRow['area'], status: LeverStatus, fails: Gate[], reason: string, enabler = false): LeverRow => ({
  id,
  name,
  area,
  status,
  fails,
  reason,
  enabler,
});

export const LEVERS: LeverRow[] = [
  L(1, 'Demand Intelligence Engine (gap sizing)', 'Demand data', 'Kept', [], 'Fuels every term of the formula; reuses data Meesho already logs'),
  L(2, 'Committed-supply ledger', 'Demand data', 'Kept', [], 'Stops makers piling into one gap; no per-order cost'),
  L(3, 'Price Integrity Layer (benchmark B + band)', 'Price integrity', 'Kept', [], 'Makes the price drop measurable and enforceable'),
  L(4, 'Auto price-hold', 'Price integrity', 'Kept', [], 'Keeps the saving when B moves (G4)'),
  L(5, 'Demand teaser + 5-minute cost check', 'Find & onboard', 'Kept', ['G3'], 'Enabler: tied to the price band', true),
  L(6, 'GST/Udyam records check', 'Find & onboard', 'Kept', ['G3'], 'Enabler: keeps traders out of the price filter', true),
  L(7, 'AI listing bot (3 screens)', 'Find & onboard', 'Kept', ['G3'], 'Enabler: removes the listing barrier for offline makers', true),
  L(8, 'Factory Launch Week (order book)', 'Launch', 'Kept', [], 'The 30-day quick win: concentrated demand without discounts'),
  L(9, 'District control group', 'Launch', 'Kept', ['G3'], 'Enabler: proves lift before scaling', true),
  L(10, 'Restock loop (reorder point)', 'Grow & retain', 'Kept', ['G3'], 'Enabler: keeps the cheaper listing in stock', true),
  L(11, 'SKU health coach (one cause, one fix)', 'Grow & retain', 'Kept', ['G3'], 'Enabler: retention without a manager per maker', true),
  L(12, 'Cluster Pack Point (partner-run)', 'Fulfilment', 'Kept', [], 'Per-order fee paid by makers; only above ₹175'),
  L(13, 'Make-to-demand switch suggestions', 'Grow & retain', 'Merged', [], 'Merged into the coach (slow-seller rule)'),
  L(14, 'RTO rate per SKU', 'Grow & retain', 'Merged', [], 'Merged into the coach and the cost stack'),
  L(15, 'Prepaid nudge', 'Grow & retain', 'Merged', [], 'Merged into the coach (refusals rule)'),
  L(16, 'Win-back diagnosis for churned makers', 'Find & onboard', 'Merged', [], 'Merged into the demand teaser for the churned cohort'),
  L(17, 'Take-home calculator vs other marketplaces', 'Find & onboard', 'Merged', [], 'Merged into the cost check'),
  L(18, 'Launch-rating down-weighting', 'Launch', 'Merged', [], 'Merged into Launch Week placement rules'),
  L(19, 'Apparel launch', 'Launch', 'Deferred', ['G4'], 'Waits until spec verifiability and returns tests pass'),
  L(20, 'Commission discount for makers', 'Launch', 'Dropped', ['G1'], 'Commission is already 0%; any other fee cut is a subsidy'),
  L(21, 'Shipping subsidy for new makers', 'Fulfilment', 'Dropped', ['G1'], 'Per-order cost to Meesho'),
  L(22, 'Ad credits for launch', 'Launch', 'Dropped', ['G1', 'G4'], 'Subsidy; visibility ends when credits end'),
  L(23, 'Buyer coupons on C2M listings', 'Launch', 'Dropped', ['G1', 'G4'], 'Subsidy; price rises when coupons stop'),
  L(24, 'Volume guarantee to makers', 'Launch', 'Dropped', ['G1'], 'Not allowed (mentor); a guarantee is a liability'),
  L(25, 'Dedicated KAM per maker', 'Grow & retain', 'Dropped', ['G2'], "Doesn't scale; KAM only after two failed fixes"),
  L(26, 'Field team onboarding visits', 'Find & onboard', 'Dropped', ['G2'], 'One person per cluster per week'),
  L(27, 'Factory-origin badge for buyers', 'Price integrity', 'Dropped', ['G3', 'G4'], 'Misleading-claim risk; C2M is a filter, not a label'),
  L(28, 'Meesho-only SKUs to avoid channel conflict', 'Find & onboard', 'Dropped', ['G4'], 'Spec swaps defeat like-for-like comparison'),
  L(29, 'Copyright takedowns for copied designs', 'Price integrity', 'Dropped', ['G2', 'G4'], 'Slow and manual; speed and price-hold win instead'),
  L(30, 'Meesho-owned warehouses for makers', 'Fulfilment', 'Dropped', ['G1', 'G2'], 'Capex and storage cost per order'),
  L(31, 'Pre-orders / made-to-order listings', 'Launch', 'Dropped', ['G4'], 'Not allowed: 24–48 h dispatch, no pre-orders'),
  L(32, 'Working-capital loans for first lots', 'Find & onboard', 'Dropped', ['G3'], 'Not tied to a price-reducing lever; credit risk'),
  L(33, 'Subscription plan for makers', 'Grow & retain', 'Dropped', ['G2'], 'Sellers prefer per-order fees (mentor)'),
  L(34, 'Exclusive category slots for makers', 'Launch', 'Dropped', ['G4'], 'Protection ends; price creeps back up'),
  L(35, 'Price-superlative claims in buyer UI', 'Price integrity', 'Dropped', ['G4'], 'Compliance risk (CCPA); not durable'),
  L(36, 'Influencer-led launch promotion', 'Launch', 'Dropped', ['G1', 'G2'], 'Per-launch spend; one-off'),
  L(37, 'Factory audits by Meesho staff', 'Price integrity', 'Dropped', ['G2'], 'Manual; sampled test buys catch the same gaming'),
  L(38, 'Free packaging material', 'Fulfilment', 'Dropped', ['G1'], 'Per-order cost'),
  L(39, 'Return-fee waiver for makers', 'Fulfilment', 'Dropped', ['G1', 'G4'], 'Subsidy; invites careless listings'),
];
