import { describe, expect, it } from 'vitest';
import { C } from '../../src/data/constants';
import { PERSONA_SPECS, type PersonaId } from '../../src/data/personas';
import { simulate, type SimResult } from '../../src/engine/simulate';
import {
  NUDGE_TYPES,
  isCleared,
  nextNudgeDay,
  nudgeTimeline,
  nudgesFiredOn,
  nudgesFor,
  type Nudge,
  type NudgeAccount,
  type NudgeState,
  type NudgeType,
} from '../../src/engine/nudges';

const runs = Object.fromEntries(PERSONA_SPECS.map((p) => [p.id, simulate({ personaId: p.id })])) as Record<PersonaId, SimResult>;
const acc = (id: PersonaId, run = runs[id]): NudgeAccount => ({ id, persona: run.persona, run });
const empty = (over: Partial<NudgeState> = {}): NudgeState => ({ onboarding: { committedDay: null }, actions: {}, packed: {}, handed: {}, notReady: {}, ...over });
const END = C.TIMELINE_DAYS.value.max;
const all = (id: PersonaId, state = empty()) => nudgeTimeline(acc(id), state, END);
const ofType = (id: PersonaId, t: NudgeType, state = empty()) => all(id, state).filter((n) => n.type === t);

/** Every CTA must open a maker-app screen that exists. */
const ROUTE = /^\/app\/(today|inbox|launch|packpoint|coach|earnings|more|products|products\/[\w-]+|orders(\?tab=returns(&ret=[\w-]+:-?\d+)?)?|list\/[\w-]+\/(product|quantity|price|fulfilment))$/;

/** Hiren with no casserole sales after its first lot lands: stock sits at the node (storage nudges). */
function stuckAtNode(): SimResult {
  const r = structuredClone(runs.hiren);
  const first = r.events.find((e) => e.kind === 'stockIn' && e.skuId === 'casserole-1500')!.day;
  for (const d of r.days) for (const s of d.skus) if (s.skuId === 'casserole-1500' && d.day > first) s.orders = 0;
  r.events = r.events.filter((e) => !(e.skuId === 'casserole-1500' && e.kind === 'batchArrived'));
  // Keep the run long enough for day 60 of storage.
  return r;
}

