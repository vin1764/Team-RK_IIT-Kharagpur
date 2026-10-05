import type { ReactNode } from 'react';

/** Grouped panel with the deck's dashed plum border. */
export function DashedPanel({
  title,
  children,
  className = '',
  tone = 'cream',
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'cream' | 'white' | 'blush';
}) {
  const bg = { cream: 'bg-cream', white: 'bg-white', blush: 'bg-blush' }[tone];
  return (
    <section className={`rounded-2xl border-2 border-dashed border-plum/60 p-4 ${bg} ${className}`}>
      {title && <h3 className="mb-3 font-display text-lg font-bold text-plum">{title}</h3>}
      {children}
    </section>
  );
}
