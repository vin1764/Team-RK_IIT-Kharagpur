import { useState } from 'react';
import { dayLabel } from '../../lib/format';
import { Caption, NudgeCard, Screen, useV } from '../ui';

/** Every nudge so far, newest first. Unread = not opened yet. */
export default function Inbox() {
  const v = useV();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const list = [...v.timeline].reverse().filter((n) => tab === 'all' || !v.state.read[n.id]);
  const shown = list.slice(0, 60);
  return (
    <Screen title={v.t.inbox} back={{ to: '/app/today', label: v.t.backToToday }}>
      <div className="flex gap-2" role="tablist">
        {(['all', 'unread'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === k ? 'bg-plum text-white' : 'bg-white text-plum border border-plum'}`}>
            {v.t[k]}
          </button>
        ))}
      </div>
      {shown.length === 0 && <Caption>No nudges yet. They start once your launch slot is committed.</Caption>}
      <ul className="space-y-2">
        {shown.map((n, i) => (
          <li key={n.id}>
            {(i === 0 || shown[i - 1]!.firedDay !== n.firedDay) && <div className="mb-1 mt-2 text-xs font-semibold text-grey">{dayLabel(n.firedDay)}</div>}
            <NudgeCard n={n} v={v} showActions={n.expiresDay >= v.day} compact />
          </li>
        ))}
      </ul>
      {list.length > shown.length && <Caption>Showing the latest {shown.length} of {list.length}.</Caption>}
    </Screen>
  );
}
