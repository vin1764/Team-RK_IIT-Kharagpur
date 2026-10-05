import { useState } from 'react';
import { ENABLER_RULE, GATES, LEVERS, type Gate, type LeverStatus } from '../data/levers';
import { SectionPage } from './SectionPage';

const STATUS_TONE: Record<LeverStatus, string> = {
  Kept: 'bg-good text-white',
  Merged: 'bg-orange-soft text-ink',
  Deferred: 'bg-warn text-ink',
  Dropped: 'bg-bad/15 text-bad',
};

export default function Levers() {
  const [status, setStatus] = useState<LeverStatus | 'All'>('All');
  const [gate, setGate] = useState<Gate | 'Any'>('Any');
  const count = (s: LeverStatus) => LEVERS.filter((l) => l.status === s).length;
  const rows = LEVERS.filter((l) => (status === 'All' || l.status === status) && (gate === 'Any' || l.fails.includes(gate)));
  return (
    <SectionPage path="/levers">
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {GATES.map((g) => (
          <div key={g.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="text-xs font-bold text-magenta">{g.id}</div>
            <div className="font-display text-xl font-bold text-plum">{g.name}</div>
            <p className="mt-1 text-sm text-grey">{g.test}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-plum p-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange">Gates don’t average</div>
          <p className="mt-1">One “no” eliminates a lever.</p>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-orange">Enabler exception</div>
          <p className="mt-1">{ENABLER_RULE}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {(['Kept', 'Merged', 'Deferred', 'Dropped'] as const).map((s) => (
            <div key={s} className="rounded-2xl border border-line bg-white p-3">
              <div className="font-display text-3xl font-bold text-plum">{count(s)}</div>
              <div className="text-xs text-grey">{s}</div>
            </div>
          ))}
          <p className="col-span-4 text-xs text-grey">{LEVERS.length} levers considered. 30-day quick win: Factory Launch Week.</p>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-grey">Status:</span>
        {(['All', 'Kept', 'Merged', 'Deferred', 'Dropped'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 font-semibold ${status === s ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum'}`}>
            {s}
          </button>
        ))}
        <span className="ml-3 text-grey">Fails gate:</span>
        {(['Any', 'G1', 'G2', 'G3', 'G4'] as const).map((g) => (
          <button key={g} type="button" aria-pressed={gate === g} onClick={() => setGate(g)} className={`rounded-full border px-3 py-1 font-semibold ${gate === g ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum'}`}>
            {g}
          </button>
        ))}
        <span className="text-grey">{rows.length} shown</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-blush text-xs text-plum">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Lever</th>
              <th className="px-3 py-2">Area</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Fails</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="px-3 py-1.5 text-grey">{l.id}</td>
                <td className="px-3 py-1.5 font-medium">{l.name}</td>
                <td className="px-3 py-1.5 text-xs text-grey">{l.area}</td>
                <td className="px-3 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[l.status]}`}>{l.status}</span>
                  {l.enabler && <span className="ml-1 rounded-full bg-magenta px-2 py-0.5 text-[11px] font-semibold text-white">Enabler</span>}
                </td>
                <td className="px-3 py-1.5 text-xs">{l.fails.length ? l.fails.join(', ') : '—'}</td>
                <td className="px-3 py-1.5 text-xs">{l.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPage>
  );
}
