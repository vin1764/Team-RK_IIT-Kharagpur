import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { ArrowRight, Check, X } from 'lucide-react';
import { C } from '../data/constants';
import {
  benchmarkB,
  committedPerWeekFromLot,
  expectedDailyPerSku,
  isCrowded,
  listPrice,
  nextBatch,
  packPointFeeTier,
  reorderPoint,
  matchedPairs,
  diffVsBaselinePct,
  makersPerManager,
  categoryManagersNeeded,
} from '../engine/formulas';
import { MAKER_SELLER_ID } from '../data/generate/bTable';
import { Chip } from '../components/Chip';
import { DecisionCard } from '../components/DecisionCard';
import { MetricTile } from '../components/MetricTile';
import { Num } from '../components/FormulaPopover';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { useJourney } from './ctx';
import { PackPointFlow } from './PackPointFlow';
import { BandBar, KV, PanelTitle } from './parts';
import type { GateInput } from '../engine/gates';

export function ControlPanel() {
  const j = useJourney();
  switch (j.chapter) {
    case 0:
      return <DemandEngine />;
    case 1:
      return <Outreach />;
    case 2:
      return <Band />;
    case 3:
      return <Records />;
    case 4:
      return <Ledger />;
    case 5:
      return <Node />;
    case 6:
      return <Weeks />;
    case 7:
      return <Districts />;
    case 8:
      return <Fault />;
    case 9:
      return <Gate1 />;
    case 10:
      return <Restock />;
    case 11:
      return <Gate2 />;
    case 12:
      return <OpenGaps />;
    default:
      return <Cohort />;
  }
}

/** Lift is shown as a difference vs the matched-control baseline, not a raw ratio. */
const fmtLift = (x: number) => `${x >= 1 ? '+' : '−'}${num(Math.abs(x - 1) * 100)}% vs baseline`;
const fmtInput = (i: GateInput) => (i.unit === '%' ? pctText(i.value, 1) : i.unit === '×' ? fmtLift(i.value) : num(i.value, 2));
const fmtTarget = (i: GateInput) => (i.unit === '×' ? `≥ +${num((i.target - 1) * 100)}%` : `${i.sense === 'min' ? '≥' : '≤'} ${i.target}${i.unit === '%' ? '%' : ''}`);

