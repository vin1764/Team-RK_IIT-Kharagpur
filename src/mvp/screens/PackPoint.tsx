import { C } from '../../data/constants';
import { dateLabel, fulfilmentOf, nodeLots, weekdayLabel } from '../../engine/nudges';
import { packPointFeeFor, storageCost } from '../../engine/formulas';
import { inr, num } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { listingNumbers, nodeAt } from '../onboard';
import { allSpecs } from '../stage';
import { Caption, Card, GoBtn, H2, Row, Screen, ScreenNudges, useV } from '../ui';

/** Pack Point: next lot, lots received (counted vs sent), storage clock per lot, slow-stock decision. */
export default function PackPoint() {
  const v = useV();
  const node = nodeAt(v, Math.max(v.day, 0));
  const ppSkus = allSpecs(v).filter((s) => fulfilmentOf(v.run, s.id) === 'packPoint' && v.run.days.some((d) => d.day <= v.day && d.skus.some((x) => x.skuId === s.id && (x.live || x.onHand > 0))));
  const upcoming = v.timeline.filter((n) => (n.type === 'send_lot_packpoint' || n.type === 'send_next_lot') && (n.dueDay ?? 0) >= v.day).at(-1);
  const sub = node ? `${v.persona.city} node · ${node.makers} makers · ${inr(node.fee)} per delivered order` : `No node in ${v.persona.city} yet`;

  if (!node) {
    return (
      <Screen title={v.t.packPointTitle} back={{ to: '/app/orders', label: v.t.ordersTitle }} sub={sub}>
        <Card>
          <p className="text-sm">
            There’s no Pack Point in {v.persona.city} yet. You ship yourself and Valmo picks up from your door ({C.VALMO_PICKUP_WINDOW.value}). A node opens
            once enough makers in a cluster pool their orders; the fee is {inr(packPointFeeFor(C.PP_REFERENCE_MAKERS.value))} per delivered order at{' '}
            {C.PP_REFERENCE_MAKERS.value} makers.
          </p>
          <div className="mt-2">
            <Chip kind="partner" />
          </div>
        </Card>
        <GoBtn to="/app/orders" next>
          {v.t.ordersTitle}
        </GoBtn>
      </Screen>
    );
  }

  return (
    <Screen title={v.t.packPointTitle} back={{ to: '/app/orders', label: v.t.ordersTitle }} sub={sub}>
      <ScreenNudges v={v} route="/app/packpoint" />
      {ppSkus.length === 0 && (
        <Card>
          <H2>Not using the node yet</H2>
          <ul className="mt-1 space-y-1 text-sm">
            {allSpecs(v)
              .filter((s) => v.state.onboarding.listed[s.id] || s.inLaunch)
              .map((s) => {
                const price = listingNumbers(v, s, v.state.onboarding.margins[s.id] ?? s.margin).price;
                return (
                  <li key={s.id}>
                    <b>{s.name}</b> at {inr(price)}:{' '}
                    {price <= C.PACK_POINT_MIN_PRICE.value
                      ? `ship yourself (Pack Point is for products above ${inr(C.PACK_POINT_MIN_PRICE.value)}).`
                      : node.pays
                        ? 'eligible for the Pack Point.'
                        : `Pack Point waits until the node has ${C.PP_REFERENCE_MAKERS.value} makers; ship yourself meanwhile.`}
                  </li>
                );
              })}
          </ul>
        </Card>
      )}
      {ppSkus.map((s) => {
        const lots = nodeLots(v.run, s.id, v.day);
        const arrivals = v.run.events.filter((e) => e.skuId === s.id && (e.kind === 'stockIn' || e.kind === 'batchArrived') && e.day <= v.day);
        const atNode = v.run.days.find((d) => d.day === v.day)?.skus.find((x) => x.skuId === s.id)?.onHand ?? 0;
        return (
          <div key={s.id} className="space-y-3">
            <Card tone={upcoming ? 'orange' : 'white'}>
              <H2>
                {v.t.nextLot}: {s.name}
              </H2>
              {upcoming ? (
                <p className="text-sm" data-testid="pp-next-lot">
                  {upcoming.title.replace(/^Send (your lot to the .* Pack Point|next week's lot): /, '')} · drop {weekdayLabel(upcoming.dueDay!)}, {C.PP_DROP_WINDOW.value}
                </p>
              ) : (
                <p className="text-sm text-grey">No lot due. We tell you {C.PP_DROP_NOTICE_DAYS.value} days before each drop.</p>
              )}
              <Row k="Units at the node now" v={num(atNode)} />
            </Card>
            <Card>
              <H2>{v.t.lotsReceived}</H2>
              {arrivals.length === 0 && <Caption>No lots received yet.</Caption>}
              <ul className="mt-1 space-y-1 text-sm">
                {arrivals.map((e) => {
                  const units = Number(e.data?.units ?? 0);
                  const short = Math.round((units * C.PP_INBOUND_SHORTFALL_PCT.value) / 100);
                  return (
                    <li key={`${e.day}-${e.kind}`} className="flex justify-between gap-2">
                      <span>{dateLabel(e.day)}</span>
                      <span className="tabular-nums">
                        sent {num(units + short)} · counted {num(units)}
                        {short > 0 && <span className="text-bad"> · {short} short</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card>
              <H2>{v.t.storageClock}</H2>
              {lots.length === 0 && <Caption>Nothing in storage.</Caption>}
              <ul className="mt-1 space-y-2 text-sm">
                {lots.map((l) => {
                  const age = v.day - l.arrival;
                  const free = C.PP_STORAGE_FREE_DAYS.value;
                  const pct = Math.min(100, (100 * age) / C.PP_SLOW_STOCK_DECISION_DAY.value);
                  return (
                    <li key={l.arrival}>
                      <div className="flex justify-between">
                        <span>
                          Lot of {dateLabel(l.arrival)}: {num(l.units)} units
                        </span>
                        <span className={age > free ? 'font-semibold text-bad' : 'text-grey'}>
                          day {age} of {free} free
                        </span>
                      </div>
                      <div className="mt-0.5 h-2 rounded-full bg-line">
                        <div className={`h-2 rounded-full ${age > free ? 'bg-bad' : age >= C.PP_STORAGE_WARNING_DAY.value ? 'bg-warn' : 'bg-good'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {age > free && <Caption>Storage so far: {inr(storageCost(l.units, age), 2)}</Caption>}
                    </li>
                  );
                })}
              </ul>
              <Caption>
                Free for {C.PP_STORAGE_FREE_DAYS.value} days, then ₹{C.PP_STORAGE_PER_UNIT_DAY.value}/unit/day. At day {C.PP_SLOW_STOCK_DECISION_DAY.value} you decide: keep, or stop
                and let it sell down.
              </Caption>
            </Card>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Chip kind="partner" />
        <span className="text-xs text-grey">Returns are graded at the node; swaps are caught by weight.</span>
      </div>
      <GoBtn to="/app/orders?tab=returns" next kind="secondary">
        {v.t.returnsTab}
      </GoBtn>
    </Screen>
  );
}
