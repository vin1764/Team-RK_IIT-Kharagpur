import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { C } from '../data/constants';
import { CATEGORY_CARDS, SCORECARD, type CategoryCard, type CategoryRatings } from '../data/categories';
import { categoryScore, listPrice, middlemanMargin } from '../engine/formulas';
import { runCategorySim } from '../app/useSim';
import { useApp } from '../app/store';
import { DashedPanel } from '../components/DashedPanel';
import { TitleTab } from '../components/TitleTab';
import { Chip } from '../components/Chip';
import { Num } from '../components/FormulaPopover';
import { inr, num, pctText } from '../lib/format';
import { SectionPage } from './SectionPage';

const CRITERIA: { key: keyof CategoryRatings; label: string }[] = [
  { key: 'spec', label: 'Spec verifiability' },
  { key: 'savings', label: 'Savings after RTO' },
  { key: 'margin', label: 'Middleman margin capturable' },
  { key: 'reach', label: 'Factories reachable' },
];

const STATUS_TONE: Record<CategoryCard['status'], string> = {
  'Launch M1': 'bg-good text-white',
  'Launch M2': 'bg-good/80 text-white',
  'Launch M3': 'bg-warn text-ink',
  'Launch M4': 'bg-warn text-ink',
  'Not sized': 'bg-line text-ink',
  Later: 'bg-line text-ink',
  Excluded: 'bg-bad text-white',
};

function Scorecard() {
  const defaults = C.CATEGORY_WEIGHTS_PCT.value;
  const [w, setW] = useState<CategoryRatings>({ ...defaults });
  const total = w.spec + w.savings + w.margin + w.reach;
  const ranked = useMemo(
    () =>
      SCORECARD.map((c) => ({ ...c, score: total === 0 ? 0 : (categoryScore(c.ratings, w) * 100) / total })).sort((a, b) => b.score - a.score),
    [w, total],
  );
  const changed = CRITERIA.some((k) => w[k.key] !== defaults[k.key]);
  const card = (id: string) => CATEGORY_CARDS.find((c) => c.id === id)!;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <DashedPanel title="Weights (drag to change; ranking re-sorts live)" tone="white">
        <div className="space-y-3">
          {CRITERIA.map((k) => (
            <label key={k.key} className="block text-sm">
              <span className="flex justify-between">
                <span>{k.label}</span>
                <span className="font-semibold text-plum">{total === 0 ? 0 : Math.round((w[k.key] * 100) / total)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={60}
                value={w[k.key]}
                onChange={(e) => setW({ ...w, [k.key]: Number(e.target.value) })}
                className="w-full accent-plum"
                aria-label={`${k.label} weight`}
              />
            </label>
          ))}
          <div className="flex items-center justify-between text-xs text-grey">
            <span>score = Σ (rating ÷ 5 × weight), normalised to 100</span>
            <button
              type="button"
              disabled={!changed}
              onClick={() => setW({ ...defaults })}
              className="inline-flex items-center gap-1 rounded-full border border-plum px-2 py-0.5 font-semibold text-plum disabled:opacity-40"
            >
              <RotateCcw size={12} aria-hidden /> Team weights
            </button>
          </div>
        </div>
      </DashedPanel>
      <div className="rounded-2xl border border-line bg-white p-3">
        <table className="w-full text-sm">
          <thead className="text-xs text-grey">
            <tr>
              <th className="w-8 py-1 text-left">#</th>
              <th className="py-1 text-left">Category</th>
              {CRITERIA.map((k) => (
                <th key={k.key} className="hidden py-1 text-center md:table-cell" title={k.label}>
                  {k.label.split(' ')[0]}
                </th>
              ))}
              <th className="w-40 py-1 text-left">Score</th>
              <th className="py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, i) => (
              <motion.tr layout transition={{ duration: 0.2 }} key={c.id} className="border-t border-line">
                <td className="py-1.5 font-semibold text-grey">{i + 1}</td>
                <td className="py-1.5 font-medium">{c.name}</td>
                {CRITERIA.map((k) => (
                  <td key={k.key} className="hidden py-1.5 text-center text-grey md:table-cell">
                    {c.ratings[k.key]}
                  </td>
                ))}
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-blush">
                      <div className="h-2 rounded-full bg-plum" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold">
                      <Num f="categoryScore">{num(c.score)}</Num>
                    </span>
                  </div>
                </td>
                <td className="py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[card(c.id).status]}`}>{card(c.id).status}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {ranked.findIndex((c) => c.id === 'apparel') < SCORECARD.findIndex((c) => c.id === 'apparel') && (
          <p className="mt-2 rounded-lg bg-orange-soft p-2 text-xs" data-testid="apparel-note">
            Apparel moves up when returns matter less, but it still waits: {card('apparel').failingTest}. A score can’t buy back returns a buyer will still make.
          </p>
        )}
      </div>
    </div>
  );
}

