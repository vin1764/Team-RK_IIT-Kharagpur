import { useMemo, useState } from 'react';
import { usePersonaRuns } from '../app/useSim';
import { C } from '../data/constants';
import { PERSONA_SPECS, SKUS, type PersonaId } from '../data/personas';
import { listPrice, packPointBreakEvenMakers, packPointCost, packPointFeeTier, packPointPnl } from '../engine/formulas';
import { PackPointFlow } from '../journey/PackPointFlow';
import { Go } from '../app/Go';
import { buildCtx, JourneyContext } from '../journey/ctx';
import { DemandEngine, Districts, Gate1, Ledger, Cohort, Fault } from '../journey/ControlPanels';
import { runSim } from '../app/useSim';
import { useApp } from '../app/store';
import { Chip } from '../components/Chip';
import { MetricTile } from '../components/MetricTile';
import { Num } from '../components/FormulaPopover';
import { PanelTitle } from '../journey/parts';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { SectionPage } from './SectionPage';

const TABS = ['Demand engine', 'Ledger', 'Pack Point', 'Launch', 'Coach & KAM', 'Cohort'] as const;
type Tab = (typeof TABS)[number];

function PackPoint() {
  const [makers, setMakers] = useState(C.PP_REFERENCE_MAKERS.value);
  const cost = packPointCost(makers);
  const fee = packPointFeeTier(makers);
  const seed = useApp((s) => s.seed);
  const hero = runSim({ personaId: 'hiren', seed });
  const node = PERSONA_SPECS[0]!.node!;
  const pnl = packPointPnl(makers);
  const breakEven = packPointBreakEvenMakers();
  const ppDays = hero.days.flatMap((d) => d.skus.filter((s) => s.skuId === 'casserole-1500' && s.live).map((s) => ({ day: d.day, s })));
  const queue = ppDays.slice(-7);
  return (
    <div className="space-y-4">
      <PanelTitle right={<Chip kind="partner" />}>Cluster Pack Point · fee by makers pooled</PanelTitle>
      <label className="block text-sm">
        Makers pooled: <strong>{makers}</strong>
        <input type="range" min={10} max={90} value={makers} onChange={(e) => setMakers(Number(e.target.value))} className="w-full accent-plum" aria-label="Makers pooled" />
      </label>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricTile label="Fee per delivered order" value={<Num f="packPointFee">{inr(fee.fee)}</Num>} target={`≤ ${inr(C.T_PACK_POINT_FEE.value)} at ≥ ${C.PP_REFERENCE_MAKERS.value} makers`} status={fee.fee <= C.T_PACK_POINT_FEE.value ? 'good' : 'warn'} />
        <MetricTile label="Cost per order handled" value={<Num f="packPointCost">{inr(cost.costPerOrder, 1)}</Num>} />
        <MetricTile label="Orders / month" value={num(cost.ordersPerMonth)} />
        <MetricTile label="Staff · area" value={`${cost.staff} · ${num(cost.areaSqft)} sq ft`} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {C.PP_FEE_TIER_MAKERS.value.map((m) => (
          <span key={m} className={`rounded-full px-3 py-1 font-semibold ${fee.tierMakers === m ? 'bg-plum text-white' : 'bg-blush text-plum'}`}>
            {m} makers → {inr(packPointFeeTier(m).fee)}
          </span>
        ))}
      </div>
      <p className="text-xs text-grey">
        Fee = cost per order × (1 + {C.PP_PARTNER_MARGIN_PCT.value}% partner margin) ÷ (1 − RTO). Storage free for {C.PP_STORAGE_FREE_DAYS.value} days, then ₹{C.PP_STORAGE_PER_UNIT_DAY.value}/unit/day; slow stock decided by day {C.PP_SLOW_STOCK_DECISION_DAY.value}. Self-ship always available.
      </p>
      <PackPointFlow makers={makers} />
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Partner profit / month" value={<Num f="packPointPnl">{inr(pnl.profit)}</Num>} target={`margin ${pctText(pnl.marginPct, 1)}`} status={pnl.profit >= 0 ? 'good' : 'bad'} />
        <MetricTile label="Break-even node size" value={`${breakEven ?? '—'} makers`} target="at the published fee" />
        <MetricTile
          label="Cost/order vs Shiprocket"
          value={`${inr(cost.costPerOrder, 1)} vs ${inr(C.PP_SHIPROCKET_BENCHMARK.value)}`}
          target="published 3PL price, cross-check"
          status={cost.costPerOrder <= C.PP_SHIPROCKET_BENCHMARK.value ? 'good' : 'warn'}
        />
        <MetricTile
          label="Dwell at the node (casserole)"
          value={hero.kpis.ppDwellDays === null ? '—' : `${num(hero.kpis.ppDwellDays, 1)} days`}
          target={`≤ ${C.T_PACK_POINT_DWELL_DAYS.value} days; slow stock decided by day ${C.PP_SLOW_STOCK_DECISION_DAY.value}`}
          status={hero.kpis.ppDwellDays !== null && hero.kpis.ppDwellDays <= C.T_PACK_POINT_DWELL_DAYS.value ? 'good' : 'warn'}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-3 text-sm">
          <div className="mb-1 font-semibold text-plum">Who uses the Rajkot node</div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-t border-line">
                <td className="py-1">Launch 1 cohort (already pooled)</td>
                <td className="py-1 text-right font-semibold">{node.startMakers} makers</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1">Launch 2 offline makers (join {dayLabel(node.crossDay)}, ~{dayLabel(C.LAUNCH_LIVE_DAYS.value.min + C.LAUNCH_CADENCE_DAYS.value)} live)</td>
                <td className="py-1 text-right font-semibold">+{node.afterMakers - node.startMakers} makers</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1">Hiren: 1 L bottle at {inr(listPrice(SKUS.bottle.stack, SKUS.bottle.margin))} → self-ship (below {inr(C.PACK_POINT_MIN_PRICE.value)})</td>
                <td className="py-1 text-right">not at the node</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1">Hiren: 1.5 L casserole (from {dayLabel(hero.events.find((e) => e.kind === 'switchLive')?.day ?? 0)})</td>
                <td className="py-1 text-right font-semibold">via the node</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-grey">Launch 1: online-elsewhere and churned makers; Launch 2 onward: offline makers via the Pack Point. Self-ship stays available to everyone.</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3 text-sm">
          <div className="mb-1 font-semibold text-plum">Hiren’s casserole at the node (to day 90)</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-good/15 px-2 py-1 font-semibold text-good">Grade A {hero.kpis.ppGrades.A}</span>
            <span className="rounded bg-warn/20 px-2 py-1 font-semibold">Grade B {hero.kpis.ppGrades.B}</span>
            <span className="rounded bg-bad/15 px-2 py-1 font-semibold text-bad">Grade C {hero.kpis.ppGrades.C}</span>
            <span className="rounded bg-blush px-2 py-1 font-semibold">Swaps caught {hero.events.filter((e) => e.kind === 'swapCaught').length}</span>
            <span className="rounded bg-blush px-2 py-1 font-semibold">Slow-stock decisions {hero.kpis.ppSlowStockUnits} units</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-grey">
            {hero.events
              .filter((e) => e.kind === 'swapCaught' || e.kind === 'slowStock' || (e.kind === 'stockIn' && e.skuId === 'casserole-1500'))
              .slice(0, 4)
              .map((e, i) => (
                <li key={i}>
                  {dayLabel(e.day)} · {e.text}
                </li>
              ))}
          </ul>
        </div>
      </div>
      <Go to="/economics" className="inline-block text-sm font-semibold text-magenta hover:underline">
        Partner P&amp;L by makers pooled → Economics
      </Go>
      <div>
        <div className="mb-1 text-sm font-semibold text-plum">Ops queue · Rajkot node (Hiren’s casserole, last 7 days)</div>
        <table className="w-full text-xs">
          <thead className="text-grey">
            <tr>
              <th className="text-left">Day</th>
              <th className="text-right">Picked & packed</th>
              <th className="text-right">QC (photo + weight)</th>
              <th className="text-right">Delivered</th>
              <th className="text-right">Returns weighed</th>
              <th className="text-right">Swaps caught</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(({ day, s }) => (
              <tr key={day} className="border-t border-line">
                <td>{dayLabel(day)}</td>
                <td className="text-right">{s.orders}</td>
                <td className="text-right text-good">{s.orders} ✓</td>
                <td className="text-right">{s.delivered}</td>
                <td className="text-right">{s.returnRequests}</td>
                <td className="text-right">{s.returnsByReason.swap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoachKam() {
  const seed = useApp((s) => s.seed);
  const rows = PERSONA_SPECS.flatMap((p) =>
    runSim({ personaId: p.id, seed })
      .events.filter((e) => ['coachNudge', 'fixRecheck', 'kamCase', 'newRule'].includes(e.kind))
      .map((e) => ({ p, e })),
  ).sort((a, b) => a.e.day - b.e.day);
  const ladder = ['Auto metric watch', 'Coach nudge', 'One-tap fix', `Re-check after ${C.FIX_RECHECK_DAYS.value} days`, 'KAM only if a fix fails twice'];
  return (
    <div className="space-y-4">
      <PanelTitle right={<><Chip kind="new" /><Chip kind="existing">Existing Meesho: KAM</Chip></>}>Intervention ladder</PanelTitle>
      <ol className="grid grid-cols-5 gap-2 text-center text-xs">
        {ladder.map((x, i) => (
          <li key={x} className={`rounded-lg p-2 font-semibold ${i === 4 ? 'bg-plum text-white' : 'bg-blush text-plum'}`}>
            {i + 1}. {x}
          </li>
        ))}
      </ol>
      <table className="w-full text-xs">
        <thead className="text-grey">
          <tr>
            <th className="text-left">Day</th>
            <th className="text-left">Maker</th>
            <th className="text-left">Queue item</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, e }, i) => (
            <tr key={i} className={`border-t border-line align-top ${e.kind === 'kamCase' || e.kind === 'newRule' ? 'bg-orange-soft/60' : ''}`}>
              <td className="py-1">{dayLabel(e.day)}</td>
              <td className="py-1 font-semibold">{p.name}</td>
              <td className="py-1">{e.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-grey">Each KAM case becomes a coach rule, so makers per manager rises with every launch.</p>
    </div>
  );
}

export default function ControlRoom() {
  const [tab, setTab] = useState<Tab>('Demand engine');
  const [pid, setPid] = useState<PersonaId>('hiren');
  const p = PERSONA_SPECS.find((x) => x.id === pid)!;
  const { base, cf } = usePersonaRuns(pid);
  const ctxAt = useMemo(() => (chapter: number, day: number) => buildCtx(p, base, cf, chapter, day), [p, base, cf]);
  const live = C.LAUNCH_LIVE_DAYS.value;
  return (
    <SectionPage path="/control-room">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full bg-blush p-1" role="tablist" aria-label="Control room tabs">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === t ? 'bg-plum text-white' : 'text-plum'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-grey">Maker:</span>
          {PERSONA_SPECS.map((x) => (
            <button key={x.id} type="button" onClick={() => setPid(x.id)} aria-pressed={pid === x.id} className={`rounded-full px-3 py-1 font-semibold ${pid === x.id ? 'bg-plum text-white' : 'border border-line bg-white text-plum'}`}>
              {x.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-plum/50 bg-white p-4 text-sm">
        {tab === 'Demand engine' && (
          <JourneyContext.Provider value={ctxAt(0, C.TIMELINE_DAYS.value.min)}>
            <DemandEngine />
          </JourneyContext.Provider>
        )}
        {tab === 'Ledger' && (
          <JourneyContext.Provider value={ctxAt(4, C.CHAPTER_DAYS.value[4]!)}>
            <Ledger />
          </JourneyContext.Provider>
        )}
        {tab === 'Pack Point' && <PackPoint />}
        {tab === 'Launch' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <JourneyContext.Provider value={ctxAt(7, live.max)}>
              <Districts />
            </JourneyContext.Provider>
            <JourneyContext.Provider value={ctxAt(9, C.GATE_DAYS.value[0]!)}>
              <Gate1 />
            </JourneyContext.Provider>
            <div className="xl:col-span-2">
              <JourneyContext.Provider value={ctxAt(8, C.STICK_WINDOW_DAYS.value.max)}>
                <Fault />
              </JourneyContext.Provider>
            </div>
          </div>
        )}
        {tab === 'Coach & KAM' && <CoachKam />}
        {tab === 'Cohort' && (
          <JourneyContext.Provider value={ctxAt(13, C.GATE_DAYS.value[2]!)}>
            <Cohort />
          </JourneyContext.Provider>
        )}
      </div>
    </SectionPage>
  );
}
