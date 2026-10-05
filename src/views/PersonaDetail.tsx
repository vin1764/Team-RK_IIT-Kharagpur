import { useParams } from 'react-router-dom';
import { PlayCircle, Quote } from 'lucide-react';
import { Go } from '../app/Go';
import { PageShell } from '../app/PageShell';
import { page } from '../app/pages';
import { usePersonaRuns } from '../app/useSim';
import { C } from '../data/constants';
import { PERSONA_SPECS, personaById, type PersonaSpec } from '../data/personas';
import { PERSONA_STORY, STAGES } from '../data/personaStory';
import { channelTakeHome, listPrice } from '../engine/formulas';
import { StagePill } from '../components/StagePill';
import { DashedPanel } from '../components/DashedPanel';
import { TitleTab } from '../components/TitleTab';
import { Chip } from '../components/Chip';
import { OutcomeChart } from '../components/OutcomeChart';
import { OutcomeRows } from '../components/OutcomeRows';
import { Num } from '../components/FormulaPopover';
import { inr, num, pctText } from '../lib/format';
import NotFound from './NotFound';

function BranchPanel({ p }: { p: PersonaSpec }) {
  const sku = p.skus[0]!;
  const price = listPrice(sku.stack, sku.margin, sku.gstRatePct);
  if (p.id === 'ayesha') {
    const c = channelTakeHome(price, C.AYESHA_AMAZON_PRICE.value, sku.stack);
    return (
      <DashedPanel title="Her path: take-home side by side" tone="white">
        <p className="mb-2 text-xs text-grey">Same factory price ({inr(c.exWorks)}) everywhere; only the fee stack differs.</p>
        <table className="w-full text-sm">
          <thead className="text-grey">
            <tr>
              <th className="text-left font-medium" />
              <th className="text-left font-semibold text-plum">Meesho</th>
              <th className="text-left font-medium">Amazon</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="py-1 text-grey">Price</td>
              <td>{inr(price)}</td>
              <td>{inr(C.AYESHA_AMAZON_PRICE.value)}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 text-grey">Fees (commission, shipping, closing)</td>
              <td>{inr(c.meeshoFees)}</td>
              <td>{inr(c.amazonFees)}</td>
            </tr>
            <tr className="border-t border-line font-semibold">
              <td className="py-1 text-grey">Take-home per unit</td>
              <td className="text-good">
                <Num c="COMMISSION_PCT">{inr(c.meesho)}</Num>
              </td>
              <td>
                <Num c="AMZ_REFERRAL_PCT">{inr(c.amazon)}</Num>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip kind="existing">Existing Meesho: 0% commission</Chip>
          <Chip kind="new">New: take-home calculator</Chip>
        </div>
        <p className="mt-2 text-[11px] text-grey">Amazon fees are team estimates; shown for comparison only.</p>
      </DashedPanel>
    );
  }
  if (p.id === 'sunita' && p.winBack) {
    const w = p.winBack;
    return (
      <DashedPanel title="Her path: win-back diagnosis" tone="white">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-blush p-2">
            <div className="font-display text-2xl font-bold text-plum">{num(w.views)}</div>
            <div className="text-[11px] text-grey">views on the old listing</div>
          </div>
          <div className="rounded-lg bg-blush p-2">
            <div className="font-display text-2xl font-bold text-plum">{num(w.clicks)}</div>
            <div className="text-[11px] text-grey">clicks → {w.likelyReason.toLowerCase()} is the likely reason</div>
          </div>
          <div className="rounded-lg bg-blush p-2">
            <div className="font-display text-2xl font-bold text-bad">{pctText(w.refusalPct)}</div>
            <div className="text-[11px] text-grey">refusals vs {pctText(w.categoryRefusalPct)} category</div>
          </div>
        </div>
        <p className="mt-2 text-sm">
          Inherits a seller-level quality score of <strong>{pctText((p.sellerQualityScore ?? 0) * 100)} 1–2★</strong>, so new listings don’t start from zero.
          Self-ships at {inr(price)} (below the {inr(C.PACK_POINT_MIN_PRICE.value)} Pack Point threshold).
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip kind="new">New: win-back diagnosis</Chip>
          <Chip kind="existing">Existing Meesho: seller quality score</Chip>
        </div>
      </DashedPanel>
    );
  }
  return (
    <DashedPanel title="His path: who packs it?" tone="white">
      <p className="text-sm">
        At {inr(price)} the bottle is below the {inr(C.PACK_POINT_MIN_PRICE.value)} Pack Point threshold, so he self-ships it. His second product, the {p.switchOptions[0]!.name} at{' '}
        {inr(listPrice(p.switchOptions[0]!.stack, p.switchOptions[0]!.margin))}, goes through the Rajkot Pack Point once it passes {C.PP_REFERENCE_MAKERS.value} makers. A deliberate trade-off:
        the node fee would eat most of the saving on a cheap SKU.
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Chip kind="partner">Partner-run: Pack Point</Chip>
        <Chip kind="existing">Existing Meesho: Valmo pickup</Chip>
      </div>
    </DashedPanel>
  );
}

