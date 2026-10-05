import { PlayCircle } from 'lucide-react';
import { useApp } from '../app/store';
import { TOUR } from '../app/tour';
import { Go } from '../app/Go';
import { SectionPage } from './SectionPage';

export default function Tour() {
  const setStep = useApp((s) => s.setTourStep);
  return (
    <SectionPage path="/tour">
      <button
        type="button"
        onClick={() => setStep(0)}
        data-testid="start-tour"
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-lg font-semibold text-ink shadow hover:brightness-105"
      >
        <PlayCircle size={22} aria-hidden /> Start the tour
      </button>
      <p className="mb-4 text-sm text-grey">{TOUR.length} steps, about 4 minutes. Use ← → (or the buttons in the caption bar) to move; Esc or ✕ exits at any time.</p>
      <ol className="grid gap-2 md:grid-cols-2">
        {TOUR.map((s, i) => (
          <li key={s.to + i} className="flex gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum text-sm font-bold text-white">{i + 1}</span>
            <div>
              <Go to={s.to} className="font-semibold text-plum hover:underline">
                {s.title}
              </Go>
              <p className="text-xs text-grey">{s.caption}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionPage>
  );
}
