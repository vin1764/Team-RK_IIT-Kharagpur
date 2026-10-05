import { useApp } from './store';
import { simulate, simulateCategory, type SimOptions, type SimResult } from '../engine/simulate';
import type { PersonaId } from '../data/personas';
import type { CategoryId } from '../data/categories';

const cache = new Map<string, SimResult>();

/** Memoised simulation run: same options → same (cached) result. */
export function runSim(o: SimOptions): SimResult {
  const key = JSON.stringify(o);
  let r = cache.get(key);
  if (!r) {
    r = simulate(o);
    cache.set(key, r);
  }
  return r;
}

const catCache = new Map<string, SimResult | null>();
export function runCategorySim(id: CategoryId, seed: number): SimResult | null {
  const key = `${id}|${seed}`;
  if (!catCache.has(key)) catCache.set(key, simulateCategory(id, seed));
  return catCache.get(key)!;
}

/** The persona's base run and its "without our solution" counterfactual, at the current seed. */
export function usePersonaRuns(personaId: PersonaId) {
  const seed = useApp((s) => s.seed);
  return { base: runSim({ personaId, seed }), cf: runSim({ personaId, seed, counterfactual: true }) };
}

/** Cumulative series for the with/without chart. */
export function cumulative(base: SimResult, cf: SimResult) {
  let a = 0;
  let b = 0;
  return base.days.map((d, i) => {
    a += d.orders;
    b += cf.days[i]!.orders;
    return {
      day: d.day,
      ordersWith: a,
      ordersWithout: b,
      takeHomeWith: Math.round(d.money.takeHomeCum),
      takeHomeWithout: Math.round(cf.days[i]!.money.takeHomeCum),
    };
  });
}
