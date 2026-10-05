import { C } from '../data/constants';
import type { FormulaTerm } from '../data/copy';

export interface Chapter {
  n: number;
  title: string;
  /** Day range label as in CLAUDE.md section 8. */
  days: string;
  stage: string;
  lit: FormulaTerm['id'][];
}

const d = C.CHAPTER_DAYS.value;
const live = C.LAUNCH_LIVE_DAYS.value;

export const CHAPTERS: Chapter[] = [
  { n: 0, title: 'Meesho finds the gap', days: `Day ${d[0]}`, stage: 'Demand Intelligence Engine', lit: ['makers'] },
  { n: 1, title: 'Outreach', days: `Day ${d[1]}`, stage: '① Factory Onboarding', lit: ['makers'] },
  { n: 2, title: 'Cost check', days: `Day ${d[2]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'] },
  { n: 3, title: 'Sign-up + records', days: `Day ${d[3]}`, stage: '① Factory Onboarding', lit: ['makers'] },
  { n: 4, title: 'Listing bot', days: `Day ${d[4]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'] },
  { n: 5, title: 'Fulfilment choice', days: `Day ${d[5]}`, stage: '① Factory Onboarding', lit: ['makers', 'priceDrop'] },
  { n: 6, title: 'Order book + production', days: `Day ${d[6]}–${C.LAUNCH_STOCK_IN_DAY.value}`, stage: '② Factory Launch Week', lit: ['active30'] },
  { n: 7, title: 'Launch Week', days: `Day ${live.min}–${live.max}`, stage: '② Factory Launch Week', lit: ['active30', 'ordersPerMaker', 'priceDrop'] },
  { n: 8, title: 'Returns & RTO', days: `Day ${d[8]}–${C.STICK_WINDOW_DAYS.value.max - 2}`, stage: '② Factory Launch Week', lit: ['ordersPerMaker'] },
  { n: 9, title: 'Gate 1', days: `Day ${C.GATE_DAYS.value[0]}`, stage: 'Day-30 rule', lit: ['active30'] },
  { n: 10, title: 'Restock + coach', days: `Day ${d[10]}–${d[11]! - 1}`, stage: '③ Growth Loop', lit: ['ordersPerMaker', 'retained90'] },
  { n: 11, title: 'B moves + Gate 2', days: `Day ${d[11]}–${C.GATE_DAYS.value[1]}`, stage: 'Price Integrity Layer', lit: ['priceDrop', 'retained90'] },
  { n: 12, title: 'Make to demand', days: `Day ${d[12]}–80`, stage: '③ Growth Loop', lit: ['ordersPerMaker', 'retained90'] },
  { n: 13, title: 'Gate 3 + scorecard', days: `Day ${C.GATE_DAYS.value[2]}`, stage: 'Scale or stop', lit: ['makers', 'active30', 'ordersPerMaker', 'priceDrop', 'retained90'] },
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
