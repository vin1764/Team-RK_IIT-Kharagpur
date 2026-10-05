import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Go } from '../app/Go';
import { Breadcrumbs } from '../app/Breadcrumbs';
import { page } from '../app/pages';
import { usePersonaRuns } from '../app/useSim';
import { C } from '../data/constants';
import { PERSONA_SPECS, personaById, type PersonaSpec } from '../data/personas';
import { Timeline, type TimelineMarker } from '../components/Timeline';
import { MakerPhone } from '../components/MakerPhone';
import { BuyerPhone } from '../components/BuyerPhone';
import { ImpactTracker } from '../components/ImpactTracker';
import { EventLog, type LogEvent } from '../components/EventLog';
import { AnswersPs, Chip } from '../components/Chip';
import { StagePill } from '../components/StagePill';
import { Num } from '../components/FormulaPopover';
import { useApp } from '../app/store';
import { inr, num, dayLabel } from '../lib/format';
import { annualise, daysOfCover } from '../engine/formulas';
import { CHAPTERS, chapterForDay, focusDay } from '../journey/chapters';
import { buildCtx, JourneyContext, type JourneyCtx } from '../journey/ctx';
import { MakerScreen } from '../journey/MakerScreens';
import { ControlPanel } from '../journey/ControlPanels';
import { BuyerScreen } from '../journey/BuyerScreens';
import { CompareChart } from '../journey/CompareChart';
import type { SimEvent, SimResult } from '../engine/simulate';
import NotFound from './NotFound';

type View = 'maker' | 'control' | 'buyer';

export default function Journey() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const p = personaById(id);
  if (!p) return <NotFound />;
  const ch = Number(params.get('ch') ?? 0);
  const start = Number.isInteger(ch) && ch >= 0 && ch < CHAPTERS.length ? ch : 0;
  return <JourneyFor key={`${p.id}-${start}`} p={p} startChapter={start} />;
}

/** Chapter 12 opens on this persona's own make-to-demand moment (switch or KAM), if it has one. */
function chapterDay(n: number, r: SimResult) {
  if (n === 12) {
    const from = C.CHAPTER_DAYS.value[12]!;
    const e = r.events.find((x) => (x.kind === 'switch' || x.kind === 'kamCase') && x.day >= from);
    if (e) return e.day;
  }
  return focusDay(n);
}

const ACTOR: Record<SimEvent['actor'], LogEvent['actor']> = { maker: 'maker', system: 'system', meesho: 'meesho', buyer: 'buyer' };

