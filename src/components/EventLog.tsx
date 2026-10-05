import { dayLabel } from '../lib/format';

export interface LogEvent {
  day: number;
  text: string;
  actor: 'maker' | 'system' | 'meesho' | 'buyer';
}

const ACTOR: Record<LogEvent['actor'], string> = {
  maker: 'border-l-orange',
  system: 'border-l-magenta',
  meesho: 'border-l-plum',
  buyer: 'border-l-pink',
};

/** Bottom event log: one line per event, colour-coded by who acted. */
export function EventLog({ events, newestFirst = false, className = 'max-h-48' }: { events: LogEvent[]; newestFirst?: boolean; className?: string }) {
  const sorted = [...events].sort((a, b) => (newestFirst ? b.day - a.day : a.day - b.day));
  return (
    <ol className={`space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-2 text-xs ${className}`} aria-label="Event log">
      {sorted.map((e, i) => (
        <li key={i} className={`border-l-4 bg-cream/60 px-2 py-1 ${ACTOR[e.actor]}`}>
          <span className="font-semibold text-plum">{dayLabel(e.day)}</span> · {e.text}
        </li>
      ))}
    </ol>
  );
}
