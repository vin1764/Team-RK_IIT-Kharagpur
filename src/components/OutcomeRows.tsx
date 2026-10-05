import type { SimResult } from '../engine/simulate';
import { inr, num, pctText } from '../lib/format';
import { Num } from './FormulaPopover';

/** 90-day outcome with our solution vs today's Meesho, from the engine. */
export function OutcomeRows({ base, cf, compact = false }: { base: SimResult; cf: SimResult; compact?: boolean }) {
  const rows = [
    { label: 'Orders (90 days)', w: num(base.kpis.totalOrders), wo: num(cf.kpis.totalOrders) },
    { label: 'Take-home', w: inr(base.kpis.takeHome), wo: inr(cf.kpis.takeHome), f: 'takeHome' as const },
    { label: 'Stock left', w: `${num(base.kpis.unitsLeft)} selling`, wo: `${num(cf.kpis.unitsLeft)} unsold (${inr(cf.kpis.cashInStockEnd)})` },
    { label: 'Price vs B', w: `${pctText(base.kpis.priceDropAtLaunchPct, 1)} below`, wo: '—', f: 'priceDropDelivered' as const },
    { label: 'Day-30 gate', w: base.gates.g1?.decision ?? '—', wo: 'Churns ~day 25' },
  ];
  return (
    <table className={`w-full text-left ${compact ? 'text-xs' : 'text-sm'}`}>
      <thead>
        <tr className="text-grey">
          <th className="py-1 font-medium" />
          <th className="py-1 font-semibold text-plum">With our solution</th>
          <th className="py-1 font-medium">Today’s Meesho</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <td className="py-1 pr-2 text-grey">{r.label}</td>
            <td className="py-1 pr-2 font-semibold text-ink">{r.f ? <Num f={r.f}>{r.w}</Num> : r.w}</td>
            <td className="py-1 text-grey">{r.wo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
