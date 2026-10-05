import { C } from '../data/constants';
import { PS_QUESTIONS, type PsQuestion } from '../data/copy';
import { PS_MAP } from '../app/pages';
import { Go } from '../app/Go';
import { middlemanMargin } from '../engine/formulas';
import { TitleTab } from '../components/TitleTab';
import { Num } from '../components/FormulaPopover';
import { inr, pctText } from '../lib/format';
import { SectionPage } from './SectionPage';

const CHALLENGES = [
  ['Operational hassle', 'Single-order packing, reverse logistics'],
  ['Inventory risk', 'Stock made for a channel that may not buy'],
  ['Unproven demand', '“Will there be enough scale?”'],
  ['Weak early scale-up', 'A small share of orders in the first 30 days'],
] as const;

export default function Problem() {
  const aov = C.AOV.value;
  const split = C.MIDDLEMAN_SPLIT_AT_AOV.value;
  const margin = middlemanMargin(aov);
  const exWorks = aov - margin;
  const slices = [
    { who: 'Factory (ex-works)', v: exWorks, cls: 'bg-plum text-white' },
    { who: 'Distributor', v: split.distributor, cls: 'bg-magenta text-white' },
    { who: 'Wholesaler', v: split.wholesaler, cls: 'bg-pink text-white' },
    { who: 'Reseller', v: split.reseller, cls: 'bg-orange text-ink' },
  ];
  return (
    <SectionPage path="/problem">
      <blockquote className="mb-6 rounded-2xl bg-plum p-5 font-display text-2xl text-white">
        “Design a strategy to meaningfully grow Meesho’s C2M seller base and their long-term contribution to price competitiveness.”
      </blockquote>
      <TitleTab size="sm" className="mb-3">
        The {inr(aov)} order: who takes what
      </TitleTab>
      <div className="mb-2 flex h-14 w-full overflow-hidden rounded-xl text-xs font-semibold">
        {slices.map((s) => (
          <div key={s.who} className={`flex flex-col items-center justify-center ${s.cls}`} style={{ width: `${(100 * s.v) / aov}%` }} title={`${s.who}: ${inr(s.v)}`}>
            <span>{inr(s.v)}</span>
            <span className="hidden font-normal md:block">{s.who}</span>
          </div>
        ))}
      </div>
      <p className="mb-8 text-sm text-grey">
        The middlemen take <Num f="savingPerOrder">{inr(margin)}</Num> ({pctText((100 * margin) / aov)} of the price). An integrated maker selling direct can pass most of it to the buyer: {inr(margin - C.SELF_SHIP_OWN_COST.value)} if self-shipping,
        less the Pack Point fee if not.
      </p>

      <TitleTab size="sm" className="mb-3">
        Two problems × four challenges
      </TitleTab>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-display text-lg font-bold text-plum">1 · Large manufacturers don’t come onto B2C</h3>
          <p className="text-sm text-grey">Built for bulk and made-to-order with no returns; B2C means new operations, inventory risk and a real cost of failure.</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-display text-lg font-bold text-plum">2 · Those who onboard don’t stay</h3>
          <p className="text-sm text-grey">Weak early orders, and conviction erodes.</p>
        </div>
        {CHALLENGES.map(([h, b]) => (
          <div key={h} className="rounded-xl bg-blush p-3">
            <div className="font-semibold text-magenta">{h}</div>
            <div className="text-sm">{b}</div>
          </div>
        ))}
      </div>

      <TitleTab size="sm" className="mb-3">
        Where each PS question is answered
      </TitleTab>
      <div className="grid gap-3 md:grid-cols-2" data-testid="ps-map">
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
    </SectionPage>
  );
}