describe('nudge engine: all 26 types', () => {
  it('has 26 types', () => {
    expect(NUDGE_TYPES).toHaveLength(26);
  });

  // [type, persona, expected first day (or null = any), extra state]
  const natural: [NudgeType, PersonaId, number | null][] = [
    ['make_first_lot', 'hiren', C.LAUNCH_COMMIT_BY_DAY.value],
    ['stock_in_reminder', 'hiren', C.LAUNCH_STOCK_IN_DAY.value - C.STOCK_IN_REMINDER_DAYS.value],
    ['send_lot_packpoint', 'hiren', null],
    ['lot_received', 'hiren', null],
    ['launch_live', 'hiren', C.LAUNCH_LIVE_DAYS.value.min],
    ['new_order_pack', 'hiren', C.LAUNCH_LIVE_DAYS.value.min],
    ['valmo_pickup', 'hiren', C.LAUNCH_LIVE_DAYS.value.min],
    ['return_incoming', 'hiren', null],
    ['claim_reminder', 'hiren', null],
    ['return_at_node', 'hiren', null],
    ['day30_result', 'hiren', C.GATE_DAYS.value[0]!],
    ['restock_batch', 'hiren', 33],
    ['send_next_lot', 'hiren', null],
    ['stock_out', 'ayesha', null],
    ['coach_fix', 'hiren', 38],
    ['coach_recheck', 'hiren', 52],
    ['price_alert', 'hiren', 52],
    ['prepaid_nudge', 'sunita', null],
    ['stop_sku', 'hiren', 64],
    ['switch_sku', 'hiren', 64],
    ['escalation_call', 'sunita', null],
    ['payout', 'hiren', null],
  ];

  it.each(natural)('%s fires for %s on the right day, with a valid deep link', (type, id, day) => {
    const list = ofType(id, type);
    expect(list.length, `${type} fired`).toBeGreaterThan(0);
    if (day !== null) expect(list[0]!.firedDay).toBe(day);
    for (const n of list) {
      expect(n.cta.route).toMatch(ROUTE);
      expect(n.title.length).toBeGreaterThan(10);
      expect(n.titleHi.length).toBeGreaterThan(3);
      expect(n.source.length).toBeGreaterThan(3);
      expect(n.persona).toBe(id);
    }
  });

  it('dispatch_deadline and pickup_missed fire when the maker says "not ready" at pickup, and clear on hand-over', () => {
    const d = C.LAUNCH_LIVE_DAYS.value.min;
    const sku = 'bottle-1l';
    const state = empty({ notReady: { [`${sku}:${d}`]: true } });
    const fired = nudgesFiredOn(acc('hiren'), d + 1, state);
    const deadline = fired.find((n) => n.type === 'dispatch_deadline')!;
    expect(deadline.priority).toBe('urgent');
    expect(deadline.cta.route).toBe('/app/orders');
    expect(fired.some((n) => n.type === 'pickup_missed')).toBe(true);
    expect(nudgesFor(acc('hiren'), d + 1, state).some((n) => n.id === deadline.id)).toBe(true);
    const handed = { ...state, handed: { [`${sku}:${d}`]: true as const } };
    expect(nudgesFiredOn(acc('hiren'), d + 1, handed).some((n) => n.type === 'dispatch_deadline')).toBe(false);
    // Without "not ready", Valmo's scan counts as handed over: no deadline nudges in the base run.
    expect(ofType('hiren', 'dispatch_deadline')).toHaveLength(0);
  });

  it('storage nudges do not fire in the base run: casserole lots sell within the free period', () => {
    expect(ofType('hiren', 'storage_warning')).toHaveLength(0);
    expect(ofType('hiren', 'storage_decision')).toHaveLength(0);
  });

  it('storage_warning fires at day 25 and storage_decision at day 60 of a lot sitting at the node', () => {
    // Synthetic: the casserole's first lot lands on day 25 and nothing sells.
    const early = stuckAtNode();
    for (const e of early.events) if (e.kind === 'stockIn' && e.skuId === 'casserole-1500') e.day = 25;
    for (const d of early.days) for (const s of d.skus) if (s.skuId === 'casserole-1500') s.orders = 0;
    const list = nudgeTimeline(acc('hiren', early), empty(), END);
    const warn = list.find((n) => n.type === 'storage_warning')!;
    expect(warn.firedDay).toBe(25 + C.PP_STORAGE_WARNING_DAY.value);
    expect(warn.cta.route).toBe('/app/packpoint');
    const dec = list.find((n) => n.type === 'storage_decision')!;
    expect(dec.firedDay).toBe(25 + C.PP_SLOW_STOCK_DECISION_DAY.value);
    expect(dec.cta.route).toBe('/app/products/casserole-1500');
  });

  it('covers every type', () => {
    const covered = new Set<NudgeType>([...natural.map(([t]) => t), 'dispatch_deadline', 'pickup_missed', 'storage_warning', 'storage_decision']);
    expect([...covered].sort()).toEqual([...NUDGE_TYPES].sort());
  });
});

