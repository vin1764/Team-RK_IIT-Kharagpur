import { C } from '../constants';
import type { PersonaSummary } from '../personas';
import { mulberry32 } from '../../engine/rng';

export type OutreachSource = 'Meesho exit records' | 'IndiaMART manufacturer profiles' | 'Marketplace storefronts' | 'Cluster-association lists';

/** Where each cohort is found (CLAUDE.md ① Find). */
export const SOURCE_BY_COHORT: Record<PersonaSummary['cohort'], OutreachSource[]> = {
  'Churned from Meesho': ['Meesho exit records'],
  'Online elsewhere': ['Marketplace storefronts', 'IndiaMART manufacturer profiles'],
  'Offline only': ['Cluster-association lists', 'IndiaMART manufacturer profiles'],
};

/** First contact by IndiaMART enquiry or email; WhatsApp only after opt-in. */
export const FIRST_CONTACT = 'IndiaMART enquiry or email; WhatsApp only after opt-in';

export interface OutreachFunnel {
  cohort: PersonaSummary['cohort'];
  sources: OutreachSource[];
  stages: { stage: 'Found' | 'Contacted' | 'Opted in' | 'Cost check' | 'Signed up' | 'Live'; count: number }[];
}

/** Seeded outreach funnel for one cohort in one launch. */
export function generateOutreach(cohort: PersonaSummary['cohort'], seed: number): OutreachFunnel {
  const rng = mulberry32(seed);
  const r = C.GEN_OUTREACH_RATES_PCT.value;
  const jitter = () => 0.92 + rng() * 0.16;
  const found = Math.round(C.GEN_OUTREACH_FOUND.value * jitter());
  const step = (n: number, pct: number) => Math.round(n * (pct / 100) * jitter());
  const contacted = step(found, r.contacted);
  const optedIn = step(contacted, r.optedIn);
  const costCheck = step(optedIn, r.costCheck);
  const signedUp = step(costCheck, r.signedUp);
  const live = step(signedUp, r.live);
  return {
    cohort,
    sources: SOURCE_BY_COHORT[cohort],
    stages: [
      { stage: 'Found', count: found },
      { stage: 'Contacted', count: contacted },
      { stage: 'Opted in', count: optedIn },
      { stage: 'Cost check', count: costCheck },
      { stage: 'Signed up', count: signedUp },
      { stage: 'Live', count: live },
    ],
  };
}
