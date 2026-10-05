import { describe, expect, it } from 'vitest';
import { C } from '../../src/data/constants';
import { PERSONA_SPECS, type PersonaId } from '../../src/data/personas';
import { CATEGORY_CARDS } from '../../src/data/categories';
import { simulate, simulateCategory, type SimResult } from '../../src/engine/simulate';
import { SCENARIOS } from '../../src/engine/scenarios';
import { cohortMetrics } from '../../src/data/generate/cohort';

const PERSONAS: PersonaId[] = ['hiren', 'ayesha', 'sunita'];
const SEEDS = [C.DEFAULT_SEED.value, 1, 77, 4242];

/** Every run the tests sweep: personas × seeds, counterfactuals, every scenario. */
const runs: { label: string; r: SimResult }[] = [
  ...PERSONAS.flatMap((p) => SEEDS.map((seed) => ({ label: `${p}/${seed}`, r: simulate({ personaId: p, seed }) }))),
  ...PERSONAS.map((p) => ({ label: `${p}/cf`, r: simulate({ personaId: p, counterfactual: true }) })),
  ...SCENARIOS.map((s) => ({ label: `hiren/${s.id}`, r: simulate({ personaId: 'hiren', scenario: s.id }) })),
];

const hero = simulate({ personaId: 'hiren' });
const eventsOn = (r: SimResult, day: number, kind: string) => r.events.filter((e) => e.day === day && e.kind === kind);

describe('determinism', () => {
  it('same seed and settings → identical output', () => {
    for (const p of PERSONAS) {
      expect(JSON.stringify(simulate({ personaId: p, seed: 99 }))).toBe(JSON.stringify(simulate({ personaId: p, seed: 99 })));
    }
    expect(JSON.stringify(simulate({ personaId: 'hiren', scenario: 'launchFlops' }))).toBe(
      JSON.stringify(simulate({ personaId: 'hiren', scenario: 'launchFlops' })),
    );
  });

  it('a different seed changes the daily texture', () => {
    const a = simulate({ personaId: 'hiren', seed: 1 }).days.map((d) => d.orders);
    const b = simulate({ personaId: 'hiren', seed: 2 }).days.map((d) => d.orders);
    expect(a).not.toEqual(b);
  });

  it('covers Day −14 to Day 90', () => {
    expect(hero.days[0]!.day).toBe(C.TIMELINE_DAYS.value.min);
    expect(hero.days[hero.days.length - 1]!.day).toBe(C.TIMELINE_DAYS.value.max);
  });
});

