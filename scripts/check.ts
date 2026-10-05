import { simulate, simulateCategory } from '../src/engine/simulate';
import { PERSONA_SPECS } from '../src/data/personas';
import { cohortMetrics } from '../src/data/generate/cohort';

for (const p of PERSONA_SPECS) {
  const r = simulate({ personaId: p.id });
  const cf = simulate({ personaId: p.id, counterfactual: true });
  const g = r.gates;
  const last = r.days[r.days.length - 1]!;
  const last7 = r.days.slice(-7).reduce((a, d) => a + d.orders, 0) / 7;
  const last30 = r.days.slice(-30).reduce((a, d) => a + d.orders, 0);
  console.log(`\n${p.name}`);
  console.log(`  G1 ${g.g1?.decision} (${g.g1?.reason}) | rerun ${g.g1rerun?.decision ?? '-'} (${g.g1rerun?.reason ?? ''}) | G2 ${g.g2?.decision} (${g.g2?.reason}) | G3 ${g.g3?.decision} (${g.g3?.reason})`);
  console.log(`  SKUs: ${last.skus.map((s) => `${s.skuId}${s.stopped ? '(stopped)' : s.live ? '' : '(not live)'}`).join(', ')}`);
  console.log(`  day-90 stock ${last.onHand} (CF ${cf.days[cf.days.length - 1]!.onHand}); run-rate ${last7.toFixed(1)}/day → cover ${(last.onHand / last7).toFixed(1)} days; last-30 units ${last30}`);
  console.log(`  earned ${Math.round(last.money.takeHomeCum)} paid ${Math.round(last.money.payoutsCum)} netCash ${Math.round(last.money.netCashCum)} stock@cost ${Math.round(last.money.cashInStock)} | CF earned ${Math.round(cf.kpis.takeHome)}`);
  console.log(`  min earned over run: ${Math.round(Math.min(...r.days.map((d) => d.money.takeHomeCum)))}; KAM ${r.kpis.kamCases}; events: ${r.events.filter((e) => ['kamCase', 'switch', 'slowSeller', 'nadFlag', 'restockPrompt'].includes(e.kind)).map((e) => `${e.day}:${e.kind}:${e.skuId ?? ''}`).join(' ')}`);
  const m = cohortMetrics(r.cohort);
  console.log(`  cohort: drop ${m.priceDropAvgPct.toFixed(1)} activeD60 ${m.activeD60Pct.toFixed(1)} activeD90 ${m.activeD90Pct.toFixed(1)} 2nd lot ${m.secondLotByD45Pct.toFixed(1)} n=${m.makers}`);
}
for (const c of ['homeKitchen', 'fashionAccessories', 'bpc', 'footwear'] as const) {
  const r = simulateCategory(c)!;
  console.log(c, r.gates.g1?.decision, r.gates.g1?.reason);
}
const d33 = simulate({ personaId: 'hiren' }).events.find((e) => e.day === 33 && e.kind === 'restockPrompt' && e.skuId === 'bottle-1l');
console.log('day33', d33?.data);
