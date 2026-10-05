import type { ReactNode } from 'react';
import { Building2, FlaskConical, Handshake, Sparkles, Database, HelpCircle } from 'lucide-react';
import type { PsQuestion } from '../data/copy';
import { PS_QUESTIONS } from '../data/copy';

export type ChipKind = 'existing' | 'new' | 'partner' | 'simulated' | 'synthetic';

const CHIP: Record<ChipKind, { label: string; cls: string; icon: ReactNode }> = {
  existing: { label: 'Existing Meesho', cls: 'bg-plum text-white', icon: <Building2 size={12} aria-hidden /> },
  new: { label: 'New', cls: 'bg-orange-soft text-ink border border-orange', icon: <Sparkles size={12} aria-hidden /> },
  partner: { label: 'Partner-run', cls: 'bg-white text-plum border border-plum', icon: <Handshake size={12} aria-hidden /> },
  simulated: { label: 'Simulated', cls: 'bg-magenta/10 text-magenta border border-magenta', icon: <FlaskConical size={12} aria-hidden /> },
  synthetic: { label: 'Synthetic data', cls: 'bg-white text-grey border border-line', icon: <Database size={12} aria-hidden /> },
};

/** Feasibility tag: every component says whether it exists at Meesho today, is new, or partner-run. */
export function Chip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  const c = CHIP[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>
      {c.icon}
      {children ?? c.label}
    </span>
  );
}

/** Persistent "Answers the PS" chip on the screens that answer a PS question. */
export function AnswersPs({ q }: { q: PsQuestion[] }) {
  if (q.length === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-pink px-2.5 py-0.5 text-[11px] font-semibold text-white"
      title={q.map((x) => `${x}: ${PS_QUESTIONS[x]}`).join('\n')}
    >
      <HelpCircle size={12} aria-hidden />
      Answers the PS · {q.join(' · ')}
    </span>
  );
}
