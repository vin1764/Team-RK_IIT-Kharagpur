/**
 * Break-it lab scenarios (CLAUDE.md section 9). Each one changes the simulation's inputs;
 * the engine's own guardrails decide what happens.
 */

export type ScenarioId =
  | 'priceRaise'
  | 'thinnerSteel'
  | 'resellerSignup'
  | 'rivalDump'
  | 'crowdedGap'
  | 'smallNode'
  | 'launchFlops'
  | 'forecastOverPromise'
  | 'coachFixFails'
  | 'saleWeekB';

export interface ScenarioDef {
  id: ScenarioId;
  n: number;
  title: string;
  expected: string;
  /** The guardrail that should fire. */
  guardrail: string;
  deckRef: string;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'priceRaise',
    n: 1,
    title: 'Maker raises price after reviews',
    expected: 'Auto price-hold: launch slot removed, then visibility cut',
    guardrail: 'Auto price-hold',
    deckRef: 'Price Integrity Layer · check 3',
  },
  {
    id: 'thinnerSteel',
    n: 2,
    title: 'Maker uses thinner steel',
    expected: '"Not as described" returns > 1.5× norm → test buy flagged → visibility cut',
    guardrail: 'NAD return watch + sampled test buy',
    deckRef: 'Price Integrity Layer · gaming',
  },
  {
    id: 'resellerSignup',
    n: 3,
    title: 'Reseller signs up as "manufacturer"',
    expected: 'Record mismatch → not launch-eligible; can’t reach B anyway',
    guardrail: 'GST + Udyam record check',
    deckRef: '① Factory Onboarding · sign-up and auto checks',
  },
  {
    id: 'rivalDump',
    n: 4,
    title: 'Rival dumps stock to drag B down',
    expected: 'Percentile + minimum orders keep B stable; weight cap shown',
    guardrail: 'B = 25th percentile, ≥ N orders, per-seller weight cap',
    deckRef: 'Price Integrity Layer · Benchmark B',
  },
  {
    id: 'crowdedGap',
    n: 5,
    title: 'Everyone chases the same gap',
    expected: 'Ledger ≥ 90% → "crowded" → teaser paused → switch suggestions',
    guardrail: 'Committed-supply ledger',
    deckRef: 'Demand Intelligence Engine · ledger',
  },
  {
    id: 'smallNode',
    n: 6,
    title: 'Only 25 makers at the node',
    expected: 'Fee ₹44; node waits; self-ship continues; Gate 2 = wait',
    guardrail: 'Pack Point pays-or-waits (Gate 2)',
    deckRef: '① Cluster Pack Point',
  },
  {
    id: 'launchFlops',
    n: 7,
    title: 'Launch flops',
    expected: 'Stick 0.3, lift 1.1× → Tighten; rerun with adjusted eligibility',
    guardrail: 'Day-30 rule (fixed in advance)',
    deckRef: '② Factory Launch Week · day-30 rule',
  },
  {
    id: 'forecastOverPromise',
    n: 8,
    title: 'Forecast over-promises',
    expected: 'Attainment < 60% by day 14 → confidence lowered, ranges widened',
    guardrail: 'Forecast attainment check',
    deckRef: 'Demand Intelligence Engine · likely share',
  },
  {
    id: 'coachFixFails',
    n: 9,
    title: 'Coach fix fails twice',
    expected: 'KAM queue; cause logged; new rule created',
    guardrail: 'Intervention ladder step 5 (KAM)',
    deckRef: '③ Growth Loop · intervention ladder',
  },
  {
    id: 'saleWeekB',
    n: 10,
    title: 'Sale-week B distortion',
    expected: 'Sale days excluded; B unchanged',
    guardrail: 'B excludes sale days',
    deckRef: 'Price Integrity Layer · Benchmark B',
  },
];

export const scenarioById = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
