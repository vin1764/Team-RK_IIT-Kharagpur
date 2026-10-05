import { useState } from 'react';
import { Check, Lock, MessageCircle, Package, Truck } from 'lucide-react';
import { C } from '../data/constants';
import { costCheck, channelTakeHome, expectedDailyPerSku, firstLot, listPrice, packPointRecommended, payoutDay, savingPerOrder, takeHome } from '../engine/formulas';
import { useMakerStrings } from '../components/MakerPhone';
import { Chip } from '../components/Chip';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { useJourney } from './ctx';
import { BandBar, KV, PhoneCard, ProductArt } from './parts';
import type { MakerStrings } from '../i18n/en';

export function MakerScreen() {
  const j = useJourney();
  const t = useMakerStrings();
  switch (j.chapter) {
    case 0:
      return <Idle />;
    case 1:
      return <Teaser t={t} />;
    case 2:
      return <CostCheck t={t} />;
    case 3:
      return <SignUp t={t} />;
    case 4:
      return <ListingBot t={t} />;
    case 5:
      return <Fulfilment t={t} />;
    case 6:
      return <OrderBook t={t} />;
    case 7:
      return <LiveOrders t={t} />;
    case 8:
      return <Returns t={t} />;
    case 9:
      return <Results t={t} />;
    case 10:
      return <RestockCoach t={t} />;
    case 11:
      return <PriceAlert t={t} />;
    case 12:
      return <MakeToDemand t={t} />;
    default:
      return <Earnings t={t} />;
  }
}

function Idle() {
  const j = useJourney();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-grey">
      <Lock size={40} aria-hidden />
      <p className="text-lg">{j.p.name.split(' ')[0]} hasn’t heard from Meesho yet.</p>
      <p className="text-base">The demand engine is finding the gap first.</p>
    </div>
  );
}

function Teaser({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const s = j.sku;
  const dMin = expectedDailyPerSku(s.openGapWeek.min, s.likelyShare);
  const dMax = expectedDailyPerSku(s.openGapWeek.max, s.likelyShare);
  const lead =
    j.p.id === 'ayesha'
      ? `Same factory price, different fee stack: see your take-home on Meesho next to Amazon.`
      : j.p.winBack
        ? `Your old listing had ${num(j.p.winBack.views)} views but only ${j.p.winBack.clicks} clicks. We know why, and the fix.`
        : `Buyers near you search for “${s.productType}” but few listings are in stock.`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-grey">
        <MessageCircle size={16} aria-hidden /> WhatsApp · after opt-in on an IndiaMART enquiry
      </div>
      <PhoneCard tone="blush">
        <div className="text-sm font-semibold text-magenta">Meesho Supplier team</div>
        <p className="mt-1 text-lg">{lead}</p>
        <p className="mt-2 text-lg">
          {t.teaser}: <strong>{Math.round(dMin)}–{Math.round(dMax)} orders/day</strong> at or below {inr(j.B)}.
        </p>
        <p className="mt-1 text-sm italic text-grey">{t.forecast}.</p>
      </PhoneCard>
      <button type="button" className="w-full rounded-xl bg-orange py-3 text-lg font-semibold text-ink">
        {t.openCostCheck}
      </button>
    </div>
  );
}

