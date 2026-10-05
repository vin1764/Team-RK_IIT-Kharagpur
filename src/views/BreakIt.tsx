import { useState } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../app/store';
import { runSim } from '../app/useSim';
import { scenarioById, type ScenarioId } from '../engine/scenarios';
import type { SimResult } from '../engine/simulate';
import { Chip } from '../components/Chip';
import { DecisionCard } from '../components/DecisionCard';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { SectionPage } from './SectionPage';

const IDS: ScenarioId[] = ['launchFlops', 'priceRaise', 'resellerSignup', 'smallNode', 'coachFixFails'];

/** Which events tell the story of each scenario. */
const STORY: Record<ScenarioId, string[]> = {
  launchFlops: ['live', 'gate'],
  priceRaise: ['priceBreach', 'visibilityCut', 'gate'],
  resellerSignup: ['recordMismatch', 'costCheck', 'priceBreach', 'gate'],
  smallNode: ['fulfilmentChoice', 'switch', 'gate'],
  coachFixFails: ['coachNudge', 'fixRecheck', 'kamCase', 'newRule'],
  thinnerSteel: [],
  rivalDump: [],
  crowdedGap: [],
  forecastOverPromise: [],
  saleWeekB: [],
};

function compare(base: SimResult, s: SimResult) {
  const g = (r: SimResult) => r.gates;
  return [
    { label: 'Gate 1 (day 30)', base: g(base).g1?.decision ?? '—', s: g(s).g1?.decision ?? '—' },
    { label: 'Stick rate', base: num(g(base).g1?.inputs[0]?.value ?? 0, 2), s: num(g(s).g1?.inputs[0]?.value ?? 0, 2) },
    { label: 'Lift', base: `${num(g(base).g1?.inputs[1]?.value ?? 0, 2)}×`, s: `${num(g(s).g1?.inputs[1]?.value ?? 0, 2)}×` },
    { label: 'Gate 2 (day 60)', base: `${g(base).g2?.decision} · Pack Point ${g(base).g2?.packPoint.verdict.toLowerCase()}`, s: `${g(s).g2?.decision} · Pack Point ${g(s).g2?.packPoint.verdict.toLowerCase()} (${inr(g(s).g2?.packPoint.fee ?? 0)})` },
    { label: 'Orders (90 days)', base: num(base.kpis.totalOrders), s: num(s.kpis.totalOrders) },
    { label: 'Take-home', base: inr(base.kpis.takeHome), s: inr(s.kpis.takeHome) },
    { label: 'Prices held', base: pctText(base.kpis.pricesHeldPct, 1), s: pctText(s.kpis.pricesHeldPct, 1) },
    { label: 'KAM cases', base: num(base.kpis.kamCases), s: num(s.kpis.kamCases) },
  ];
}

export default function BreakIt() {
  const [id, setId] = useState<ScenarioId>('launchFlops');
  const seed = useApp((s) => s.seed);
  const sc = scenarioById(id);
  const base = runSim({ personaId: 'hiren', seed });
  const r = runSim({ personaId: 'hiren', seed, scenario: id });
  const story = r.events.filter((e) => STORY[id].includes(e.kind) && !base.events.some((b) => b.day === e.day && b.text === e.text)).slice(0, 6);
  const g1 = r.gates.g1;
  return (
    <SectionPage path="/break-it">
      <div className="mb-4 flex flex-wrap gap-2">
        {IDS.map((x) => {
          const s = scenarioById(x);
          return (
            <button key={x} type="button" aria-pressed={id === x} onClick={() => setId(x)} className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${id === x ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum'}`}>
              <Zap size={14} aria-hidden /> {s.n}. {s.title}
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Chip kind="simulated">Reruns the same engine on Hiren’s data</Chip>
        <span className="text-xs text-grey">Deck: {sc.deckRef}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 font-display text-lg font-bold text-plum">1 · What happened</h2>
          <ol className="space-y-2 text-sm">
            {story.map((e, i) => (
              <li key={i} className="border-l-4 border-orange pl-2">
                <span className="font-semibold">{dayLabel(e.day)}</span> · {e.text}
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-2xl border-2 border-plum bg-white p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-plum">
            <ShieldCheck size={18} /> 2 · Guardrail that fired
          </h2>
          <p className="mb-2 text-sm font-semibold">{sc.guardrail}</p>
          <ul className="space-y-2 text-sm">
            {r.guardrails.map((g, i) => (
              <li key={i} className="rounded-lg bg-blush p-2">
                <div className="text-xs font-semibold text-magenta">
                  {dayLabel(g.day)} · {g.guardrail}
                </div>
                <div>{g.what}</div>
                <div className="text-xs text-grey">Cost: {g.cost}</div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-grey">Expected (deck): {sc.expected}</p>
        </section>
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 font-display text-lg font-bold text-plum">3 · The numbers vs the base run</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-grey">
              <tr>
                <th className="text-left" />
                <th className="text-left">Base</th>
                <th className="text-left">This scenario</th>
              </tr>
            </thead>
            <tbody>
              {compare(base, r).map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-1 text-grey">{row.label}</td>
                  <td className="py-1">{row.base}</td>
                  <td className={`py-1 font-semibold ${row.base !== row.s ? 'text-plum' : ''}`}>{row.s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      {g1 && (
        <div className="mt-4 max-w-xl">
          <DecisionCard decision={g1.decision} gate="Gate 1 in this scenario" rule={g1.rule} inputs={g1.inputs.map((i) => ({ label: i.label, value: i.unit === '%' ? pctText(i.value, 1) : i.unit === '×' ? `${num(i.value, 2)}×` : num(i.value, 2), pass: i.pass }))} />
        </div>
      )}
    </SectionPage>
  );
}
