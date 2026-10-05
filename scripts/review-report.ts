/** Review report: day-90 numbers for all three personas and the Impact page's scale bridge. */
import { simulate } from '../src/engine/simulate';
import { PERSONA_SPECS } from '../src/data/personas';
import { C } from '../src/data/constants';
import { cohortMetrics } from '../src/data/generate/cohort';
import { annualise, daysOfCover, scaleBridge } from '../src/engine/formulas';

const r0 = (n: number) => Math.round(n).toLocaleString('en-IN');
for (const p of PERSONA_SPECS) {
  const r = simulate({ personaId: p.id });
  const cf = simulate({ personaId: p.id, counterfactual: true });
  const d90 = r.days[r.days.length - 1]!;
  const d60 = r.days.find((d) => d.day === 60)!;
  const last30 = r.days.slice(-30);
  const units30 = last30.reduce((a, d) => a + d.orders, 0);
  const rev30 = last30.reduce((a, d) => a + d.skus.reduce((b, s) => b + s.orders * s.price, 0), 0);
  const perDay7 = r.days.slice(-7).reduce((a, d) => a + d.orders, 0) / 7;
  const g = r.gates;
  console.log(`\n${p.name} (${p.cohort}, Launch ${p.launchNo})`);
  console.log(`  Listings: ${d90.skus.map((s) => `${s.skuId}${s.stopped ? ' (stopped)' : ''}`).join(', ')}`);
  console.log(`  Gates: G1 ${g.g1?.decision}${g.g1?.decision !== 'Invest' ? ` (${g.g1?.reason})` : ''}${g.g1rerun ? ` → rerun day ${g.g1rerun.day}: ${g.g1rerun.decision}` : ''} | G2 ${g.g2?.decision}${g.g2?.decision !== 'Continue' ? ` (${g.g2?.reason})` : ''} | G3 ${g.g3?.decision} (${g.g3?.reason})`);
  console.log(`  Orders 90d ${r0(r.kpis.totalOrders)} (today's Meesho ${r0(cf.kpis.totalOrders)}) · returns ${r.kpis.returnRatePct.toFixed(1)}% · RTO ${r.kpis.rtoRatePct.toFixed(1)}%`);
  console.log(`  Earned (accrued) ₹${r0(d90.money.takeHomeCum)} (today's Meesho ₹${r0(cf.kpis.takeHome)}) · last 30 days ₹${r0(d90.money.takeHomeCum - d60.money.takeHomeCum)}/month`);
  console.log(`  Paid out ₹${r0(d90.money.payoutsCum)} · cash in stock ₹${r0(d90.money.cashInStock)} · net cash ₹${r0(d90.money.netCashCum)} · tax credits ₹${r0(d90.money.creditsCum)}`);
  console.log(`  Stock ${d90.onHand} units (today's Meesho ${cf.days[cf.days.length - 1]!.onHand}) · ${daysOfCover(d90.onHand, perDay7)!.toFixed(1)} days of cover`);
  console.log(`  Monthly run-rate ${r0(units30)} units · annualised revenue ₹${r0(annualise(rev30))} · price vs B at launch ${r.kpis.priceDropAtLaunchPct.toFixed(1)}% below`);
  console.log(`  KAM cases ${r.kpis.kamCases}${r.kpis.newRules.length ? ` · new rule: ${r.kpis.newRules.join('; ')}` : ''}`);
  const m = cohortMetrics(r.cohort);
  console.log(`  Cohort (Launch ${p.launchNo}, ${m.makers} makers): price drop ${m.priceDropAvgPct.toFixed(1)}% (target ${C.PRICE_DROP_TARGET_PCT_OF_B.value}) · active d60 ${m.activeD60Pct.toFixed(1)}% (≥70) · d90 ${m.activeD90Pct.toFixed(1)}% (≥60) · second lot ${m.secondLotByD45Pct.toFixed(1)}% (≥50)`);
}
const hero = simulate({ personaId: 'hiren' });
const units30 = hero.days.slice(-30).reduce((a, d) => a + d.orders, 0);
const live = hero.days[hero.days.length - 1]!.skus.filter((s) => s.live && !s.stopped).length;
const b = scaleBridge({ unitsLast30: units30, liveSkus: live });
console.log('\nScale bridge (Impact page)');
console.log(`  1 Simulated today: ${r0(b.simUnitsMonthly)} units/month across ${b.simSkus} live SKUs → ${r0(b.perSkuSim)} units/SKU/month`);
console.log(`  2 SKU expansion: ${b.skusMature.min}–${b.skusMature.max} SKUs via make to demand`);
console.log(`  3 Mature run-rate: ${r0(b.matureMonthly)} units/month (${r0(b.matureYearly)}/yr) → ${r0(b.perSkuMature)} units/SKU/month (${b.perSkuGap.toFixed(1)}× today's per-SKU rate)`);
console.log(`  4 × makers: ${r0(b.makersForDeck)} (≈ scale target ${r0(C.MAKERS_SCALE_TARGET.value)})`);
console.log(`  5 × ₹${b.savingPerOrder} saving per order: ${r0(b.matureYearly)} × ${r0(b.makersForDeck)} × ₹${b.savingPerOrder} = ₹${b.deckCr} Cr/yr; at ${r0(C.MAKERS_SCALE_TARGET.value)} makers ₹${b.atScaleTargetCr.toFixed(1)} Cr`);
