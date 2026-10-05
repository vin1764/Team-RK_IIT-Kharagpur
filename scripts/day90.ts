/** Day-90 numbers per persona, and the MVP.md section 6 checks. Run: npx vite-node scripts/day90.ts */
import { simulate } from '../src/engine/simulate';
import { PERSONA_SPECS } from '../src/data/personas';
import { C } from '../src/data/constants';
import { daysOfCover, scaleBridge } from '../src/engine/formulas';

const END = C.TIMELINE_DAYS.value.max;
for (const p of PERSONA_SPECS) {
  const r = simulate({ personaId: p.id });
  const cf = simulate({ personaId: p.id, counterfactual: true });
  const last = r.days.at(-1)!;
  const cfLast = cf.days.at(-1)!;
  const w = r.days.filter((d) => d.day > END - 7);
  const rr = w.reduce((a, d) => a + d.orders, 0) / 7;
  const pre = r.days.filter((d) => d.day < C.LAUNCH_COMMIT_BY_DAY.value);
  const g = r.gates;
  console.log(`\n${p.name}`);
  console.log(`  orders ${r.kpis.totalOrders} · earned ₹${Math.round(last.money.takeHomeCum)} · paid out ₹${Math.round(last.money.payoutsCum)} · credits ₹${Math.round(last.money.creditsCum)} · net cash ₹${Math.round(last.money.netCashCum)}`);
  console.log(`  stock left ${last.onHand} (cash ₹${Math.round(last.money.cashInStock)}), ${daysOfCover(last.onHand, rr)?.toFixed(1)} days cover at ${rr.toFixed(1)}/day · counterfactual stock ${cfLast.onHand} (₹${Math.round(cfLast.money.cashInStock)}) · cf orders ${cf.kpis.totalOrders} · cf earned ₹${Math.round(cfLast.money.takeHomeCum)}`);
  console.log(`  gates: g1 ${g.g1?.decision}${g.g1rerun ? ` → rerun ${g.g1rerun.decision}` : ''} · g2 ${g.g2?.decision} (stick ≥1.0: ${g.g2?.durability.find((x) => /stick/i.test(x.label))?.value.toFixed(2)}) · g3 ${g.g3?.decision}`);
  console.log(`  before commit: max cash in stock ₹${Math.max(...pre.map((d) => d.money.cashInStock))}, max onHand ${Math.max(...pre.map((d) => d.onHand))}`);
  if (g.g3) console.log(`  cohort: ${JSON.stringify(g.g3.cohort)}`);
}
const h = simulate({ personaId: 'hiren' });
const last30 = h.days.filter((d) => d.day > END - 30).reduce((a, d) => a + d.orders, 0);
console.log('\nscale bridge', JSON.stringify(scaleBridge({ unitsLast30: last30, liveSkus: h.days.at(-1)!.skus.filter((s) => s.live).length })));
