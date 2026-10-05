import { C } from '../data/constants';
import type { FormulaTerm } from '../data/copy';

export interface Chapter {
  n: number;
  title: string;
  /** Day range label as in CLAUDE.md section 8. */
  days: string;
  stage: string;
  lit: FormulaTerm['id'][];
  /** One-line caption when the chapter has no event yet. */
  summary: string;
}

const d = C.CHAPTER_DAYS.value;
const live = C.LAUNCH_LIVE_DAYS.value;

export const CHAPTERS: Chapter[] = [
  { n: 0, title: 'Meesho finds the gap', days: `Day ${d[0]}`, stage: 'Demand Intelligence Engine', lit: ['makers'], summary: 'The demand engine finds an open gap in a product type and computes benchmark B from comparable listings.' },
  { n: 1, title: 'Outreach', days: `Day ${d[1]}`, stage: '① Factory Onboarding', lit: ['makers'], summary: 'The maker gets a teaser naming their product type and its gap, with a 5-minute cost-check link (WhatsApp only after opt-in).' },
  { n: 2, title: 'Cost check', days: `Day ${d[2]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'], summary: 'Making cost in, everything else pre-filled: break-even vs B decides pass, near miss or not a fit.' },
  { n: 3, title: 'Sign-up + records', days: `Day ${d[3]}`, stage: '① Factory Onboarding', lit: ['makers'], summary: 'One question (manufacturer, wholesaler or reseller); GST and Udyam records are checked automatically.' },
  { n: 4, title: 'Listing bot', days: `Day ${d[4]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'], summary: 'Three screens: product recognised, first lot sized from demand, price set inside the band. Fees lock at dispatch.' },
  { n: 5, title: 'Fulfilment choice', days: `Day ${d[5]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'], summary: 'Self-ship or the Cluster Pack Point: the node only pays above the price threshold and once enough makers pool.' },
  { n: 6, title: 'Order book + production', days: `Day ${d[6]}–${C.LAUNCH_STOCK_IN_DAY.value}`, stage: '② Factory Launch Week', lit: ['active30'], summary: 'The order book opens: slots, price cap B, expected orders, dates. Makers commit, produce and stock in by day 18.' },
  { n: 7, title: 'Launch Week', days: `Day ${live.min}–${live.max}`, stage: '② Factory Launch Week', lit: ['active30', 'ordersPerMaker', 'priceDrop'], summary: 'Five live days in the launch section, launch districts only; control districts measure the lift.' },
  { n: 8, title: 'Returns & RTO', days: `Day ${d[8]}–${C.STICK_WINDOW_DAYS.value.max - 2}`, stage: '② Factory Launch Week', lit: ['ordersPerMaker'], summary: 'Returns and RTOs from the launch come back: who pays for what is decided by fault attribution, not by default.' },
  { n: 9, title: 'Gate 1', days: `Day ${C.GATE_DAYS.value[0]}`, stage: 'Day-30 rule', lit: ['active30'], summary: 'The day-30 rule, fixed in advance: stick rate, lift, sell-through, prices held, returns → Invest, Tighten or Stop.' },
  { n: 10, title: 'Restock + coach', days: `Day ${d[10]}–${d[11]! - 1}`, stage: '③ Growth Loop', lit: ['ordersPerMaker', 'retained90'], summary: 'Restock from the run-rate, and one coach nudge a week: one cause, one fix, one tap, re-checked after 14 days.' },
  { n: 11, title: 'B moves + Gate 2', days: `Day ${d[11]}–${C.GATE_DAYS.value[1]}`, stage: 'Price Integrity Layer', lit: ['priceDrop', 'retained90'], summary: 'B is recalculated as the market moves; the auto price-hold keeps the saving. Gate 2 checks durability and the Pack Point.' },
  { n: 12, title: 'Make to demand', days: `Day ${d[12]}–80`, stage: '③ Growth Loop', lit: ['ordersPerMaker', 'retained90'], summary: 'Make to demand: make more, keep, fix, stop or switch to an open gap on the same material.' },
  { n: 13, title: 'Gate 3 + scorecard', days: `Day ${C.GATE_DAYS.value[2]}`, stage: 'Invest, Tighten or Stop', lit: ['makers', 'active30', 'ordersPerMaker', 'priceDrop', 'retained90'], summary: 'Day 90: the cohort against its targets decides Invest, Tighten or Stop for the next launch.' },
];

/** The chapter a day belongs to. */
export function chapterForDay(day: number): number {
  let idx = 0;
  d.forEach((start, i) => {
    if (day >= start) idx = i;
  });
  return idx;
}

export const focusDay = (n: number) => C.CHAPTER_FOCUS_DAYS.value[n]!;
