import { C } from '../data/constants';
import { dayLabel } from '../lib/format';

export interface TimelineMarker {
  day: number;
  label: string;
  kind: 'chapter' | 'gate';
}

/** Scrubber from Day −14 to Day 90 with chapter and gate markers. */
export function Timeline({ day, onChange, markers }: { day: number; onChange: (d: number) => void; markers: TimelineMarker[] }) {
  const { min, max } = C.TIMELINE_DAYS.value;
  const pos = (d: number) => `${((d - min) / (max - min)) * 100}%`;
  return (
    <div className="w-full rounded-xl border border-line bg-white px-4 pb-3 pt-2">
      <div className="mb-1 flex items-center justify-between text-xs text-grey">
        <span>{dayLabel(min)}</span>
        <span className="rounded-full bg-plum px-2 py-0.5 font-semibold text-white" data-testid="timeline-day">
          {dayLabel(day)}
        </span>
        <span>{dayLabel(max)}</span>
      </div>
      <div className="relative h-8">
        {markers.map((m) => (
          <button
            key={`${m.kind}-${m.day}`}
            type="button"
            onClick={() => onChange(m.day)}
            title={`${dayLabel(m.day)} · ${m.label}`}
            aria-label={`Jump to ${dayLabel(m.day)}: ${m.label}`}
            className={`absolute top-0 -translate-x-1/2 rounded-sm ${m.kind === 'gate' ? 'h-4 w-4 rotate-45 bg-plum' : 'h-3 w-1.5 bg-orange'}`}
            style={{ left: pos(m.day) }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          value={day}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Timeline day"
          className="absolute bottom-0 left-0 w-full accent-plum"
        />
      </div>
    </div>
  );
}
