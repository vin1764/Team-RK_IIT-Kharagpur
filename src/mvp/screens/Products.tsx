import { useParams } from 'react-router-dom';
import { Go } from '../../app/Go';
import { C } from '../../data/constants';
import type { SkuSpec } from '../../data/personas';
import { daysOfCover, reorderPoint } from '../../engine/formulas';
import { dateLabel } from '../../engine/nudges';
import { inr, num, pctText } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { ProductArt } from '../ProductArt';
import { runRateAt } from '../money';
import { listingNumbers } from '../onboard';
import { allSpecs, specById } from '../stage';
import { Caption, Card, GoBtn, H2, Row, Screen, ScreenNudges, useV } from '../ui';
import type { AccountView } from '../useAccount';
import AppNotFound from './AppNotFound';

type Status = 'makeMore' | 'keep' | 'fix' | 'stop' | 'launching';

const STATUS_STYLE: Record<Status, string> = {
  makeMore: 'bg-orange text-ink',
  keep: 'bg-good/15 text-good',
  fix: 'bg-warn/25 text-ink',
  stop: 'bg-bad/15 text-bad',
  launching: 'bg-blush text-plum',
};

/** Facts for one SKU on the current demo day. */
export function skuFacts(v: AccountView, spec: SkuSpec) {
  const sd = v.ds.skus.find((s) => s.skuId === spec.id);
  const rr = runRateAt(v, spec.id);
  const onHand = sd?.onHand ?? 0;
  const cover = daysOfCover(onHand, rr);
  const rop = reorderPoint(rr, spec.leadTimeDays, spec.safetyDays);
  const w = v.run.days.filter((d) => d.day > v.day - C.REFUSAL_WINDOW_DAYS.value && d.day <= v.day);
  const sum = (f: (x: NonNullable<typeof sd>) => number) => w.reduce((a, d) => a + (d.skus.find((s) => s.skuId === spec.id) ? f(d.skus.find((s) => s.skuId === spec.id)!) : 0), 0);
  const orders = sum((x) => x.orders);
  const delivered = sum((x) => x.delivered);
  const refusalPct = orders ? (100 * sum((x) => x.rto)) / orders : 0;
  const returnPct = delivered ? (100 * sum((x) => x.returnRequests)) / delivered : 0;
  const coachActive = v.active.some((n) => (n.type === 'coach_fix' || n.type === 'prepaid_nudge') && n.sku === spec.id);
  const restock = v.run.events.filter((e) => e.kind === 'restockPrompt' && e.skuId === spec.id && e.day <= v.day).at(-1);
  let status: Status = 'keep';
  if (sd?.stopped || v.state.actions[`stop_sku:${spec.id}`]) status = 'stop';
  else if (!sd?.live) status = 'launching';
  else if (coachActive) status = 'fix';
  else if (onHand <= rop) status = 'makeMore';
  return { sd, rr, onHand, cover, rop, refusalPct, returnPct, status, restock, orders14: orders };
}

/** Products: make more / keep / fix / stop, with days of cover; a stopped SKU gets a "make this instead" card. */
export function Products() {
  const v = useV();
  const label: Record<Status, string> = { makeMore: v.t.makeMore, keep: v.t.keep, fix: v.t.fix, stop: v.t.stop, launching: 'Launching' };
  const specs = allSpecs(v).filter((s) => v.ds.skus.some((x) => x.skuId === s.id && (x.live || x.stopped || x.onHand > 0)) || (s.inLaunch && v.state.onboarding.listed[s.id]));
  const switches = v.run.events.filter((e) => e.kind === 'switch' && e.day <= v.day);
  return (
    <Screen title={v.t.productsTitle}>
      <ScreenNudges v={v} route="/app/products" />
      {specs.length === 0 && (
        <Card>
          <p className="text-sm">No products listed yet.</p>
          <div className="mt-2">
            <GoBtn to="/app/today" kind="secondary">
              {v.t.continueSetup}
            </GoBtn>
          </div>
        </Card>
      )}
      {specs.map((s) => {
        const f = skuFacts(v, s);
        const n = listingNumbers(v, s, s.margin);
        return (
          <Go key={s.id} to={`/app/products/${s.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
            <ProductArt sku={s.id} size={52} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{s.name}</span>
              <span className="block text-xs text-grey">
                {inr(f.sd?.price ?? n.price)} · {num(f.onHand)} in stock · {f.cover === null ? 'no sales yet' : `${num(f.cover)} ${v.t.daysCover.toLowerCase()}`}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[f.status]}`} data-testid={`status-${s.id}`}>
              {label[f.status]}
            </span>
          </Go>
        );
      })}
      {switches.map((e) => {
        const s = specById(v, e.skuId);
        if (!s) return null;
        const listed = v.state.onboarding.listed[s.id] || v.ds.skus.some((x) => x.skuId === s.id && x.live);
        return (
          <Card key={e.skuId} tone="orange">
            <div className="flex items-center justify-between">
              <H2>{v.t.makeInstead}</H2>
              <Chip kind="simulated" />
            </div>
            <p className="mt-1 text-sm">
              <b>{s.name}</b>: {num(s.openGapWeek.min)}–{num(s.openGapWeek.max)} a week unserved, same material and machines. Cap {inr(s.bEpochs[0]!.B)}.
            </p>
            <div className="mt-2">
              {listed ? (
                <GoBtn to={`/app/products/${s.id}`} kind="secondary">
                  See {s.name}
                </GoBtn>
              ) : (
                <GoBtn to={`/app/list/${s.id}/product`} kind="do">
                  {v.t.listIt}
                </GoBtn>
              )}
            </div>
          </Card>
        );
      })}
      <GoBtn to="/app/coach" kind="secondary" next>
        {v.t.coachTitle}
      </GoBtn>
    </Screen>
  );
}

