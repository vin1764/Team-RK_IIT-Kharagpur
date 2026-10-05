import type { ReactNode } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

/**
 * The buyer's phone (Meesho app). Buyer-facing: compliant copy only. No price-superlative
 * claims, no countdowns, no strike-throughs, and no buyer-facing "factory" badge.
 */
export function BuyerPhone({ children, query, scale, fitViewport }: { children: ReactNode; query?: string; scale?: number; fitViewport?: boolean }) {
  return (
    <PhoneFrame
      scale={scale}
      fitViewport={fitViewport}
      label="Buyer phone"
      header={
        <div className="space-y-1.5 bg-white px-3 py-2 shadow-sm">
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
      <div className="space-y-2 bg-cream/40 p-3 text-sm">{children}</div>
    </PhoneFrame>
  );
}
