/**
 * Phase 1 report: gate results for all three personas, Hiren's day-33 restock, the cohort
 * price drop vs the 8% target, the five required scenarios and the persona branches.
 * Run: npm run report:phase1
 */
import { simulate } from '../src/engine/simulate';
import { PERSONA_SPECS } from '../src/data/personas';
import { C } from '../src/data/constants';
import { cohortMetrics } from '../src/data/generate/cohort';

const f = (n: number, d = 2) => n.toFixed(d);

console.log('=== Gate results (seed', C.DEFAULT_SEED.value, ') ===');
for (const p of PERSONA_SPECS) {
  const s = simulate({ personaId: p.id });
  const { g1, g2, g3 } = s.gates;
  console.log(`\n${p.name} (${p.cohort}, Launch ${p.launchNo})`);
  console.log(`  G1 d30: ${g1!.decision} · ${g1!.inputs.map((i) => `${i.label} ${f(i.value)} ${i.pass ? '✓' : '✗'}`).join(' · ')}`);
  console.log(`  G2 d60: ${g2!.decision} · ${g2!.durability.map((i) => `${i.label} ${f(i.value)} ${i.pass ? '✓' : '✗'}`).join(' · ')}${g2!.packPoint.applies ? ` · Pack Point ${g2!.packPoint.verdict} (${g2!.packPoint.nodeMakers} makers, ₹${g2!.packPoint.fee})` : ''}`);
  console.log(`  G3 d90: ${g3!.decision} · ${g3!.inputs.map((i) => `${i.label} ${f(i.value, 1)} ${i.pass ? '✓' : '✗'}`).join(' · ')}`);
  const m = cohortMetrics(s.cohort);
  const own = s.cohort.find((x) => x.persona === p.id)!;
  console.log(`  Cohort price drop: ${f(m.priceDropAvgPct, 1)}% of B vs target ${C.PRICE_DROP_TARGET_PCT_OF_B.value}% → ${m.priceDropAvgPct >= C.PRICE_DROP_TARGET_PCT_OF_B.value ? 'clears' : 'MISSES'} (${m.makers} makers; this maker ${own.priceDropPct}%)`);
  const branch = s.events.filter((e) => ['winBack', 'kamCase', 'newRule', 'fulfilmentChoice'].includes(e.kind) || e.data?.channel === 'compare' || (e.kind === 'coachNudge' && e.data?.trigger === 'refusals'));
  for (const e of branch) console.log(`  [d${e.day} ${e.kind}] ${e.text}`);
  console.log(`  KAM cases: ${s.kpis.kamCases}`);
}

const hero = simulate({ personaId: 'hiren' });
const r = hero.events.find((e) => e.day === 33 && e.kind === 'restockPrompt' && e.skuId === 'bottle-1l')!;
console.log('\n=== Hiren day 33 restock ===');
console.log(`  ${r.text}`);
console.log(`  batch = ${r.data!.batch} ${r.data!.batch === 230 ? '✓ (must be 230)' : '✗ MUST BE 230'}`);

console.log('\n=== Hiren chapter events (days in CLAUDE.md §5/§8) ===');
for (const e of hero.events.filter((e) => [-14, -10, -9, -8, -7, -6, 0, 7, 18, 21, 30, 33, 38, 52, 60, 64, 90].includes(e.day)))
  console.log(`  d${e.day} [${e.kind}] ${e.text.slice(0, 140)}`);

console.log('\n=== Required scenarios (Hiren) ===');
for (const id of ['launchFlops', 'priceRaise', 'resellerSignup', 'smallNode', 'coachFixFails'] as const) {
  const s = simulate({ personaId: 'hiren', scenario: id });
  console.log(`  ${id}: G1 ${s.gates.g1!.decision} (stick ${f(s.gates.g1!.inputs[0]!.value)}, lift ${f(s.gates.g1!.inputs[1]!.value)}×) · G2 ${s.gates.g2!.decision}/${s.gates.g2!.packPoint.verdict} ₹${s.gates.g2!.packPoint.fee} · KAM ${s.kpis.kamCases}`);
  for (const g of s.guardrails) console.log(`     ↳ d${g.day} ${g.guardrail}: ${g.what}`);
}

const cf = simulate({ personaId: 'hiren', counterfactual: true });
console.log('\n=== Hiren counterfactual vs with ===');
console.log(`  Without: ${cf.kpis.totalOrders} orders, take-home ₹${Math.round(cf.kpis.takeHome)}, ${cf.kpis.unitsLeft} units unsold (₹${Math.round(cf.kpis.cashInStockEnd)} tied up), churns day ${C.CF_CHURN_DAY.value}`);
console.log(`  With:    ${hero.kpis.totalOrders} orders, take-home ₹${Math.round(hero.kpis.takeHome)}, ${hero.kpis.unitsLeft} units in live stock`);
