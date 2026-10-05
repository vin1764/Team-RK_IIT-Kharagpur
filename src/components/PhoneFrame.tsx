import type { ReactNode } from 'react';

/** Phone viewport the content is designed at; scaled down to fit the three-view layout. */
const W = 390;
const H = 844;

/** A 390×844 phone, scaled. */
export function PhoneFrame({
  children,
  header,
  scale = 0.6,
  label,
}: {
  children: ReactNode;
  header: ReactNode;
  scale?: number;
  label: string;
}) {
  return (
    <div style={{ width: W * scale, height: H * scale }} className="shrink-0" role="region" aria-label={label}>
      <div
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        className="flex flex-col overflow-hidden rounded-[44px] border-[10px] border-ink bg-white shadow-2xl"
      >
        <div className="flex h-7 shrink-0 items-center justify-center bg-ink">
          <div className="h-4 w-24 rounded-full bg-black" />
        </div>
        {header}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
