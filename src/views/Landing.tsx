import { ArrowRight, PlayCircle } from 'lucide-react';
import { Go } from '../app/Go';
import { PageShell } from '../app/PageShell';
import { NAV_PAGES, PS_MAP, page } from '../app/pages';
import { C2M_TERMS, FORMULA_FUEL, PITCH, PS_QUESTIONS, type PsQuestion } from '../data/copy';
import { PERSONAS } from '../data/personas';
import { DashedPanel } from '../components/DashedPanel';
import { StagePill } from '../components/StagePill';

export default function Landing() {
  const def = page('/');
  return (
    <PageShell def={def} trail={[{ label: 'Home' }]}>
      <p className="mb-6 max-w-4xl font-display text-2xl text-plum">{PITCH}</p>

      <Go
        to="/tour"
        className="mb-8 inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-base font-semibold text-ink shadow hover:brightness-105"
      >
        <PlayCircle size={20} aria-hidden /> Start judge tour
      </Go>

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
