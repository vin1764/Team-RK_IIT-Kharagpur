import { C } from '../data/constants';
import { committedDayOf, dateLabel } from '../engine/nudges';
import type { SkuSpec } from '../data/personas';
import type { AccountView } from './useAccount';

/** SKUs the maker lists during onboarding (the Launch Week SKUs). */
export const launchSkus = (v: AccountView): SkuSpec[] => v.run.persona.skus.filter((s) => s.inLaunch);

/** Every SKU the maker can have (launch + make-to-demand options). */
export const allSpecs = (v: AccountView): SkuSpec[] => [...v.run.persona.skus, ...v.run.persona.switchOptions];
export const specById = (v: AccountView, sku: string | undefined) => allSpecs(v).find((s) => s.id === sku);

export interface SetupStep {
  key: 'entry' | 'check' | 'signup' | 'list' | 'commit';
  label: string;
  route: string;
  done: boolean;
}

export function setupSteps(v: AccountView): SetupStep[] {
  const o = v.state.onboarding;
  const unlisted = launchSkus(v).find((s) => !o.listed[s.id]);
  const unfulfilled = launchSkus(v).find((s) => !o.fulfilment[s.id]);
  return [
    { key: 'entry', label: 'See your demand', route: '/app/start', done: o.entrySeen },
    { key: 'check', label: 'Check if it pays', route: '/app/check', done: o.costChecked },
    { key: 'signup', label: 'Sign up', route: '/app/signup', done: o.signedUp },
    {
      key: 'list',
      label: 'List your products',
      route: unlisted ? `/app/list/${unlisted.id}/product` : unfulfilled ? `/app/list/${unfulfilled.id}/fulfilment` : '/app/launch',
      done: !unlisted && !unfulfilled,
    },
    { key: 'commit', label: 'Commit your launch slot', route: '/app/launch', done: o.committedDay !== null },
  ];
}

/** The account's committed day (the maker's own tap, or the order-book deadline in the demo). */
export const committedOf = (v: AccountView) => committedDayOf(v.state, v.day);

/** One line for the banner under the app header. */
export function stageOf(v: AccountView): string {
  const committed = committedOf(v);
  const live = C.LAUNCH_LIVE_DAYS.value;
  const stockIn = C.LAUNCH_STOCK_IN_DAY.value;
  const d = v.day;
  if (committed === null) {
    const steps = setupSteps(v);
    const done = steps.filter((s) => s.done).length;
    return `Setup · ${done} of ${steps.length} done · commit by ${dateLabel(C.LAUNCH_COMMIT_BY_DAY.value)}`;
  }
  if (d < stockIn) return `Committed · making your first lot · stock in by ${dateLabel(stockIn)}`;
  if (d < live.min) return `Stock in · live on ${dateLabel(live.min)}`;
  if (d <= live.max) return `Live in Factory Launch Week ${v.run.persona.launchWeekNo}`;
  const g1 = C.GATE_DAYS.value[0]!;
  if (d < g1) return `Launch Week done · day-30 result on ${dateLabel(g1)}`;
  return `Selling · day ${d} of ${C.TIMELINE_DAYS.value.max}`;
}
