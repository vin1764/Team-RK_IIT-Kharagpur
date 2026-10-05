/** Judge tour: ~4 minutes, ← → to move, exit any time. */
export interface TourStep {
  to: string;
  title: string;
  caption: string;
}

const j = (ch: number) => `/journey/hiren?ch=${ch}`;

export const TOUR: TourStep[] = [
  { to: '/notes', title: 'Choose a maker; the pitch and the formula', caption: 'Three makers (offline, online elsewhere, churned) each open their own journey. C2M price contribution = makers × share active at day 30 × orders per maker × price drop per order × share retained at day 90. Each term has an owner.' },
  { to: '/problem', title: 'The problem, and where each PS question is answered', caption: 'On a ₹265 order the middlemen take ₹72. Two problems: makers don’t come, and those who come don’t stay.' },
  { to: '/categories', title: 'Which categories, and which not', caption: 'Drag the weights: Apparel rises when returns matter less, but still fails the buyer tests. Scale ≠ cost edge; ownership is.' },
  { to: j(0), title: 'Journey · Meesho finds the gap', caption: 'The demand engine sizes the open gap and computes benchmark B from 10 listings, with exclusions.' },
  { to: j(4), title: 'Journey · Cost check → listing bot', caption: 'Break-even ₹132 vs B ₹160 first; then three screens. Edit the margin: take-home updates live, and a price above B blocks go-live with the reason.' },
  { to: j(5), title: 'Journey · Who packs it? (Cluster Pack Point)', caption: 'At 34 makers the node fee is ₹44, more than the saving on a ₹148 bottle: self-ship now; the ₹265 casserole goes to the node once it passes 40 makers (₹30).' },
  { to: j(7), title: 'Journey · Factory Launch Week', caption: 'Compliant launch section for the buyer; launch vs control districts measure the lift.' },
  { to: j(8), title: 'Journey · Returns and RTO', caption: 'Fault attribution: RTOs cost the maker nothing when dispatched on time; returns pay a fee; swaps are caught by weight at the node.' },
  { to: j(9), title: 'Journey · Gate 1 (day 30)', caption: 'Rule fixed in advance: stick rate, lift, sell-through, prices held → Invest, Tighten or Stop.' },
  { to: j(10), title: 'Journey · Restock + coach', caption: 'Day 33: 11/day → reorder at 77, next batch 230. Day 38: one Hindi nudge, one-tap photo fix; re-checked on day 52.' },
  { to: j(12), title: 'Journey · Make to demand', caption: 'The sipper slows → stop (stock back to his distributors) → switch to the ₹265 casserole via the Pack Point, then add a lunch box: 4 listings by day 90.' },
  { to: '/economics', title: 'Economics · Pack Point P&L', caption: 'Where the buyer’s rupee goes, and the 3PL partner’s P&L by makers pooled: ₹44 → ₹30 → ₹26 → ₹23 per delivered order.' },
  { to: '/impact', title: 'Impact and scale', caption: 'Day-90 scorecards and the bridge from one simulated maker to the deck’s ₹657 Cr. Thank you.' },
];
