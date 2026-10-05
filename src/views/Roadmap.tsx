import { ROADMAP_GATES, SPRINTS } from '../data/roadmap';
import { StagePill } from '../components/StagePill';
import { dayLabel } from '../lib/format';
import { SectionPage } from './SectionPage';

export default function Roadmap() {
  return (
    <SectionPage path="/roadmap">
      <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SPRINTS.map((s) => (
          <article key={s.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-plum font-display text-lg font-bold text-white">{s.id}</span>
              <StagePill>{s.days}</StagePill>
            </div>
            <h3 className="font-display text-lg font-bold text-plum">{s.title}</h3>
            <div className="mt-2 text-xs font-semibold text-magenta">Build (new)</div>
            <ul className="list-disc pl-4 text-sm">
              {s.build.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="mt-2 text-xs font-semibold text-plum">Reuse (existing Meesho)</div>
            <ul className="list-disc pl-4 text-sm text-grey">
              {s.reuse.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg bg-cream px-2 py-1 text-xs">
              <span className="font-semibold">Metric:</span> {s.metric}
            </div>
          </article>
        ))}
      </div>
      <h2 className="mb-3 font-display text-xl font-bold text-plum">Gates, fixed in advance</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {ROADMAP_GATES.map((g) => (
          <article key={g.day} className="rounded-2xl border-2 border-plum bg-white p-4">
            <div className="text-xs font-bold text-magenta">{dayLabel(g.day)}</div>
            <h3 className="font-display text-lg font-bold text-plum">{g.name}</h3>
            <p className="mt-2 rounded-lg bg-good/10 p-2 text-sm">
              <span className="font-semibold text-good">Go: </span>
              {g.go}
            </p>
            <p className="mt-2 rounded-lg bg-bad/10 p-2 text-sm">
              <span className="font-semibold text-bad">Kill / tighten: </span>
              {g.kill}
            </p>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
