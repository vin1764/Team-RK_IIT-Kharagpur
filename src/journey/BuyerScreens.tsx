import { useState } from 'react';
import { Star } from 'lucide-react';
import { BUYER_COPY } from '../data/copy';
import { C } from '../data/constants';
import { listPrice } from '../engine/formulas';
import { generateBuyers } from '../data/generate/buyers';
import { inr, dayLabel } from '../lib/format';
import { useJourney } from './ctx';
import { ProductArt } from './parts';

/** Buyer-facing screens. Compliant copy only: no price superlatives, no countdowns, no strike-throughs, no factory badge. */
export function BuyerScreen() {
  const j = useJourney();
  const live = C.LAUNCH_LIVE_DAYS.value.min;
  if (j.chapter < 7) return <Search showOurs={false} note={`Few listings in stock for this item today. (New listings go live ${dayLabel(live)}.)`} />;
  if (j.chapter === 7) return <LaunchFlow />;
  if (j.chapter === 8) return <ReturnFlow />;
  if (j.chapter === 9) return <Delivered />;
  if (j.chapter === 10) return <ProductPage highlight />;
  if (j.chapter === 12) return <SecondProduct />;
  return <ProductPage />;
}

function Search({ showOurs, note }: { showOurs: boolean; note?: string }) {
  const j = useJourney();
  const rows = j.r.bTables[`${j.sku.id}#0`]!.filter((r) => r.sameSpec && r.aboveQualityFloor && r.sellerId !== 'maker').slice(0, 3);
  return (
    <div className="space-y-2">
      <div className="text-sm text-grey">Results for “{j.sku.productType.split(' · ')[0]!.toLowerCase()}”</div>
      {showOurs && <Card title={j.sku.name} price={j.price} tag={BUYER_COPY.madeBy} type={j.sku.productType} />}
      {rows.map((r, i) => (
        <Card key={r.sellerId} title={`${j.sku.productType.split(' · ')[0]} (seller ${i + 1})`} price={r.pricePerUnit} tag={i === 0 ? 'Low stock' : 'Out of stock'} muted type={j.sku.productType} />
      ))}
      {note && <p className="text-sm text-grey">{note}</p>}
    </div>
  );
}

function Card({ title, price, tag, muted = false, type }: { title: string; price: number; tag: string; muted?: boolean; type: string }) {
  return (
    <div className={`flex gap-3 rounded-xl border border-line bg-white p-2 ${muted ? 'opacity-70' : ''}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-blush">
        <ProductArt type={type} className="h-16" />
      </div>
      <div>
        <div className="text-base">{title}</div>
        <div className="text-xl font-bold">{inr(price)}</div>
        <div className="text-xs text-grey">{tag}</div>
      </div>
    </div>
  );
}

function LaunchFlow() {
  const j = useJourney();
  const [step, setStep] = useState(0);
  const [pay, setPay] = useState<'cod' | 'prepaid'>('cod');
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {['Home', 'Product', 'Checkout'].map((x, i) => (
          <button key={x} type="button" onClick={() => setStep(i)} className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${step === i ? 'bg-pink text-white' : 'bg-blush text-pink'}`}>
            {x}
          </button>
        ))}
      </div>
      {step === 0 && (
        <>
          <div className="rounded-xl bg-plum p-3 text-white">
            <div className="text-lg font-semibold">{BUYER_COPY.launchSection}</div>
            <div className="text-sm opacity-90">New items, made by the factory</div>
          </div>
          <button type="button" className="block w-full text-left" onClick={() => setStep(1)}>
            <Card title={j.sku.name} price={j.price} tag={BUYER_COPY.pricePosition} type={j.sku.productType} />
          </button>
        </>
      )}
      {step === 1 && (
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex h-40 items-center justify-center rounded-lg bg-blush">
            <ProductArt type={j.sku.productType} className="h-32" />
          </div>
          <div className="mt-2 text-lg">{j.sku.name}</div>
          <div className="text-2xl font-bold">{inr(j.price)}</div>
          <div className="text-sm text-good">{BUYER_COPY.pricePosition}</div>
          <div className="text-sm text-grey">{BUYER_COPY.madeBy} · {BUYER_COPY.cod}</div>
          <button type="button" onClick={() => setStep(2)} className="mt-3 w-full rounded-xl bg-pink py-2 text-lg font-semibold text-white">
            Buy now
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-2 rounded-xl border border-line bg-white p-3">
          <div className="text-lg font-semibold">Payment</div>
          {(
            [
              ['cod', 'Cash on delivery'],
              ['prepaid', 'Pay online (UPI)'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setPay(k)} className={`w-full rounded-lg border-2 px-3 py-2 text-left text-base ${pay === k ? 'border-pink bg-blush' : 'border-line'}`}>
              {label}
            </button>
          ))}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{inr(j.price)}</span>
          </div>
          <button type="button" className="w-full rounded-xl bg-pink py-2 text-lg font-semibold text-white">
            Place order
          </button>
        </div>
      )}
    </div>
  );
}