export default function PersonaDetail() {
  const { id } = useParams();
  const p = personaById(id);
  if (!p) return <NotFound />;
  return <Detail p={p} />;
}

function Detail({ p }: { p: PersonaSpec }) {
  const def = page('/personas/:id');
  const story = PERSONA_STORY[p.id];
  const { base, cf } = usePersonaRuns(p.id);
  const first = p.name.split(' ')[0];
  return (
    <PageShell
      def={def}
      title={`${p.name}, ${p.business}`}
      trail={[{ label: 'Home', to: '/' }, { label: 'Personas', to: '/personas' }, { label: p.name }]}
      back={{ to: '/personas', label: 'All personas' }}
      next={{ to: `/journey/${p.id}`, label: `Play ${first}'s journey` }}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StagePill>{p.cohort}</StagePill>
        <StagePill tone="plum">Launch {p.launchNo}</StagePill>
        <span className="text-sm text-grey">
          {p.city} · {p.category} · {p.heroSku}
        </span>
        <Chip kind="synthetic" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-2 text-sm text-grey">{story.profile}</p>
          <p className="font-display text-3xl italic text-plum">“{p.mainAsk}”</p>
        </div>
        <BranchPanel p={p} />
      </div>

      <TitleTab size="sm" className="mb-3">
        1 · The problem, stage by stage
      </TitleTab>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s, i) => (
          <div key={s} className="rounded-xl border border-line bg-white p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-magenta">
              {i + 1}. {s}
            </div>
            <p className="text-sm">{story.pains[s]}</p>
          </div>
        ))}
      </div>

      <TitleTab size="sm" className="mb-3">
        2 · What we heard
      </TitleTab>
      <div className="mb-8 grid gap-3 md:grid-cols-3">
        {story.heard.map((h) => (
          <figure key={h.quote} className="rounded-xl border border-line bg-white p-4">
            <Quote size={16} className="mb-1 text-pink" aria-hidden />
            <blockquote className="font-display text-lg italic text-ink">{h.quote}</blockquote>
            <figcaption className="mt-2 text-[11px] text-grey">{h.source}</figcaption>
          </figure>
        ))}
        <div className="rounded-xl bg-plum p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-orange">Takeaway</div>
          <p className="mt-1 text-base">{story.takeaway}</p>
        </div>
      </div>

      <TitleTab size="sm" className="mb-3">
        3 · What changes, lever by lever
      </TitleTab>
      <ol className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {story.levers.map((l, i) => (
          <li key={l.lever} className="flex gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange text-sm font-bold text-ink">{i + 1}</span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{l.lever}</span>
                <Chip kind={l.tag} />
              </div>
              <div className="text-[11px] text-magenta">{l.stage}</div>
              <p className="mt-1 text-sm text-grey">{l.change}</p>
            </div>
          </li>
        ))}
      </ol>

      <TitleTab size="sm" className="mb-3">
        4 · 90-day outcome vs today’s Meesho
      </TitleTab>
      <div className="mb-6 grid gap-6 rounded-2xl border border-line bg-white p-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-plum">
            Cumulative orders <Chip kind="simulated" />
          </div>
          <OutcomeChart base={base} cf={cf} />
        </div>
        <div>
          <OutcomeRows base={base} cf={cf} />
          <p className="mt-3 text-[11px] text-grey">
            Counterfactual: no demand data (guessed lot of {num(C.CF_GUESSED_LOT.value)}), no launch, no coach → churns around day {C.CF_CHURN_DAY.value}. Simulated, synthetic data; a
            forecast, not a guarantee.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Go to={`/journey/${p.id}`} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 font-semibold text-ink">
          <PlayCircle size={18} aria-hidden /> Play {first}’s journey
        </Go>
        <span className="text-sm text-grey">Other makers:</span>
        {PERSONA_SPECS.filter((x) => x.id !== p.id).map((x) => (
          <Go key={x.id} to={`/personas/${x.id}`} className="text-sm font-semibold text-magenta hover:underline">
            {x.name}
          </Go>
        ))}
      </div>
    </PageShell>
  );
}
