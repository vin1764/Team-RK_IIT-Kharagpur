import type { ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useApp } from '../app/store';
import { en, type MakerStrings } from '../i18n/en';
import { hi } from '../i18n/hi';

export const useMakerStrings = (): MakerStrings => (useApp((s) => s.lang) === 'hi' ? hi : en);

/** The maker's phone (supplier app), with a Hindi/English toggle. Orange = maker action. */
export function MakerPhone({ children, scale, fitViewport }: { children: (t: MakerStrings) => ReactNode; scale?: number; fitViewport?: boolean }) {
  const t = useMakerStrings();
  const toggleLang = useApp((s) => s.toggleLang);
  return (
    <PhoneFrame
      scale={scale}
      fitViewport={fitViewport}
      label="Maker phone"
      header={
        <div className="flex items-center justify-between bg-plum px-4 py-2 text-white">
          <span className="text-lg font-semibold">{t.appName}</span>
          <button
            type="button"
            onClick={toggleLang}
            aria-label={t.languageLabel}
            data-testid="lang-toggle"
            className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold"
          >
            <Languages size={16} aria-hidden />
            {t.language}
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-3 text-sm">{children(t)}</div>
    </PhoneFrame>
  );
}
