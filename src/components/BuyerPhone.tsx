import type { ReactNode } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

/**
 * The buyer's phone (Meesho app). Buyer-facing: compliant copy only. No price-superlative
 * claims, no countdowns, no strike-throughs, and no buyer-facing "factory" badge.
 */
export function BuyerPhone({ children, query, scale }: { children: ReactNode; query?: string; scale?: number }) {
  return (
    <PhoneFrame
      scale={scale}
      label="Buyer phone"
      header={
        <div className="space-y-2 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-pink">meesho</span>
            <ShoppingBag size={22} className="text-ink" aria-hidden />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-grey">
            <Search size={16} aria-hidden />
            {query ?? 'Search products'}
          </div>
        </div>
      }
    >
      <div className="space-y-3 bg-cream/40 p-4 text-base">{children}</div>
    </PhoneFrame>
  );
}
