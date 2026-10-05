import { C } from '../constants';
import { mulberry32, pick, randInt } from '../../engine/rng';

export interface CohortMaker {
  id: string;
  name: string;
  cluster: string;
  productType: string;
  priceDropPct: number;
  activeD30: boolean;
  activeD60: boolean;
  activeD90: boolean;
  secondLotByD45: boolean;
  /** True for a persona row (its outcomes come from its own simulation). */
  persona?: string;
}

export interface CohortMember {
  persona: string;
  name: string;
  cluster: string;
  productType: string;
  priceDropPct: number;
  activeD30: boolean;
  activeD60: boolean;
  activeD90: boolean;
  secondLotByD45: boolean;
}

const CLUSTERS: Record<1 | 2, string[]> = {
  1: ['Rajkot', 'Moradabad', 'Jagadhri', 'Jamnagar', 'Ahmedabad', 'Delhi NCR'],
  2: ['Kolkata', 'Rajkot', 'Mumbai', 'Jaipur', 'Delhi NCR', 'Machilipatnam'],
};
const TYPES: Record<1 | 2, string[]> = {
  1: ['Steel bottle · 1 L', 'Steel serving bowl set · 3 pc', 'Steel lunch box · 3 tier', 'Steel casserole · 1.5 L', 'Brass diya set', 'Steel tumbler set · 6'],
  2: ['Imitation jewellery set', 'Oxidised earrings', 'Bangle set · 12', 'Hair clip set', 'Anklet pair', 'Kundan necklace'],
};

/**
 * 30–50 makers per launch. Price drops vary by maker but the cohort average is forced to
 * clear PRICE_DROP_TARGET_PCT_OF_B (the consistency rule); persona rows keep their own values.
 */
export function generateCohort(launchNo: 1 | 2, seed: number, members: CohortMember[]): CohortMaker[] {
  const rng = mulberry32(seed);
  const { min, max } = C.MAKERS_PER_LAUNCH.value;
  const n = randInt(rng, min, max);
  const mean = C.GEN_COHORT_PRICE_DROP_MEAN_PCT.value;
  const spread = C.GEN_COHORT_PRICE_DROP_SPREAD_PCT.value;
  const odds = C.GEN_COHORT_ACTIVE_PCT.value;
  const second = C.GEN_COHORT_SECOND_LOT_PCT.value;

  const synthetic: CohortMaker[] = Array.from({ length: n - members.length }, (_, i) => {
    const activeD30 = rng() * 100 < odds.d30;
    const activeD60 = activeD30 && rng() * 100 < (odds.d60 / odds.d30) * 100;
    const activeD90 = activeD60 && rng() * 100 < (odds.d90 / odds.d60) * 100;
    return {
      id: `L${launchNo}-M${String(i + 1).padStart(2, '0')}`,
      name: `Maker ${String(i + 1).padStart(2, '0')}`,
      cluster: pick(rng, CLUSTERS[launchNo]),
      productType: pick(rng, TYPES[launchNo]),
      priceDropPct: Math.round((mean + (rng() * 2 - 1) * spread) * 10) / 10,
      activeD30,
      activeD60,
      activeD90,
      secondLotByD45: activeD30 && rng() * 100 < second,
    };
  });

  const personaRows: CohortMaker[] = members.map((m) => ({ id: `L${launchNo}-${m.persona}`, ...m }));
  const all = [...personaRows, ...synthetic];

  // Consistency rule: the cohort average must clear the target. Lift synthetic rows evenly if not.
  const target = C.PRICE_DROP_TARGET_PCT_OF_B.value;
  const avg = all.reduce((a, m) => a + m.priceDropPct, 0) / all.length;
  if (avg < target && synthetic.length > 0) {
    const lift = ((target - avg) * all.length) / synthetic.length + 0.1;
    for (const m of synthetic) m.priceDropPct = Math.round((m.priceDropPct + lift) * 10) / 10;
  }
  return all;
}

export function cohortMetrics(cohort: CohortMaker[]) {
  const n = cohort.length;
  const share = (f: (m: CohortMaker) => boolean) => (100 * cohort.filter(f).length) / n;
  return {
    makers: n,
    priceDropAvgPct: cohort.reduce((a, m) => a + m.priceDropPct, 0) / n,
    activeD30Pct: share((m) => m.activeD30),
    activeD60Pct: share((m) => m.activeD60),
    activeD90Pct: share((m) => m.activeD90),
    secondLotByD45Pct: share((m) => m.secondLotByD45),
  };
}