function CostCheck({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const [making, setMaking] = useState(j.sku.stack.makingCost);
  const [margin, setMargin] = useState(j.sku.margin);
  const stack = { ...j.sku.stack, makingCost: making };
  const c = costCheck(stack, margin, j.B, j.sku.gstRatePct);
  const label = { pass: 'Pass: in band', nearMiss: `Near miss: keep margin ≤ ${inr(c.maxMargin)}`, notFit: 'Not a fit at this cost: try another product' }[c.verdict];
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.costCheck}</h2>
      <label className="block text-base">
        {t.makingCost}
        <input type="number" value={making} onChange={(e) => setMaking(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border-2 border-orange px-3 py-2 text-xl" />
      </label>
      <label className="block text-base">
        {t.margin}
        <input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border-2 border-orange px-3 py-2 text-xl" />
      </label>
      <p className="text-sm text-grey">Packaging, shipping & fee, returns buffer and GST are pre-filled for “{j.sku.productType}”.</p>
      <PhoneCard>
        <KV k={t.breakEven} v={inr(c.breakEven)} />
        <KV k={t.listPrice} v={inr(c.price)} />
        <KV k={t.takeHome} v={inr(c.takeHome)} strong />
        <BandBar breakEven={c.breakEven} B={j.B} price={c.price} />
        <div className={`mt-4 rounded-lg px-3 py-2 text-center text-base font-semibold ${c.verdict === 'pass' ? 'bg-good text-white' : c.verdict === 'nearMiss' ? 'bg-warn text-ink' : 'bg-bad text-white'}`}>{label}</div>
      </PhoneCard>
      {j.p.id === 'ayesha' && <AmazonCompare price={c.price} />}
    </div>
  );
}

function AmazonCompare({ price }: { price: number }) {
  const j = useJourney();
  const c = channelTakeHome(price, C.AYESHA_AMAZON_PRICE.value, j.sku.stack);
  return (
    <PhoneCard tone="blush">
      <div className="text-sm font-semibold">Take-home per unit</div>
      <KV k="Meesho" v={<span className="text-good">{inr(c.meesho)}</span>} />
      <KV k={`Amazon at ${inr(C.AYESHA_AMAZON_PRICE.value)}`} v={inr(c.amazon)} />
    </PhoneCard>
  );
}

function SignUp({ t }: { t: MakerStrings }) {
  const [sel, setSel] = useState<'m' | 'w' | 'r'>('m');
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.sellerType}</h2>
      {(
        [
          ['m', t.manufacturer],
          ['w', t.wholesaler],
          ['r', t.reseller],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => setSel(k)}
          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg ${sel === k ? 'border-orange bg-orange-soft' : 'border-line'}`}
        >
          <span className={`h-5 w-5 rounded-full border-2 ${sel === k ? 'border-orange bg-orange' : 'border-grey'}`} />
          {label}
        </button>
      ))}
      <p className="text-sm text-grey">That’s the only question. GST “nature of business” and Udyam activity are checked automatically.</p>
    </div>
  );
}

function ListingBot({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const s = j.sku;
  const [step, setStep] = useState(0);
  const [margin, setMargin] = useState(s.margin);
  const price = listPrice(s.stack, margin, s.gstRatePct);
  const keep = takeHome(price, s.stack, s.gstRatePct);
  const lot = firstLot({ min: expectedDailyPerSku(s.openGapWeek.min, s.likelyShare), max: expectedDailyPerSku(s.openGapWeek.max, s.likelyShare) }, s.minRun);
  const blocked = price > j.B ? `Price ${inr(price)} is above B ${inr(j.B)}. Lower your margin to ${inr(costCheck(s.stack, margin, j.B, s.gstRatePct).maxMargin)} or less.` : price < j.breakEven ? 'Price is below break-even.' : null;
  const tabs = [t.product, t.quantity, t.price];
  return (
    <div className="space-y-3">
      <div className="flex gap-1" role="tablist">
        {tabs.map((x, i) => (
          <button key={x} type="button" role="tab" aria-selected={step === i} onClick={() => setStep(i)} className={`flex-1 rounded-lg py-2 text-base font-semibold ${step === i ? 'bg-magenta text-white' : 'bg-blush text-magenta'}`}>
            {i + 1}. {x}
          </button>
        ))}
      </div>
      <Chip kind="simulated">Simulated AI listing bot</Chip>
      {step === 0 && (
        <PhoneCard>
          <div className="flex justify-center rounded-xl bg-blush py-3">
            <ProductArt type={s.productType} className="h-28" />
          </div>
          <p className="mt-2 text-sm text-magenta">Recognised: {s.productType}. Is this right?</p>
          <p className="mt-1 text-lg font-semibold">{s.name}</p>
          <p className="text-sm text-grey">Title from top searches; images cleaned; attributes pre-filled.</p>
          <button type="button" onClick={() => setStep(1)} className="mt-3 w-full rounded-xl bg-orange py-2 text-lg font-semibold">
            Yes, that’s it
          </button>
        </PhoneCard>
      )}
      {step === 1 && (
        <PhoneCard>
          <KV k="Expected orders/day" v={`${Math.round(expectedDailyPerSku(s.openGapWeek.min, s.likelyShare))}–${Math.round(expectedDailyPerSku(s.openGapWeek.max, s.likelyShare))}`} />
          <KV k="Likely share" v={pctText(s.likelyShare * 100)} />
          <KV k="Minimum run · lead time" v={`${s.minRun} · ${s.leadTimeDays} days`} />
          <KV k={`Suggested first lot (≈${C.FIRST_LOT_DAYS.value} days)`} v={`${lot.suggested} units`} strong />
          <p className="mt-1 text-sm text-grey">
            Range {lot.low}–{lot.high}. {t.forecast}.
          </p>
          <button type="button" onClick={() => setStep(2)} className="mt-3 w-full rounded-xl bg-orange py-2 text-lg font-semibold">
            {t.nextStep}
          </button>
        </PhoneCard>
      )}
      {step === 2 && (
        <PhoneCard>
          <KV k={t.makingCost} v={inr(s.stack.makingCost)} />
          <label className="flex items-center justify-between gap-2 text-base">
            <span className="text-grey">{t.margin}</span>
            <input aria-label="Margin" type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} className="w-24 rounded-lg border-2 border-orange px-2 py-1 text-right text-lg font-semibold" />
          </label>
          <KV k="Packaging · shipping & fee" v={`${inr(s.stack.packaging)} · ${inr(s.stack.shippingAndFee)}`} />
          <KV k="Returns buffer · GST" v={`${inr(s.stack.returnsBuffer)} · ${pctText(s.gstRatePct ?? C.GST_RATE_PCT.value)}`} />
          <KV k={t.listPrice} v={inr(price)} strong />
          <KV k={t.takeHome} v={<span className={keep > 0 ? 'text-good' : 'text-bad'}>{inr(keep)}</span>} />
          <BandBar breakEven={j.breakEven} B={j.B} price={price} />
          <p className="mt-4 text-sm text-grey">Fees locked at dispatch.</p>
          {blocked ? (
            <div className="mt-2 rounded-xl bg-bad/10 p-3 text-base text-bad" role="alert">
              <strong>{t.blocked}.</strong> {blocked}
            </div>
          ) : (
            <button type="button" className="mt-2 w-full rounded-xl bg-orange py-2 text-lg font-semibold">
              {t.goLive}
            </button>
          )}
        </PhoneCard>
      )}
    </div>
  );
}

function Fulfilment({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const rec = packPointRecommended(j.price);
  const self = savingPerOrder(j.price, 'selfShip');
  const pp = savingPerOrder(j.price, 'packPoint');
  const alt = j.p.switchOptions.find((s) => packPointRecommended(listPrice(s.stack, s.margin)));
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.fulfilment}</h2>
      {[
        { k: 'self', title: t.selfShip, icon: <Truck aria-hidden />, saving: self.saving, recd: !rec, tag: 'existing' as const },
        { k: 'pp', title: t.packPoint, icon: <Package aria-hidden />, saving: pp.saving, recd: rec, tag: 'partner' as const },
      ].map((o) => (
        <PhoneCard key={o.k} tone={o.recd ? 'orange' : 'white'}>
          <div className="flex items-center gap-2 text-lg font-semibold">
            {o.icon} {o.title}
            {o.recd && <span className="ml-auto rounded-full bg-orange px-2 py-0.5 text-xs">{t.recommended}</span>}
          </div>
          <p className="text-sm text-grey">Saving you can pass on per order: {inr(o.saving)}</p>
          <div className="mt-1">
            <Chip kind={o.tag} />
          </div>
        </PhoneCard>
      ))}
      <p className="text-base">
        At {inr(j.price)}{' '}
        {rec
          ? 'the Pack Point is worth it.'
          : `the Pack Point fee eats most of your saving: self-ship this one${alt ? `, and use the Pack Point for your ${alt.name} (${inr(listPrice(alt.stack, alt.margin))})` : ''}.`}
      </p>
    </div>
  );
}

function OrderBook({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const s = j.sku;
  const live = C.LAUNCH_LIVE_DAYS.value;
  const lot = j.first('listingBot')?.data?.lot ?? '—';
  const stockIn = j.day >= C.LAUNCH_STOCK_IN_DAY.value;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.orderBook}</h2>
      <PhoneCard>
        <KV k="Product type" v={s.productType} />
        <KV k="Price cap (B)" v={inr(j.B)} />
        <KV k="Expected" v={`${Math.round(expectedDailyPerSku(s.openGapWeek.min, s.likelyShare))}–${Math.round(expectedDailyPerSku(s.openGapWeek.max, s.likelyShare))}/day`} />
        <KV k="Commit by · stock in · live" v={`D${C.LAUNCH_COMMIT_BY_DAY.value} · D${C.LAUNCH_STOCK_IN_DAY.value} · D${live.min}–${live.max}`} />
        <p className="mt-1 text-sm italic text-grey">{t.forecast}.</p>
      </PhoneCard>
      <h3 className="text-lg font-semibold">{t.stockReady}</h3>
      {[
        [`Committed ${lot} units at ${inr(j.price)}`, j.day >= C.LAUNCH_COMMIT_BY_DAY.value],
        ['Catalogue built by the bot', true],
        ['Price locked', j.day >= C.LAUNCH_COMMIT_BY_DAY.value],
        ['Stock linked to the listing', stockIn],
      ].map(([label, done]) => (
        <div key={String(label)} className="flex items-center gap-2 text-base">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-good text-white' : 'border-2 border-line'}`}>{done && <Check size={14} />}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function LiveOrders({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const d = j.skuDay;
  const live = C.LAUNCH_LIVE_DAYS.value;
  const soFar = j.sumSku((s) => (s.skuId === j.sku.id ? s.orders : 0), live.min, j.day);
  return (
    <div className="space-y-3">
      <PhoneCard tone="plum">
        <div className="text-sm opacity-80">Factory Launch Week · {dayLabel(j.day)}</div>
        <div className="font-display text-5xl font-bold">{d.orders}</div>
        <div className="text-base">{t.liveOrders} · {soFar} since day {live.min}</div>
      </PhoneCard>
      <PhoneCard>
        <KV k={t.stockLeft} v={`${d.onHand} units`} />
        <KV k="COD · prepaid" v={`${d.cod} · ${d.prepaid}`} />
        <KV k={t.payoutOn} v={`${dayLabel(payoutDay(j.day + C.SIM_DELIVERY_DAYS.value))} for today’s orders`} />
        <p className="mt-1 text-sm text-grey">Paid {C.PAYMENT_CYCLE_DAYS.value} days after delivery; TCS {C.GST_TCS_PCT.value}% and TDS {C.INCOME_TAX_TDS_PCT.value}% are claimable credits.</p>
      </PhoneCard>
    </div>
  );
}

function Returns({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const from = C.CHAPTER_DAYS.value[8]!;
  const rows = j.r.days
    .filter((x) => x.day >= from && x.day <= j.day)
    .flatMap((x) => x.skus.filter((s) => s.skuId === j.sku.id).map((s) => ({ day: x.day, s })))
    .filter(({ s }) => s.rto > 0 || s.returnRequests > 0)
    .slice(-5)
    .reverse();
  const swapPP = j.sku.fulfilment === 'packPoint';
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">{t.returnsTitle}</h2>
      {rows.map(({ day, s }) => (
        <PhoneCard key={day} className="space-y-1 text-base">
          <div className="text-sm text-grey">{dayLabel(day)}</div>
          {s.rto > 0 && <div>{s.rto} RTO (buyer refused): no charge, dispatched on time; unit comes back.</div>}
          {s.returnsByReason.expectation + s.returnsByReason.size > 0 && <div>{s.returnsByReason.expectation + s.returnsByReason.size} return “not as expected”: return fee charged; unit restocked (grade A).</div>}
          {s.returnsByReason.product > 0 && <div>{s.returnsByReason.product} product return: return fee charged; unit graded C.</div>}
          {s.returnsByReason.swap > 0 && (
            <div>{s.returnsByReason.swap} swapped item: {swapPP ? 'caught by the weight check, you’re not charged.' : `claim filed; about ${pctText(C.CLAIM_RECOVERY_SHARE.value * 100)} recovered.`}</div>
          )}
        </PhoneCard>
      ))}
      {rows.length === 0 && <p className="text-base text-grey">No returns yet.</p>}
    </div>
  );
}

function Results({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const g = j.r.gates.g1;
  const ds = j.dayState(C.GATE_DAYS.value[0]!);
  const sold = j.sumSku((s) => s.orders - s.rto, C.LAUNCH_LIVE_DAYS.value.min, C.GATE_DAYS.value[0]!);
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.results}</h2>
      <PhoneCard>
        <KV k="Sold (net of RTO)" v={num(sold)} />
        <KV k="Paid out so far" v={inr(ds.money.payoutsCum)} />
        <KV k="Stock left" v={`${ds.onHand} units`} />
        <KV k="Take-home so far" v={inr(ds.money.takeHomeCum)} strong />
      </PhoneCard>
      <PhoneCard tone={g?.decision === 'Invest' ? 'orange' : 'blush'}>
        <div className="text-sm text-grey">Day-30 decision</div>
        <div className="text-2xl font-bold">{g?.decision}</div>
        <p className="text-sm">{g?.decision === 'Invest' ? 'You stay in the launch programme; your listing keeps its boost.' : g?.reason}</p>
      </PhoneCard>
    </div>
  );
}

function RestockCoach({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const [done, setDone] = useState(false);
  const r = j.first('restockPrompt', j.sku.id);
  const nudge = j.r.events.find((e) => e.kind === 'coachNudge' && e.day >= C.CHAPTER_DAYS.value[10]! && e.day < C.CHAPTER_DAYS.value[11]!);
  const hiText = nudge?.text.match(/Hindi nudge: “([^”]+)”/)?.[1];
  return (
    <div className="space-y-3">
      {r && j.day >= r.day && (
        <PhoneCard tone="orange">
          <div className="text-lg font-semibold">{t.restock}</div>
          <div className="text-sm text-grey">{dayLabel(r.day)}</div>
          <KV k="Selling" v={`${num(Number(r.data!.runRate), 1)}/day`} />
          <KV k="On hand → reorder at" v={`${r.data!.onHand} → ${r.data!.reorderPoint}`} />
          <KV k="Next batch" v={`${r.data!.batch} units`} strong />
          <button type="button" className="mt-2 w-full rounded-xl bg-orange py-2 text-lg font-semibold">
            {t.startBatch}
          </button>
        </PhoneCard>
      )}
      {nudge && j.day >= nudge.day && (
        <PhoneCard>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t.coach}</span>
            <Chip kind="simulated" />
          </div>
          {hiText && <p className="mt-1 text-xl font-semibold text-magenta">{hiText}</p>}
          <p className="text-sm text-grey">{nudge.text.replace(/^Coach: /, '').replace(/ Hindi nudge.*$/, '')}</p>
          <button type="button" onClick={() => setDone(true)} disabled={done} className="mt-2 w-full rounded-xl bg-orange py-2 text-lg font-semibold disabled:bg-good disabled:text-white">
            {done ? t.fixed : t.fixNow}
          </button>
        </PhoneCard>
      )}
    </div>
  );
}

function PriceAlert({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const b = j.r.events.find((e) => e.kind === 'bMoved' && e.skuId === j.sku.id);
  const shown = b && j.day >= b.day;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.priceAlert}</h2>
      <PhoneCard tone={shown ? 'orange' : 'white'}>
        {shown ? (
          <>
            <div className="text-lg font-semibold">Benchmark moved: {inr(Number(b!.data!.from))} → {inr(Number(b!.data!.to))}</div>
            <p className="text-base">{b!.data!.holds ? `Your ${inr(j.skuDay.price)} is still in band. No action needed; your price holds.` : 'Your price is above B. Re-price within 3 days to keep visibility.'}</p>
          </>
        ) : (
          <p className="text-base">B is steady at {inr(j.B)}; your {inr(j.skuDay.price)} holds.</p>
        )}
        <BandBar breakEven={j.breakEven} B={j.B} price={j.skuDay.price} />
      </PhoneCard>
    </div>
  );
}

function MakeToDemand({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const [built, setBuilt] = useState(false);
  const slow = j.r.events.find((e) => e.kind === 'slowSeller');
  const sw = j.r.events.find((e) => e.kind === 'switch');
  const kam = j.r.events.find((e) => e.kind === 'kamCase');
  if (slow && sw && j.day >= slow.day) {
    const option = j.r.persona.switchOptions.find((o) => o.id === sw.skuId)!;
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">{t.makeToDemand}</h2>
        <PhoneCard tone="blush">
          <div className="text-sm text-grey">{dayLabel(slow.day)} · Stop</div>
          <p className="text-base">{slow.text.replace(/ while the type is steady/, '')}</p>
        </PhoneCard>
        <PhoneCard tone="orange">
          <div className="flex items-center gap-3">
            <ProductArt type={option.productType} className="h-14" />
            <div>
              <div className="text-lg font-semibold">Make instead: {option.name}</div>
              <div className="text-sm text-grey">
                {Math.round((option.openGapWeek.min + option.openGapWeek.max) / 2)}/week unserved · same steel, same press · {inr(listPrice(option.stack, option.margin))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setBuilt(true)} className="mt-3 w-full rounded-xl bg-orange py-2 text-lg font-semibold">
            {built ? 'Second listing built ✓' : 'Build second listing (2 min)'}
          </button>
        </PhoneCard>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.makeToDemand}</h2>
      <PhoneCard tone="orange">
        <div className="text-lg font-semibold">Make more: {j.sku.name}</div>
        <p className="text-base">Selling {j.skuDay.orders} today, {j.skuDay.onHand} in stock. Keep making.</p>
      </PhoneCard>
      {kam && j.day >= kam.day && (
        <PhoneCard>
          <div className="text-sm text-grey">{dayLabel(kam.day)} · Meesho KAM call</div>
          <p className="text-base">{kam.text.replace('Fix failed twice → Meesho KAM steps in. ', '')}</p>
        </PhoneCard>
      )}
    </div>
  );
}

function Earnings({ t }: { t: MakerStrings }) {
  const j = useJourney();
  const k = j.r.kpis;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">{t.earnings}</h2>
      <PhoneCard tone="plum">
        <div className="text-sm opacity-80">Take-home</div>
        <div className="font-display text-5xl font-bold">{inr(k.takeHome)}</div>
        <div className="text-base">vs {inr(j.cf.kpis.takeHome)} without the programme</div>
      </PhoneCard>
      <PhoneCard>
        <KV k="Orders" v={num(k.totalOrders)} />
        <KV k="Paid out" v={inr(k.payoutsNet)} />
        <KV k="Tax credits to claim" v={inr(k.creditsClaimable)} />
        <KV k="Stock (still selling)" v={`${num(k.unitsLeft)} units`} />
      </PhoneCard>
    </div>
  );
}
