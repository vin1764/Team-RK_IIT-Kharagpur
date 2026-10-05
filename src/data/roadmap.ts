/** 30-60-90 roadmap: sprints A–F and the gates with kill criteria (fixed in advance). */
import { C } from './constants';

export interface Sprint {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  days: string;
  title: string;
  build: string[];
  reuse: string[];
  metric: string;
}

export const SPRINTS: Sprint[] = [
  {
    id: 'A',
    days: 'Days −14 to 0',
    title: 'Find the gap, reach the makers',
    build: ['Demand engine v0 on logged searches/orders', 'Committed-supply ledger', 'Demand teaser + 5-minute cost check'],
    reuse: ['Search and order logs', 'Supplier Panel'],
    metric: `Contact → live ≤ ${C.T_CONTACT_TO_LIVE_DAYS.value} days`,
  },
  {
    id: 'B',
    days: 'Days 0–7',
    title: 'Sign up and list',
    build: ['GST/Udyam records check', 'Listing bot (3 screens)', 'Benchmark B + price band'],
    reuse: ['Catalogue upload (~72 h go-live)', 'Seller onboarding'],
    metric: `Sign-up → live ≥ ${C.T_SIGNUP_TO_LIVE_PCT.value}%`,
  },
  {
    id: 'C',
    days: 'Days 7–25',
    title: 'Factory Launch Week',
    build: ['Order book + slot allocation', 'Launch section (district control)', 'Auto price-hold'],
    reuse: ['Home and deals placements', 'Onboarding boost', 'Valmo pickup'],
    metric: `Lift ≥ ${C.T_DEMAND_LIFT.value}×, prices held ≥ ${C.T_PRICES_HELD_PCT.value}%`,
  },
  {
    id: 'D',
    days: 'Days 25–30',
    title: 'Measure and decide (Gate 1)',
    build: ['Stick rate and lift dashboards', 'Fault attribution for returns'],
    reuse: ['Returns and RTO data', 'Quality score'],
    metric: `Stick rate ≥ ${C.T_STICK_RATE_D30.value}, sell-through ≥ ${C.T_SELL_THROUGH_PCT.value}%`,
  },
  {
    id: 'E',
    days: 'Days 31–60',
    title: 'Growth loop (Gate 2)',
    build: ['Restock loop', 'SKU health coach + one-tap fixes', 'Pack Point with a 3PL partner'],
    reuse: ['Cheaper-equivalent swap', 'KAM team (escalation only)'],
    metric: `Second lot by day 45 ≥ ${C.T_SECOND_LOT_BY_D45_PCT.value}%, fix success ≥ ${C.T_FIX_SUCCESS_PCT.value}%`,
  },
  {
    id: 'F',
    days: 'Days 61–90',
    title: 'Make to demand, scale or stop (Gate 3)',
    build: ['Switch suggestions', 'Cohort scorecard', 'Launch 2 order book (offline makers via the Pack Point)'],
    reuse: ['Promotions calendar', 'Supplier Panel analytics'],
    metric: `Makers active at day 90 ≥ ${C.T_MAKERS_ACTIVE_D90_PCT.value}%, price drop ≥ ${C.PRICE_DROP_TARGET_PCT_OF_B.value}% of B`,
  },
];

export interface GateRow {
  day: number;
  name: string;
  go: string;
  kill: string;
}

export const ROADMAP_GATES: GateRow[] = [
  {
    day: C.GATE_DAYS.value[0]!,
    name: 'Gate 1: launch works?',
    go: `Invest: stick ≥ ${C.T_STICK_RATE_D30.value} AND lift ≥ ${C.T_DEMAND_LIFT.value}× AND sell-through ≥ ${C.T_SELL_THROUGH_PCT.value}% AND prices held`,
    kill: 'Stop: no lift over control districts, or prices did not hold. Tighten (rerun once): lift positive but below target, or stick below target.',
  },
  {
    day: C.GATE_DAYS.value[1]!,
    name: 'Gate 2: saving durable?',
    go: `Continue: prices held ≥ ${C.T_PRICES_HELD_PCT.value}% through B moves; stock-outs ≤ ${C.T_STOCKOUTS_PER_LISTING_MONTH.value}/listing/month. Pack Point pays at ≥ ${C.PP_REFERENCE_MAKERS.value} makers.`,
    kill: 'Tighten: prices slipped or stock-outs repeat. Pack Point waits (self-ship continues) below 40 makers.',
  },
  {
    day: C.GATE_DAYS.value[2]!,
    name: 'Gate 3: scale or stop',
    go: `Scale: makers active at day 90 ≥ ${C.T_MAKERS_ACTIVE_D90_PCT.value}% AND cohort price drop ≥ ${C.PRICE_DROP_TARGET_PCT_OF_B.value}% of B`,
    kill: 'Stop and rework before the next cohort if either misses.',
  },
];
