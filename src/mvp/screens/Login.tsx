import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Go } from '../../app/Go';
import { Chip } from '../../components/Chip';
import { PERSONA_SPECS } from '../../data/personas';
import { useMvp } from '../state';
import { dayLabel } from '../../lib/format';

const ASK: Record<string, string> = {
  hiren: 'Will it sell? Who packs it?',
  ayesha: 'What’s my net after fees and RTOs?',
  sunita: 'Will anyone see my listings this time?',
};

/** Demo account picker: each account keeps its own state. */
export default function Login() {
  const states = useMvp((s) => s.states);
  useEffect(() => {
    document.title = 'Log in · Maker app';
  }, []);
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-plum">Log in as a demo maker</h1>
        <p className="mt-1 text-sm text-grey">
          Each account keeps its own progress on this device. Use “Demo controls” to move the day forward; “Reset account” starts it again.
        </p>
      </div>
      <ul className="space-y-3">
        {PERSONA_SPECS.map((p, i) => {
          const s = states[p.id];
          return (
            <li key={p.id}>
              <Go
                to={`/app/today?as=${p.id}`}
                next={i === 0}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-magenta"
                label={`Log in as ${p.name}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush font-display text-xl font-bold text-plum">{p.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-ink">{p.name}</span>
                  <span className="block text-sm text-grey">
                    {p.business} · {p.city}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-cream px-2 py-0.5">{p.cohort}</span>
                    <span className="rounded-full bg-cream px-2 py-0.5">{p.category}</span>
                    <span className="rounded-full bg-cream px-2 py-0.5">Now: {dayLabel(s.day)}</span>
                  </span>
                  <span className="mt-1 block text-sm italic text-plum">“{ASK[p.id]}”</span>
                </span>
                <ChevronRight className="shrink-0 text-magenta" aria-hidden />
              </Go>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-2 text-xs text-grey">
        <Chip kind="synthetic" /> Synthetic makers; every number comes from the simulation engine.
      </p>
    </div>
  );
}
