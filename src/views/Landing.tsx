import { ArrowRight, PlayCircle } from 'lucide-react';
import { Go } from '../app/Go';
import { PageShell } from '../app/PageShell';
import { NAV_PAGES, PS_MAP, page } from '../app/pages';
import { C2M_TERMS, FORMULA_FUEL, PITCH, PS_QUESTIONS, type PsQuestion } from '../data/copy';
import { PERSONAS } from '../data/personas';
import { DashedPanel } from '../components/DashedPanel';
import { StagePill } from '../components/StagePill';
import { MakerPhone } from '../components/MakerPhone';
import { Chip } from '../components/Chip';
import { Num } from '../components/FormulaPopover';
import { useApp } from '../app/store';
import { runSim } from '../app/useSim';
import { C } from '../data/constants';
import { inr, num } from '../lib/format';

function HeroPhone({ perMonth, orders }: { perMonth: number; orders: number }) {
  return (
    <MakerPhone scale={0.56}>
      {() => (
        <>
          <div className="rounded-2xl bg-plum p-3 text-white">
            <div className="text-xs opacity-80">Hiren · day 90 · last 30 days</div>
            <div className="font-display text-3xl font-bold">{inr(perMonth)}</div>
            <div className="text-xs">earned this month · {num(orders)} orders</div>
          </div>
          {['New order · 1 L steel bottle', 'New order · 1.5 L casserole (Pack Point)', 'Payout credited (7 days after delivery)'].map((x) => (
            <div key={x} className="rounded-xl border border-line bg-white p-2 text-xs">
              {x}
            </div>
          ))}
          <Chip kind="simulated" />
        </>
      )}
    </MakerPhone>
  );
}

export default function Landing() {
  const def = page('/');
  const setTourStep = useApp((s) => s.setTourStep);
  const hero = runSim({ personaId: 'hiren' });
  const d90 = hero.days[hero.days.length - 1]!;
  const d60 = hero.days.find((d) => d.day === d90.day - C.DAYS_PER_MONTH.value)!;
  const perMonth = d90.money.takeHomeCum - d60.money.takeHomeCum;
  const orders30 = hero.days.filter((d) => d.day > d60.day).reduce((a, d) => a + d.orders, 0);
  const split = C.PROBLEM_SPLIT_AT_AOV.value;
  const middlemen = split.distributor + split.wholesaler + split.reseller;
  const stats = [
    { v: inr(middlemen), l: `middlemen take on every ${inr(C.AOV.value)} order`, c: 'PROBLEM_SPLIT_AT_AOV' as const },
    { v: `~${num(C.MAKERS_SAM.value)}`, l: 'integrated makers who can remove it (SAM)', c: 'MAKERS_SAM' as const },
    { v: `${inr(perMonth)}/month`, l: 'Hiren earns by day 90 (simulated, accrued)', c: undefined },
  ];
  return (
    <PageShell def={def} trail={[{ label: 'Home' }]} hideSummary>
      <div className="mb-8 grid items-start gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-5 max-w-4xl font-display text-3xl text-plum">{PITCH}</p>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="font-display text-4xl font-bold text-plum">{s.c ? <Num c={s.c}>{s.v}</Num> : <Num f="takeHomeAccrued">{s.v}</Num>}</div>
                <div className="mt-1 text-sm text-grey">{s.l}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTourStep(0)}
            data-testid="landing-start-tour"
            className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-base font-semibold text-ink shadow hover:brightness-105"
          >
            <PlayCircle size={20} aria-hidden /> Start judge tour
          </button>
          <p className="mt-2 text-sm text-grey">15 steps, about 4 minutes. Use → / ← or the arrows in the caption bar; Esc or ✕ exits.</p>
        </div>
        <div className="hidden justify-center lg:flex">
          <HeroPhone perMonth={perMonth} orders={orders30} />
        </div>
      </div>

      <DashedPanel title="The organising formula" tone="white" className="mb-8">
        <div className="flex flex-wrap items-stretch gap-2">
          {C2M_TERMS.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-xl font-bold text-grey">×</span>}
              <div className="rounded-xl bg-blush px-3 py-2">
                <div className="text-sm font-semibold text-ink">{t.term}</div>
                <div className="text-[11px] text-magenta">{t.owner}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-grey">
          = C2M price contribution. {FORMULA_FUEL}
        </p>
      </DashedPanel>

      <h2 className="mb-3 font-display text-xl font-bold text-plum">Three makers, one engine</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {PERSONAS.map((p) => (
          <Go key={p.id} to={`/personas/${p.id}`} className="group rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-plum">
            <div className="mb-2 flex items-center justify-between">
              <StagePill>{p.cohort}</StagePill>
              {p.isHero && <StagePill tone="plum">Hero</StagePill>}
            </div>
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="text-sm text-grey">
              {p.business}, {p.city} · {p.category}
            </div>
            <p className="mt-2 font-display text-lg italic text-plum">“{p.mainAsk}”</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-magenta group-hover:underline">
              Meet {p.name.split(' ')[0]} <ArrowRight size={14} aria-hidden />
            </span>
          </Go>
        ))}
      </div>

      <h2 className="mb-3 font-display text-xl font-bold text-plum">Answers the PS</h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {(Object.keys(PS_MAP) as PsQuestion[]).map((q) => (
          <div key={q} className="rounded-xl border border-line bg-white p-3">
            <div className="text-sm">
              <span className="mr-1 rounded bg-pink px-1.5 py-0.5 text-xs font-bold text-white">{q}</span>
              {PS_QUESTIONS[q]}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PS_MAP[q].map((l) => (
                <Go key={l.label} to={l.to} className="rounded-full border border-magenta px-3 py-0.5 text-xs font-semibold text-magenta hover:bg-blush">
                  {l.label} →
                </Go>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-display text-xl font-bold text-plum">Every section</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NAV_PAGES.map((p) => (
          <Go key={p.path} to={p.path.replace(':id', 'hiren')} className="rounded-xl border border-line bg-white p-3 hover:border-plum">
            <div className="font-semibold text-plum">{p.title}</div>
            <div className="mt-1 text-xs text-grey">{p.summary}</div>
          </Go>
        ))}
      </div>
    </PageShell>
  );
}
