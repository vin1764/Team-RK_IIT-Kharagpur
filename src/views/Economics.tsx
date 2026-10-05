import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C } from '../data/constants';
import { SKUS, type SkuSpec } from '../data/personas';
import {
  gstInsidePrice,
  listPrice,
  packPointBreakEvenMakers,
  packPointCost,
  packPointFeeTier,
  packPointPnl,
  takeHome,
} from '../engine/formulas';
import { useApp } from '../app/store';
import { runSim } from '../app/useSim';
import { TitleTab } from '../components/TitleTab';
import { Chip } from '../components/Chip';
import { MetricTile } from '../components/MetricTile';
import { Num } from '../components/FormulaPopover';
import { PackPointFlow } from '../journey/PackPointFlow';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { SectionPage } from './SectionPage';

const OPTIONS: { sku: SkuSpec; label: string }[] = [
  { sku: SKUS.bottle, label: 'Hiren · 1 L bottle (self-ship)' },
  { sku: SKUS.casserole, label: 'Hiren · 1.5 L casserole (Pack Point)' },
  { sku: SKUS.bowls, label: 'Ayesha · bowl set (self-ship)' },
  { sku: SKUS.jewellery, label: 'Sunita · jewellery set (self-ship)' },
];

function Waterfall() {
  const [i, setI] = useState(0);
  const sku = OPTIONS[i]!.sku;
  const pp = sku.fulfilment === 'packPoint';
  const price = listPrice(sku.stack, sku.margin, sku.gstRatePct);
  const gst = gstInsidePrice(price, sku.gstRatePct);
  const meesho = C.CONTRIBUTION_PER_ORDER.value;
  const keep = takeHome(price, sku.stack, sku.gstRatePct);
  const fee = packPointFeeTier(C.PP_REFERENCE_MAKERS.value).fee;
  const rows: { who: string; v: number; cls: string; tag?: 'existing' | 'new' | 'partner' }[] = [
    { who: 'Factory: making cost', v: sku.stack.makingCost, cls: 'bg-plum text-white' },
    { who: 'Maker keeps (take-home)', v: keep, cls: 'bg-orange text-ink' },
    { who: 'Maker’s returns buffer', v: sku.stack.returnsBuffer, cls: 'bg-orange-soft text-ink' },
    pp
      ? { who: 'Pack Point partner (fee at 40+ makers)', v: fee, cls: 'bg-magenta text-white', tag: 'partner' }
      : { who: 'Maker’s own packing', v: sku.stack.packaging, cls: 'bg-orange-soft text-ink' },
    { who: 'Couriers / Valmo & platform costs (in the shipping & fixed fee)', v: sku.stack.shippingAndFee - meesho, cls: 'bg-grey text-white', tag: 'existing' },
    { who: 'Meesho contribution (avg per order, filing)', v: meesho, cls: 'bg-plum-deep text-white', tag: 'existing' },
    { who: 'Government: GST inside the price', v: gst, cls: 'bg-line text-ink' },
  ];
  const B = sku.bEpochs[0]!.B;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {OPTIONS.map((o, k) => (
          <button key={o.sku.id} type="button" aria-pressed={i === k} onClick={() => setI(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${i === k ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="mb-2 flex h-12 w-full overflow-hidden rounded-xl text-[11px] font-semibold" role="img" aria-label={`Where the buyer’s ${inr(price)} goes`}>
        {rows.map((r) => (
          <div key={r.who} className={`flex items-center justify-center ${r.cls}`} style={{ width: `${(100 * r.v) / price}%` }} title={`${r.who}: ${inr(r.v, 1)}`}>
            {r.v / price > 0.06 ? inr(r.v) : ''}
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.who} className="border-t border-line">
                <td className="py-1">
                  <span className={`mr-2 inline-block h-3 w-3 rounded-sm align-middle ${r.cls.split(' ')[0]}`} />
                  {r.who} {r.tag && <Chip kind={r.tag} />}
                </td>
                <td className="py-1 text-right font-semibold">{inr(r.v, 1)}</td>
                <td className="py-1 pl-2 text-right text-xs text-grey">{pctText((100 * r.v) / price, 1)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-plum font-bold">
              <td className="py-1">Buyer pays</td>
              <td className="py-1 text-right">{inr(price)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        <div className="space-y-2">
          <MetricTile label="Buyer pays vs B" value={<Num f="priceDropDelivered">{`${inr(price)} vs ${inr(B)}`}</Num>} target={`${pctText((100 * (B - price)) / B, 1)} below today’s typical price`} status="good" />
          <MetricTile label="vs the reseller price" value={`${inr(sku.resellerPrice - price)} saved`} target={`reseller sells at ${inr(sku.resellerPrice)}`} status="good" />
          <MetricTile label="Maker take-home per unit" value={<Num f="takeHome">{inr(keep)}</Num>} target={`+ ${inr(sku.stack.returnsBuffer)} returns buffer`} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-grey">
        Commission is {C.COMMISSION_PCT.value}%. The shipping & fixed fee is deducted from settlement; Meesho’s share is shown at its filing average ({inr(meesho, 2)}/order), the rest
        covers couriers and platform costs (approximation). TCS {C.GST_TCS_PCT.value}% and TDS {C.INCOME_TAX_TDS_PCT.value}% are withheld but claimable, so they are not costs.
      </p>
    </div>
  );
}

function PartnerPnl() {
  const [makers, setMakers] = useState(C.PP_REFERENCE_MAKERS.value);
  const p = packPointPnl(makers);
  const cost = packPointCost(makers);
  const breakEven = packPointBreakEvenMakers();
  const curve = Array.from({ length: 17 }, (_, k) => 10 + k * 5).map((m) => {
    const x = packPointPnl(m);
    return { makers: m, revenue: Math.round(x.revenue), cost: Math.round(x.cost) };
  });
  const b = cost.breakdown;
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        Makers pooled at the node: <strong>{makers}</strong> · fee {inr(p.fee)} per delivered order
        <input type="range" min={10} max={90} value={makers} onChange={(e) => setMakers(Number(e.target.value))} className="w-full accent-plum" aria-label="Makers pooled (P&L)" />
      </label>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Revenue / month" value={inr(p.revenue)} target={`${num(p.delivered)} delivered of ${num(p.handled)} handled`} />
        <MetricTile label="Cost / month" value={inr(p.cost)} target={`${inr(cost.costPerOrder, 1)} per order handled`} />
        <MetricTile label="Partner profit / month" value={<Num f="packPointPnl">{inr(p.profit)}</Num>} target={`margin ${pctText(p.marginPct, 1)}`} status={p.profit >= 0 ? 'good' : 'bad'} />
        <MetricTile label="Break-even node" value={`${breakEven ?? '—'} makers`} target={`Shiprocket cross-check ${inr(C.PP_SHIPROCKET_BENCHMARK.value)}/order`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-60">
          <ResponsiveContainer>
            <LineChart data={curve} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" />
              <XAxis dataKey="makers" tick={{ fontSize: 11 }} label={{ value: 'makers pooled', fontSize: 11, position: 'insideBottomRight', offset: -2 }} />
              <YAxis tick={{ fontSize: 11 }} width={64} tickFormatter={(v: number) => inr(v)} />
              <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={(m) => `${m} makers`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="stepAfter" dataKey="revenue" name="Partner revenue (fee × delivered)" stroke="#5C1049" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cost" name="Node cost" stroke="#FE9C01" strokeWidth={2} dot={false} isAnimationActive={false} />
              <ReferenceLine x={C.PP_REFERENCE_MAKERS.value} stroke="#7A4E70" strokeDasharray="4 3" label={{ value: 'fee ≤ ₹30', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceDot x={Math.round(makers / 5) * 5} y={Math.round(packPointPnl(Math.round(makers / 5) * 5).revenue)} r={6} fill="#F43397" stroke="#fff" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="w-full self-start text-sm">
          <tbody>
            {[
              [`Staff (${cost.packers} packer${cost.packers > 1 ? 's' : ''}, ${cost.handlers} handler${cost.handlers > 1 ? 's' : ''}, 1 supervisor)`, b.staff],
              [`Rent (${num(cost.areaSqft)} sq ft × ₹${C.PP_RENT_PER_SQFT.value})`, b.rent],
              [`Consumables (₹${C.PP_CONSUMABLES_PER_ORDER.value}/order)`, b.consumables],
              [`Equipment (${inr(C.PP_EQUIPMENT_COST.value)} over ${C.PP_EQUIPMENT_MONTHS.value} months)`, b.equipment],
              ['Utilities', b.utilities],
            ].map(([k, v]) => (
              <tr key={String(k)} className="border-t border-line">
                <td className="py-1 text-grey">{k}</td>
                <td className="py-1 text-right font-semibold">{inr(Number(v))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-plum font-bold">
              <td className="py-1">Monthly cost</td>
              <td className="py-1 text-right">{inr(cost.monthlyCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-grey">
        Fee steps by node size (₹{C.PP_FEE_TIER_MAKERS.value.map((m) => packPointFeeTier(m).fee).join(' / ')} at {C.PP_FEE_TIER_MAKERS.value.join('/')} makers) and is charged per delivered order, so RTOs cost the
        maker nothing at the node. Between tiers the partner earns more than its {C.PP_PARTNER_MARGIN_PCT.value}% target margin. The partner covers its cost from the break-even size,
        but Gate 2 only moves makers to the node once the fee is at or below the {inr(C.T_PACK_POINT_FEE.value)} target ({C.PP_REFERENCE_MAKERS.value}+ makers); until then the node
        waits and makers self-ship.
      </p>
      <PackPointFlow makers={makers} />
    </div>
  );
}

function CashView() {
  const seed = useApp((s) => s.seed);
  const r = runSim({ personaId: 'hiren', seed });
  const data = r.days.map((d) => ({
    day: d.day,
    out: Math.round(d.money.makingPaidCum),
    in: Math.round(d.money.payoutsCum),
    stock: Math.round(d.money.cashInStock),
  }));
  const firstPayout = r.days.find((d) => d.money.payoutNet > 0)?.day;
  const firstSale = r.days.find((d) => d.orders > 0)?.day;
  const last = r.days[r.days.length - 1]!;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} ticks={[C.TIMELINE_DAYS.value.min, 0, ...C.GATE_DAYS.value]} />
            <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => inr(v)} />
            <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={(d) => dayLabel(Number(d))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="out" name="Cash out: stock made" stroke="#D64545" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="in" name="Cash in: payouts (net of TCS/TDS)" stroke="#1E9E5A" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="stock" name="Cash tied in stock" stroke="#7A4E70" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            {firstPayout !== undefined && <ReferenceLine x={firstPayout} stroke="#1E9E5A" strokeDasharray="4 3" label={{ value: 'first payout', fontSize: 10, position: 'insideTopLeft' }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <MetricTile label="First sale → first payout" value={firstSale !== undefined && firstPayout !== undefined ? `${firstPayout - firstSale} days` : '—'} target={`delivery ${C.SIM_DELIVERY_DAYS.value} days + ${C.PAYMENT_CYCLE_DAYS.value}-day payment cycle`} />
        <MetricTile label="Payouts by day 90" value={inr(last.money.payoutsCum)} target={`stock made ${inr(last.money.makingPaidCum)}`} />
        <MetricTile label="Tax credits to claim" value={inr(last.money.creditsCum)} target="TCS + TDS, claimable" />
      </div>
    </div>
  );
}

export default function Economics() {
  return (
    <SectionPage path="/economics">
      <div className="space-y-10">
        <section>
          <TitleTab size="sm" className="mb-3">
            Per order: where the buyer’s rupee goes
          </TitleTab>
          <Waterfall />
        </section>
        <section>
          <TitleTab size="sm" className="mb-3">
            Pack Point partner P&amp;L by makers pooled
          </TitleTab>
          <PartnerPnl />
        </section>
        <section>
          <TitleTab size="sm" className="mb-3">
            Payment-cycle cash view · Hiren
          </TitleTab>
          <CashView />
        </section>
      </div>
    </SectionPage>
  );
}