function ReturnFlow() {
  const j = useJourney();
  const [reason, setReason] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">Return {j.sku.name}</div>
      <p className="text-sm text-grey">Within {C.RETURN_WINDOW_DAYS.value} days of delivery.</p>
      {['Different from the photo', 'Damaged or defective', 'Size or capacity not as expected', 'Changed my mind'].map((r) => (
        <button key={r} type="button" onClick={() => setReason(r)} className={`w-full rounded-lg border-2 px-3 py-2 text-left text-base ${reason === r ? 'border-pink bg-blush' : 'border-line'}`}>
          {r}
        </button>
      ))}
      {reason && <p className="rounded-lg bg-cream p-2 text-sm">Pickup scheduled. The item is checked when it comes back; refund follows.</p>}
    </div>
  );
}

function Delivered() {
  const j = useJourney();
  const buyer = generateBuyers(j.r.options.seed, j.r.districts, 1)[0]!;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-good/10 p-3 text-base">
        <div className="font-semibold text-good">Delivered</div>
        {buyer.name}, {buyer.district}
      </div>
      <Card title={j.sku.name} price={j.price} tag={BUYER_COPY.madeBy} type={j.sku.productType} />
      <div className="rounded-xl border border-line bg-white p-3">
        <div className="text-base">How was it?</div>
        <div className="mt-1 flex gap-1 text-orange">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={28} fill="currentColor" aria-hidden />
          ))}
        </div>
        <p className="mt-1 text-xs text-grey">Launch ratings are down-weighted; quality is judged on returns.</p>
      </div>
    </div>
  );
}

function ProductPage({ highlight = false }: { highlight?: boolean }) {
  const j = useJourney();
  const nudge = j.r.events.find((e) => e.kind === 'coachNudge' && e.day <= j.day);
  const trigger = String(nudge?.data?.trigger ?? '');
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-line bg-white p-3">
        <div className={`relative flex h-44 items-center justify-center rounded-lg ${highlight && trigger === 'weakListing' ? 'bg-white ring-2 ring-good' : 'bg-blush'}`}>
          <ProductArt type={j.sku.productType} className="h-36" />
          {highlight && (trigger === 'weakListing' || trigger === 'listingFix') && (
            <span className="absolute bottom-1 right-1 rounded bg-good px-1.5 py-0.5 text-xs text-white">{trigger === 'weakListing' ? 'New photo' : 'With scale photo'}</span>
          )}
        </div>
        <div className="mt-2 text-lg">{j.sku.name}</div>
        <div className="text-2xl font-bold">{inr(j.skuDay.price)}</div>
        <div className="text-sm text-good">{BUYER_COPY.pricePosition}</div>
        <div className="text-sm text-grey">{BUYER_COPY.madeBy}</div>
      </div>
      {highlight && trigger === 'refusals' && (
        <div className="rounded-xl border-2 border-pink bg-blush p-3 text-base">
          Pay online now and get it by <strong>{dayLabel(j.day + C.SIM_DELIVERY_DAYS.value)}</strong>. Cash on delivery also available.
        </div>
      )}
      {highlight && trigger === 'weakListing' && (
        <p className="text-sm text-grey">
          Click-through: {j.sku.ctrPct}% → {String(j.dayState(Math.max(j.day, (nudge?.day ?? j.day) + 1)).skus.find((s) => s.skuId === j.sku.id)?.ctrPct ?? j.skuDay.ctrPct)}% after the photo fix.
        </p>
      )}
    </div>
  );
}

function SecondProduct() {
  const j = useJourney();
  const sw = j.r.events.find((e) => e.kind === 'switchLive');
  const opt = sw && j.r.persona.switchOptions.find((o) => o.id === sw.skuId);
  if (!opt || j.day < sw!.day) return <ProductPage />;
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-plum p-2 text-sm text-white">New from this maker</div>
      <Card title={opt.name} price={listPrice(opt.stack, opt.margin)} tag={BUYER_COPY.pricePosition} type={opt.productType} />
      <Card title={j.sku.name} price={j.skuDay.price} tag={BUYER_COPY.madeBy} type={j.sku.productType} />
    </div>
  );
}