function SimResultCard({ c }: { c: CategoryCard }) {
  const seed = useApp((s) => s.seed);
  const r = runCategorySim(c.id, seed);
  if (!r || !c.sim) return null;
  const k = r.kpis;
  const g = r.gates.g1!;
  return (
    <div className="mt-3 rounded-xl bg-cream p-3 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-plum">30-day launch result</span>
        <Chip kind="simulated" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Orders" value={num(k.totalOrders)} />
        <Stat label="Returns" value={pctText(k.returnRatePct, 1)} />
        <Stat label="Below B" value={<Num f="priceDropDelivered">{pctText(k.priceDropAtLaunchPct, 1)}</Num>} />
        <Stat label="Stick rate" value={<Num f="stickRate">{num(g.inputs[0]!.value, 2)}</Num>} />
        <Stat label="vs control" value={<Num f="lift">{`+${num((g.inputs[1]!.value - 1) * 100)}%`}</Num>} />
        <Stat
          label="Day-30 rule"
          value={
            c.gate ? (
              <span className="text-warn">Gated</span>
            ) : (
              <span className={g.decision === 'Invest' ? 'text-good' : g.decision === 'Tighten' ? 'text-warn' : 'text-bad'}>{g.decision}</span>
            )
          }
        />
      </div>
      {c.gate ? (
        <div className="mt-2 rounded-lg border-2 border-dashed border-warn bg-warn/10 px-2 py-1 text-[11px] font-semibold text-ink" data-testid={`gated-${c.id}`}>
          Gated: {c.id === 'footwear' ? 'awaiting ~10 weeks of Home & Kitchen return data' : c.gate.toLowerCase()}. No order book until the gate passes. Preview sim:{' '}
          {g.decision}
          {g.decision !== 'Invest' ? ` (${g.reason.toLowerCase()})` : ''}.
        </div>
      ) : (
        g.decision !== 'Invest' && <p className="mt-1 text-[11px] font-semibold text-warn">{g.reason}</p>
      )}
      <p className="mt-1 text-[11px] text-grey">
        {c.sim.name} at {inr(listPrice(c.sim.stack, c.sim.margin, c.sim.gstRatePct))}, same engine as the personas.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-grey">{label}</div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function CategoryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CATEGORY_CARDS.map((c) => (
        <article key={c.id} className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-plum">{c.name}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[c.status]}`}>{c.status}</span>
          </div>
          {c.statusNote && <div className="mb-1 text-xs font-semibold text-good">{c.statusNote}</div>}
          <dl className="space-y-1 text-xs">
            {c.heroSku && (
              <div>
                <dt className="inline text-grey">Hero SKU: </dt>
                <dd className="inline font-medium">{c.heroSku}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-grey">Key parameters: </dt>
              <dd className="inline">{c.keyParameters}</dd>
            </div>
            <div>
              <dt className="inline text-grey">Special rule: </dt>
              <dd className="inline">{c.specialRule}</dd>
            </div>
            {c.gate && (
              <div>
                <dt className="inline text-grey">Gate: </dt>
                <dd className="inline font-semibold text-warn">{c.gate}</dd>
              </div>
            )}
          </dl>
          {c.sim ? (
            <SimResultCard c={c} />
          ) : (
            <div className="mt-3 rounded-xl border-2 border-dashed border-bad/50 bg-bad/5 p-3 text-xs">
              <div className="font-semibold text-bad">Why not yet</div>
              <p className="mt-1">Fails: {c.failingTest}.</p>
              <p className="mt-1 text-grey">No launch sim is run for a category that fails a buyer test.</p>
            </div>
          )}
          <div className="mt-auto flex flex-wrap gap-1 pt-3">
            {c.sim && <Chip kind="new">Launch Week slot</Chip>}
            {c.id === 'homeKitchen' && <Chip kind="partner">Pack Point above {inr(C.PACK_POINT_MIN_PRICE.value)}</Chip>}
          </div>
        </article>
      ))}
    </div>
  );
}

type MakerType = 'integrated' | 'jobWork' | 'contract' | 'trader';
type Band = 'small' | 'target' | 'large';

