import { C } from '../data/constants';
import type { SkuSpec } from '../data/personas';
import { breakEven, costCheck, expectedDailyPerSku, firstLot, listPrice, packPointFeeFor, packPointRecommended, takeHome } from '../engine/formulas';
import { useMvp, type AccountState } from './state';
import type { AccountView } from './useAccount';

/** Patch the account's onboarding record. */
export function useOnboard(v: AccountView) {
  const update = useMvp((s) => s.update);
  return (patch: (o: AccountState['onboarding']) => Partial<AccountState['onboarding']>) =>
    update(v.id, (s) => ({ ...s, onboarding: { ...s.onboarding, ...patch(s.onboarding) } }));
}

/** Benchmark B for a SKU at a day (the market moves). */
export const bAt = (spec: SkuSpec, day: number) => [...spec.bEpochs].reverse().find((e) => e.fromDay <= day)?.B ?? spec.bEpochs[0]!.B;

/** The SKU's cost stack with the maker's own making cost, if entered (cost check is for the hero SKU). */
export function stackFor(v: AccountView, spec: SkuSpec) {
  const hero = v.run.persona.skus[0]!;
  const making = spec.id === hero.id ? (v.state.onboarding.makingCost ?? spec.stack.makingCost) : spec.stack.makingCost;
  return { ...spec.stack, makingCost: making };
}

/** Listing numbers for a SKU with a margin. */
export function listingNumbers(v: AccountView, spec: SkuSpec, margin: number) {
  const stack = stackFor(v, spec);
  const gst = spec.gstRatePct ?? C.GST_RATE_PCT.value;
  const B = bAt(spec, Math.max(v.day, C.TIMELINE_DAYS.value.min));
  const check = costCheck(stack, margin, B, gst);
  return { stack, gst, B, ...check, be: breakEven(stack, gst), price: listPrice(stack, margin, gst), keep: takeHome(listPrice(stack, margin, gst), stack, gst) };
}

/** The demand card numbers for a SKU. */
export function demandFor(spec: SkuSpec) {
  const daily = { min: expectedDailyPerSku(spec.openGapWeek.min, spec.likelyShare), max: expectedDailyPerSku(spec.openGapWeek.max, spec.likelyShare) };
  return { daily, lot: firstLot(daily, spec.minRun), gap: spec.openGapWeek, share: spec.likelyShare };
}

/** Pack Point availability and fee in the maker's city at a day. */
export function nodeAt(v: AccountView, day: number) {
  const node = v.run.persona.node;
  if (!node) return null;
  const makers = day >= node.crossDay ? node.afterMakers : node.startMakers;
  return { makers, fee: packPointFeeFor(makers), pays: makers >= C.PP_REFERENCE_MAKERS.value };
}

/** Whether Pack Point is recommended for a SKU at its list price. */
export const ppRecommended = (price: number) => packPointRecommended(price);

/** Seller type check: Launch Week needs a manufacturer record that matches Udyam. */
export const eligibleForLaunch = (o: AccountState['onboarding']) => o.signedUp && o.sellerType === 'manufacturer';
