/**
 * Hardcoded data: every run the prototype shows was computed once (scripts/make-snapshot.ts) and is
 * read from src/data/snapshot.json. Nothing is simulated in the browser.
 */
import snapshotRaw from '../data/snapshot.json?raw';
import type { SimResult } from '../engine/simulate';
import type { PersonaId } from '../data/personas';
import type { CategoryId } from '../data/categories';

interface Snapshot {
  personas: Record<PersonaId, { base: SimResult; cf: SimResult }>;
  categories: Partial<Record<CategoryId, SimResult | null>>;
}

const snapshot = JSON.parse(snapshotRaw) as Snapshot;

/** A persona's run (with our solution, or today's Meesho if `counterfactual`). */
export function runSim(o: { personaId: PersonaId; counterfactual?: boolean }): SimResult {
  const p = snapshot.personas[o.personaId];
  return o.counterfactual ? p.cf : p.base;
}

/** A launch category's 30-day run (null for categories that don't launch). */
export function runCategorySim(id: CategoryId): SimResult | null {
  return snapshot.categories[id] ?? null;
}

/** The persona's run and its "without our solution" counterfactual. */
export function usePersonaRuns(personaId: PersonaId) {
  return { base: runSim({ personaId }), cf: runSim({ personaId, counterfactual: true }) };
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
