import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { C } from '../../data/constants';
import { demandConfidence } from '../../engine/formulas';
import { inr, num } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { ProductArt } from '../ProductArt';
import { demandFor, listingNumbers, useOnboard } from '../onboard';
import { allSpecs, specById } from '../stage';
import { Btn, Caption, Card, GoBtn, H2, Row, Screen, SimTag, useV } from '../ui';
import type { AccountView } from '../useAccount';
import type { SkuSpec } from '../../data/personas';
import AppNotFound from './AppNotFound';

type Step = 'product' | 'quantity' | 'price';
const STEPS: Step[] = ['product', 'quantity', 'price'];

function Steps({ v, step, sku }: { v: AccountView; step: Step; sku: string }) {
  return (
    <ol className="grid grid-cols-3 gap-1 text-center text-xs font-semibold" aria-label="Listing steps">
      {STEPS.map((s, i) => (
        <li key={s} className={`rounded-full py-1 ${s === step ? 'bg-magenta text-white' : STEPS.indexOf(step) > i ? 'bg-blush text-plum' : 'bg-white text-grey'}`} aria-current={s === step ? 'step' : undefined}>
          {i + 1}. {v.t[s]}
        </li>
      ))}
      <li className="sr-only">{sku}</li>
    </ol>
  );
}

function ProductStep({ v, spec }: { v: AccountView; spec: SkuSpec }) {
  // Make-to-demand products come pre-filled from the maker's existing photos and listing.
  const prefilled = !!v.state.onboarding.listed[spec.id] || !spec.inLaunch;
  const [photos, setPhotos] = useState(prefilled ? C.SAMPLE_PHOTOS.value.min : 0);
  const [type, setType] = useState(spec.productType);
  const [changing, setChanging] = useState(false);
  const [confirmed, setConfirmed] = useState(prefilled);
  const [title, setTitle] = useState(`${spec.name} | ${v.persona.business.split(' ').slice(0, 3).join(' ')}`);
  const [weight, setWeight] = useState(String(spec.weightGrams));
  const attrs = spec.productType.split('·').map((s) => s.trim());
  const ready = photos >= C.SAMPLE_PHOTOS.value.min && confirmed && title.trim().length > 0 && Number(weight) > 0;
  return (
    <>
      <Card>
        <H2>Add {C.SAMPLE_PHOTOS.value.min}–{C.SAMPLE_PHOTOS.value.max} photos</H2>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: photos }, (_, i) => (
            <ProductArt key={i} sku={spec.id} raw angle={i} size={64} />
          ))}
          {photos < C.SAMPLE_PHOTOS.value.max && (
            <button type="button" onClick={() => setPhotos(photos === 0 ? C.SAMPLE_PHOTOS.value.min : photos + 1)} className="h-16 w-16 rounded-lg border-2 border-dashed border-magenta text-xs font-semibold text-magenta" data-testid="add-photos">
              {photos === 0 ? `+ ${C.SAMPLE_PHOTOS.value.min} sample photos` : '+ 1'}
            </button>
          )}
        </div>
      </Card>
      {photos >= C.SAMPLE_PHOTOS.value.min && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <H2>We think this is</H2>
              <SimTag />
            </div>
            <div className="mt-1 text-lg font-semibold">{type}</div>
            {changing ? (
              <select value={type} onChange={(e) => { setType(e.target.value); setChanging(false); setConfirmed(true); }} className="mt-2 w-full rounded-lg border border-line px-2 py-2" aria-label="Product type">
                {allSpecs(v).map((s) => (
                  <option key={s.id}>{s.productType}</option>
                ))}
              </select>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Btn kind={confirmed ? 'secondary' : 'primary'} onClick={() => setConfirmed(true)} testId="confirm-type">
                  {confirmed ? `✓ ${v.t.confirm}` : v.t.confirm}
                </Btn>
                <Btn kind="secondary" onClick={() => setChanging(true)}>
                  {v.t.change}
                </Btn>
              </div>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <H2>
                {v.t.yourPhoto} → {v.t.cleaned}
              </H2>
              <SimTag />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <ProductArt sku={spec.id} raw size={88} />
              <span className="text-2xl text-grey">→</span>
              <ProductArt sku={spec.id} size={88} />
            </div>
            <Caption>White background, centred, with a scale object added.</Caption>
          </Card>
          <Card>
            <label className="block text-sm font-semibold" htmlFor="title">
              {v.t.titleLabel}
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {attrs.map((a, i) => (
                <label key={i} className="block">
                  <span className="text-xs text-grey">{i === 0 ? 'Type' : 'Size / spec'}</span>
                  <input defaultValue={a} className="w-full rounded-lg border border-line px-2 py-1.5" />
                </label>
              ))}
            </div>
            <label className="mt-2 block text-sm font-semibold" htmlFor="weight">
              {v.t.packedWeight} (g)
            </label>
            <input id="weight" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9]/g, ''))} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            <Caption>Shipping is charged by packed weight and zone.</Caption>
          </Card>
        </>
      )}
      {ready ? (
        <GoBtn to={`/app/list/${spec.id}/quantity`} next>
          {v.t.continueBtn}: {v.t.quantity}
        </GoBtn>
      ) : (
        <Caption>Add photos and confirm the product type to continue.</Caption>
      )}
    </>
  );
}

