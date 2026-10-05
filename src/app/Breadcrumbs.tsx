import { ChevronRight } from 'lucide-react';
import { Go } from './Go';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-grey">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} aria-hidden />}
            {c.to ? (
              <Go to={c.to} className="hover:text-magenta hover:underline">
                {c.label}
              </Go>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
