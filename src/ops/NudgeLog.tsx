import { useMemo, useState } from 'react';
import { runSim } from '../app/useSim';
import { personaById, type PersonaId } from '../data/personas';
import { isCleared, NUDGE_TYPES, nudgeTimeline, type NudgeType } from '../engine/nudges';
import { dayLabel } from '../lib/format';
import { useAccountState } from '../mvp/state';
import { Chip } from '../components/Chip';

/** Every nudge the engine sent a maker up to the demo day, with the cause behind it. */
export function NudgeLog({ pid, asOf }: { pid: PersonaId; asOf: number }) {
  const state = useAccountState(pid);
  const [type, setType] = useState<NudgeType | 'all'>('all');
  const p = personaById(pid)!;
  const all = useMemo(() => {
    const run = runSim({ personaId: pid });
    return nudgeTimeline({ id: pid, persona: run.persona, run }, state, asOf);
  }, [pid, state, asOf]);
  const counts = NUDGE_TYPES.map((t) => [t, all.filter((n) => n.type === t).length] as const).filter(([, n]) => n > 0);
  const rows = all.filter((n) => type === 'all' || n.type === type).reverse();
  const first = p.name.split(' ')[0];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-plum">Nudge log · {p.name}</h2>
        <Chip kind="new" />
        <span className="text-xs text-grey">
          {all.length} nudges to {dayLabel(asOf)} · {all.filter((n) => isCleared(n, state)).length} acted on · {all.filter((n) => state.actions[n.id]?.action === 'dismissed').length} set aside
        </span>
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        <button type="button" onClick={() => setType('all')} className={`rounded-full px-2 py-0.5 font-semibold ${type === 'all' ? 'bg-plum text-white' : 'bg-blush text-plum'}`}>
          all {all.length}
        </button>
        {counts.map(([t, n]) => (
          <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full px-2 py-0.5 font-semibold ${type === t ? 'bg-plum text-white' : 'bg-blush text-plum'}`}>
            {t} {n}
          </button>
        ))}
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-xl border border-line">
        <table className="w-full text-xs" data-testid="nudge-log">
          <thead className="sticky top-0 bg-cream text-grey">
            <tr>
              <th className="px-2 py-1 text-left">Day</th>
              <th className="px-2 py-1 text-left">Cause</th>
              <th className="px-2 py-1 text-left">What the maker saw</th>
              <th className="px-2 py-1 text-left">Opens</th>
              <th className="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const a = state.actions[n.id];
              const status = a ? (a.action === 'dismissed' ? 'Set aside' : `Acted: ${a.action}`) : isCleared(n, state) ? 'Done' : n.expiresDay < asOf ? 'Expired' : 'Open';
              return (
                <tr key={n.id} className={`border-t border-line align-top ${n.priority === 'urgent' ? 'bg-bad/5' : ''}`}>
                  <td className="whitespace-nowrap px-2 py-1">{dayLabel(n.firedDay)}</td>
                  <td className="px-2 py-1">
                    <b className="text-magenta">{n.type}</b> fired for {first} · {n.source}
                  </td>
                  <td className="px-2 py-1">{n.title}</td>
                  <td className="px-2 py-1 font-mono">#{n.cta.route}</td>
                  <td className="whitespace-nowrap px-2 py-1">{status}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-grey">
                  No nudges yet. They start when the maker commits a launch slot.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