export function DemandEngine() {
  const j = useJourney();
  const s = j.sku;
  // The maker's own listing appears only once the listing bot has built it.
  const listed = j.day >= C.CHAPTER_DAYS.value[4]!;
  const table = j.r.bTables[`${s.id}#0`]!.filter((row) => listed || row.sellerId !== MAKER_SELLER_ID);
  const b = benchmarkB(table, { excludeSellerId: MAKER_SELLER_ID });
  const dMin = expectedDailyPerSku(s.openGapWeek.min, s.likelyShare);
  const dMax = expectedDailyPerSku(s.openGapWeek.max, s.likelyShare);
  const steps = [
    ['Analyse', 'Searches, clicks, orders, stock-outs, committed lots'],
    ['Diagnose', 'High search, low search-to-click, few listings → supply gap'],
    ['Size', `Open gap ${Math.round(s.openGapWeek.min)}–${Math.round(s.openGapWeek.max)}/week × likely share ${pctText(s.likelyShare * 100)} → ${Math.round(dMin)}–${Math.round(dMax)}/day`],
    ['Suggest', `Demand teaser + first-lot sizing for “${s.productType}”`],
  ];
  return (
    <div>
      <PanelTitle right={<><Chip kind="new" /><Chip kind="simulated" /></>}>Demand engine</PanelTitle>
      <ol className="mb-3 grid grid-cols-4 gap-1 text-xs">
        {steps.map(([h, b2], i) => (
          <li key={h} className="rounded-lg bg-blush p-2">
            <div className="font-semibold text-magenta">
              {i + 1}. {h}
            </div>
            <div className="mt-0.5 text-ink">{b2}</div>
          </li>
        ))}
      </ol>
      <div className="text-xs font-semibold text-plum">
        Benchmark B = <Num f="benchmarkB">{inr(b.B)}</Num> (25th percentile, same spec, ≥ {C.B_MIN_DELIVERED_ORDERS.value} orders, own orders excluded)
      </div>
      <table className="mt-1 w-full text-[11px]">
        <thead className="text-grey">
          <tr>
            <th className="text-left">Listing</th>
            <th className="text-right">₹/unit</th>
            <th className="text-right">Delivered</th>
            <th className="text-left pl-2">In B?</th>
          </tr>
        </thead>
        <tbody>
          {[...table].sort((a, x) => a.pricePerUnit - x.pricePerUnit).map((row) => {
            const ex = b.excluded.find((e) => e.listing.sellerId === row.sellerId);
            return (
              <tr key={row.sellerId} className={`border-t border-line ${row.pricePerUnit === b.B && !ex ? 'bg-orange-soft font-semibold' : ''}`}>
                <td>{row.title}</td>
                <td className="text-right">{inr(row.pricePerUnit)}</td>
                <td className="text-right">{row.deliveredOrders}</td>
                <td className={`pl-2 ${ex ? 'text-bad' : 'text-good'}`}>{ex ? `No: ${ex.reason}` : 'Yes'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Outreach() {
  const j = useJourney();
  const f = j.r.outreach;
  const max = f.stages[0]!.count;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Outreach funnel · {j.p.cohort}</PanelTitle>
      <p className="mb-2 text-xs text-grey">Found via {f.sources.join(' + ')}. Synthetic counts for this launch.</p>
      <div className="space-y-1">
        {f.stages.map((s) => (
          <div key={s.stage} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-grey">{s.stage}</span>
            <div className="h-5 flex-1 rounded bg-blush">
              <div className="flex h-5 items-center rounded bg-plum px-1 text-[10px] font-semibold text-white" style={{ width: `${(s.count / max) * 100}%` }}>
                {s.count}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-cream p-2 text-xs">
        <div className="font-semibold text-plum">Opt-in compliance</div>
        {['First contact: IndiaMART enquiry or email', 'WhatsApp only after the maker opts in', 'Every forecast says “a forecast, not a guarantee”', 'Message differs by cohort'].map((x) => (
          <div key={x} className="flex items-center gap-1">
            <Check size={12} className="text-good" /> {x}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Band() {
  const j = useJourney();
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Price band check</PanelTitle>
      <p className="text-sm">
        <Num f="priceBand">break-even ≤ price ≤ B</Num>, at onboarding (cost check) and at listing. Same spec, per unit.
      </p>
      <div className="px-6 py-4">
        <BandBar breakEven={j.breakEven} B={j.B} price={j.price} big />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricTile label="Break-even" value={<Num f="breakEven">{inr(j.breakEven)}</Num>} />
        <MetricTile label="List price" value={<Num f="listPrice">{inr(j.price)}</Num>} />
        <MetricTile label="Benchmark B" value={<Num f="benchmarkB">{inr(j.B)}</Num>} />
      </div>
      <p className="mt-2 text-xs text-grey">Below B by {pctText(((j.B - j.price) / j.B) * 100, 1)}. Cohort target: ≥ {C.PRICE_DROP_TARGET_PCT_OF_B.value}% on average.</p>
    </div>
  );
}

export function Records() {
  const [trader, setTrader] = useState(false);
  const rows = [
    ['Seller type answer', trader ? 'Manufacturer' : 'Manufacturer', true],
    ['GST nature of business', trader ? 'Wholesale / trading' : 'Manufacturing', !trader],
    ['Udyam activity type', trader ? 'Trading' : 'Manufacturing', !trader],
  ] as const;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Records check (automatic)</PanelTitle>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v, ok]) => (
            <tr key={k} className="border-t border-line">
              <td className="py-1.5 text-grey">{k}</td>
              <td className="py-1.5 font-semibold">{v}</td>
              <td className="py-1.5">{ok ? <Check className="text-good" size={18} /> : <X className="text-bad" size={18} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`mt-3 rounded-lg p-3 text-sm font-semibold ${trader ? 'bg-bad/10 text-bad' : 'bg-good/10 text-good'}`}>
        {trader ? 'Records disagree → not launch-eligible. A trader can’t reach B anyway.' : 'Records agree → launch-eligible.'}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={trader} onChange={(e) => setTrader(e.target.checked)} /> Try it: a trader answers “manufacturer”
      </label>
      <p className="mt-2 text-xs text-grey">C2M is a filter, not a label: no buyer-facing badge.</p>
    </div>
  );
}

export function Ledger() {
  const j = useJourney();
  const s = j.sku;
  const lot = Number(j.first('listingBot')?.data?.lot ?? 0);
  const mid = (s.openGapWeek.min + s.openGapWeek.max) / 2;
  const unserved = mid + s.committedWeek;
  const before = s.committedWeek;
  const after = before + committedPerWeekFromLot(lot);
  const pctOf = (x: number) => (100 * x) / unserved;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Committed-supply ledger</PanelTitle>
      <p className="text-sm">
        Every commitment shrinks the gap every seller sees. One unit throughout: orders per week. {j.p.name.split(' ')[0]}’s {lot}-unit first lot covers about{' '}
        {C.FIRST_LOT_DAYS.value} days, so it counts as {Math.round(after - before)} orders/week.
      </p>
      <div className="mt-3 h-8 w-full overflow-hidden rounded-lg bg-blush">
        <div className="flex h-full">
          <div className="flex items-center justify-center bg-grey text-[11px] text-white" style={{ width: `${pctOf(before)}%` }}>
            Already committed {Math.round(before)} orders/wk
          </div>
          <div className="flex items-center justify-center bg-orange text-[11px] font-semibold" style={{ width: `${pctOf(after - before)}%` }}>
            +{Math.round(after - before)}/wk
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-grey">
        <span>0</span>
        <span>Crowded at {pctText(C.CROWDED_SHARE.value * 100)}</span>
        <span>{Math.round(unserved)} orders/week unserved</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricTile label="Open gap before (orders/week)" value={Math.round(unserved - before)} />
        <MetricTile label="Open gap after (orders/week)" value={Math.round(unserved - after)} />
        <MetricTile label="Crowded?" value={isCrowded(after, unserved) ? 'Yes' : 'No'} status={isCrowded(after, unserved) ? 'bad' : 'good'} />
      </div>
      <p className="mt-2 text-xs text-grey">
        Commitments expire if not live within lead time + buffer; capped at declared capacity; new listings in the last {C.PROVISIONAL_SUPPLY_DAYS.value} days count as provisional supply.
      </p>
    </div>
  );
}

export function Node() {
  const j = useJourney();
  const node = j.p.node;
  const curve = Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map((m) => ({ makers: m, fee: packPointFeeTier(m).fee }));
  if (!node)
    return (
      <div>
        <PanelTitle right={<Chip kind="partner" />}>Cluster Pack Point</PanelTitle>
        <p className="text-sm">
          No node in {j.p.city} for this cohort yet. At {inr(j.price)} {j.price <= C.PACK_POINT_MIN_PRICE.value ? `(below ${inr(C.PACK_POINT_MIN_PRICE.value)})` : ''} {j.p.name.split(' ')[0]} self-ships; Valmo picks up.
        </p>
        <FeeCurve curve={curve} at={null} />
      </div>
    );
  const makers = node.startMakers;
  const fee = packPointFeeTier(makers).fee;
  return (
    <div>
      <PanelTitle right={<Chip kind="partner" />}>Rajkot Pack Point</PanelTitle>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="Makers pooled" value={makers} target={`≥ ${C.PP_REFERENCE_MAKERS.value}`} status={makers >= C.PP_REFERENCE_MAKERS.value ? 'good' : 'warn'} />
        <MetricTile label="Fee / delivered order" value={<Num f="packPointFee">{inr(fee)}</Num>} target={`≤ ${inr(C.T_PACK_POINT_FEE.value)}`} status={fee <= C.T_PACK_POINT_FEE.value ? 'good' : 'warn'} />
        <MetricTile label="Crosses 40" value={`Week ${Math.ceil(node.crossDay / 7)}`} />
      </div>
      <FeeCurve curve={curve} at={{ makers, fee }} />
      <div className="mt-2">
        <PackPointFlow makers={makers} />
      </div>
    </div>
  );
}

export function FeeCurve({ curve, at }: { curve: { makers: number; fee: number }[]; at: { makers: number; fee: number } | null }) {
  return (
    <div className="mt-2 h-36">
      <ResponsiveContainer>
        <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" />
          <XAxis dataKey="makers" tick={{ fontSize: 10 }} label={{ value: 'makers pooled', fontSize: 10, position: 'insideBottomRight', offset: -2 }} />
          <YAxis tick={{ fontSize: 10 }} width={32} />
          <Tooltip formatter={(v) => inr(Number(v))} />
          <Line type="stepAfter" dataKey="fee" stroke="#5C1049" strokeWidth={2} dot={false} isAnimationActive={false} name="Fee per delivered order" />
          {at && <ReferenceDot x={Math.round(at.makers / 10) * 10} y={at.fee} r={6} fill="#FE9C01" stroke="#fff" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Weeks() {
  const j = useJourney();
  const live = C.LAUNCH_LIVE_DAYS.value;
  const weeks = [
    ['W1', 'Dates and order book published; makers commit', 0],
    ['W2', 'Production; bot builds catalogues; launch promoted', 7],
    ['W3', `Listings checked (price locked, stock linked); live days ${live.min}–${live.max}`, 14],
    ['W4', 'Deliveries, returns, early reviews; reorders; day-30 decision', 21],
  ] as const;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Factory Launch Week · order book</PanelTitle>
      <ol className="grid grid-cols-4 gap-2 text-xs">
        {weeks.map(([w, text, start]) => (
          <li key={w} className={`rounded-lg p-2 ${j.day >= start && j.day < start + 7 ? 'bg-orange-soft ring-2 ring-orange' : 'bg-blush'}`}>
            <div className="font-semibold text-plum">{w}</div>
            {text}
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg bg-cream p-3 text-sm">
        <div className="font-semibold text-plum">Slot allocation rule</div>
        Slots capped per product type. Oversubscribed slot → the lower price wins. Eligibility by rule: manufacturer, records agree, price in band, stock ready.
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricTile label="Makers in this launch" value={j.r.cohort.length} />
        <MetricTile label="Price cap (B)" value={inr(j.B)} />
        <MetricTile label="Stock in by" value={dayLabel(C.LAUNCH_STOCK_IN_DAY.value)} />
      </div>
      {j.p.node && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-plum">Inbound weigh-in at the Rajkot node this week</div>
          <PackPointFlow makers={j.ds.nodeMakers} ds={j.ds} ownSkuId="casserole-1500" highlight="inbound" />
        </div>
      )}
    </div>
  );
}

export function Districts() {
  const j = useJourney();
  const live = C.LAUNCH_LIVE_DAYS.value;
  const to = Math.min(j.day, live.max);
  const idx = (name: string) => j.r.districts.findIndex((d) => d.name === name);
  const ordersIn = (name: string) => j.sumSku((s) => s.byDistrict[idx(name)] ?? 0, live.min, to);
  // Matched pairs: each launch district against a control district of similar baseline demand.
  const pairs = matchedPairs(j.r.districts).map(({ launch, control }) => {
    const treated = ordersIn(launch.name);
    const baseline = ordersIn(control.name) * (launch.weight / control.weight);
    return { name: `${launch.name} ↔ ${control.name}`, launch: treated, baseline: Math.round(baseline * 10) / 10, diff: diffVsBaselinePct(treated, baseline) };
  });
  const treatedAll = pairs.reduce((a, p) => a + p.launch, 0);
  const baselineAll = pairs.reduce((a, p) => a + p.baseline, 0);
  const diff = diffVsBaselinePct(treatedAll, baselineAll);
  const targetDiff = 100 * (C.T_DEMAND_LIFT.value - 1);
  return (
    <div>
      <PanelTitle right={<><Chip kind="new" /><Chip kind="existing">Existing Meesho: home & deals placement</Chip></>}>Launch vs matched control districts</PanelTitle>
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={pairs} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={46} />
            <YAxis tick={{ fontSize: 10 }} width={28} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="launch" name="Launch district (sees the launch section)" fill="#5C1049" isAnimationActive={false} />
            <Bar dataKey="baseline" name="Matched control, scaled to the same baseline" fill="#F0C9E2" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <MetricTile
          label={`Difference vs baseline (to ${dayLabel(to)})`}
          value={<Num f="lift">{`${diff >= 0 ? '+' : '−'}${num(Math.abs(diff))}%`}</Num>}
          target={`≥ +${num(targetDiff)}%`}
          status={diff >= targetDiff ? 'good' : 'warn'}
        />
        <MetricTile label="Launch-district orders" value={treatedAll} caption={`${pairs.length} matched pairs`} />
        <MetricTile label="Matched-control baseline" value={num(baselineAll)} caption="control orders scaled to the same demand share" />
      </div>
      <p className="mt-1 text-[11px] text-grey">
        Pairs: {pairs.map((p) => `${p.name} ${p.diff >= 0 ? '+' : '−'}${num(Math.abs(p.diff))}%`).join(' · ')}
      </p>
      {j.p.node && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-plum">Pack Point pick/pack/QC queue today (Launch 1 node makers; Hiren’s bottle self-ships)</div>
          <PackPointFlow makers={j.ds.nodeMakers} ds={j.ds} ownSkuId="casserole-1500" highlight="pack" />
        </div>
      )}
    </div>
  );
}

export function Fault() {
  const j = useJourney();
  const from = C.CHAPTER_DAYS.value[8]!;
  const sum = (f: (s: (typeof j.skuDay)) => number) => j.sumSku((s) => (s.skuId === j.sku.id ? f(s) : 0), from, j.day);
  const pp = j.sku.fulfilment === 'packPoint';
  const orders = j.sumSku((s) => (s.skuId === j.sku.id ? s.orders : 0), C.LAUNCH_LIVE_DAYS.value.min, j.day);
  const rto = j.sumSku((s) => (s.skuId === j.sku.id ? s.rto : 0), C.LAUNCH_LIVE_DAYS.value.min, j.day);
  const rows = [
    ['RTO (refused / unreachable)', sum((s) => s.rto), 'Nobody: no reverse shipping when dispatched on time', 'Unit back to stock'],
    ['Customer return: not as expected / size', sum((s) => s.returnsByReason.expectation + s.returnsByReason.size), `Maker: return fee (₹${j.sku.returnFee}, by weight and zone)`, pp ? `Graded A, or B after a ₹${C.PP_REPACK_COST.value} repack; restocked` : 'Graded A, restocked'],
    ['Customer return: product fault', sum((s) => s.returnsByReason.product), 'Maker: return fee + unit', 'Graded C'],
    [
      'Swapped item',
      sum((s) => s.returnsByReason.swap),
      pp
        ? 'Buyer: weighed at the node below dispatch weight → claim denied; maker not charged'
        : `Self-ship: maker files a claim, ~${pctText(C.CLAIM_RECOVERY_SHARE.value * 100)} recovered. Via the Pack Point it would be caught by weight and the maker not charged.`,
      pp ? 'Original unit stays' : 'Needs unboxing evidence',
    ],
  ] as const;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Fault attribution · {dayLabel(from)}–{dayLabel(j.day)}</PanelTitle>
      <table className="w-full text-xs">
        <thead className="text-grey">
          <tr>
            <th className="text-left">What happened</th>
            <th className="text-right">#</th>
            <th className="pl-2 text-left">Who pays</th>
            <th className="pl-2 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, n, b, c]) => (
            <tr key={a} className="border-t border-line align-top">
              <td className="py-1">{a}</td>
              <td className="py-1 text-right font-semibold">{n}</td>
              <td className="py-1 pl-2">{b}</td>
              <td className="py-1 pl-2 text-grey">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-cream p-2">
          <div className="font-semibold text-plum">Policy: RTO</div>
          {C.RTO_RULE.value}. <Chip kind="existing" />
        </div>
        <div className="rounded-lg bg-cream p-2">
          <div className="font-semibold text-plum">Policy: customer return</div>
          {C.CUSTOMER_RETURN_RULE.value}. <Chip kind="existing" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MetricTile label="RTO rate, this SKU" value={<Num f="rtoProbability">{pctText((100 * rto) / Math.max(1, orders), 1)}</Num>} caption={`type 75th percentile: ${pctText(j.sku.typeRefusalP75Pct)}`} status={(100 * rto) / Math.max(1, orders) > j.sku.typeRefusalP75Pct ? 'warn' : 'good'} />
        <MetricTile label="Feeds the cost stack" value="Returns buffer" caption={`${inr(j.sku.stack.returnsBuffer)}/unit`} />
      </div>
    </div>
  );
}

export function Gate1() {
  const j = useJourney();
  const g = j.r.gates.g1!;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Gate 1 · day {g.day}</PanelTitle>
      <DecisionCard
        decision={g.decision}
        reason={g.decision === 'Invest' ? undefined : g.reason}
        gate={`Day-30 rule · ${j.p.name}`}
        rule={g.rule}
        inputs={g.inputs.map((i) => ({ label: `${i.label} (target ${fmtTarget(i)})`, value: fmtInput(i), pass: i.pass }))}
      />
      {j.r.gates.g1rerun && (
        <div className="mt-2 rounded-lg border-2 border-plum p-2 text-sm" data-testid="gate1-rerun">
          <span className="font-semibold text-plum">Rerun, day {j.r.gates.g1rerun.day}</span> (after the fix and the next Launch Week):{' '}
          <strong className={j.r.gates.g1rerun.decision === 'Invest' ? 'text-good' : 'text-warn'}>{j.r.gates.g1rerun.decision}</strong>.{' '}
          {j.r.gates.g1rerun.inputs.map((i) => `${i.label.toLowerCase()} ${fmtInput(i)}`).join(' · ')}
        </div>
      )}
      <p className="mt-2 text-xs text-grey">
        Stick rate = launched SKU orders/day, days {C.STICK_WINDOW_DAYS.value.min}–{C.STICK_WINDOW_DAYS.value.max} ÷ established SKU median ({j.sku.establishedMedianPerDay}/day). Lift = launch vs control districts, live days.
      </p>
    </div>
  );
}

export function Restock() {
  const j = useJourney();
  const r = j.first('restockPrompt', j.sku.id);
  const nudge = j.r.events.find((e) => e.kind === 'coachNudge' && e.day >= C.CHAPTER_DAYS.value[10]! && e.day < C.CHAPTER_DAYS.value[11]!);
  const recheck = nudge && j.r.events.find((e) => e.kind === 'fixRecheck' && e.day === nudge.day + C.FIX_RECHECK_DAYS.value);
  const rr = Number(r?.data?.runRate ?? 0);
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Restock loop + SKU health coach</PanelTitle>
      {r && (
        <div className="rounded-lg bg-cream p-3 text-sm">
          <div className="font-semibold text-plum">{dayLabel(r.day)} · reorder-point math</div>
          <KV k="Run rate (last 7 days ÷ 7, trend-adjusted)" v={`${num(rr, 1)}/day`} />
          <KV k={`× (lead ${j.sku.leadTimeDays} + safety ${j.sku.safetyDays} days) = reorder point`} v={<Num f="reorderPoint">{reorderPoint(rr, j.sku.leadTimeDays, j.sku.safetyDays)}</Num>} />
          <KV k={`Next batch ≈ run rate × ${C.NEXT_BATCH_DAYS.value}, ≥ min run ${j.sku.minRun}`} v={<Num f="nextBatch">{nextBatch(rr, j.sku.minRun)}</Num>} />
          <KV k="On hand" v={String(r.data!.onHand)} />
        </div>
      )}
      {nudge && (
        <div className="mt-3 rounded-lg bg-blush p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-magenta">{dayLabel(nudge.day)} · coach trigger fired</span>
            <Chip kind="simulated" />
          </div>
          <p>{nudge.text.replace(/ Hindi nudge.*$/, '')}</p>
          {recheck && (
            <p className={`mt-1 font-semibold ${recheck.data?.success ? 'text-good' : 'text-bad'}`}>
              {dayLabel(recheck.day)}: {recheck.data?.success ? 'fix worked; back in band' : 'fix did not work'}
            </p>
          )}
        </div>
      )}
      <div className="mt-3 text-xs text-grey">Intervention ladder: auto metric watch → coach nudge → one-tap fix → re-check after {C.FIX_RECHECK_DAYS.value} days → KAM only if a fix fails twice.</div>
    </div>
  );
}

export function Gate2() {
  const j = useJourney();
  const g = j.r.gates.g2!;
  const b = j.r.events.find((e) => e.kind === 'bMoved' && e.skuId === j.sku.id);
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>B moves · Gate 2</PanelTitle>
      <div className="mb-3 rounded-lg bg-cream p-3 text-sm">
        {b ? (
          <>
            <div className="font-semibold text-plum">{dayLabel(b.day)} · B recalculated</div>
            {b.text}
          </>
        ) : (
          <>B steady at {inr(j.B)}; auto price-hold watching daily.</>
        )}
      </div>
      <DecisionCard
        decision={g.decision}
        reason={g.reason}
        gate={`Gate 2 · day ${g.day} · ${g.decision}`}
        rule={g.rule}
        inputs={[...g.durability, ...g.watch].map((i) => ({ label: i.label, value: fmtInput(i), pass: i.pass }))}
      />
      {g.packPoint.applies && (
        <p className="mt-2 text-sm">
          Pack Point <strong>{g.packPoint.verdict.toLowerCase()}</strong>: {g.packPoint.nodeMakers} makers, fee {inr(g.packPoint.fee)} per delivered order. <Chip kind="partner" />
        </p>
      )}
    </div>
  );
}

export function OpenGaps() {
  const j = useJourney();
  const kam = j.r.events.find((e) => e.kind === 'kamCase');
  const rule = j.r.events.find((e) => e.kind === 'newRule');
  const options = j.r.persona.switchOptions;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Make to demand</PanelTitle>
      {options.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs text-grey">
            <tr>
              <th className="text-left">Open gap, same material and process</th>
              <th className="text-right">Unserved/wk</th>
              <th className="text-right">Price</th>
              <th className="text-right">Route</th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td>{o.productType}</td>
                <td className="text-right">{Math.round((o.openGapWeek.min + o.openGapWeek.max) / 2)}</td>
                <td className="text-right">{inr(listPrice(o.stack, o.margin))}</td>
                <td className="text-right">{o.fulfilment === 'packPoint' ? 'Pack Point' : 'Self-ship'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-xs">
        {['Make more', 'Keep', 'Fix', 'Stop', 'Switch'].map((x) => (
          <div key={x} className="rounded-lg bg-blush p-2 font-semibold text-plum">
            {x}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-grey">Makers switch products, not platforms.</p>
      {kam && (
        <div className="mt-3 rounded-lg border-2 border-plum p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-plum">
            KAM queue · {dayLabel(kam.day)} <Chip kind="existing">Existing Meesho: KAM</Chip>
          </div>
          <p>{kam.text}</p>
          {rule && (
            <p className="mt-1 flex items-center gap-1 font-semibold text-magenta">
              <ArrowRight size={14} /> {rule.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Cohort() {
  const j = useJourney();
  const g = j.r.gates.g3!;
  const kams = j.r.kpis.kamCases;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Gate 3 · cohort metrics vs targets</PanelTitle>
      <div className="grid grid-cols-3 gap-2">
        {[...g.inputs, ...g.watch].map((i) => (
          <MetricTile key={i.label} label={i.label} value={fmtInput(i)} target={`${i.sense === 'min' ? '≥' : '≤'} ${i.target}${i.unit === '%' ? '%' : ''}`} status={i.pass ? 'good' : 'warn'} />
        ))}
        <MetricTile label="Makers in cohort" value={g.cohort.makers} />
        <MetricTile
          label="Makers per category manager"
          value={<Num f="makersPerManager">{num(makersPerManager(g.cohort.makers))}</Num>}
          caption={`${categoryManagersNeeded(g.cohort.makers)} manager · ${kams} KAM case${kams === 1 ? '' : 's'} here; rises as cases become coach rules`}
        />
      </div>
      <div className={`mt-3 rounded-xl p-3 text-center text-xl font-bold ${g.decision === 'Invest' ? 'bg-good text-white' : g.decision === 'Tighten' ? 'bg-warn text-ink' : 'bg-bad text-white'}`}>{g.decision}</div>
      <p className="mt-1 text-xs text-grey">{g.rule}</p>
    </div>
  );
}
