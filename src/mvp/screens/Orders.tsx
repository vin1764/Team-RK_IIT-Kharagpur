import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Go } from '../../app/Go';
import { C } from '../../data/constants';
import { dateLabel, fulfilmentOf } from '../../engine/nudges';
import type { ReturnReason } from '../../data/personas';
import { inr, num, dayLabel } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { useMvp } from '../state';
import { specById } from '../stage';
import { applyAction, Btn, Caption, Card, H2, Row, Screen, ScreenNudges, useV } from '../ui';
import type { AccountView } from '../useAccount';

const orderId = (sku: string, day: number, i: number) => `MS${(day + 100).toString().padStart(3, '0')}${sku.slice(0, 2).toUpperCase()}${(i + 1).toString().padStart(3, '0')}`;

function useMarkOrders(v: AccountView) {
  const update = useMvp((s) => s.update);
  return (field: 'packed' | 'handed', sku: string, day: number) =>
    update(v.id, (s) => {
      // Record the matching nudge action too, so the nudge clears.
      const type = field === 'packed' ? 'new_order_pack' : day === v.day ? 'valmo_pickup' : 'dispatch_deadline';
      const n = v.active.find((x) => x.type === type && (type === 'valmo_pickup' || x.sku === sku));
      const a = n?.actions.find((x) => x.id === (field === 'packed' ? 'packed' : 'handed'));
      const base = n && a ? applyAction(v, s, n, a) : s;
      return { ...base, [field]: { ...base[field], [`${sku}:${day}`]: true } };
    });
}