function JourneyFor({ p, startChapter }: { p: PersonaSpec; startChapter: number }) {
  const def = page('/journey/:id');
  const { base, cf } = usePersonaRuns(p.id);
  const [pos, setPos] = useState(() => ({ day: chapterDay(startChapter, base), chapter: startChapter }));
  const { day, chapter } = pos;
  /** Scrubbing picks the chapter from the day; Prev/Next set it explicitly (chapters 7 and 8 overlap). */
  const setDay = (d: number) => setPos({ day: d, chapter: chapterForDay(d) });
  const [focus, setFocus] = useState<View | null>(null);
  const [showCf, setShowCf] = useState(false);
  const [rail, setRail] = useState(true);
  const ctx = useMemo(() => buildCtx(p, base, cf, chapter, day), [p, base, cf, chapter, day]);
  const ch = CHAPTERS[chapter]!;

  const go = useCallback(
    (n: number) => {
      const c = Math.max(0, Math.min(CHAPTERS.length - 1, n));
      setPos({ day: chapterDay(c, base), chapter: c });
    },
    [base],
  );

  useEffect(() => {
    document.title = `Journey: ${p.name} · Meesho C2M prototype`;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (useApp.getState().tourStep !== null) return;
      if (e.key === 'ArrowRight') go(chapter + 1);
      if (e.key === 'ArrowLeft') go(chapter - 1);
      if (e.key === 'Escape') setFocus(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapter, go, p.name]);

  const markers: TimelineMarker[] = [
    ...CHAPTERS.map((c) => ({ day: chapterDay(c.n, base), label: `${c.n}. ${c.title}`, kind: 'chapter' as const })),
    ...C.GATE_DAYS.value.map((g) => ({ day: g, label: `Gate at day ${g}`, kind: 'gate' as const })),
  ];
  const chapterStart = C.CHAPTER_DAYS.value[chapter]!;
  const chapterEnd = (C.CHAPTER_DAYS.value[chapter + 1] ?? C.TIMELINE_DAYS.value.max + 1) - 1;
  const narration = base.events.filter((e) => e.day >= chapterStart && e.day <= Math.min(day, chapterEnd)).slice(-2);

  const views: { id: View; label: string; tone: string; node: ReactNode }[] = [
    {
      id: 'maker',
      label: `Maker · ${p.name.split(' ')[0]}`,
      tone: 'text-orange',
      node: (
        <MakerPhone scale={focus === 'maker' ? 1 : 0.7} fitViewport>
          {() => <MakerScreen />}
        </MakerPhone>
      ),
    },
    {
      id: 'control',
      label: 'Meesho control room',
      tone: 'text-plum',
      node: (
        <div className={`w-full rounded-2xl border-2 border-dashed border-plum/50 bg-white p-3 ${focus === 'control' ? 'text-base' : 'text-sm'}`}>
          <ControlPanel />
        </div>
      ),
    },
    {
      id: 'buyer',
      label: 'Buyer',
      tone: 'text-pink',
      node: (
        <BuyerPhone fitViewport scale={focus === 'buyer' ? 1 : 0.7} query={p.skus[0]!.productType.split(' · ')[0]!.toLowerCase()}>
          <BuyerScreen />
        </BuyerPhone>
      ),
    },
  ];

  return (
    <JourneyContext.Provider value={ctx}>
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-2 lg:px-6">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Personas', to: '/personas' }, { label: p.name, to: `/personas/${p.id}` }, { label: 'Journey' }]} />
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="rounded-t-2xl rounded-b-md bg-plum px-4 py-1.5 font-display text-2xl font-bold text-white">The journey: {p.name}</h1>
          <StagePill>{p.cohort}</StagePill>
          <div className="flex items-center gap-1 rounded-full border border-line bg-white p-0.5" role="group" aria-label="Persona switcher">
            {PERSONA_SPECS.map((x) => (
              <Go key={x.id} to={`/journey/${x.id}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${x.id === p.id ? 'bg-plum text-white' : 'text-plum hover:bg-blush'}`}>
                {x.name.split(' ')[0]}
              </Go>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-plum">
            <input type="checkbox" checked={showCf} onChange={(e) => setShowCf(e.target.checked)} className="accent-plum" data-testid="cf-toggle" />
            Without our solution
          </label>
          <div className="ml-auto flex items-center gap-2">
            <AnswersPs q={def.ps} />
            <Chip kind="synthetic" />
          </div>
        </div>

        <Timeline day={day} onChange={setDay} markers={markers} />

        <div className="my-2 flex items-center gap-2 rounded-xl bg-plum px-3 py-2 text-white">
          <button type="button" onClick={() => go(chapter - 1)} disabled={chapter === 0} aria-label="Previous chapter" data-testid="prev-chapter" className="rounded-full bg-white/15 p-1.5 disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-ink" data-testid="chapter-label">
                Chapter {ch.n} / {CHAPTERS.length - 1}
              </span>
              <span className="font-display text-lg font-bold">{ch.title}</span>
              <span className="text-xs text-white/70">
                {ch.days} · {ch.stage}
              </span>
            </div>
            <div className="line-clamp-2 text-xs text-white/85" title={narration.map((e) => e.text).join(' ')}>
              {narration.length ? narration.map((e) => `${dayLabel(e.day)}: ${e.text}`).join('  ·  ') : ch.summary}
            </div>
          </div>
          <button type="button" onClick={() => go(chapter + 1)} disabled={chapter === CHAPTERS.length - 1} aria-label="Next chapter" data-testid="next-chapter" className="rounded-full bg-orange p-1.5 text-ink disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className={`grid gap-3 ${rail && !focus ? 'xl:grid-cols-[auto_minmax(0,1fr)_auto_15rem]' : 'xl:grid-cols-[auto_minmax(0,1fr)_auto]'} ${focus ? '!grid-cols-1' : ''}`}>
          {views
            .filter((v) => !focus || v.id === focus)
            .map((v) => (
              <section key={v.id} aria-label={v.label} className={`flex min-w-0 flex-col ${focus ? 'items-center' : ''}`}>
                <div className="mb-1 flex w-full items-center justify-between gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${v.tone}`}>{v.label}</span>
                  <button
                    type="button"
                    onClick={() => setFocus(focus === v.id ? null : v.id)}
                    aria-label={focus === v.id ? 'Exit focus mode' : `Focus on ${v.label}`}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-plum hover:bg-blush"
                  >
                    {focus === v.id ? <Minimize2 size={12} /> : <Maximize2 size={12} />} {focus === v.id ? 'Exit focus' : 'Focus'}
                  </button>
                </div>
                  <motion.div key={`${v.id}-${chapter}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`w-full ${focus === 'control' ? 'max-w-5xl' : ''} ${v.id !== 'control' ? 'flex justify-center' : ''}`}>
                    {v.node}
                  </motion.div>
              </section>
            ))}
          {!focus && (
            <div className="hidden xl:block">
              {rail ? (
                <div>
                  <button type="button" onClick={() => setRail(false)} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-plum" aria-label="Collapse impact tracker">
                    <PanelRightClose size={14} /> Impact tracker
                  </button>
                  <Tracker ctx={ctx} />
                </div>
              ) : null}
            </div>
          )}
        </div>
        {!rail && !focus && (
          <button type="button" onClick={() => setRail(true)} className="mt-2 inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-plum" aria-label="Open impact tracker">
            <PanelRightOpen size={14} /> Show impact tracker
          </button>
        )}
        <div className="mt-3 xl:hidden">
          <Tracker ctx={ctx} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <CompareChart base={base} cf={cf} day={day} showCf={showCf} />
          <div className="flex flex-col">
            <h3 className="mb-1 font-display text-lg font-bold text-plum">Event log</h3>
            <EventLog events={logEvents(ctx)} newestFirst className="max-h-80 flex-1" />
          </div>
        </div>

        <nav aria-label="Page navigation" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Go to={`/personas/${p.id}`} className="flex items-center gap-1.5 rounded-full border border-plum px-4 py-2 text-sm font-semibold text-plum hover:bg-blush">
            <ArrowLeft size={16} aria-hidden /> {p.name}
          </Go>
          <Go to={def.next} next className="flex items-center gap-1.5 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-ink shadow-sm hover:brightness-105">
            Next: Control room <ArrowRight size={16} aria-hidden />
          </Go>
        </nav>
      </main>
    </JourneyContext.Provider>
  );
}

function Tracker({ ctx }: { ctx: JourneyCtx }) {
  const { r, day, ds, chapter } = ctx;
  const lit = CHAPTERS[chapter]!.lit;
  // Before day 0 nothing has been listed, stocked or sold.
  if (day < 0) {
    const dash = (labels: string[]) => labels.map((label) => ({ label, value: '—' }));
    return (
      <ImpactTracker
        lit={lit}
        maker={dash(['Units sold', 'Earned (accrued)', 'Paid out', 'Cash in stock (at cost)', 'Days of cover', 'Monthly run-rate', 'Annualised revenue'])}
        buyer={dash(['Price vs B', 'Total saved vs B', 'vs reseller price'])}
        meesho={dash(['Orders', 'Contribution'])}
      />
    );
  }
  const upTo = r.days.filter((d) => d.day <= day);
  const sold = upTo.reduce((a, d) => a + d.orders - d.rto, 0);
  const orders = upTo.reduce((a, d) => a + d.orders, 0);
  const last30 = upTo.filter((d) => d.day > day - C.DAYS_PER_MONTH.value);
  const units30 = last30.reduce((a, d) => a + d.orders, 0);
  const revenue30 = last30.reduce((a, d) => a + d.skus.reduce((b, s) => b + s.orders * s.price, 0), 0);
  const perDay7 = upTo.filter((d) => d.day > day - C.RUN_RATE_WINDOW_DAYS.value).reduce((a, d) => a + d.orders, 0) / C.RUN_RATE_WINDOW_DAYS.value;
  const cover = daysOfCover(ds.onHand, perDay7);
  const live = ctx.skuDay.live;
  const net = ds.money.netCashCum;
  return (
    <ImpactTracker
      lit={lit}
      maker={[
        { label: 'Units sold', value: num(sold) },
        { label: 'Earned (accrued)', value: <Num f="takeHome">{inr(Math.max(0, ds.money.takeHomeCum))}</Num> },
        { label: `Paid out (${C.PAYMENT_CYCLE_DAYS.value} days after delivery)`, value: inr(ds.money.payoutsCum) },
        { label: 'Cash in stock (at cost)', value: inr(ds.money.cashInStock) },
        {
          label: 'Net cash position',
          value: (
            <span
              className={net < 0 ? 'text-grey' : ''}
              title="Cash in (payouts, stock recovered, claims) minus cash out (stock made, packing, fees, GST remitted). Negative while stock is built ahead of payouts; the stock is still an asset at cost."
            >
              {inr(net)} ⓘ
            </span>
          ),
        },
        { label: 'Days of cover', value: cover === null ? '—' : `${num(cover, 1)} days` },
        { label: 'Monthly run-rate (last 30 days)', value: `${num(units30)} units` },
        { label: 'Annualised revenue', value: <Num f="annualise">{inr(annualise(revenue30))}</Num> },
      ]}
      buyer={[
        { label: 'Price vs B', value: live ? <Num f="priceBand">{`${inr(ctx.skuDay.price)} vs ${inr(ctx.skuDay.B)}`}</Num> : '—' },
        { label: 'Total saved vs B', value: <Num f="priceDropDelivered">{inr(ds.buyerSavedCum)}</Num> },
        { label: 'vs reseller price', value: inr(ds.buyerSavedVsResellerCum) },
      ]}
      meesho={[
        { label: 'Orders', value: num(orders) },
        { label: 'Contribution', value: inr(ds.meeshoContributionCum) },
      ]}
    />
  );
}

function logEvents(ctx: JourneyCtx): LogEvent[] {
  const out: LogEvent[] = ctx.past.slice(-40).map((e) => ({ day: e.day, text: e.text, actor: ACTOR[e.actor] }));
  // Daily order lines for the last week up to today.
  for (const d of ctx.r.days.filter((x) => x.day <= ctx.day && x.day > ctx.day - 7 && x.orders > 0)) {
    const byD = ctx.r.districts.map((dist, i) => ({ dist, n: d.skus.reduce((a, s) => a + (s.byDistrict[i] ?? 0), 0) })).sort((a, b) => b.n - a.n)[0]!;
    const returns = d.returns;
    out.push({
      day: d.day,
      actor: 'buyer',
      text: `${byD.dist.name} district${byD.dist.launch ? ' (launch)' : ' (control)'} leads · ${d.orders} orders · ${d.rto} RTO (no charge to maker)${returns ? ` · ${returns} return${returns > 1 ? 's' : ''}` : ''}`,
    });
  }
  return out;
}
