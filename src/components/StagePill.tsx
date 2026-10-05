import type { ReactNode } from 'react';

/** Orange pill for stage labels ("① Factory Onboarding", "Day 21–25"). */
export function StagePill({ children, tone = 'orange' }: { children: ReactNode; tone?: 'orange' | 'plum' | 'magenta' }) {
  const tones = {
    orange: 'bg-orange text-ink',
    plum: 'bg-plum text-white',
    magenta: 'bg-magenta text-white',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
