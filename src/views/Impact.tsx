import { useApp } from '../app/store';
import { runSim } from '../app/useSim';
import { C } from '../data/constants';
import { C2M_TERMS } from '../data/copy';
import { PERSONA_SPECS } from '../data/personas';
import { cohortMetrics } from '../data/generate/cohort';
import { c2mContribution, priceDropDelivered, scaleBridge } from '../engine/formulas';
import { MetricTile } from '../components/MetricTile';
import { Num } from '../components/FormulaPopover';
import { Chip } from '../components/Chip';
import { TitleTab } from '../components/TitleTab';
import { inr, num, pctText } from '../lib/format';
import { SectionPage } from './SectionPage';

export default function Impact() {
  const seed = useApp((s) => s.seed);
  const runs = PERSONA_SPECS.map((p) => ({ p, r: runSim({ personaId: p.id, seed }), cf: runSim({ personaId: p.id, seed, counterfactual: true }) }));
  const hero = runs[0]!.r;
  const cohort = cohortMetrics(hero.cohort);
  const ordersPerMaker = runs.reduce((a, x) => a + x.r.kpis.meeshoOrders, 0) / runs.length;
  const dropRs = priceDropDelivered(
    runs.flatMap((x) => x.r.days.flatMap((d) => d.skus.filter((s) => s.delivered > 0).map((s) => ({ B: s.B, price: s.price, orders: s.kept })))),
  );
  const terms = {
    makers: cohort.makers,
    active30: cohort.activeD30Pct / 100,
    ordersPerMaker,
    priceDrop: dropRs,
    retained90: cohort.activeD90Pct / 100,
  };
  const value = (makers: number) =>
    c2mContribution({ makersOnboarded: makers, activeShareD30: terms.active30, ordersPerMaker: terms.ordersPerMaker, priceDropPerOrder: terms.priceDrop, retainedShareD90: terms.retained90 });
  const termText: Record<string, string> = {
    makers: num(terms.makers),
    active30: pctText(cohort.activeD30Pct),
    ordersPerMaker: num(terms.ordersPerMaker),
    priceDrop: inr(terms.priceDrop, 1),
    retained90: pctText(cohort.activeD90Pct),
  };
  const heroLast30 = hero.days.slice(-C.DAYS_PER_MONTH.value).reduce((a, d) => a + d.orders, 0);
  const heroLive = hero.days[hero.days.length - 1]!.skus.filter((s) => s.live && !s.stopped).length;
  const bridge = scaleBridge({ unitsLast30: heroLast30, liveSkus: heroLive });
  const ramp = C.MAKER_RAMP_YEAR_ONE.value;
  const yearOne = ramp[ramp.length - 1]!;
  return (
    <SectionPage path="/impact">
      <div className="mb-2 flex gap-2">
        <Chip kind="simulated" />
        <Chip kind="synthetic" />
      </div>
      <TitleTab size="sm" className="mb-3">
        Day-90 scorecard per maker
      </TitleTab>
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {runs.map(({ p, r, cf }) => (
          <article key={p.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="font-display text-lg font-bold text-plum">{p.name}</div>
            <div className="mb-2 text-xs text-grey">{p.cohort} · Launch {p.launchNo}</div>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile label="Orders" value={num(r.kpis.totalOrders)} caption={`today’s Meesho: ${num(cf.kpis.totalOrders)}`} status="good" />
              <MetricTile label="Earned (accrued)" value={<Num f="takeHome">{inr(r.kpis.takeHome)}</Num>} caption={`today’s Meesho: ${inr(cf.kpis.takeHome)}`} status={r.kpis.takeHome > cf.kpis.takeHome ? 'good' : 'warn'} />
              <MetricTile label="Price vs B at launch" value={<Num f="priceDropDelivered">{pctText(r.kpis.priceDropAtLaunchPct, 1)}</Num>} target={`cohort ≥ ${C.PRICE_DROP_TARGET_PCT_OF_B.value}%`} status={r.kpis.priceDropAtLaunchPct >= C.PRICE_DROP_TARGET_PCT_OF_B.value ? 'good' : 'warn'} />
              <MetricTile label="Gates 1 · 2 · 3" value={<span className="text-lg">{`${r.gates.g1?.decision} · ${r.gates.g2?.decision} · ${r.gates.g3?.decision}`}</span>} />
            </div>
            {p.isHero && (
              <p className="mt-2 text-xs text-grey">
                The hero sits at {pctText(r.kpis.priceDropAtLaunchPct, 1)} below B, under the {C.PRICE_DROP_TARGET_PCT_OF_B.value}% target; the cohort average ({pctText(cohort.priceDropAvgPct, 1)}) clears it.
              </p>
            )}
          </article>
        ))}
      </div>

      <TitleTab size="sm" className="mb-3">
        The formula with real values (Launch 1 cohort)
      </TitleTab>
      <div className="mb-8 rounded-2xl border-2 border-dashed border-plum/50 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {C2M_TERMS.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-xl font-bold text-grey">×</span>}
              <div className="rounded-xl bg-blush px-3 py-2 text-center">
                <div className="font-display text-2xl font-bold text-plum">{termText[t.id]}</div>
                <div className="text-[11px] text-grey">{t.term}</div>
              </div>
            </div>
          ))}
          <span className="text-xl font-bold text-grey">=</span>
          <div className="rounded-xl bg-plum px-4 py-2 text-center text-white">
            <div className="font-display text-2xl font-bold">
              <Num f="c2m">{inr(value(terms.makers))}</Num>
            </div>
            <div className="text-[11px] opacity-80">buyer price saving, 90 days</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-grey">
          Orders per maker = average delivered-and-kept orders of the three simulated makers. Price drop per order = Σ(B − price) × orders ÷ Σ orders across them. Shares from the
          cohort at day 30 and day 90.
        </p>
      </div>

      <TitleTab size="sm" className="mb-3">
        From one maker to the deck’s {inr(bridge.deckCr)} Cr
      </TitleTab>
      <div className="mb-8 rounded-2xl border-2 border-dashed border-plum/50 bg-white p-4" data-testid="scale-bridge">
        <ol className="grid gap-2 md:grid-cols-5">
          {[
            {
              h: '1 · Simulated today',
              v: `${num(bridge.simUnitsMonthly)} units/month`,
              s: `Hiren at day 90 (month 3), ${bridge.simSkus} live SKUs → ${num(bridge.perSkuSim)} units/SKU/month`,
            },
            {
              h: '2 · SKU expansion',
              v: `${bridge.skusMature.min}–${bridge.skusMature.max} SKUs`,
              s: `Make to demand keeps adding open-gap types on the same steel (he went 2 → ${bridge.simSkus + 1} listings in 90 days)`,
            },
            {
              h: '3 · Mature run-rate',
              v: `${num(bridge.matureMonthly)} units/month`,
              s: `${num(bridge.matureYearly)} a year; ${num(bridge.perSkuMature)} units/SKU/month (${num(bridge.perSkuGap, 1)}× today’s per-SKU rate, as reviews and boost build)`,
            },
            {
              h: '4 · × makers',
              v: `${num(bridge.makersForDeck)} makers`,
              s: `≈ the ${num(C.MAKERS_SCALE_TARGET.value)} scale target (not year one; year one ends at ${num(yearOne)})`,
            },
            {
              h: '5 · × saving per order',
              v: `${inr(bridge.savingPerOrder)} × orders`,
              s: `${num(bridge.matureYearly)} × ${num(bridge.makersForDeck)} × ${inr(bridge.savingPerOrder)} = ${inr(bridge.deckCr)} Cr a year; at ${num(C.MAKERS_SCALE_TARGET.value)} makers ${inr(bridge.atScaleTargetCr)} Cr`,
            },
          ].map((x) => (
            <li key={x.h} className="rounded-xl bg-blush p-3">
              <div className="text-xs font-semibold text-magenta">{x.h}</div>
              <div className="font-display text-xl font-bold text-plum">{x.v}</div>
              <div className="mt-1 text-xs text-ink">{x.s}</div>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-grey">
          Assumptions: a mature maker sells ~{num(bridge.matureMonthly)} units a month across {bridge.skusMature.min}–{bridge.skusMature.max} SKUs (deck); every order saves the buyer{' '}
          {inr(bridge.savingPerOrder)} (the self-ship saving on a {inr(C.AOV.value)} order); makers are added linearly. The simulated maker is only in months 1–3 with 2–3 SKUs, so steps
          2–3 are the plan, not the simulation. A forecast, not a guarantee.
        </p>
      </div>

      <TitleTab size="sm" className="mb-3">
        Zoom out
      </TitleTab>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-xs text-grey">Year-one ramp</div>
          <div className="font-display text-3xl font-bold text-plum">{ramp.join(' → ')} makers</div>
          <p className="mt-2 text-sm">
            × {num(yearOne)} makers at the same per-maker rates: <strong>{inr(value(yearOne))}</strong> of buyer price saving per 90 days.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-xs text-grey">Scale target (not year one)</div>
          <div className="font-display text-3xl font-bold text-plum">{num(C.MAKERS_SCALE_TARGET.value)} makers</div>
          <p className="mt-2 text-sm">
            Needed at {C.SCALE_TARGET_CONVERSION_PCT.value}% conversion. At the same rates: <strong>{inr(value(C.MAKERS_SCALE_TARGET.value))}</strong> per 90 days.
          </p>
        </div>
        <div className="rounded-2xl bg-plum p-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange">Year 2 (10x view)</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
            <li>More clusters, each with its own Pack Point once it passes {C.PP_REFERENCE_MAKERS.value} makers</li>
            <li>Categories M3–M4 once their gates pass (BPC licence check, footwear returns)</li>
            <li>Apparel only when spec verifiability and savings-after-returns tests pass</li>
            <li>Every KAM case becomes a coach rule: makers per manager keeps rising</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-grey">A forecast, not a guarantee. Linear scaling is a simplification: later cohorts may convert differently.</p>
    </SectionPage>
  );
}
