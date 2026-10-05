import type { ReactNode } from 'react';
import { inr } from '../lib/format';

/** Price band: break-even ↔ B with the price marker. */
export function BandBar({ breakEven, B, price, big = false }: { breakEven: number; B: number; price: number; big?: boolean }) {
  const lo = Math.min(breakEven, price) * 0.9;
  const hi = Math.max(B, price) * 1.08;
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  const inBand = price >= breakEven && price <= B;
  return (
    <div className={big ? 'py-6' : 'py-4'}>
      <div className={`relative ${big ? 'h-4' : 'h-3'} rounded-full bg-blush`}>
        <div className="absolute inset-y-0 rounded-full bg-good/30" style={{ left: pos(breakEven), width: `calc(${pos(B)} - ${pos(breakEven)})` }} />
        <div className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-grey" style={{ left: pos(breakEven) }}>
          Break-even {inr(breakEven)}
        </div>
        <div className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-plum" style={{ left: pos(B) }}>
          B {inr(B)}
        </div>
        <div
          className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow ${inBand ? 'bg-good' : 'bg-bad'}`}
          style={{ left: pos(price) }}
          aria-label={`Price ${inr(price)}`}
        />
        <div className={`absolute top-5 -translate-x-1/2 whitespace-nowrap text-xs font-bold ${inBand ? 'text-good' : 'text-bad'}`} style={{ left: pos(price) }}>
          {inr(price)}
        </div>
      </div>
    </div>
  );
}

/** Intentional product illustrations (local SVG, no external images). */
export function ProductArt({ type, className = 'h-24' }: { type: string; className?: string }) {
  const t = type.toLowerCase();
  if (t.includes('bowl'))
    return (
      <svg viewBox="0 0 100 60" className={className} aria-hidden>
        <ellipse cx="50" cy="22" rx="44" ry="8" fill="#E9C46A" />
        <path d="M6 22 Q50 70 94 22" fill="#D4A72C" />
        <ellipse cx="50" cy="22" rx="36" ry="5" fill="#F4DFA0" />
      </svg>
    );
  if (t.includes('jewellery'))
    return (
      <svg viewBox="0 0 100 70" className={className} aria-hidden>
        <path d="M15 10 Q50 70 85 10" fill="none" stroke="#D4A72C" strokeWidth="4" />
        <circle cx="50" cy="48" r="8" fill="#F43397" stroke="#D4A72C" strokeWidth="3" />
        <circle cx="10" cy="40" r="5" fill="#D4A72C" />
        <circle cx="90" cy="40" r="5" fill="#D4A72C" />
      </svg>
    );
  if (t.includes('casserole'))
    return (
      <svg viewBox="0 0 100 60" className={className} aria-hidden>
        <rect x="15" y="20" width="70" height="32" rx="10" fill="#C9C3CC" stroke="#7A4E70" strokeWidth="2" />
        <ellipse cx="50" cy="20" rx="38" ry="7" fill="#DCD7DE" stroke="#7A4E70" strokeWidth="2" />
        <rect x="44" y="6" width="12" height="6" rx="3" fill="#7A4E70" />
        <rect x="4" y="28" width="12" height="5" rx="2" fill="#7A4E70" />
        <rect x="84" y="28" width="12" height="5" rx="2" fill="#7A4E70" />
      </svg>
    );
  if (t.includes('sipper'))
    return (
      <svg viewBox="0 0 40 100" className={className} aria-hidden>
        <rect x="12" y="4" width="16" height="12" rx="3" fill="#F43397" />
        <rect x="9" y="16" width="22" height="78" rx="8" fill="#C9C3CC" stroke="#7A4E70" strokeWidth="1.5" />
      </svg>
    );
  if (t.includes('oil'))
    return (
      <svg viewBox="0 0 40 100" className={className} aria-hidden>
        <rect x="15" y="6" width="10" height="14" rx="2" fill="#1E9E5A" />
        <rect x="8" y="20" width="24" height="74" rx="6" fill="#E9C46A" stroke="#7A4E70" strokeWidth="1.5" />
      </svg>
    );
  if (t.includes('slipper'))
    return (
      <svg viewBox="0 0 100 50" className={className} aria-hidden>
        <ellipse cx="50" cy="30" rx="44" ry="14" fill="#9F2089" />
        <path d="M30 22 Q50 2 70 22" fill="none" stroke="#2B1026" strokeWidth="5" />
      </svg>
    );
  return (
    <svg viewBox="0 0 40 100" className={className} aria-hidden>
      <rect x="13" y="2" width="14" height="10" rx="2" fill="#7A4E70" />
      <rect x="8" y="12" width="24" height="84" rx="8" fill="#C9C3CC" stroke="#7A4E70" strokeWidth="1.5" />
      <rect x="12" y="20" width="4" height="66" rx="2" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
}

export function PhoneCard({ children, tone = 'white', className = '' }: { children: ReactNode; tone?: 'white' | 'orange' | 'plum' | 'blush'; className?: string }) {
  const tones = {
    white: 'bg-white border border-line',
    orange: 'bg-orange-soft/70 border-2 border-orange',
    plum: 'bg-plum text-white',
    blush: 'bg-blush',
  };
  return <div className={`rounded-2xl p-4 ${tones[tone]} ${className}`}>{children}</div>;
}

export function KV({ k, v, strong = false }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 ${strong ? 'text-xl font-bold' : ''}`}>
      <span className={strong ? '' : 'text-grey'}>{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}

export function PanelTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="font-display text-lg font-bold text-plum">{children}</h3>
      <div className="flex flex-wrap gap-1">{right}</div>
    </div>
  );
}