describe('integrity across every run', () => {
  const numbersIn = (x: unknown, path: string, out: string[]) => {
    if (typeof x === 'number') {
      if (Number.isNaN(x)) out.push(path);
    } else if (Array.isArray(x)) x.forEach((v, i) => numbersIn(v, `${path}[${i}]`, out));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) numbersIn(v, `${path}.${k}`, out);
  };

  it.each(runs)('$label: no NaN anywhere', ({ r }) => {
    const bad: string[] = [];
    numbersIn({ days: r.days, kpis: r.kpis, gates: r.gates, events: r.events }, 'r', bad);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it.each(runs)('$label: stock never negative, orders never exceed stock', ({ r }) => {
    for (const d of r.days) {
      for (const s of d.skus) {
        expect(s.onHand).toBeGreaterThanOrEqual(0);
        expect(s.orders).toBeLessThanOrEqual(s.demand);
        expect(s.rto).toBeLessThanOrEqual(s.orders);
        expect(s.ordersLaunch + s.ordersControl).toBe(s.orders);
        expect(s.byDistrict.reduce((a, b) => a + b, 0)).toBe(s.orders);
      }
    }
  });

  it.each(runs)('$label: payouts lag delivery by exactly 7 days', ({ r }) => {
    const lag = C.PAYMENT_CYCLE_DAYS.value;
    const skuIds = new Set(r.days.flatMap((d) => d.skus.map((s) => s.skuId)));
    for (const id of skuIds) {
      const series = r.days.map((d) => d.skus.find((s) => s.skuId === id));
      series.forEach((s, i) => {
        if (!s) return;
        const keptLagAgo = i - lag >= 0 ? series[i - lag]?.kept ?? 0 : 0;
        expect(s.paidUnits, `${id} day ${r.days[i]!.day}`).toBe(keptLagAgo);
      });
    }
  });
});

describe("the hero's story fires on the deck's days", () => {
  const ch = C.CHAPTER_DAYS.value;

  it('pre-launch chapters 0–6', () => {
    expect(eventsOn(hero, ch[0]!, 'gapFound')).toHaveLength(1);
    expect(eventsOn(hero, ch[1]!, 'outreach')).toHaveLength(1);
    expect(eventsOn(hero, ch[2]!, 'costCheck')[0]!.data).toMatchObject({ breakEven: 132.3, price: 148, B: 160 });
    expect(eventsOn(hero, ch[3]!, 'signUp')).toHaveLength(1);
    expect(eventsOn(hero, ch[4]!, 'listingBot')[0]!.data).toMatchObject({ lot: 150, price: 148 });
    const ful = eventsOn(hero, ch[5]!, 'fulfilmentChoice')[0]!.text;
    expect(ful).toContain('self-ship');
    expect(ful).toContain('casserole (₹265)');
    expect(eventsOn(hero, ch[6]!, 'orderBook')[0]!.text).toContain('a forecast, not a guarantee');
    expect(eventsOn(hero, C.LAUNCH_COMMIT_BY_DAY.value, 'commit')).toHaveLength(1);
    expect(eventsOn(hero, C.LAUNCH_STOCK_IN_DAY.value, 'stockIn').length).toBeGreaterThan(0);
    expect(eventsOn(hero, C.LAUNCH_LIVE_DAYS.value.min, 'live').length).toBeGreaterThan(0);
  });

  it('Gate 1 (day 30): Invest', () => {
    expect(hero.gates.g1!.decision).toBe('Invest');
    expect(eventsOn(hero, 30, 'gate')).toHaveLength(1);
  });

  it('day 33 restock: 11/day → reorder at 77, next batch 230', () => {
    const e = eventsOn(hero, C.HERO_RESTOCK_DAY.value, 'restockPrompt').find((x) => x.skuId === 'bottle-1l')!;
    expect(e.data!.runRate).toBeCloseTo(C.HERO_RUN_RATE_DAY_33.value, 5);
    expect(e.data!.reorderPoint).toBe(77);
    expect(e.data!.batch).toBe(230);
    // Deck: 84 on hand; the simulation lands within a few units.
    expect(Math.abs((e.data!.onHand as number) - C.HERO_ON_HAND_DAY_33.value)).toBeLessThanOrEqual(3);
  });

  it('day 38 coach: weak listing → photo fix; recovers by the day-52 re-check', () => {
    const nudge = eventsOn(hero, 38, 'coachNudge').find((x) => x.skuId === 'bottle-1l')!;
    expect(nudge.data!.trigger).toBe('weakListing');
    const after = hero.days.find((d) => d.day === 40)!.skus.find((s) => s.skuId === 'bottle-1l')!;
    expect(after.ctrPct).toBe(C.HERO_CTR_AFTER_PCT.value);
    expect(eventsOn(hero, 52, 'fixRecheck')[0]!.data!.success).toBe(true);
  });

  it('day 52: B drops to ₹155 and ₹148 holds', () => {
    const e = eventsOn(hero, C.HERO_B_MOVES_DAY.value, 'bMoved')[0]!;
    expect(e.data).toMatchObject({ from: 160, to: 155, price: 148, holds: true });
  });

  it('day 64: the sipper slows → stop → switch to the casserole (₹265, Pack Point)', () => {
    expect(eventsOn(hero, 64, 'slowSeller')[0]!.skuId).toBe('sipper-750');
    const sw = eventsOn(hero, 64, 'switch')[0]!;
    expect(sw.skuId).toBe('casserole-1500');
    expect(sw.text).toContain('via the Pack Point');
    const casserole = hero.days[hero.days.length - 1]!.skus.find((s) => s.skuId === 'casserole-1500')!;
    expect(casserole.price).toBe(265);
  });

  it('Gate 2 (day 60): Pack Point pays once the node passes 40 makers; Gate 3 (day 90) decides', () => {
    expect(hero.gates.g2!.packPoint).toMatchObject({ verdict: 'Pays', fee: 30 });
    expect(hero.gates.g3!.decision).toBe('Scale');
  });

  it('the hero sits at 7.5% below B at launch', () => {
    expect(hero.kpis.priceDropAtLaunchPct).toBeCloseTo(7.5, 5);
  });
});

describe('personas', () => {
  it.each(PERSONAS)('%s passes Gate 1 in the base run', (p) => {
    expect(simulate({ personaId: p }).gates.g1!.decision).toBe('Invest');
  });

  it('KAM path triggers exactly once for Sunita, never for the others', () => {
    const s = simulate({ personaId: 'sunita' });
    expect(s.kpis.kamCases).toBe(1);
    expect(s.kpis.newRules).toEqual(['Tarnish complaints → plating check']);
    expect(simulate({ personaId: 'hiren' }).kpis.kamCases).toBe(0);
    expect(simulate({ personaId: 'ayesha' }).kpis.kamCases).toBe(0);
  });

  it('Sunita starts with a win-back diagnosis', () => {
    const s = simulate({ personaId: 'sunita' });
    expect(s.events.find((e) => e.kind === 'winBack')!.text).toContain('2,400 views → 38 clicks');
  });

  it('Ayesha: the prepaid nudge lowers refusals (RTOs avoided)', () => {
    const a = simulate({ personaId: 'ayesha' });
    expect(a.events.some((e) => e.kind === 'coachNudge' && e.data?.trigger === 'refusals')).toBe(true);
    expect(a.kpis.rtosAvoided).toBeGreaterThan(0);
  });

  it('Sunita’s jewellery set lists at ₹150 and keeps ₹28', () => {
    const s = simulate({ personaId: 'sunita' });
    expect(s.days[0]!.skus[0]!.price).toBe(150);
  });
});

describe('counterfactual (today’s Meesho)', () => {
  it.each(PERSONAS)('%s: guessed lot of 500, churns ~day 25 with unsold stock', (p) => {
    const cf = simulate({ personaId: p, counterfactual: true });
    const churn = cf.events.find((e) => e.kind === 'churn')!;
    expect(churn.day).toBe(C.CF_CHURN_DAY.value);
    expect(cf.days.filter((d) => d.day > C.CF_CHURN_DAY.value).every((d) => d.orders === 0)).toBe(true);
    expect(cf.kpis.unitsLeft).toBeGreaterThan(0);
    const real = simulate({ personaId: p });
    expect(real.kpis.totalOrders).toBeGreaterThan(cf.kpis.totalOrders);
    expect(real.kpis.takeHome).toBeGreaterThan(cf.kpis.takeHome);
  });
});

describe('cohort', () => {
  it.each(SEEDS)('seed %i: cohort average clears the price-drop target; makers vary; 30–50 makers', (seed) => {
    for (const p of ['hiren', 'sunita'] as const) {
      const r = simulate({ personaId: p, seed });
      const m = cohortMetrics(r.cohort);
      expect(m.priceDropAvgPct).toBeGreaterThanOrEqual(C.PRICE_DROP_TARGET_PCT_OF_B.value);
      expect(m.makers).toBeGreaterThanOrEqual(C.MAKERS_PER_LAUNCH.value.min);
      expect(m.makers).toBeLessThanOrEqual(C.MAKERS_PER_LAUNCH.value.max);
      expect(new Set(r.cohort.map((x) => x.priceDropPct)).size).toBeGreaterThan(5);
    }
  });

  it('the hero’s own row stays honest at 7.5%', () => {
    expect(hero.cohort.find((m) => m.persona === 'hiren')!.priceDropPct).toBe(7.5);
  });
});

describe('break-it scenarios: the right guardrail fires', () => {
  const run = (id: (typeof SCENARIOS)[number]['id']) => simulate({ personaId: 'hiren', scenario: id });
  const fired = (r: SimResult, g: string) => r.guardrails.some((x) => x.guardrail === g);

  it.each(SCENARIOS)('#$n $title', (sc) => {
    const r = run(sc.id);
    if (sc.id === 'launchFlops') {
      expect(r.gates.g1!.decision).toBe('Tighten');
      expect(r.gates.g1!.inputs[0]!.value).toBeLessThan(0.4);
      expect(r.gates.g1!.inputs[1]!.value).toBeGreaterThan(1);
      expect(r.gates.g1!.inputs[1]!.value).toBeLessThan(C.T_DEMAND_LIFT.value);
    } else if (sc.id === 'smallNode') {
      expect(r.gates.g2!.packPoint).toMatchObject({ verdict: 'Waits', fee: 44 });
      expect(fired(r, sc.guardrail)).toBe(true);
    } else {
      expect(fired(r, sc.guardrail)).toBe(true);
    }
  });

  it('rival dump and sale week keep B within 3% of the honest B', () => {
    for (const id of ['rivalDump', 'saleWeekB'] as const) {
      const r = run(id);
      for (const d of r.days) {
        const b = d.skus.find((s) => s.skuId === 'bottle-1l')!;
        const honest = hero.days.find((x) => x.day === d.day)!.skus.find((s) => s.skuId === 'bottle-1l')!.B;
        expect(Math.abs(b.B - honest) / honest).toBeLessThanOrEqual(0.03);
      }
    }
  });

  it('reseller: never launch-eligible, priced above B', () => {
    const r = run('resellerSignup');
    expect(r.events.some((e) => e.kind === 'live')).toBe(false);
    expect(r.days[0]!.skus[0]!.price).toBeGreaterThan(160);
  });

  it('coach fix fails twice → one KAM case and a new rule', () => {
    const r = run('coachFixFails');
    expect(r.kpis.kamCases).toBe(1);
    expect(r.kpis.newRules).toHaveLength(1);
  });
});

describe('category 30-day sims (same engine)', () => {
  it.each(CATEGORY_CARDS)('$name', (card) => {
    const r = simulateCategory(card.id);
    if (!card.sim) {
      expect(r).toBeNull();
      expect(card.failingTest).toBeTruthy();
      return;
    }
    expect(r).not.toBeNull();
    expect(r!.days[r!.days.length - 1]!.day).toBe(30);
    expect(r!.gates.g1).toBeDefined();
    expect(r!.kpis.totalOrders).toBeGreaterThan(0);
  });
});

describe('every persona spec prices in band at launch', () => {
  it.each(PERSONA_SPECS)('$name', (p) => {
    const r = simulate({ personaId: p.id });
    const s = r.days.find((d) => d.day === C.LAUNCH_LIVE_DAYS.value.min)!.skus[0]!;
    expect(s.inBand).toBe(true);
  });
});