function QuantityStep({ v, spec }: { v: AccountView; spec: SkuSpec }) {
  const onboard = useOnboard(v);
  const d = demandFor(spec);
  const [minBatch, setMinBatch] = useState(String(spec.minRun));
  const [lead, setLead] = useState(String(spec.leadTimeDays));
  const minLot = Math.min(Number(minBatch) || spec.minRun, d.lot.low);
  const maxLot = Math.max(d.lot.high, minLot);
  const [lot, setLot] = useState(v.state.onboarding.lots[spec.id] ?? d.lot.suggested);
  const lotClamped = Math.min(maxLot, Math.max(minLot, lot));
  const confidence = demandConfidence(C.DEMAND_PAST_LAUNCHES.value);
  return (
    <>
      <Card tone="blush">
        <div className="flex items-center justify-between">
          <H2>Demand for your {spec.name}</H2>
          <SimTag />
        </div>
        <Row k="Open gap" v={`${num(d.gap.min)}–${num(d.gap.max)} / week`} />
        <Row k="Your likely share" v={`${Math.round(d.share * 100)}% (confidence: ${confidence})`} />
        <Row k={v.t.expectedOrders} v={`${num(d.daily.min, 1)}–${num(d.daily.max, 1)} a day`} strong />
        <Caption>
          {v.t.forecast}. Based on {C.DEMAND_PAST_LAUNCHES.value} past launches of this type.
        </Caption>
      </Card>
      <Card>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>
            <span className="text-xs text-grey">{v.t.minBatch}</span>
            <input inputMode="numeric" value={minBatch} onChange={(e) => setMinBatch(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-lg border border-line px-2 py-1.5" />
          </label>
          <label>
            <span className="text-xs text-grey">{v.t.leadTime}</span>
            <input inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-lg border border-line px-2 py-1.5" />
          </label>
        </div>
      </Card>
      <Card>
        <div className="flex items-baseline justify-between">
          <H2>{v.t.firstLot}</H2>
          <span className="font-display text-3xl font-bold text-plum" data-testid="first-lot">
            {num(lotClamped)}
          </span>
        </div>
        <input
          type="range"
          min={minLot}
          max={maxLot}
          step={C.LOT_ROUNDING_UNITS.value}
          value={lotClamped}
          onChange={(e) => setLot(Number(e.target.value))}
          className="w-full accent-magenta"
          aria-label={v.t.firstLot}
        />
        <div className="flex justify-between text-xs text-grey">
          <span>{num(minLot)}</span>
          <span>suggested {num(d.lot.suggested)}</span>
          <span>{num(maxLot)}</span>
        </div>
        <Row k={v.t.stockValue} v={inr(lotClamped * listingNumbers(v, spec, spec.margin).stack.makingCost)} />
        <Caption>{C.FIRST_LOT_DAYS.value} days of expected sales, never below your minimum batch.</Caption>
      </Card>
      <GoBtn to={`/app/list/${spec.id}/price`} next onClick={() => onboard((o) => ({ lots: { ...o.lots, [spec.id]: lotClamped } }))}>
        {v.t.continueBtn}: {v.t.price}
      </GoBtn>
    </>
  );
}

function PriceStep({ v, spec }: { v: AccountView; spec: SkuSpec }) {
  const onboard = useOnboard(v);
  const [margin, setMargin] = useState(v.state.onboarding.margins[spec.id] ?? spec.margin);
  const n = listingNumbers(v, spec, margin);
  const above = n.price > n.B;
  const below = n.price < n.be;
  const span = n.B * 1.15 - n.be * 0.9;
  const at = (x: number) => `${Math.max(0, Math.min(100, ((x - n.be * 0.9) / span) * 100))}%`;
  const lot = v.state.onboarding.lots[spec.id] ?? demandFor(spec).lot.suggested;
  const checks = [
    { ok: true, label: 'Photos and title' },
    { ok: lot > 0, label: `First lot: ${num(lot)} units` },
    { ok: !above && !below, label: 'Price inside the band' },
  ];
  return (
    <>
      <Card>
        <label className="block text-sm font-semibold" htmlFor="pmargin">
          {v.t.margin}: {inr(margin)}
        </label>
        <input id="pmargin" type="range" min={0} max={Math.max(spec.margin * 3, n.maxMargin + 10)} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-magenta" />
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-blush p-2">
            <div className="text-xs text-grey">{v.t.listPrice}</div>
            <div className="text-2xl font-bold text-plum" data-testid="price-list">
              {inr(n.price)}
            </div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="text-xs text-grey">{v.t.takeHome}</div>
            <div className="text-2xl font-bold text-ink" data-testid="price-keep">
              {inr(n.keep)}
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <H2>{v.t.priceVsBand}</H2>
        <div className="relative mt-5 h-3 rounded-full bg-line" aria-label={`Band ${inr(n.be)} to ${inr(n.B)}`}>
          <div className="absolute h-3 rounded-full bg-good/60" style={{ left: at(n.be), width: `calc(${at(n.B)} - ${at(n.be)})` }} />
          <div className={`absolute -top-1.5 h-6 w-1.5 rounded ${above || below ? 'bg-bad' : 'bg-magenta'}`} style={{ left: at(n.price) }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-grey">
          <span>
            {v.t.breakEven} {inr(n.be)}
          </span>
          <span>
            Cap B {inr(n.B)}
          </span>
        </div>
        {above && (
          <p className="mt-2 rounded-lg bg-bad/10 p-2 text-sm text-bad" data-testid="golive-blocked">
            <b>{v.t.blocked}:</b> {inr(n.price)} is above the cap {inr(n.B)}; buyers already get it cheaper. Lower your margin to {inr(n.maxMargin)} or less.
          </p>
        )}
        {below && <p className="mt-2 rounded-lg bg-bad/10 p-2 text-sm text-bad">Below break-even: you would lose money on every order.</p>}
        <p className="mt-2 text-xs text-grey">{v.t.feesLocked}: the shipping fee and the price you see are the ones applied when you dispatch.</p>
        <div className="mt-1">
          <Chip kind="existing">Existing Meesho fee rules</Chip>
        </div>
      </Card>
      <Card>
        <H2>{v.t.goLiveChecklist}</H2>
        <ul className="mt-1 space-y-1 text-sm">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'text-good' : 'text-bad'}>
              {c.ok ? '✓' : '✗'} <span className="text-ink">{c.label}</span>
            </li>
          ))}
          <li className="text-grey">○ Who packs it: next step</li>
        </ul>
      </Card>
      {above || below ? (
        <Btn disabled>{v.t.blocked}</Btn>
      ) : (
        <GoBtn
          to={`/app/list/${spec.id}/fulfilment`}
          next
          onClick={() => onboard((o) => ({ listed: { ...o.listed, [spec.id]: true }, margins: { ...o.margins, [spec.id]: margin }, lots: { ...o.lots, [spec.id]: lot } }))}
        >
          {v.t.continueBtn}: {v.t.fulfilment}
        </GoBtn>
      )}
    </>
  );
}

/** Listing bot: product → quantity → price, for one SKU. */
export default function List() {
  const v = useV();
  const { sku, step } = useParams();
  const spec = specById(v, sku);
  const s = (step ?? 'product') as Step;
  if (!spec || !STEPS.includes(s)) return <AppNotFound />;
  const back = s === 'product' ? (v.state.onboarding.signedUp ? '/app/today' : '/app/signup') : `/app/list/${spec.id}/${STEPS[STEPS.indexOf(s) - 1]}`;
  return (
    <Screen title={`${v.t.listingBot}: ${v.t[s]}`} back={{ to: back, label: v.t.back }} sub={spec.name}>
      <Steps v={v} step={s} sku={spec.id} />
      {s === 'product' && <ProductStep v={v} spec={spec} />}
      {s === 'quantity' && <QuantityStep v={v} spec={spec} />}
      {s === 'price' && <PriceStep v={v} spec={spec} />}
    </Screen>
  );
}
