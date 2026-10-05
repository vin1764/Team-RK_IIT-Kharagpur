/**
 * Persona narrative: pains by journey stage, what we heard, and what changes lever by lever.
 * Numbers come from constants.ts or formulas.ts; quotes are paraphrased/translated.
 */
import { C } from './constants';
import { PERSONA_SPECS, SKUS, type PersonaId } from './personas';
import { breakEven, channelTakeHome, listPrice, packPointFeeTier, takeHome } from '../engine/formulas';
import type { ChipKind } from '../components/Chip';
import { inr } from '../lib/format';

export const STAGES = ['Decide', 'Set up & stock', 'Go live', 'Get & fulfil', 'Close & settle', 'Stay or leave'] as const;
export type Stage = (typeof STAGES)[number];

export interface Lever {
  stage: Stage;
  lever: string;
  change: string;
  tag: Extract<ChipKind, 'existing' | 'new' | 'partner'>;
}

export interface PersonaStory {
  profile: string;
  pains: Record<Stage, string>;
  heard: { quote: string; source: string }[];
  takeaway: string;
  levers: Lever[];
}

const price = (s: (typeof SKUS)[keyof typeof SKUS]) => listPrice(s.stack, s.margin, s.gstRatePct);
const bottle = SKUS.bottle;
const bottlePrice = price(bottle);
const casserolePrice = price(SKUS.casserole);
const bowlsPrice = price(SKUS.bowls);
const jewelleryPrice = price(SKUS.jewellery);
const ayeshaCompare = channelTakeHome(bowlsPrice, C.AYESHA_AMAZON_PRICE.value, SKUS.bowls.stack);
const ppFee40 = packPointFeeTier(C.PP_REFERENCE_MAKERS.value).fee;
const ppFeeStart = packPointFeeTier(C.HERO_NODE_START_MAKERS.value).fee;
const ppMin = inr(C.PACK_POINT_MIN_PRICE.value);
const payDays = C.PAYMENT_CYCLE_DAYS.value;
const dispatch = C.DISPATCH_SLA_HOURS.value;
const wb = PERSONA_SPECS.find((p) => p.id === 'sunita')!.winBack!;

