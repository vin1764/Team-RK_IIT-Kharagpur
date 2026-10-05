import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type Decision = 'Invest' | 'Tighten' | 'Stop';

const STYLE: Record<Decision, { cls: string; icon: ReactNode }> = {
  Invest: { cls: 'border-good bg-good/10 text-good', icon: <CheckCircle2 size={22} aria-hidden /> },
  Tighten: { cls: 'border-warn bg-warn/10 text-warn', icon: <AlertTriangle size={22} aria-hidden /> },
  Stop: { cls: 'border-bad bg-bad/10 text-bad', icon: <XCircle size={22} aria-hidden /> },
};

/** A gate decision with the rule (fixed in advance) and the inputs that drove it. */
export function DecisionCard({
  decision,
  gate,
  rule,
  inputs,
}: {
  decision: Decision;
  gate: string;
  rule: string;
  inputs: { label: string; value: ReactNode; pass: boolean }[];
}) {
  const s = STYLE[decision];
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-grey">{gate}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-lg font-bold ${s.cls}`}>
          {s.icon}
          {decision}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {inputs.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-3">
            <span className="text-grey">{i.label}</span>
            <span className={`font-semibold ${i.pass ? 'text-good' : 'text-bad'}`}>
              {i.value} {i.pass ? '✓' : '✗'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-cream p-2 text-xs text-ink">
        <span className="font-semibold">Rule, fixed in advance: </span>
        {rule}
      </p>
    </div>
  );
}
