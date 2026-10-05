import { runSim } from '../app/useSim';
import { C } from '../data/constants';
import { PERSONA_SPECS } from '../data/personas';
import { categoryManagersNeeded, expectedDailyPerSku, firstLot, listPrice, makersPerManager } from '../engine/formulas';
import { committedDayOf, dateLabel, fulfilmentOf, nodeLots } from '../engine/nudges';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { MetricTile } from '../components/MetricTile';
import { Chip } from '../components/Chip';
import { PanelTitle } from '../journey/parts';
import { useMvp } from '../mvp/state';

/** Launch Week order book: slots per maker and SKU, cap B, lot, commit status as of the demo day. */
export function OrderBook({ asOf }: { asOf: number }) {
  const states = useMvp((s) => s.states);
  const rows = PERSONA_SPECS.flatMap((p) =>
    p.skus
      .filter((s) => s.inLaunch)
      .map((s) => {
        const st = states[p.id];
        const committed = committedDayOf(st, asOf);
        const lot = st.onboarding.lots[s.id] ?? firstLot({ min: expectedDailyPerSku(s.openGapWeek.min, s.likelyShare), max: expectedDailyPerSku(s.openGapWeek.max, s.likelyShare) }, s.minRun).suggested;
        return { p, s, committed, lot, price: listPrice(s.stack, st.onboarding.margins[s.id] ?? s.margin, s.gstRatePct) };
      }),
  ).sort((a, b) => a.p.launchWeekNo - b.p.launchWeekNo);
  const live = C.LAUNCH_LIVE_DAYS.value;
  return (
    <div>
      <PanelTitle right={<Chip kind="new" />}>Order book and slot allocation</PanelTitle>
      <p className="mb-2 text-xs text-grey">
        Commit by {dayLabel(C.LAUNCH_COMMIT_BY_DAY.value)} · stock in by {dayLabel(C.LAUNCH_STOCK_IN_DAY.value)} · live {dayLabel(live.min)}–{dayLabel(live.max)}. One slot per SKU, capped at B; the
        lot is {C.FIRST_LOT_DAYS.value} days of expected sales.
      </p>
      <table className="w-full text-xs">
        <thead className="text-grey">
          <tr>
            <th className="text-left">Week</th>
            <th className="text-left">Maker · SKU</th>
            <th className="text-right">Cap B</th>
            <th className="text-right">Price</th>
            <th className="text-right">Lot</th>
            <th className="text-left">Slot as of {dayLabel(asOf)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, s, committed, lot, price }) => (
            <tr key={s.id} className="border-t border-line">
              <td className="py-1">LW {p.launchWeekNo}</td>
              <td className="py-1">
                <b>{p.name.split(' ')[0]}</b> · {s.name}
              </td>
              <td className="py-1 text-right">{inr(s.bEpochs[0]!.B)}</td>
              <td className="py-1 text-right">{inr(price)}</td>
              <td className="py-1 text-right">{num(lot)}</td>
              <td className="py-1">{committed === null ? 'Open: not committed yet' : asOf >= live.min ? 'Live' : `Committed ${dayLabel(committed)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The node's inbound and storage queue (Hiren's Pack Point SKUs), as of the demo day. */
export function NodeQueue({ asOf }: { asOf: number }) {
  const r = runSim({ personaId: 'hiren' });
  const skus = [...r.persona.skus, ...r.persona.switchOptions].filter((s) => fulfilmentOf(r, s.id) === 'packPoint');
  const inbound = r.events.filter((e) => (e.kind === 'stockIn' || e.kind === 'batchArrived') && skus.some((s) => s.id === e.skuId) && e.day > asOf && e.day <= asOf + 7);
  const lots = skus.flatMap((s) => nodeLots(r, s.id, asOf).map((l) => ({ s, ...l })));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-line bg-white p-3 text-sm">
        <div className="mb-1 font-semibold text-plum">Inbound, next 7 days</div>
        {inbound.length === 0 ? (
          <p className="text-xs text-grey">No lots due.</p>
        ) : (
          <ul className="space-y-0.5 text-xs">
            {inbound.map((e) => (
              <li key={`${e.day}${e.skuId}`}>
                {dayLabel(e.day)} ({dateLabel(e.day)}) · {skus.find((s) => s.id === e.skuId)?.name} · {num(Number(e.data?.units ?? 0))} units
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-line bg-white p-3 text-sm">
        <div className="mb-1 font-semibold text-plum">Storage queue</div>
        {lots.length === 0 ? (
          <p className="text-xs text-grey">Nothing stored.</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {lots.map((l) => {
                const age = asOf - l.arrival;
                return (
                  <tr key={`${l.s.id}${l.arrival}`} className="border-t border-line">
                    <td className="py-1">{l.s.name}</td>
                    <td className="py-1 text-right">{num(l.units)} units</td>
                    <td className={`py-1 text-right ${age > C.PP_STORAGE_FREE_DAYS.value ? 'text-bad' : age >= C.PP_STORAGE_WARNING_DAY.value ? 'text-warn' : ''}`}>
                      day {age} of {C.PP_STORAGE_FREE_DAYS.value} free
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Makers per category manager for the cohort. */
export function ManagerLoad() {
  const r = runSim({ personaId: 'hiren' });
  const makers = r.cohort.length;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      <MetricTile label="Makers per category manager" value={num(makersPerManager(makers))} caption={`${makers} makers · ${categoryManagersNeeded(makers)} manager(s) at ${pctText(C.KAM_ESCALATION_RATE.value * 100)} escalating`} />
      <MetricTile label="Cases per manager (capacity)" value={num(C.KAM_CASES_PER_MANAGER.value)} />
      <MetricTile label="Escalations so far (3 demo makers)" value={num(PERSONA_SPECS.reduce((a, p) => a + runSim({ personaId: p.id }).kpis.kamCases, 0))} caption="each becomes a coach rule" />
    </div>
  );
}

/** Cohort metrics vs targets, shown as each one becomes measurable. */
export function CohortMetrics({ asOf, pid }: { asOf: number; pid: (typeof PERSONA_SPECS)[number]['id'] }) {
  const r = runSim({ personaId: pid });
  const c = r.gates.g3!.cohort;
  const [d30, d60, d90] = C.GATE_DAYS.value as [number, number, number];
  const tiles: { label: string; day: number; value: string; target?: string; pass?: boolean }[] = [
    { label: `Stick rate at day 30 (${r.persona.name.split(' ')[0]})`, day: d30, value: num(r.kpis.stickRateD30, 2), target: `≥ ${C.T_STICK_RATE_D30.value}`, pass: r.kpis.stickRateD30 >= C.T_STICK_RATE_D30.value },
    { label: 'Makers active at day 30', day: d30, value: pctText(c.activeD30Pct) },
    { label: 'Second lot by day 45', day: 45, value: pctText(c.secondLotByD45Pct), target: `≥ ${C.T_SECOND_LOT_BY_D45_PCT.value}%`, pass: c.secondLotByD45Pct >= C.T_SECOND_LOT_BY_D45_PCT.value },
    { label: 'Makers active at day 60', day: d60, value: pctText(c.activeD60Pct), target: `≥ ${C.T_MAKERS_ACTIVE_D60_PCT.value}%`, pass: c.activeD60Pct >= C.T_MAKERS_ACTIVE_D60_PCT.value },
    { label: 'Makers active at day 90', day: d90, value: pctText(c.activeD90Pct), target: `≥ ${C.T_MAKERS_ACTIVE_D90_PCT.value}%`, pass: c.activeD90Pct >= C.T_MAKERS_ACTIVE_D90_PCT.value },
    { label: 'Cohort price drop vs B', day: d90, value: pctText(c.priceDropAvgPct, 1), target: `≥ ${C.PRICE_DROP_TARGET_PCT_OF_B.value}%`, pass: c.priceDropAvgPct >= C.PRICE_DROP_TARGET_PCT_OF_B.value },
  ];
  return (
    <div>
      <PanelTitle right={<Chip kind="simulated" />}>
        Cohort metrics vs targets · {r.persona.name.split(' ')[0]}’s Launch Week cohort ({c.makers} makers)
      </PanelTitle>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {tiles.map((t) =>
          asOf >= t.day ? (
            <MetricTile key={t.label} label={t.label} value={t.value} target={t.target} status={t.pass === undefined ? undefined : t.pass ? 'good' : 'warn'} />
          ) : (
            <MetricTile key={t.label} label={t.label} value="—" caption={`measured on ${dayLabel(t.day)}`} />
          ),
        )}
      </div>
    </div>
  );
}
