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
    path: '/',
    nav: 'Home',
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
    next: '/personas',
    inNav: true,
  },
  {
    path: '/personas',
    nav: 'Personas',
    title: 'Three cohorts of makers',
    summary: 'Offline only, online elsewhere, churned from Meesho: one engine, three problems, three paths.',
    contains: ['Side-by-side comparison', 'A card per persona'],
    ps: ['Q2'],
    next: '/personas/hiren',
    inNav: true,
  },
  {
    path: '/personas/:id',
    nav: 'Persona',
    title: 'Persona',
    summary: 'Problem → what we heard → solution path → outcome vs the status quo.',
    contains: ['Who they are', 'Their main question', 'Pain points on the 6-stage journey', 'What changes for them', '90-day outcome vs counterfactual'],
    ps: ['Q2'],
    next: '/journey/:id',
    inNav: false,
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
    next: '/levers',
    inNav: true,
  },
  {
    path: '/levers',
    nav: 'Levers',
    title: 'Gates and levers',
    summary: 'Four gates every lever must pass: subsidy-free, scalable, price-reducing, durable.',
    contains: ['The 4 gates', 'The enabler rule', 'All levers considered, filterable'],
    ps: ['Q3'],
    next: '/break-it',
    inNav: true,
  },
  {
    path: '/break-it',
    nav: 'Break it',
    title: 'What-if lab',
    summary: 'Try to break the system and see which guardrail catches it.',
    contains: ['Scenario switches', 'What happened → guardrail fired → what it cost'],
    ps: ['Q4'],
    next: '/verify',
    inNav: true,
  },
  {
    path: '/verify',
    nav: 'Verify',
    title: 'Numbers and policy',
    summary: 'Every constant in the prototype with its value, source and status.',
    contains: ['Every constant: value, source, status', 'Policy checks', 'Known caveats'],
    ps: [],
    next: '/roadmap',
    inNav: true,
  },
  {
    path: '/roadmap',
    nav: 'Roadmap',
    title: '30-60-90 roadmap',
    summary: 'Sprints A–F, with gates at day 30, 60 and 90 and their kill criteria.',
    contains: ['Sprints A–F', 'Gates with kill criteria', 'Linked live metrics'],
    ps: ['Q4'],
    next: '/tour',
    inNav: true,
  },
  {
    path: '/tour',
    nav: 'Tour',
    title: 'Judge tour',
    summary: 'A 4-minute guided path through the prototype. Use ← → to move.',
    contains: ['12–14 captioned steps', '← → keys', 'Exit any time'],
    ps: ['Q1', 'Q2', 'Q3', 'Q4'],
    next: '/',
    inNav: true,
  },
  {
    path: '/styleguide',
    nav: 'Styleguide',
    title: 'Styleguide',
    summary: 'Design-system components, rendered with values from constants.ts and formulas.ts.',
    contains: [],
    ps: [],
    next: '/',
    inNav: false,
  },
];

export const page = (path: string): PageDef => {
  const p = PAGES.find((x) => x.path === path);
  if (!p) throw new Error(`Unknown page ${path}`);
  return p;
};

/** Pages built so far. Unfinished pages keep their route (no dead links) but stay out of the nav and tiles. */
export const READY = new Set(['/', '/problem', '/categories', '/personas', '/personas/:id', '/journey/:id', '/control-room', '/economics', '/impact', '/levers', '/break-it', '/verify', '/roadmap', '/tour']);

export const NAV_PAGES = PAGES.filter((p) => p.inNav && READY.has(p.path));

/** Where each PS question is answered (landing-page map). */
export const PS_MAP: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { label: string; to: string }[]> = {
  Q1: [{ label: 'Category Lab', to: '/categories' }],
  Q2: [
    { label: 'Personas', to: '/personas' },
    { label: 'Onboarding in the journey', to: '/journey/hiren' },
  ],
  Q3: [
    { label: 'Launch Week & Growth Loop', to: '/journey/hiren' },
    { label: 'Impact', to: '/impact' },
  ],
  Q4: [
    { label: 'Control room', to: '/control-room' },
    { label: 'Break-it lab', to: '/break-it' },
    { label: 'Roadmap & gates', to: '/roadmap' },
  ],
};
