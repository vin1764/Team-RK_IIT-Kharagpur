/**
 * Shared copy. Buyer-facing strings must follow the compliance rules (CLAUDE.md section 0):
 * no "lowest price", "cheapest", "best price", "guaranteed", "sale", "Direct from factory"
 * or "Verified factory". Forecasts always say "a forecast, not a guarantee".
 */

export const BUYER_COPY = {
  launchSection: 'Factory Launch Week',
  madeBy: 'Made by the factory',
  pricePosition: "Priced at or below today's typical price",
  cod: 'Cash on delivery available',
} as const;

export const FORECAST_DISCLAIMER = 'A forecast, not a guarantee';

export const FOOTER_NOTE =
  "Synthetic data. Policy facts verified against public Meesho seller guides and Meesho's filing; mentor inputs marked.";

export const PITCH =
  'Help India’s integrated manufacturers sell on Meesho at or below today’s typical price, and keep them selling.';

export interface FormulaTerm {
  id: 'makers' | 'active30' | 'ordersPerMaker' | 'priceDrop' | 'retained90';
  term: string;
  owner: string;
}

export const C2M_TERMS: FormulaTerm[] = [
  { id: 'makers', term: 'Makers onboarded', owner: '① Factory Onboarding' },
  { id: 'active30', term: 'Share active at day 30', owner: '② Factory Launch Week' },
  { id: 'ordersPerMaker', term: 'Orders per maker', owner: '② Launch Week + ③ Growth Loop' },
  { id: 'priceDrop', term: 'Price drop per order', owner: 'Price Integrity Layer' },
  { id: 'retained90', term: 'Share retained at day 90', owner: '③ Growth Loop' },
];

export const FORMULA_FUEL = 'All five terms are fuelled by the Demand Intelligence Engine.';

export type PsQuestion = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const PS_QUESTIONS: Record<PsQuestion, string> = {
  Q1: 'Which segments and categories have a genuine, defensible price advantage, and which don’t despite scale?',
  Q2: 'What stops reluctant makers, and what changes their calculus?',
  Q3: 'What makes early scale-up sustainable without subsidies or handholding?',
  Q4: 'What should Meesho measure, and when should it intervene?',
};
