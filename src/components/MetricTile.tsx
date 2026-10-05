import type { ReactNode } from 'react';

export type StatusTone = 'good' | 'warn' | 'bad' | 'none';

const DOT: Record<StatusTone, string> = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', none: 'bg-line' };
const WORD: Record<StatusTone, string> = { good: 'On target', warn: 'Watch', bad: 'Off target', none: 'No target' };

/** Big number + label + target + status dot. */
export function MetricTile({
  value,
  label,
  target,
  status = 'none',
}: {
  value: ReactNode;
  label: ReactNode;
  target?: ReactNode;
  status?: StatusTone;
}) {
  return (
    <div className="flex min-w-[10rem] flex-col gap-1 rounded-xl border border-line bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-grey">{label}</span>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[status]}`} role="img" aria-label={WORD[status]} title={WORD[status]} />
      </div>
      <div className="font-display text-3xl font-bold text-plum">{value}</div>
      {target && <div className="text-[11px] text-grey">Target: {target}</div>}
    </div>
  );
}
