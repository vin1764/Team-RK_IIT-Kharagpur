import { CheckCircle2, Circle } from 'lucide-react';
import { C } from '../../data/constants';
import { dateLabel } from '../../engine/nudges';
import type { Gate1Result } from '../../engine/gates';
import { inr, num } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { demandFor, eligibleForLaunch, listingNumbers, useOnboard } from '../onboard';
import { nextPayout } from '../money';
import { committedOf, launchSkus } from '../stage';
import { Btn, Caption, Card, GoBtn, H2, Row, Screen, ScreenNudges, Stat, useV } from '../ui';
import { ready } from '../ready';

const PLAIN: Record<string, string> = {
  Invest: 'It worked. Your listing stays in front of buyers, and we keep restocking you on the run-rate.',
  Tighten: 'Close. Fix one thing, then you get one rerun at the next Launch Week.',
  Stop: 'This product didn’t lift. Stop making it; we’ll suggest one that buyers are asking for.',
};

function GateCard({ g, title }: { g: Gate1Result; title: string }) {
  return (
    <Card tone={g.decision === 'Invest' ? 'white' : 'orange'}>
      <div className="flex items-center justify-between">
        <H2>{title}</H2>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${g.decision === 'Invest' ? 'bg-good text-white' : g.decision === 'Tighten' ? 'bg-warn text-ink' : 'bg-bad text-white'}`} data-testid="gate1-decision">
          {g.decision}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold">{PLAIN[g.decision]}</p>
      <ul className="mt-2 space-y-0.5 text-sm">
        {g.inputs.map((i) => (
          <li key={i.label} className="flex justify-between gap-2">
            <span>
              {i.pass ? '✓' : '✗'} {i.label}
            </span>
            <span className="tabular-nums text-grey">
              {i.unit === '%' ? `${num(i.value)}%` : i.unit === '×' ? `${num(i.value, 1)}×` : num(i.value, 2)} (target {i.sense === 'min' ? '≥' : '≤'}{' '}
              {i.unit === '%' ? `${i.target}%` : i.unit === '×' ? `${i.target}×` : i.target})
            </span>
          </li>
        ))}
      </ul>
      <Caption>{g.reason}</Caption>
    </Card>
  );
}

/** Order book → commit → stock-ready → live dashboard → day-30 results. */
export default function Launch() {
  const v = useV();
  const onboard = useOnboard(v);
  const o = v.state.onboarding;
  const skus = launchSkus(v);
  const committed = committedOf(v);
  const live = C.LAUNCH_LIVE_DAYS.value;
  const stockIn = C.LAUNCH_STOCK_IN_DAY.value;
  const allListed = skus.every((s) => o.listed[s.id] && o.fulfilment[s.id]);
  const eligible = eligibleForLaunch(o);
  const canCommit = allListed && eligible && v.day <= C.LAUNCH_COMMIT_BY_DAY.value;
  const autoCommitted = committed !== null && o.committedDay === null;
  const g1 = v.day >= C.GATE_DAYS.value[0]! ? v.run.gates.g1 : undefined;
  const g1r = v.run.gates.g1rerun && v.day >= v.run.gates.g1rerun.day ? v.run.gates.g1rerun : undefined;
  const payout = nextPayout(v);
  const lotStarted = Object.entries(v.state.actions).some(([id, a]) => id.startsWith('make_first_lot') && a.action === 'started');
  const stockChecks = [
    { label: v.t.lotReady, done: o.stockReady || v.day >= stockIn },
    { label: v.t.stockLinked, done: v.day >= stockIn },
    { label: v.t.priceLocked, done: committed !== null },
  ];
  return (
    <Screen title={v.day >= live.min && committed !== null ? v.t.launchDashboard : v.t.launchTitle} back={{ to: '/app/today', label: v.t.backToToday }} sub={`Factory Launch Week ${v.run.persona.launchWeekNo}`}>
      {ready('nudges') && <ScreenNudges v={v} route="/app/launch" />}
      {g1r && <GateCard g={g1r} title="Your rerun result" />}
      {g1 && <GateCard g={g1} title={v.t.day30} />}
      {committed !== null && v.day >= live.min && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label={v.t.liveOrders} value={num(v.ds.orders)} />
          <Stat label={v.t.stockLeft} value={num(v.ds.onHand)} />
          <Stat label={v.t.nextPayout} value={payout ? inr(payout.amount) : '—'} caption={payout ? dateLabel(payout.day) : undefined} />
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between">
          <H2>{v.t.orderBook}</H2>
          <Chip kind="new" />
        </div>
        <ul className="mt-2 space-y-2">
          {skus.map((s) => {
            const n = listingNumbers(v, s, o.margins[s.id] ?? s.margin);
            const d = demandFor(s);
            return (
              <li key={s.id} className="rounded-lg border border-line p-2 text-sm">
                <div className="font-semibold">{s.name}</div>
                <Row k={v.t.priceCap} v={inr(n.B)} />
                <Row k="Your price" v={o.listed[s.id] ? inr(n.price) : 'not listed yet'} />
                <Row k={v.t.expectedOrders} v={`${num(d.daily.min, 1)}–${num(d.daily.max, 1)} a day`} />
                <Row k={v.t.firstLot} v={`${num(o.lots[s.id] ?? d.lot.suggested)} units`} />
                {!o.listed[s.id] && (
                  <GoBtn to={`/app/list/${s.id}/product`} kind="secondary">
                    {v.t.listIt}
                  </GoBtn>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-2 text-sm">
          <H2>{v.t.dates}</H2>
          <Row k="Commit by" v={dateLabel(C.LAUNCH_COMMIT_BY_DAY.value)} />
          <Row k="Stock in by" v={dateLabel(stockIn)} />
          <Row k="Live" v={`${dateLabel(live.min)}–${dateLabel(live.max)}`} />
        </div>
      </Card>
      {committed === null ? (
        <>
          {!eligible && o.signedUp && <Caption>{v.t.notEligible}.</Caption>}
          {!allListed && <Caption>List every product and choose who packs it to commit.</Caption>}
          <Btn onClick={() => onboard(() => ({ committedDay: v.day }))} disabled={!canCommit} testId="commit-slot">
            {v.t.commitSlot}
          </Btn>
          <GoBtn to="/app/today" kind="secondary" next>
            {v.t.backToToday}
          </GoBtn>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-good/10 p-3 text-center font-semibold text-good" data-testid="committed">
            ✓ {v.t.committed} {autoCommitted ? `(the demo committed on ${dateLabel(committed)})` : `on ${dateLabel(committed)}`}
          </div>
          <Card>
            <H2>{v.t.stockReady}</H2>
            <ul className="mt-1 space-y-1 text-sm">
              {stockChecks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.done ? <CheckCircle2 size={16} className="text-good" aria-hidden /> : <Circle size={16} className="text-grey" aria-hidden />}
                  {c.label}
                </li>
              ))}
            </ul>
            {!o.stockReady && v.day < stockIn && (
              <div className="mt-2">
                <Btn kind="do" onClick={() => onboard(() => ({ stockReady: true }))}>
                  {lotStarted ? 'My lot is ready' : 'Mark lot ready'}
                </Btn>
              </div>
            )}
          </Card>
          <GoBtn to="/app/today" next>
            {v.t.backToToday}
          </GoBtn>
        </>
      )}
    </Screen>
  );
}
