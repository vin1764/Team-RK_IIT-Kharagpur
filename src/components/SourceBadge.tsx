import type { Status } from '../data/constants';

const TONE: Record<Status, string> = {
  'Meesho filing': 'bg-plum text-white',
  'Public policy (seller guides)': 'bg-magenta text-white',
  'Mentor input': 'bg-pink text-white',
  'Team model': 'bg-orange text-ink',
  'Team estimate': 'bg-orange-soft text-ink',
  Synthetic: 'bg-white text-grey border border-line',
};

/** Shows where a number comes from. */
export function SourceBadge({ status }: { status: Status }) {
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${TONE[status]}`}>{status}</span>;
}