/** One product: price vs band, stock and days of cover, quality vs the type, next batch. */
export function ProductDetail() {
  const v = useV();
  const { sku } = useParams();
  const spec = specById(v, sku);
  if (!spec) return <AppNotFound />;
  const f = skuFacts(v, spec);
  const n = listingNumbers(v, spec, v.state.onboarding.margins[spec.id] ?? spec.margin);
  const price = f.sd?.price ?? n.price;
  const B = f.sd?.B ?? n.B;
  const prepaidOn = Object.entries(v.state.actions).some(([id, a]) => id.startsWith(`prepaid_nudge:${spec.id}`) && a.action === 'prepaid_on');
  const leftover = v.run.events.find((e) => e.kind === 'slowSeller' && e.skuId === spec.id && e.day <= v.day);
  return (
    <Screen title={spec.name} back={{ to: '/app/products', label: v.t.productsTitle }} sub={spec.productType}>
      <ScreenNudges v={v} route={`/app/products/${spec.id}`} sku={spec.id} />
      <Card>
        <H2>{v.t.priceVsBand}</H2>
        <Row k="Your price" v={<b>{inr(price)}</b>} />
        <Row k={`${v.t.priceCap} today`} v={inr(B)} />
        <Row k={v.t.breakEven} v={inr(n.be)} />
        <Row k={v.t.takeHome} v={inr(n.keep)} />
        <p className={`mt-1 text-sm font-semibold ${price <= B ? 'text-good' : 'text-bad'}`}>{price <= B ? '✓ Inside the band' : '✗ Above the cap: lower your price to keep your slot'}</p>
      </Card>
      <Card tone={f.status === 'makeMore' ? 'orange' : 'white'}>
        <H2>Stock</H2>
        <Row k={v.t.stockLeft} v={num(f.onHand)} />
        <Row k="Selling now" v={`${num(f.rr, 1)} a day`} />
        <Row k={v.t.daysCover} v={f.cover === null ? '—' : num(f.cover)} strong />
        <Row k="Make more when stock is at" v={`${num(f.rop)} (lead ${spec.leadTimeDays} + safety ${spec.safetyDays} days)`} />
        {f.restock && (
          <Row
            k="Last batch asked"
            v={`${num(Number(f.restock.data?.batch ?? 0))} units, start by ${dateLabel(Number(f.restock.data?.startDay ?? f.restock.day))}`}
          />
        )}
        <Caption>Batches are sized to {C.NEXT_BATCH_DAYS.value} days of sales, never below your minimum batch ({spec.minRun}).</Caption>
      </Card>
      <Card>
        <H2>Quality, last {C.REFUSAL_WINDOW_DAYS.value} days</H2>
        <Row k="Click rate" v={`${pctText(f.sd?.ctrPct ?? spec.ctrPct, 1)} (type median ${pctText(spec.typeCtr.median, 1)})`} />
        <Row k="Returns" v={`${pctText(f.returnPct)} (75th pct for the type ${pctText(spec.typeReturnP75Pct)})`} />
        <Row k="COD refusals" v={`${pctText(f.refusalPct)} (75th pct ${pctText(spec.typeRefusalP75Pct)})`} />
        <Row k="Prepaid offer" v={prepaidOn ? 'On' : 'Off'} />
      </Card>
      {leftover && (
        <Card tone="blush">
          <H2>Stopped</H2>
          <p className="text-sm">{num(Number(leftover.data?.unitsMoved ?? 0))} units left go back to your distributor channel at cost. Nothing is written off.</p>
        </Card>
      )}
      <GoBtn to="/app/coach" kind="secondary" next>
        {v.t.coachHistory}
      </GoBtn>
    </Screen>
  );
}
