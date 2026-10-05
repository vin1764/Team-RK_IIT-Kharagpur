import { useMemo, useState } from 'react';
import { C, STATUSES, type ConstantKey, type Status } from '../data/constants';
import { payoutDay, withheldCredits } from '../engine/formulas';
import { SourceBadge } from '../components/SourceBadge';
import { valueText } from '../lib/format';
import { SectionPage } from './SectionPage';

function PolicyChecks() {
  const credits = withheldCredits(1000);
  const checks: { policy: string; value: string; where: string; ok: boolean; c: ConstantKey }[] = [
    { policy: 'Commission', value: `${C.COMMISSION_PCT.value}%`, where: 'Cost stack and Meesho-vs-Amazon take-home', ok: C.COMMISSION_PCT.value === 0, c: 'COMMISSION_PCT' },
    { policy: 'Payment cycle', value: `${C.PAYMENT_CYCLE_DAYS.value} days after delivery`, where: 'Engine pays kept orders exactly 7 days after delivery', ok: payoutDay(0) === 7, c: 'PAYMENT_CYCLE_DAYS' },
    { policy: 'RTO', value: C.RTO_RULE.value, where: 'Engine charges no reverse shipping on RTO; unit returns to stock', ok: true, c: 'RTO_RULE' },
    { policy: 'Customer return', value: C.CUSTOMER_RETURN_RULE.value, where: 'Engine charges a return fee per SKU (by weight)', ok: true, c: 'CUSTOMER_RETURN_RULE' },
    { policy: 'Dispatch SLA', value: `${C.DISPATCH_SLA_HOURS.value.min}–${C.DISPATCH_SLA_HOURS.value.max} h (Meesho mentor)`, where: 'Orders dispatched on time; no pre-orders', ok: true, c: 'DISPATCH_SLA_HOURS' },
    { policy: 'GST TCS / TDS', value: `${C.GST_TCS_PCT.value}% / ${C.INCOME_TAX_TDS_PCT.value}%`, where: 'Withheld from payouts, shown as claimable credits, not costs', ok: Math.abs(credits.tcs - 5) < 1e-9 && Math.abs(credits.tds - 1) < 1e-9, c: 'GST_TCS_PCT' },
    { policy: 'GST on steel kitchenware / imitation jewellery / footwear', value: `${C.GST_RATE_PCT.value}%`, where: 'Inside every list price', ok: C.GST_RATE_PCT.value === 5, c: 'GST_RATE_PCT' },
    { policy: 'Volume guarantees', value: C.VOLUME_GUARANTEES.value, where: 'Every forecast says “a forecast, not a guarantee”', ok: true, c: 'VOLUME_GUARANTEES' },
    { policy: 'Demand data', value: C.DEMAND_DATA_ACCESS.value, where: 'Same market view for every seller; SKU view only for its own seller', ok: true, c: 'DEMAND_DATA_ACCESS' },
    { policy: 'Valmo', value: C.VALMO_SCOPE.value, where: 'Pack Point (partner-run) stores; Valmo only picks up and delivers', ok: true, c: 'VALMO_SCOPE' },
  ];
  return (
    <div>
      <h2 className="mb-2 font-display text-xl font-bold text-plum">Meesho policy checks</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-blush text-plum">
            <tr>
              <th className="px-3 py-2">Policy</th>
              <th className="px-3 py-2">Value used</th>
              <th className="px-3 py-2">Where the prototype applies it</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Check</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((x) => (
              <tr key={x.policy} className="border-t border-line align-top">
                <td className="px-3 py-1.5 font-medium">{x.policy}</td>
                <td className="px-3 py-1.5">{x.value}</td>
                <td className="px-3 py-1.5 text-grey">{x.where}</td>
                <td className="px-3 py-1.5">
                  <SourceBadge status={C[x.c].status} />
                </td>
                <td className={`px-3 py-1.5 font-semibold ${x.ok ? 'text-good' : 'text-bad'}`}>{x.ok ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-grey">Known caveats: payment cycle to confirm on the Supplier Panel; dispatch SLA uses the stricter mentor figure; Amazon fees and hair-oil GST are team estimates.</p>
    </div>
  );
}

export default function Verify() {
  const [status, setStatus] = useState<Status | 'All'>('All');
  const rows = useMemo(() => Object.entries(C).filter(([, c]) => status === 'All' || c.status === status), [status]);
  return (
    <SectionPage path="/verify">
      <PolicyChecks />
      <h2 className="mb-2 mt-8 font-display text-xl font-bold text-plum">Every constant</h2>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {(['All', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === s ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum'}`}
          >
            {s}
          </button>
        ))}
        <span className="text-xs text-grey">{rows.length} constants</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-blush text-plum">
            <tr>
              <th className="px-3 py-2">Constant</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, c]) => (
              <tr key={key} className="border-t border-line align-top">
                <td className="px-3 py-1.5">
                  <div className="font-medium text-ink">{c.label}</div>
                  <div className="font-mono text-[10px] text-grey">{key}</div>
                  {c.note && <div className="mt-0.5 italic text-grey">{c.note}</div>}
                </td>
                <td className="max-w-xs px-3 py-1.5 font-semibold">{valueText(c.value)}</td>
                <td className="px-3 py-1.5 text-grey">{c.unit}</td>
                <td className="max-w-xs px-3 py-1.5 text-grey">{c.source}</td>
                <td className="px-3 py-1.5">
                  <SourceBadge status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPage>
  );
}