describe('nudge engine: per persona', () => {
  it('Hiren: restock on day 33 says 11 a day and 230 units', () => {
    const r = ofType('hiren', 'restock_batch')[0]!;
    expect(r.title).toBe('Selling 11 a day. Make your next batch: 230 units of the 1 L stainless steel bottle.');
    expect(r.cta.route).toBe('/app/products/bottle-1l');
    expect(r.source).toMatch(/run-rate 11(\.\d)?\/day · reorder point 77/);
  });

  it('Pack Point and storage nudges only for Hiren (casserole); bottle stays self-ship', () => {
    for (const t of ['send_lot_packpoint', 'lot_received', 'send_next_lot', 'return_at_node'] as NudgeType[]) {
      expect(ofType('hiren', t).length, t).toBeGreaterThan(0);
      expect(ofType('ayesha', t), t).toHaveLength(0);
      expect(ofType('sunita', t), t).toHaveLength(0);
      for (const n of ofType('hiren', t)) expect(['casserole-1500', 'lunchbox-3tier']).toContain(n.sku);
    }
    expect(ofType('hiren', 'new_order_pack').some((n) => n.sku === 'bottle-1l')).toBe(true);
    expect(ofType('hiren', 'new_order_pack').some((n) => n.sku === 'casserole-1500')).toBe(false);
  });

  it('Launch Week number: Hiren 2, Ayesha 1, Sunita 2', () => {
    expect(ofType('hiren', 'launch_live')[0]!.title).toContain('Launch Week 2');
    expect(ofType('ayesha', 'launch_live')[0]!.title).toContain('Launch Week 1');
    expect(ofType('sunita', 'launch_live')[0]!.title).toContain('Launch Week 2');
  });

  it('prepaid nudges: rare for Hiren, frequent for Ayesha and Sunita', () => {
    expect(ofType('hiren', 'prepaid_nudge').length).toBeLessThanOrEqual(1);
    expect(ofType('ayesha', 'prepaid_nudge').length).toBeGreaterThanOrEqual(2);
    expect(ofType('sunita', 'prepaid_nudge').length).toBeGreaterThanOrEqual(2);
  });

  it('escalation: Sunita once (fix failed twice), nobody else in the base run', () => {
    expect(ofType('sunita', 'escalation_call')).toHaveLength(1);
    expect(ofType('hiren', 'escalation_call')).toHaveLength(0);
    expect(ofType('ayesha', 'escalation_call')).toHaveLength(0);
    expect(ofType('sunita', 'escalation_call')[0]!.cta.route).toBe('/app/more');
  });

  it('escalation also fires once when two nudges are set aside', () => {
    const fixes = all('ayesha').filter((n) => n.actions.some((a) => a.dismiss) && n.type !== 'valmo_pickup').slice(0, 2);
    expect(fixes).toHaveLength(2);
    const state = empty({ actions: Object.fromEntries(fixes.map((n) => [n.id, { day: n.firedDay, action: 'dismissed' }])) });
    const esc = ofType('ayesha', 'escalation_call', state);
    expect(esc).toHaveLength(1);
    expect(esc[0]!.firedDay).toBe(fixes[1]!.firedDay + 1);
  });

  it('Sunita: day-30 Tighten, then the rerun', () => {
    const d30 = ofType('sunita', 'day30_result');
    expect(d30).toHaveLength(2);
    expect(d30[0]!.title).toContain('Tighten');
  });

  it('nothing fires before the slot is committed', () => {
    for (const p of PERSONA_SPECS) {
      for (let d = C.TIMELINE_DAYS.value.min; d < C.LAUNCH_COMMIT_BY_DAY.value; d++) expect(nudgesFiredOn(acc(p.id), d, empty())).toEqual([]);
    }
  });

  it("the maker's own commit day starts the first-lot nudge", () => {
    const n = nudgeTimeline(acc('hiren'), empty({ onboarding: { committedDay: -5 } }), 0).filter((x) => x.type === 'make_first_lot');
    expect(n.map((x) => x.firedDay)).toEqual([-5, -5]);
  });
});

describe('nudge engine: clearing and expiry', () => {
  it('a recorded action clears a nudge; dismissals clear too', () => {
    const n = ofType('hiren', 'restock_batch')[0]!;
    expect(nudgesFor(acc('hiren'), n.firedDay, empty()).some((x) => x.id === n.id)).toBe(true);
    const done = empty({ actions: { [n.id]: { day: n.firedDay, action: 'started' } } });
    expect(isCleared(n, done)).toBe(true);
    expect(nudgesFor(acc('hiren'), n.firedDay, done).some((x) => x.id === n.id)).toBe(false);
  });

  it('packing clears the order nudge', () => {
    const n = ofType('hiren', 'new_order_pack')[0]!;
    expect(isCleared(n, empty({ packed: { [`${n.sku}:${n.firedDay}`]: true } }))).toBe(true);
  });

  it('nudges expire', () => {
    const n = ofType('hiren', 'launch_live')[0]!;
    expect(nudgesFor(acc('hiren'), n.expiresDay + 1, empty()).some((x) => x.id === n.id)).toBe(false);
  });

  it('urgent nudges sort first', () => {
    const n = ofType('ayesha', 'stock_out')[0]!;
    const active = nudgesFor(acc('ayesha'), n.firedDay, empty());
    expect(active[0]!.priority).toBe('urgent');
  });

  it('"Jump to next nudge" walks Hiren from day −7 to the end', () => {
    const state = empty();
    let d = -7;
    const days: number[] = [];
    for (let next = nextNudgeDay(acc('hiren'), state, d); next !== null; next = nextNudgeDay(acc('hiren'), state, d)) {
      days.push(next);
      d = next;
    }
    expect(days[0]).toBe(C.LAUNCH_COMMIT_BY_DAY.value);
    expect(days.at(-1)).toBeLessThanOrEqual(END);
    expect(new Set(days).size).toBe(days.length);
  });

  it('is deterministic', () => {
    const a = all('sunita').map((n: Nudge) => n.id);
    const b = nudgeTimeline(acc('sunita', simulate({ personaId: 'sunita' })), empty(), END).map((n) => n.id);
    expect(a).toEqual(b);
  });
});