const TYPES: { id: MakerType; label: string; edge: 'High' | 'Medium' | 'Low' | 'None'; note: string }[] = [
  { id: 'integrated', label: 'Integrated (owns input + machines)', edge: 'High', note: 'Removes the whole middleman margin' },
  { id: 'jobWork', label: 'Job-work', edge: 'Medium', note: 'Owns machines, not the input' },
  { id: 'contract', label: 'Contract / assembler', edge: 'Low', note: 'Buys parts; thin cost edge' },
  { id: 'trader', label: 'Trader / MRP brand', edge: 'None', note: 'Buys finished goods; no cost edge' },
];

function bands() {
  const t = C.TARGET_TURNOVER_CR.value;
  return [
    { id: 'small' as Band, label: `< ₹${t.min} Cr`, note: 'Edge exists, supply breaks' },
    { id: 'target' as Band, label: `₹${t.min}–${t.max} Cr`, note: 'Target' },
    { id: 'large' as Band, label: `> ₹${t.max} Cr`, note: 'Courted by Amazon / Flipkart' },
  ];
}

function verdict(t: MakerType, b: Band): { text: string; tone: string } {
  if (t === 'trader') return { text: 'No edge', tone: 'bg-bad/10 text-bad' };
  if (b === 'target' && (t === 'integrated' || t === 'jobWork')) return { text: t === 'integrated' ? 'Target' : 'Target (smaller edge)', tone: 'bg-good text-white' };
  if (b === 'small') return { text: 'Edge, supply breaks', tone: 'bg-warn/20 text-ink' };
  if (b === 'large') return { text: 'Courted elsewhere', tone: 'bg-line text-ink' };
  return { text: 'Weak edge', tone: 'bg-warn/20 text-ink' };
}

function TypeTurnover() {
  const [sel, setSel] = useState<{ t: MakerType; b: Band }>({ t: 'integrated', b: 'target' });
  const margin = middlemanMargin(C.AOV.value);
  const v = verdict(sel.t, sel.b);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-x-auto rounded-2xl border border-line bg-white p-3">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-grey">
              <th className="py-1 text-left">Maker type ↓ · Turnover →</th>
              {bands().map((b) => (
                <th key={b.id} className="py-1 text-center">
                  <div className="font-semibold text-ink">{b.label}</div>
                  <div className="font-normal">{b.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <th className="py-1.5 pr-2 text-left text-xs font-medium">
                  {t.label}
                  <div className="font-normal text-grey">Cost edge: {t.edge}</div>
                </th>
                {bands().map((b) => {
                  const cell = verdict(t.id, b.id);
                  const active = sel.t === t.id && sel.b === b.id;
                  return (
                    <td key={b.id} className="p-1 text-center">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSel({ t: t.id, b: b.id })}
                        className={`w-full rounded-lg px-2 py-2 text-xs font-semibold ${cell.tone} ${active ? 'ring-2 ring-orange ring-offset-1' : ''}`}
                      >
                        {cell.text}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-xs text-grey">Selected</div>
          <div className="font-semibold">
            {TYPES.find((t) => t.id === sel.t)!.label} · {bands().find((b) => b.id === sel.b)!.label}
          </div>
          <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${v.tone}`}>{v.text}</div>
          <p className="mt-2 text-sm text-grey">{TYPES.find((t) => t.id === sel.t)!.note}.</p>
        </div>
        <div className="rounded-2xl bg-plum p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-orange">The lesson</div>
          <p className="mt-1 font-display text-lg">
            A ₹{C.TRADER_EXAMPLE_TURNOVER_CR.value} Cr trader moves more volume than a ₹{C.HERO_TURNOVER_CR.value} Cr integrated maker but removes ₹0 of the{' '}
            <Num f="savingPerOrder">{inr(margin)}</Num>; the integrated maker removes all of it.
          </p>
          <p className="mt-2 text-sm text-white/80">Scale ≠ cost edge; ownership is.</p>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  return (
    <SectionPage path="/categories">
      <div className="space-y-10">
        <section>
          <TitleTab size="sm" className="mb-3">
            Scorecard
          </TitleTab>
          <Scorecard />
        </section>
        <section>
          <TitleTab size="sm" className="mb-3">
            Which categories, and which not
          </TitleTab>
          <CategoryCards />
        </section>
        <section>
          <TitleTab size="sm" className="mb-3">
            Which makers: Type × Turnover
          </TitleTab>
          <TypeTurnover />
        </section>
      </div>
    </SectionPage>
  );
}