function OrdersTab({ v }: { v: AccountView }) {
  const mark = useMarkOrders(v);
  const [label, setLabel] = useState<string | null>(null);
  const days = [v.day, v.day - 1].filter((d) => d >= C.LAUNCH_LIVE_DAYS.value.min);
  const rows = days.flatMap((d) =>
    (v.run.days.find((x) => x.day === d)?.skus ?? []).filter((s) => s.orders > 0).map((s) => ({ d, s, pp: fulfilmentOf(v.run, s.skuId) === 'packPoint' })),
  );
  const pending = rows.filter((r) => !r.pp && r.d === v.day && !v.state.handed[`${r.s.skuId}:${r.d}`]).reduce((a, r) => a + r.s.orders, 0);
  const week = v.run.days.filter((x) => x.day > v.day - 7 && x.day <= v.day);
  return (
    <>
      <ScreenNudges v={v} route="/app/orders" />
      {v.day < C.LAUNCH_LIVE_DAYS.value.min ? (
        <Card>
          <p className="text-sm">No orders yet. You go live on {dateLabel(C.LAUNCH_LIVE_DAYS.value.min)}.</p>
        </Card>
      ) : (
        <Card tone={pending > 0 ? 'orange' : 'white'}>
          <div className="flex items-center justify-between">
            <H2>
              {v.t.pickupWindow} · {C.VALMO_PICKUP_WINDOW.value}
            </H2>
            <Chip kind="existing">Valmo</Chip>
          </div>
          <p className="text-sm" data-testid="pickup-pending">
            {pending > 0 ? `${pending} parcels to hand over today.` : 'Nothing waiting for pickup.'} Hand over by {C.DISPATCH_HANDOVER_CUTOFF.value} the day after the order, or it
            auto-cancels.
          </p>
        </Card>
      )}
      {rows.map(({ d, s, pp }) => {
        const key = `${s.skuId}:${d}`;
        const packed = !!v.state.packed[key];
        const handed = !!v.state.handed[key] || (!pp && d < v.day && !v.state.notReady[key]);
        const spec = specById(v, s.skuId);
        const status = pp ? 'Packed and shipped by the Pack Point' : handed ? 'Handed over to Valmo' : packed ? 'Packed · waiting for pickup' : 'To pack';
        return (
          <Card key={key}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {num(s.orders)} × {spec?.name ?? s.skuId}
                </div>
                <div className="text-xs text-grey">
                  Ordered {dateLabel(d)} · {num(s.cod)} COD, {num(s.prepaid)} prepaid
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${handed || pp ? 'bg-good/15 text-good' : packed ? 'bg-blush text-plum' : 'bg-orange-soft text-ink'}`} data-testid="order-status">
                {status}
              </span>
            </div>
            {!pp && (
              <>
                <div className="mt-1 text-xs">
                  {v.t.dispatchBy}: <b>{C.DISPATCH_HANDOVER_CUTOFF.value}, {dateLabel(d + 1)}</b>
                  {d === v.day ? ` (within ${C.DISPATCH_SLA_HOURS.value.max} h)` : ''}
                </div>
                <ul className="mt-1 flex flex-wrap gap-1 text-xs text-grey">
                  {Array.from({ length: Math.min(s.orders, 6) }, (_, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => setLabel(orderId(s.skuId, d, i))} className="inline-flex items-center gap-0.5 rounded border border-line px-1.5 py-0.5 hover:border-magenta">
                        <FileText size={12} aria-hidden /> {orderId(s.skuId, d, i)}
                      </button>
                    </li>
                  ))}
                  {s.orders > 6 && <li>+{s.orders - 6} more</li>}
                </ul>
                {!handed && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Btn kind={packed ? 'secondary' : 'do'} onClick={() => mark('packed', s.skuId, d)} disabled={packed} testId="btn-packed">
                      {packed ? `✓ ${v.t.packedBtn}` : v.t.packedBtn}
                    </Btn>
                    <Btn onClick={() => mark('handed', s.skuId, d)} testId="btn-handed">
                      {v.t.handedOver}
                    </Btn>
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}
      {label && (
        <Card tone="blush">
          <div className="flex items-center justify-between">
            <H2>
              {v.t.labelPdf} · {label}
            </H2>
            <Chip kind="simulated" />
          </div>
          <div className="mt-2 rounded border-2 border-dashed border-ink/40 bg-white p-2 font-mono text-xs">
            <div>VALMO · {label}</div>
            <div>FROM: {v.persona.business}, {v.persona.city}</div>
            <div>TO: Buyer (masked) · PIN ••••••</div>
            <div className="mt-1 tracking-[0.3em]">║▌║█║▌│║▌║▌█</div>
          </div>
          <button type="button" onClick={() => setLabel(null)} className="mt-1 text-sm text-plum underline">
            Close
          </button>
        </Card>
      )}
      {v.day >= C.LAUNCH_LIVE_DAYS.value.min && (
        <Card>
          <H2>Last 7 days</H2>
          <Row k="Orders" v={num(week.reduce((a, x) => a + x.orders, 0))} />
          <Row k="Delivered" v={num(week.reduce((a, x) => a + x.delivered, 0))} />
          <Row k="Refused at the door (RTO)" v={num(week.reduce((a, x) => a + x.rto, 0))} />
        </Card>
      )}
    </>
  );
}

const REASON: Record<ReturnReason, string> = {
  product: 'Defect or damage',
  expectation: 'Looks different from the photo',
  size: 'Wrong size',
  swap: 'Different item sent back',
};

function ReturnsTab({ v, highlight }: { v: AccountView; highlight: string | null }) {
  const from = v.day - C.RETURN_WINDOW_DAYS.value * 2;
  const items = v.run.days
    .filter((d) => d.day <= v.day + 1 && d.day > from)
    .flatMap((d) =>
      d.skus.flatMap((s) => {
        const soon = d.day > v.day ? 'Arriving tomorrow: ' : '';
        const pp = fulfilmentOf(v.run, s.skuId) === 'packPoint';
        const spec = specById(v, s.skuId);
        const out: { key: string; day: number; sku: string; what: string; reason: string; pays: string; next: string; tone: 'good' | 'warn' | 'bad' }[] = [];
        if (s.rtoArrived > 0)
          out.push({ key: `${s.skuId}:${d.day}:rto`, day: d.day, sku: s.skuId, what: `${soon}${s.rtoArrived} RTO (refused at the door)`, reason: 'COD refused', pays: 'No charge: dispatched on time', next: pp ? 'Back to the node, restocked' : 'Back to you: check and restock', tone: 'good' });
        const caught = v.run.events.filter((e) => e.kind === 'swapCaught' && e.skuId === s.skuId && e.day === d.day).length;
        if (caught > 0)
          out.push({ key: `${s.skuId}:${d.day}:caught`, day: d.day, sku: s.skuId, what: `${caught} return${caught > 1 ? 's' : ''} lighter than dispatch`, reason: REASON.swap, pays: 'Caught by weight at the node: claim denied to the buyer', next: 'Nothing for you to do', tone: 'bad' });
        for (const r of Object.keys(s.returnsArrived) as ReturnReason[]) {
          const n = s.returnsArrived[r];
          if (n <= 0) continue;
          out.push({
            key: `${s.skuId}:${d.day}:${r}`,
            day: d.day,
            sku: s.skuId,
            what: `${soon}${n} customer return${n > 1 ? 's' : ''}`,
            reason: REASON[r],
            pays: r === 'swap' ? (pp ? 'Caught by weight at the node: claim denied to the buyer' : 'File a claim with your unboxing video') : `You: return fee ${inr(spec?.returnFee ?? 0)} each (by weight and zone)`,
            next: pp ? 'Graded at the node (A resell, B repack, C write-off)' : r === 'swap' ? 'Claim recovers about half' : 'Back to you: grade and restock',
            tone: r === 'swap' ? 'bad' : 'warn',
          });
        }
        return out;
      }),
    )
    .reverse();
  return (
    <>
      <ScreenNudges v={v} route="/app/orders" />
      {items.length === 0 && (
        <Card>
          <p className="text-sm text-grey">No returns in the last {C.RETURN_WINDOW_DAYS.value * 2} days.</p>
        </Card>
      )}
      {items.map((it) => {
        const hl = highlight !== null && it.key.startsWith(`${highlight}:`);
        return (
          <Card key={it.key} className={hl ? 'ring-2 ring-magenta' : ''}>
            <div className="flex items-start justify-between gap-2" data-testid={hl ? 'return-highlight' : undefined}>
              <div>
                <div className="font-semibold">{it.what}</div>
                <div className="text-xs text-grey">
                  {specById(v, it.sku)?.name} · {dayLabel(it.day)} ({dateLabel(it.day)})
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${it.tone === 'good' ? 'bg-good/15 text-good' : it.tone === 'bad' ? 'bg-bad/15 text-bad' : 'bg-warn/20 text-ink'}`}>{it.reason}</span>
            </div>
            <Row k={v.t.whoPays} v={it.pays} />
            <Caption>{it.next}</Caption>
          </Card>
        );
      })}
    </>
  );
}

/** Orders (self-ship flow) and returns. */
export default function Orders() {
  const v = useV();
  const [params] = useSearchParams();
  const tab = params.get('tab') === 'returns' ? 'returns' : 'orders';
  const ret = params.get('ret');
  return (
    <Screen title={tab === 'returns' ? v.t.returnsTitle : v.t.ordersTitle}>
      <div className="flex gap-2" role="tablist">
        <Go to="/app/orders" className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === 'orders' ? 'bg-plum text-white' : 'border border-plum bg-white text-plum'}`}>
          {v.t.ordersTitle}
        </Go>
        <Go to="/app/orders?tab=returns" className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === 'returns' ? 'bg-plum text-white' : 'border border-plum bg-white text-plum'}`}>
          {v.t.returnsTab}
        </Go>
        <Go to="/app/packpoint" className="ml-auto rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold text-plum">
          {v.t.packPointTitle}
        </Go>
      </div>
      {tab === 'orders' ? <OrdersTab v={v} /> : <ReturnsTab v={v} highlight={ret} />}
    </Screen>
  );
}
