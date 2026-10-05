import { ArrowRight, PlayCircle } from 'lucide-react';
import { Go } from '../app/Go';
import { usePersonaRuns } from '../app/useSim';
import { PERSONA_SPECS, type PersonaSpec } from '../data/personas';
import { PERSONA_STORY, STAGES } from '../data/personaStory';
import { StagePill } from '../components/StagePill';
import { Chip } from '../components/Chip';
import { OutcomeRows } from '../components/OutcomeRows';
import { SectionPage } from './SectionPage';

function OutcomeCell({ p }: { p: PersonaSpec }) {
  const { base, cf } = usePersonaRuns(p.id);
  return <OutcomeRows base={base} cf={cf} compact />;
}

export default function Personas() {
  return (
    <SectionPage path="/personas">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip kind="synthetic">Synthetic personas, built from our calls</Chip>
        <Chip kind="simulated">Outcomes simulated by the same engine</Chip>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[960px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-40" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-plum text-white">
              <th className="px-3 py-2 font-semibold">Cohort</th>
              {PERSONA_SPECS.map((p) => (
                <th key={p.id} className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg">{p.cohort}</span>
                    {p.isHero && <StagePill>Hero</StagePill>}
                  </div>
                  <div className="text-xs font-normal text-white/80">
                    {p.name} · {p.business}, {p.city}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line align-top">
              <th className="bg-blush px-3 py-2 text-xs font-semibold text-plum">Who</th>
              {PERSONA_SPECS.map((p) => (
                <td key={p.id} className="px-3 py-2 text-xs">
                  {PERSONA_STORY[p.id].profile}
                </td>
              ))}
            </tr>
            <tr className="border-t border-line align-top">
              <th className="bg-blush px-3 py-2 text-xs font-semibold text-plum">Main ask</th>
              {PERSONA_SPECS.map((p) => (
                <td key={p.id} className="px-3 py-2 font-display text-base italic text-plum">
                  “{p.mainAsk}”
                </td>
              ))}
            </tr>
            {STAGES.map((s, i) => (
              <tr key={s} className="border-t border-line align-top">
                <th className="bg-blush px-3 py-2 text-xs font-semibold text-plum">
                  {i === 0 && <div className="mb-1 text-[10px] uppercase tracking-wide text-grey">Pain points by stage</div>}
                  {s}
                </th>
                {PERSONA_SPECS.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-xs text-ink">
                    {PERSONA_STORY[p.id].pains[s]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line align-top">
              <th className="bg-blush px-3 py-2 text-xs font-semibold text-plum">What changes</th>
              {PERSONA_SPECS.map((p) => (
                <td key={p.id} className="px-3 py-2">
                  <ul className="space-y-1.5 text-xs">
                    {PERSONA_STORY[p.id].levers.slice(0, 4).map((l) => (
                      <li key={l.lever}>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-semibold">{l.lever}</span>
                          <Chip kind={l.tag} />
                        </div>
                        <div className="text-grey">{l.change}</div>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr className="border-t border-line align-top">
              <th className="bg-blush px-3 py-2 text-xs font-semibold text-plum">90-day outcome vs today</th>
              {PERSONA_SPECS.map((p) => (
                <td key={p.id} className="px-3 py-2">
                  <OutcomeCell p={p} />
                </td>
              ))}
            </tr>
            <tr className="border-t border-line">
              <th className="bg-blush px-3 py-2" />
              {PERSONA_SPECS.map((p) => (
                <td key={p.id} className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Go
                      to={`/personas/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-plum px-3 py-1 text-xs font-semibold text-plum hover:bg-blush"
                    >
                      {p.name.split(' ')[0]}’s story <ArrowRight size={12} aria-hidden />
                    </Go>
                    <Go to={`/journey/${p.id}`} className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1 text-xs font-semibold text-ink">
                      <PlayCircle size={12} aria-hidden /> Play journey
                    </Go>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPage>
  );
}
