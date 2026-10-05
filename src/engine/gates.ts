/**
 * Decision rules fixed in advance (CLAUDE.md sections 2 and 8). Pure functions.
 */
import { C } from '../data/constants';

export interface GateInput {
  label: string;
  value: number;
  target: number;
  /** 'min' = value must be ≥ target; 'max' = value must be ≤ target. */
  sense: 'min' | 'max';
  unit: '×' | '%' | '₹' | 'ratio' | 'per listing-month';
  pass: boolean;
}

const input = (label: string, value: number, target: number, unit: GateInput['unit'], sense: GateInput['sense'] = 'min'): GateInput => ({
  label,
  value,
  target,
  sense,
  unit,
  pass: sense === 'min' ? value >= target : value <= target,
});

export type Gate1Decision = 'Invest' | 'Tighten' | 'Stop';

export interface Gate1Result {
  day: number;
  decision: Gate1Decision;
  inputs: GateInput[];
  rule: string;
  reason: string;
}

export const GATE1_RULE =
  'Invest if stick rate ≥ 0.5 AND lift ≥ 1.5× AND sell-through ≥ 60% AND prices held AND returns within the category band. Tighten if lift is positive but < 1.5×, or stick rate < 0.5, or durability is short (returns above the band) → fix, rerun once at the next Launch Week. Stop if there is no lift or prices didn’t hold.';

/** Day-30 rule. `liftX` ≤ 1 counts as "no lift". */
export function gate1(m: { stickRate: number; liftX: number; sellThroughPct: number; pricesHeldPct: number; returnRatePct: number; returnBandPct: number }, day = C.GATE_DAYS.value[0]!): Gate1Result {
  const inputs = [
    input('Stick rate', m.stickRate, C.T_STICK_RATE_D30.value, 'ratio'),
    input('Demand lift', m.liftX, C.T_DEMAND_LIFT.value, '×'),
    input('Sell-through', m.sellThroughPct, C.T_SELL_THROUGH_PCT.value, '%'),
    input('Prices held', m.pricesHeldPct, C.T_PRICES_HELD_PCT.value, '%'),
    input('Returns (durability)', m.returnRatePct, m.returnBandPct, '%', 'max'),
  ];
  const pricesHeld = inputs[3]!.pass;
  let decision: Gate1Decision;
  let reason: string;
  if (m.liftX <= 1 || !pricesHeld) {
    decision = 'Stop';
    reason = !pricesHeld ? 'Prices did not hold' : 'No lift over control districts';
  } else if (inputs.every((i) => i.pass)) {
    decision = 'Invest';
    reason = 'Every condition met';
  } else {
    decision = 'Tighten';
    reason = `Missed: ${inputs.filter((i) => !i.pass).map((i) => i.label.toLowerCase()).join(', ')}`;
  }
  return { day, decision, inputs, rule: GATE1_RULE, reason };
}

export type Gate2Decision = 'Continue' | 'Tighten';
export type Gate3Decision = 'Invest' | 'Tighten' | 'Stop';

export interface Gate2Result {
  day: number;
  decision: Gate2Decision;
  durability: GateInput[];
  watch: GateInput[];
  packPoint: { verdict: 'Pays' | 'Waits'; nodeMakers: number; fee: number; applies: boolean };
  rule: string;
  reason: string;
}

export const GATE2_RULE =
  'Continue if the saving is durable: prices held ≥ 95% through B moves, stock-outs ≤ 1 per listing per month, AND stick rate ≥ 1.0 at day 60. Otherwise Tighten (coach and restock focus, re-check at day 90). Pack Point pays once the node has ≥ 40 makers (fee ≤ ₹30); otherwise it waits and makers self-ship.';

export function gate2(m: {
  pricesHeldPct: number;
  stockOutsPerListingMonth: number;
  stickRateD60: number;
  nodeMakers: number;
  fee: number;
  packPointApplies: boolean;
}): Gate2Result {
  const durability = [
    input('Prices held (days 31–60)', m.pricesHeldPct, C.T_PRICES_HELD_PCT.value, '%'),
    input('Stock-outs', m.stockOutsPerListingMonth, C.T_STOCKOUTS_PER_LISTING_MONTH.value, 'per listing-month', 'max'),
    input('Stick rate at day 60', m.stickRateD60, C.T_STICK_RATE_D60.value, 'ratio'),
  ];
  const watch: GateInput[] = [];
  const missed = durability.filter((d) => !d.pass);
  return {
    day: C.GATE_DAYS.value[1]!,
    decision: missed.length === 0 ? 'Continue' : 'Tighten',
    reason:
      missed.length === 0
        ? 'Saving durable'
        : `Missed: ${missed.map((x) => `${x.label.toLowerCase()} ${x.unit === 'ratio' ? x.value.toFixed(2) : x.value.toFixed(1)} vs ${x.sense === 'min' ? '≥' : '≤'} ${x.target}`).join('; ')}`,
    durability,
    watch,
    packPoint: {
      verdict: m.nodeMakers >= C.PP_REFERENCE_MAKERS.value ? 'Pays' : 'Waits',
      nodeMakers: m.nodeMakers,
      fee: m.fee,
      applies: m.packPointApplies,
    },
    rule: GATE2_RULE,
  };
}

export interface Gate3Result {
  day: number;
  decision: Gate3Decision;
  inputs: GateInput[];
  watch: GateInput[];
  rule: string;
  reason: string;
}

export const GATE3_RULE =
  'Invest (scale) if, at cohort level, makers active at day 90 ≥ 60% AND the price drop delivered ≥ 8% of B AND the day-60 checks pass (makers active ≥ 70%, second lot by day 45 ≥ 50%). Tighten if the two headline checks pass but a day-60 check misses. Stop if a headline check misses.';

export function gate3(m: { makersActiveD90Pct: number; cohortPriceDropPct: number; secondLotByD45Pct: number; makersActiveD60Pct: number }): Gate3Result {
  const inputs = [
    input('Makers active at day 90', m.makersActiveD90Pct, C.T_MAKERS_ACTIVE_D90_PCT.value, '%'),
    input('Cohort price drop vs B', m.cohortPriceDropPct, C.PRICE_DROP_TARGET_PCT_OF_B.value, '%'),
  ];
  const watch = [
    input('Makers active at day 60', m.makersActiveD60Pct, C.T_MAKERS_ACTIVE_D60_PCT.value, '%'),
    input('Second lot by day 45', m.secondLotByD45Pct, C.T_SECOND_LOT_BY_D45_PCT.value, '%'),
  ];
  const decision: Gate3Decision = !inputs.every((i) => i.pass) ? 'Stop' : !watch.every((i) => i.pass) ? 'Tighten' : 'Invest';
  const missed = [...inputs, ...watch].filter((i) => !i.pass).map((i) => i.label.toLowerCase());
  return { day: C.GATE_DAYS.value[2]!, decision, inputs, watch, rule: GATE3_RULE, reason: missed.length ? `Missed: ${missed.join(', ')}` : 'Every check met' };
}