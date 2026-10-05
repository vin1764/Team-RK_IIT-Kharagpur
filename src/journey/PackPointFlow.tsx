import { ArrowRight, CornerDownLeft } from 'lucide-react';
import { C } from '../data/constants';
import { SKUS } from '../data/personas';
import { blendedRto, packPointCost, packPointFeeTier } from '../engine/formulas';
import type { DayState } from '../engine/simulate';
import { Chip } from '../components/Chip';
import { inr, num } from '../lib/format';

export type FlowStep = 'inbound' | 'store' | 'pack' | 'manifest' | 'valmo' | 'returns';

/** Node-level daily flow for a node of `makers`, from the Pack Point model (formulas.ts). */
export function nodeFlow(makers: number) {
  const cost = packPointCost(makers);
  const perDay = cost.ordersPerDay;
  const rto = blendedRto();
  // Returns at a Home & Kitchen node: the 1 L bottle's category rate and reason mix.
  const ref = SKUS.casserole;
  const returnsPerDay = perDay * (1 - rto) * (ref.returnRatePct / 100);
  const product = returnsPerDay * ref.returnMix.product;
  const swap = returnsPerDay * ref.returnMix.swap;
  const resellable = returnsPerDay - product - swap;
  const gradeB = resellable * C.PP_GRADE_B_SHARE.value;
  return {
    makers,
    fee: packPointFeeTier(makers).fee,
    lotsPerWeek: makers * C.PP_INBOUND_LOTS_PER_MAKER_WEEK.value,
    unitsInPerWeek: (makers * C.PP_ORDERS_PER_MAKER_MONTH.value * 7) / C.DAYS_PER_MONTH.value,
    unitsStored: makers * C.PP_UNITS_ON_HAND_PER_MAKER.value,
    perDay,
    staff: cost.staff,
    returnsPerDay,
    grades: { A: resellable - gradeB, B: gradeB, C: product },
    swapsPerDay: swap,
  };
}

/**
 * The Cluster Pack Point flow: one bulk lot a week → inbound (counted, weighed) → store →
 * pick/pack/QC (photo + weight vs listing) → manifest → Valmo → buyer; returns come back to the
 * node, are weighed against dispatch and graded A/B/C.
 */
export function PackPointFlow({ makers, ds, ownSkuId, highlight }: { makers: number; ds?: DayState; ownSkuId?: string; highlight?: FlowStep }) {
  const f = nodeFlow(makers);
  const own = ds?.skus.find((s) => s.skuId === ownSkuId);
  const steps: { id: FlowStep; title: string; value: string; sub: string }[] = [
    { id: 'inbound', title: 'Inbound', value: `${num(f.lotsPerWeek)} lots/wk`, sub: `~${num(f.unitsInPerWeek)} units counted & weighed` },
    { id: 'store', title: 'Store', value: `${num(f.unitsStored)} units`, sub: `free ${C.PP_STORAGE_FREE_DAYS.value} days, then ₹${C.PP_STORAGE_PER_UNIT_DAY.value}/unit/day` },
    { id: 'pack', title: 'Pick · pack · QC', value: `${num(f.perDay)}/day`, sub: 'photo + weight vs listing' },
    { id: 'manifest', title: 'Manifest', value: `${num(f.perDay)} parcels`, sub: 'one daily manifest' },
    { id: 'valmo', title: 'Valmo → buyer', value: 'Daily pickup', sub: 'pickup and delivery only' },
  ];
  return (
    <div className="rounded-xl border border-line bg-cream/60 p-3" data-testid="pack-point-flow">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-plum">
          Rajkot Pack Point · {makers} makers · fee {inr(f.fee)}/delivered order · {f.staff} staff
        </div>
        <div className="flex gap-1">
          <Chip kind="partner" />
          <Chip kind="existing">Existing Meesho: Valmo</Chip>
        </div>
      </div>
      <ol className="flex flex-wrap items-stretch gap-1 text-xs">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1">
            {i > 0 && <ArrowRight size={14} className="shrink-0 text-grey" aria-hidden />}
            <div className={`min-w-[6.5rem] rounded-lg px-2 py-1.5 ${highlight === s.id ? 'bg-orange-soft ring-2 ring-orange' : 'bg-white border border-line'}`}>
              <div className="font-semibold text-magenta">{s.title}</div>
              <div className="font-bold text-ink">{s.value}</div>
              <div className="text-[10px] text-grey">{s.sub}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className={`mt-2 flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${highlight === 'returns' ? 'bg-orange-soft ring-2 ring-orange' : 'bg-white border border-line'}`}>
        <CornerDownLeft size={14} className="text-grey" aria-hidden />
        <span className="font-semibold text-magenta">Returns → the node, never the factory</span>
        <span>~{num(f.returnsPerDay, 1)}/day weighed vs dispatch →</span>
        <span className="rounded bg-good/15 px-1.5 font-semibold text-good">A {num(f.grades.A, 1)}</span>
        <span className="rounded bg-warn/20 px-1.5 font-semibold">B {num(f.grades.B, 1)} (repack {inr(C.PP_REPACK_COST.value)})</span>
        <span className="rounded bg-bad/15 px-1.5 font-semibold text-bad">C {num(f.grades.C, 1)}</span>
        <span className="text-grey">· swaps caught by weight ~{num(f.swapsPerDay, 1)}/day</span>
      </div>
      {own && own.live && (
        <div className="mt-2 text-xs">
          <span className="font-semibold">Hiren’s casserole today:</span> {own.orders} packed · {own.delivered} delivered · {own.onHand} at the node · returns graded A {own.grades.A} / B {own.grades.B} / C{' '}
          {own.grades.C}
        </div>
      )}
      <p className="mt-1 text-[10px] text-grey">Node figures from the Rajkot Pack Point model at this size (Team model); Hiren’s line from the simulation.</p>
    </div>
  );
}
