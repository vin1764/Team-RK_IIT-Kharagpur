import type { ReactNode } from 'react';
import { C2M_TERMS, FORMULA_FUEL, type FormulaTerm } from '../data/copy';

export interface ImpactRow {
  label: string;
  value: ReactNode;
}

/** Right-rail tracker: the C2M formula with lit terms, plus maker / buyer / Meesho rows. */
export function ImpactTracker({
  lit,
  maker,
  buyer,
  meesho,
}: {
  lit: FormulaTerm['id'][];
  maker: ImpactRow[];
  buyer: ImpactRow[];
  meesho: ImpactRow[];
}) {
  const group = (title: string, rows: ImpactRow[], cls: string) => (
    <div>
      <div className={`mb-1 text-xs font-semibold ${cls}`}>{title}</div>
      <dl className="space-y-0.5 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2">
            <dt className="text-grey">{r.label}</dt>
            <dd className="font-semibold">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <aside className="space-y-3 rounded-2xl border border-line bg-white p-3" aria-label="Impact tracker">
      <div>
        <div className="mb-1 text-xs font-semibold text-plum">C2M price contribution</div>
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {C2M_TERMS.map((t, i) => (
            <span key={t.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-grey">×</span>}
              <span
                className={`rounded px-1.5 py-0.5 transition-colors duration-200 ${lit.includes(t.id) ? 'bg-orange font-semibold text-ink' : 'bg-blush text-grey'}`}
              >
                {t.term}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-grey">{FORMULA_FUEL}</p>
      </div>
      {group('Maker', maker, 'text-orange')}
      {group('Buyer', buyer, 'text-pink')}
      {group('Meesho', meesho, 'text-plum')}
    </aside>
  );
}
