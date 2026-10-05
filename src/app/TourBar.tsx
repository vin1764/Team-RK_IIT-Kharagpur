import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from './store';
import { TOUR } from './tour';

/** Fixed caption bar while the judge tour runs. ← → move; Esc or ✕ exits. */
export function TourBar() {
  const step = useApp((s) => s.tourStep);
  const setStep = useApp((s) => s.setTourStep);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === null) return;
    navigate(TOUR[step]!.to);
  }, [step, navigate]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStep(step < TOUR.length - 1 ? step + 1 : null);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep(Math.max(0, step - 1));
      }
      if (e.key === 'Escape') setStep(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [step, setStep]);

  if (step === null) return null;
  const s = TOUR[step]!;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-orange bg-plum-deep text-white shadow-2xl" role="region" aria-label="Judge tour" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous tour step" className="rounded-full bg-white/15 p-2 disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-ink" data-testid="tour-step">
              {step + 1} / {TOUR.length}
            </span>
            <span className="font-display text-lg font-bold">{s.title}</span>
          </div>
          <p className="text-sm text-white/90">{s.caption}</p>
          <div className="mt-1 flex gap-1" aria-hidden>
            {TOUR.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-orange' : 'bg-white/25'}`} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setStep(step < TOUR.length - 1 ? step + 1 : null)} aria-label={step < TOUR.length - 1 ? 'Next tour step' : 'Finish tour'} className="rounded-full bg-orange p-2 text-ink">
          <ChevronRight size={18} />
        </button>
        <button type="button" onClick={() => setStep(null)} aria-label="Exit tour" className="rounded-full bg-white/15 p-2">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
