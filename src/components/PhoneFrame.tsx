import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Phone viewport the screens are designed for. */
const W = 390;
const H = 844;
/** Smallest phone height before we let the page scroll instead. */
const MIN_FIT = 260;
/** Breathing room under the phone. */
const GAP = 10;

/**
 * A phone, rendered at real size (no CSS scaling, so text stays ≥ 11 px). `scale` sets the width
 * (390 × scale). With `fitViewport`, the height is measured so the whole phone fits in the window
 * under whatever sits above it (header, tour bar, chapter bar); content scrolls inside the phone.
 */
export function PhoneFrame({
  children,
  header,
  scale = 0.6,
  label,
  fitViewport = false,
}: {
  children: ReactNode;
  header: ReactNode;
  scale?: number;
  label: string;
  fitViewport?: boolean;
}) {
  const width = Math.round(W * scale);
  const natural = Math.round(H * scale);
  const ref = useRef<HTMLDivElement>(null);
  const [fitted, setFitted] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!fitViewport) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setFitted(Math.max(MIN_FIT, Math.min(natural, Math.floor(window.innerHeight - top - GAP))));
    };
    measure();
    window.addEventListener('resize', measure);
    // Anything above the phone can change height (caption wraps, tour bar opens): re-measure.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [fitViewport, natural]);

  const height = fitViewport && fitted !== null ? fitted : natural;
  return (
    <div
      ref={ref}
      style={{ width, height }}
      className="flex shrink-0 flex-col overflow-hidden rounded-[32px] border-[8px] border-ink bg-white shadow-2xl"
      role="region"
      aria-label={label}
    >
      <div className="flex h-5 shrink-0 items-center justify-center bg-ink">
        <div className="h-3 w-20 rounded-full bg-black" />
      </div>
      {header}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
