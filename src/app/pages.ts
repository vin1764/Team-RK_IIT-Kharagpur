/**
 * Page registry (CLAUDE.md section 7). Drives the top nav, breadcrumbs, the "next"
 * path on every page and the stub content until each page is built out.
 */
import type { PsQuestion } from '../data/copy';

export interface PageDef {
  path: string;
  /** Short nav label. */
  nav: string;
  title: string;
  summary: string;
  /** What the page contains (from the IA). */
  contains: string[];
  ps: PsQuestion[];
  next: string;
  inNav: boolean;
}

export const PAGES: PageDef[] = [
  {
    path: '/notes',
    nav: 'Case notes',
    title: 'Meesho C2M: factories to buyers',
    summary: 'The pitch, the organising formula, the three makers and a map of where each PS question is answered.',
    contains: ['One-line pitch', 'The C2M formula', 'Three persona cards', '4-minute judge tour', 'Tiles to every section', '"Answers the PS" map'],
    ps: [],
    next: '/categories',
    inNav: false,
  },
  {
    path: '/problem',
    nav: 'Problem',
    title: 'The problem',
    summary: 'Large manufacturers don’t come onto B2C, and those who do don’t stay. Here is why, in rupees and in their words.',
    contains: ['The PS in plain words', 'The ₹265 order: who takes what', 'Two problems × four challenges', 'What we heard: 4 calls, quotes, takeaways'],
    ps: ['Q2'],
    next: '/categories',
    inNav: true,
  },
  {
    path: '/categories',
    nav: 'Categories',
    title: 'Category Lab',
    summary: 'Which categories have a defensible price advantage, which don’t despite scale, and why.',
    contains: ['Scorecard with editable weights', 'Category cards with status and special rules', 'Maker Type × Turnover filter', 'Run a 30-day launch simulation per category'],
    ps: ['Q1'],
    next: '/journey/hiren',
    inNav: true,
  },
  {
    path: '/journey/:id',
    nav: 'Journey',
    title: 'The journey',
    summary: 'Day −14 to Day 90 through the maker’s phone, Meesho’s control room and the buyer’s phone.',
    contains: ['Timeline scrubber', 'Maker phone · Control room · Buyer phone', 'Chapter narration', 'Impact tracker', 'Event log', 'Focus mode', '"Without our solution" counterfactual'],
    ps: ['Q2', 'Q3'],
    next: '/control-room',
    inNav: true,
  },
  {
    path: '/control-room',
    nav: 'Control room',
    title: 'Meesho control room',
    summary: 'What Meesho measures, when it intervenes, and the rules fixed in advance.',
    contains: ['Demand engine', 'Benchmark B', 'Committed-supply ledger', 'Pack Point ops', 'Launch Week district control', 'Gates', 'Coach & KAM queue', 'Cohort metrics'],
    ps: ['Q4'],
    next: '/economics',
    inNav: true,
  },
  {
    path: '/economics',
    nav: 'Economics',
    title: 'Unit economics',
    summary: 'Per-order money for the maker, the buyer, Meesho, the Pack Point partner and couriers.',
    contains: ['Per-order waterfall per party', 'Pack Point P&L by makers pooled', 'Payment-cycle cash view'],
    ps: ['Q3'],
    next: '/impact',
    inNav: true,
  },
  {
    path: '/impact',
    nav: 'Impact',
    title: 'Scorecard and scale',
    summary: 'Day-90 results per persona, the formula with real values, and what it looks like at scale.',
    contains: ['Day-90 scorecard per persona', 'The formula with values', 'Year-one ramp and scale target', 'Year-2 view'],
    ps: ['Q3', 'Q4'],
    next: '/notes',
    inNav: true,
  },
];

export const page = (path: string): PageDef => {
  const p = PAGES.find((x) => x.path === path);
  if (!p) throw new Error(`Unknown page ${path}`);
  return p;
};

/** Pages built so far. Unfinished pages keep their route (no dead links) but stay out of the nav and tiles. */
export const READY = new Set(['/notes', '/problem', '/categories', '/journey/:id', '/control-room', '/economics', '/impact']);

export const NAV_PAGES = PAGES.filter((p) => p.inNav && READY.has(p.path));

/** Where each PS question is answered (landing-page map). */
export const PS_MAP: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { label: string; to: string }[]> = {
  Q1: [{ label: 'Category Lab', to: '/categories' }],
  Q2: [
    { label: 'Try the maker app', to: '/app' },
    { label: 'Onboarding in the journey', to: '/journey/hiren' },
  ],
  Q3: [
    { label: 'Launch Week & Growth Loop', to: '/journey/hiren' },
    { label: 'Impact', to: '/impact' },
  ],
  Q4: [
    { label: 'Control room', to: '/control-room' },
    { label: 'Economics', to: '/economics' },
  ],
};