export const PERSONA_STORY: Record<PersonaId, PersonaStory> = {
  hiren: {
    profile: `Integrated maker (owns steel coil input and machines). ₹${C.HERO_TURNOVER_CR.value} Cr turnover, ${C.HERO_WORKERS.value} workers, ~${C.HERO_IDLE_CAPACITY_PCT.value}% idle capacity. Sells through ${C.HERO_DISTRIBUTORS.value} distributors; never sold online.`,
    pains: {
      Decide: "Doesn't know the per-order cost stack, so can't tell if Meesho pays.",
      'Set up & stock': 'Afraid stock will sit unsold; has never built a listing.',
      'Go live': 'No ratings, so no reason to expect any visibility.',
      'Get & fulfil': `Single-order packing and ${dispatch.min}–${dispatch.max} h dispatch don't fit a bulk factory.`,
      'Close & settle': 'Cash locked in stock until payouts arrive.',
      'Stay or leave': "When one SKU slows, he doesn't know what to make instead.",
    },
    heard: [
      { quote: 'Will it sell? And who packs it, one bottle at a time?', source: 'Composite of maker calls, Rajkot cluster (paraphrased, translated)' },
      { quote: 'I have machines idle a quarter of the time. Give me an order and I will make it.', source: 'Composite of maker calls (paraphrased, translated)' },
    ],
    takeaway: 'Proof of demand and a packing answer come before any listing.',
    levers: [
      {
        stage: 'Decide',
        lever: 'Demand teaser + 5-minute cost check',
        change: `Sees break-even ${inr(breakEven(bottle.stack))} vs B ${inr(C.HERO_B.value)} before making anything.`,
        tag: 'new',
      },
      {
        stage: 'Set up & stock',
        lever: 'AI listing bot (3 screens)',
        change: `First lot sized from demand, not a guess; price ${inr(bottlePrice)}, take-home ${inr(takeHome(bottlePrice, bottle.stack))}/unit.`,
        tag: 'new',
      },
      {
        stage: 'Get & fulfil',
        lever: 'Cluster Pack Point (Rajkot)',
        change: `At ${inr(bottlePrice)} (below ${ppMin}) he self-ships; the ${inr(casserolePrice)} casserole goes to the node (fee ${inr(ppFeeStart)} → ${inr(ppFee40)} at 40 makers).`,
        tag: 'partner',
      },
      { stage: 'Go live', lever: 'Factory Launch Week', change: `Goes live with ${C.MAKERS_PER_LAUNCH.value.min}–${C.MAKERS_PER_LAUNCH.value.max} makers on days ${C.LAUNCH_LIVE_DAYS.value.min}–${C.LAUNCH_LIVE_DAYS.value.max} from a published order book.`, tag: 'new' },
      { stage: 'Go live', lever: 'Onboarding visibility boost', change: `Continues for ${C.ONBOARDING_BOOST_MONTHS.value.min}–${C.ONBOARDING_BOOST_MONTHS.value.max} months after the launch week.`, tag: 'existing' },
      { stage: 'Get & fulfil', lever: 'Valmo pickup and delivery', change: 'Pickup from the factory; no storage needed.', tag: 'existing' },
      { stage: 'Stay or leave', lever: 'Restock loop + SKU health coach', change: 'Dated restock prompt and one Hindi nudge a week, one tap to fix.', tag: 'new' },
      { stage: 'Stay or leave', lever: 'Make to demand', change: 'Slow sipper stopped; switches to the casserole on the same steel.', tag: 'new' },
      { stage: 'Close & settle', lever: 'Payout cycle', change: `Paid ${payDays} days after delivery; TCS/TDS shown as claimable credits.`, tag: 'existing' },
    ],
  },
  ayesha: {
    profile: `Integrated maker, ₹${C.AYESHA_TURNOVER_CR.value} Cr turnover. Sells on Amazon and Flipkart with lots in their warehouses; not on Meesho.`,
    pains: {
      Decide: 'Meesho price bands look too low next to her Amazon price.',
      'Set up & stock': 'Worried about undercutting her own Amazon listing.',
      'Go live': 'Zero ratings on Meesho despite ratings elsewhere.',
      'Get & fulfil': `Fears higher RTO on a COD-heavy base (${Math.round(C.COD_SHARE_PCT.value)}% COD).`,
      'Close & settle': "Doesn't know her net after fees and RTOs.",
      'Stay or leave': 'Will stop if refusals eat the margin.',
    },
    heard: [
      { quote: "What's my net after fees and RTOs? Show me that, not the GMV.", source: 'Composite of online-seller calls (paraphrased)' },
      { quote: "If I list cheaper here, my Amazon buyers will see it.", source: 'Composite of online-seller calls (paraphrased)' },
    ],
    takeaway: 'Lead with take-home, side by side, and treat RTO as a per-SKU number she can move.',
    levers: [
      {
        stage: 'Decide',
        lever: 'Take-home calculator: Meesho vs Amazon',
        change: `Same ex-works ${inr(ayeshaCompare.exWorks)}: Meesho at ${inr(bowlsPrice)} keeps ${inr(ayeshaCompare.meesho)}/unit; Amazon at ${inr(C.AYESHA_AMAZON_PRICE.value)} keeps ${inr(ayeshaCompare.amazon)}.`,
        tag: 'new',
      },
      { stage: 'Decide', lever: '0% commission', change: 'The fee stack differs, not the factory price.', tag: 'existing' },
      { stage: 'Set up & stock', lever: 'Channel conflict, explained honestly', change: "Meesho's Tier 2–4, COD-heavy buyer is a new order, not a moved one.", tag: 'new' },
      { stage: 'Go live', lever: 'Factory Launch Week 1', change: 'Launches with the first cohort; no rating needed to be seen.', tag: 'new' },
      { stage: 'Get & fulfil', lever: 'Self-ship', change: 'Already set up for other marketplaces; Pack Point optional.', tag: 'existing' },
      { stage: 'Close & settle', lever: 'RTO rate per SKU + prepaid nudge', change: 'Refusals above the 75th percentile trigger a prepaid nudge and clearer delivery date.', tag: 'new' },
    ],
  },
  sunita: {
    profile: `Imitation jewellery maker in Kolkata. Listed ${wb.listingsBefore} products on Meesho before, switched off ads, ran at a loss and left.`,
    pains: {
      Decide: 'Burned once: ad spend gone, no orders to show for it.',
      'Set up & stock': 'A worse-material copy took the price tag.',
      'Go live': 'No organic visibility without ratings; long wait to first order.',
      'Get & fulfil': 'Fake COD orders and refusals.',
      'Close & settle': 'Returns and swapped items; claims recovered about half.',
      'Stay or leave': 'Running at a loss, so she left.',
    },
    heard: [
      { quote: 'I put 20–30 designs up. Nobody saw them. I paid for ads, then switched them off.', source: 'Team call with a churned jewellery maker (paraphrased, translated)' },
      { quote: 'Half the returns came back as something else. The claim gave me back half.', source: 'Same call (paraphrased, translated)' },
    ],
    takeaway: 'Diagnose why the old listing failed before asking her to come back.',
    levers: [
      { stage: 'Decide', lever: 'Win-back diagnosis', change: `Old listing: ${wb.views.toLocaleString('en-IN')} views → ${wb.clicks} clicks; ${wb.likelyReason.toLowerCase()} the likely reason; refusals ${wb.refusalPct}% vs ${wb.categoryRefusalPct}%.`, tag: 'new' },
      { stage: 'Go live', lever: 'Inherited seller-level quality score', change: 'Unrated new listings start from her seller score, not zero.', tag: 'existing' },
      {
        stage: 'Get & fulfil',
        lever: 'Self-ship below the Pack Point threshold',
        change: `At ${inr(jewelleryPrice)} (below ${ppMin}) the node fee would eat the saving; she self-ships.`,
        tag: 'new',
      },
      { stage: 'Go live', lever: 'Factory Launch Week 2 (Fashion Accessories)', change: 'Speed and price-hold, not copyright, beat the copies.', tag: 'new' },
      { stage: 'Close & settle', lever: 'Listing-fix coach + prepaid nudge', change: 'Scale photo for "looks bigger in photo" returns; prepaid nudge for refusals.', tag: 'new' },
      { stage: 'Stay or leave', lever: 'KAM escalation (once) → new coach rule', change: 'Two failed fixes → a KAM finds plating that tarnishes → product fix → rule for every maker.', tag: 'existing' },
    ],
  },
};
