import { CookingPot, Gem, GlassWater, Package, Soup } from 'lucide-react';

const iconFor = (sku: string) =>
  sku.includes('bottle') || sku.includes('sipper') ? GlassWater : sku.includes('jewel') ? Gem : sku.includes('casserole') ? CookingPot : sku.includes('bowl') || sku.includes('lunch') ? Soup : Package;

/** Placeholder product photo (synthetic). `raw` = the maker's own shot; otherwise the bot's cleaned version. */
export function ProductArt({ sku, raw = false, angle = 0, size = 72 }: { sku: string; raw?: boolean; angle?: number; size?: number }) {
  const Icon = iconFor(sku);
  return (
    <div
      className={`flex items-center justify-center rounded-lg ${raw ? 'bg-gradient-to-br from-[#c9b8a6] to-[#8d7b6a]' : 'border border-line bg-white'}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={size * 0.55} strokeWidth={1.4} className={raw ? 'text-[#3d332b] opacity-80' : 'text-plum'} style={{ transform: `rotate(${raw ? angle * 9 - 8 : 0}deg)` }} />
    </div>
  );
}
