/** Judge tour: ~4 minutes, ← → to move, exit any time. */
export interface TourStep {
  to: string;
  title: string;
  caption: string;
}

const j = (ch: number) => `/journey/hiren?ch=${ch}`;

export const TOUR: TourStep[] = [
  { to: '/', title: 'The pitch and the formula', caption: 'C2M price contribution = makers × share active at day 30 × orders per maker × price drop per order × share retained at day 90. Each term has an owner.' },
  { to: '/problem', title: 'The problem, and where each PS question is answered', caption: 'On a ₹265 order the middlemen take ₹72. Two problems: makers don’t come, and those who come don’t stay.' },
  { to: '/categories', title: 'Which categories, and which not', caption: 'Drag the weights: Apparel rises when returns matter less, but still fails the buyer tests. Scale ≠ cost edge; ownership is.' },
  { to: '/personas', title: 'Three cohorts, one engine', caption: 'Offline only, online elsewhere, churned from Meesho: each with its own problem, path and 90-day outcome vs today.' },
  { to: j(0), title: 'Journey · Meesho finds the gap', caption: 'The demand engine sizes the open gap and computes benchmark B from 10 listings, with exclusions.' },
  { to: j(2), title: 'Journey · 5-minute cost check', caption: 'Break-even ₹132 vs B ₹160: Hiren sees the band before making anything. Try changing the making cost.' },
  { to: j(4), title: 'Journey · Listing bot', caption: 'Three screens. Edit the margin: take-home updates live, and a price above B blocks go-live with the reason.' },
  { to: j(7), title: 'Journey · Factory Launch Week', caption: 'Compliant launch section for the buyer; launch vs control districts measure the lift.' },
  { to: j(9), title: 'Journey · Gate 1 (day 30)', caption: 'Rule fixed in advance: stick rate, lift, sell-through, prices held → Invest, Tighten or Stop.' },
  { to: j(10), title: 'Journey · Restock + coach', caption: 'Day 33: 11/day → reorder at 77, next batch 230. Day 38: one Hindi nudge, one-tap photo fix; re-checked on day 52.' },
  { to: j(12), title: 'Journey · Make to demand', caption: 'The sipper slows → stop → switch to the ₹265 casserole on the same steel, via the Pack Point.' },
  { to: '/break-it', title: 'Try to break it', caption: 'Launch flops, price raised, reseller signs up, small node, coach fix fails: each shows the guardrail that fired.' },
  { to: '/impact', title: 'Impact and scale', caption: 'Day-90 scorecards, the formula with real values, ×620 makers in year one and the 3,050 scale target. Thank you.' },
];
