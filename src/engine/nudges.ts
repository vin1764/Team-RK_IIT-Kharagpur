/**
 * The nudge engine: what the maker app tells a maker to do, and when.
 *
 * Pure functions of (account, day, state). Every nudge is computed from the account's simulated
 * run (orders, returns, stock, events) and the actions the maker has recorded; nothing is keyed
 * to a persona or a fixed day.
 */
import { C } from '../data/constants';
import type { PersonaId, PersonaSpec, SkuSpec } from '../data/personas';
import type { DayState, SimEvent, SimResult, SkuDay } from './simulate';
import { expectedDailyPerSku, firstLot, listPrice } from './formulas';
import { inr } from '../lib/format';

export type NudgeType =
  | 'make_first_lot'
  | 'stock_in_reminder'
  | 'send_lot_packpoint'
  | 'lot_received'
  | 'launch_live'
  | 'new_order_pack'
  | 'valmo_pickup'
  | 'dispatch_deadline'
  | 'pickup_missed'
  | 'return_incoming'
  | 'claim_reminder'
  | 'return_at_node'
  | 'day30_result'
  | 'restock_batch'
  | 'send_next_lot'
  | 'stock_out'
  | 'storage_warning'
  | 'storage_decision'
  | 'coach_fix'
  | 'coach_recheck'
  | 'price_alert'
  | 'prepaid_nudge'
  | 'stop_sku'
  | 'switch_sku'
  | 'escalation_call'
  | 'payout';

export const NUDGE_TYPES: NudgeType[] = [
  'make_first_lot',
  'stock_in_reminder',
  'send_lot_packpoint',
  'lot_received',
  'launch_live',
  'new_order_pack',
  'valmo_pickup',
  'dispatch_deadline',
  'pickup_missed',
  'return_incoming',
  'claim_reminder',
  'return_at_node',
  'day30_result',
  'restock_batch',
  'send_next_lot',
  'stock_out',
  'storage_warning',
  'storage_decision',
  'coach_fix',
  'coach_recheck',
  'price_alert',
  'prepaid_nudge',
  'stop_sku',
  'switch_sku',
  'escalation_call',
  'payout',
];

export type Priority = 'urgent' | 'today' | 'info';

export interface NudgeAction {
  id: string;
  label: string;
  labelHi: string;
  /** Secondary actions (e.g. "Not now") don't count as acting on the nudge. */
  dismiss?: boolean;
}

export interface Nudge {
  id: string;
  type: NudgeType;
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  firedDay: number;
  /** Shown as "due …"; also used for sorting. */
  dueDay?: number;
  dueAt?: string;
  /** The nudge stops showing after this day. */
  expiresDay: number;
  priority: Priority;
  cta: { label: string; labelHi: string; route: string };
  actions: NudgeAction[];
  persona: PersonaId;
  sku?: string;
  /** The system event behind the nudge (shown in the ops console). */
  source: string;
}

export interface NudgeAccount {
  id: PersonaId;
  persona: PersonaSpec;
  run: SimResult;
}

export interface NudgeState {
  onboarding: { committedDay: number | null; lots?: Record<string, number> };
  actions: Record<string, { day: number; action: string }>;
  packed: Record<string, true>;
  handed: Record<string, true>;
  /** `sku:orderDay` the maker marked "Not ready today" at pickup (Valmo's scan records every other handover). */
  notReady: Record<string, true>;
}

// ───────────────────────── helpers ─────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateOf(day: number) {
  const [y, m, d] = C.DEMO_DAY_ZERO.value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + day));
}

/** "6 Nov" for a simulation day. */
export const dateLabel = (day: number) => {
  const t = dateOf(day);
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
};

/** "Thu 6 Nov". */
export const weekdayLabel = (day: number) => `${WEEKDAYS[dateOf(day).getUTCDay()]} ${dateLabel(day)}`;

const specsOf = (run: SimResult): SkuSpec[] => [...run.persona.skus, ...run.persona.switchOptions];
const specOf = (run: SimResult, sku: string) => specsOf(run).find((s) => s.id === sku);
const dayOf = (run: SimResult, d: number): DayState | undefined => run.days.find((x) => x.day === d);
const skuDayOf = (run: SimResult, d: number, sku: string): SkuDay | undefined => dayOf(run, d)?.skus.find((s) => s.skuId === sku);
const eventsOn = (run: SimResult, d: number, kind: SimEvent['kind']) => run.events.filter((e) => e.day === d && e.kind === kind);

/** Pack Point or self-ship, as the engine actually ran the SKU (node size decides for Pack Point SKUs). */
export function fulfilmentOf(run: SimResult, sku: string): 'self' | 'packPoint' {
  const spec = specOf(run, sku);
  if (!spec || spec.fulfilment !== 'packPoint') return 'self';
  const firstLive = run.days.find((d) => d.skus.some((s) => s.skuId === sku && s.live));
  return firstLive && firstLive.nodeMakers >= C.PP_REFERENCE_MAKERS.value ? 'packPoint' : 'self';
}

const allSkuIds = (run: SimResult) => [...new Set(run.days.flatMap((d) => d.skus.map((s) => s.skuId)))];
const selfShipSkus = (run: SimResult) => allSkuIds(run).filter((id) => fulfilmentOf(run, id) === 'self');
const packPointSkus = (run: SimResult) => allSkuIds(run).filter((id) => fulfilmentOf(run, id) === 'packPoint');
const nameOf = (run: SimResult, sku: string) => specOf(run, sku)?.name ?? sku;

/** The day the launch slot counts as committed: the maker's own tap, or the order-book deadline in the demo. */
export function committedDayOf(state: NudgeState, day: number): number | null {
  if (state.onboarding.committedDay !== null) return state.onboarding.committedDay;
  const by = C.LAUNCH_COMMIT_BY_DAY.value;
  return day >= by ? by : null;
}

/** Units arriving at stock (launch lots and batches) for a SKU on a day. */
function arrivalsOn(run: SimResult, d: number, sku: string): number {
  return run.events
    .filter((e) => e.day === d && e.skuId === sku && (e.kind === 'stockIn' || e.kind === 'batchArrived'))
    .reduce((a, e) => a + Number(e.data?.units ?? 0), 0);
}

/** FIFO lots at the node for a Pack Point SKU on day d: arrival day and units still there. */
export function nodeLots(run: SimResult, sku: string, d: number): { arrival: number; units: number }[] {
  const lots: { arrival: number; units: number }[] = [];
  for (const day of run.days) {
    if (day.day > d) break;
    const units = arrivalsOn(run, day.day, sku);
    if (units > 0) lots.push({ arrival: day.day, units });
    let take = day.skus.find((s) => s.skuId === sku)?.orders ?? 0;
    while (take > 0 && lots.length > 0) {
      const lot = lots[0]!;
      const t = Math.min(lot.units, take);
      lot.units -= t;
      take -= t;
      if (lot.units === 0) lots.shift();
    }
  }
  return lots;
}

const urgentFirst: Record<Priority, number> = { urgent: 0, today: 1, info: 2 };

// ───────────────────────── firing ─────────────────────────

/** Nudges that fire on exactly this day. */
export function nudgesFiredOn(account: NudgeAccount, d: number, state: NudgeState): Nudge[] {
  const { run, id: persona } = account;
  const out: Nudge[] = [];
  const add = (n: Omit<Nudge, 'persona' | 'firedDay' | 'actions'> & { actions?: NudgeAction[] }) =>
    out.push({ actions: [], ...n, persona, firedDay: d });
  const live = C.LAUNCH_LIVE_DAYS.value;
  const stockIn = C.LAUNCH_STOCK_IN_DAY.value;
  const committed = committedDayOf(state, d);
  const launchSkus = run.persona.skus.filter((s) => s.inLaunch && Number.isFinite(s.liveFromDay));

  // 1 · make_first_lot: the slot is committed.
  if (committed !== null && d === committed) {
    for (const s of launchSkus) {
      const lot =
        state.onboarding.lots?.[s.id] ??
        firstLot({ min: expectedDailyPerSku(s.openGapWeek.min, s.likelyShare), max: expectedDailyPerSku(s.openGapWeek.max, s.likelyShare) }, s.minRun).suggested;
      const startBy = stockIn - s.leadTimeDays;
      add({
        id: `make_first_lot:${s.id}`,
        type: 'make_first_lot',
        title: `Make your first lot: ${lot} units of the ${s.name}.`,
        titleHi: `पहला लॉट बनाएँ: ${s.name} के ${lot} यूनिट।`,
        body: `Start by ${dateLabel(startBy)} to be ready by ${dateLabel(stockIn)}.`,
        bodyHi: `${dateLabel(startBy)} तक शुरू करें ताकि ${dateLabel(stockIn)} तक तैयार हो।`,
        dueDay: startBy,
        dueAt: `Start by ${dateLabel(startBy)}`,
        expiresDay: stockIn,
        priority: 'today',
        cta: { label: 'Mark started', labelHi: 'शुरू किया', route: '/app/launch' },
        actions: [{ id: 'started', label: 'Mark started', labelHi: 'शुरू किया' }],
        sku: s.id,
        source: `Slot committed on day ${committed}; lot = ${C.FIRST_LOT_DAYS.value} days of expected sales (listing bot)`,
      });
    }
  }

  // 2 · stock_in_reminder: three days before stock-in.
  if (committed !== null && d === stockIn - C.STOCK_IN_REMINDER_DAYS.value) {
    add({
      id: 'stock_in_reminder',
      type: 'stock_in_reminder',
      title: `Stock-in in ${C.STOCK_IN_REMINDER_DAYS.value} days. Is your lot ready?`,
      titleHi: `${C.STOCK_IN_REMINDER_DAYS.value} दिन में स्टॉक-इन। क्या आपका लॉट तैयार है?`,
      body: `Stock must be ready and linked by ${dateLabel(stockIn)}.`,
      bodyHi: `${dateLabel(stockIn)} तक स्टॉक तैयार और लिंक होना चाहिए।`,
      dueDay: stockIn,
      dueAt: `By ${dateLabel(stockIn)}`,
      expiresDay: stockIn,
      priority: 'today',
      cta: { label: 'Open checklist', labelHi: 'चेकलिस्ट खोलें', route: '/app/launch' },
      actions: [
        { id: 'ready', label: 'Ready', labelHi: 'तैयार' },
        { id: 'late', label: 'Running late', labelHi: 'देर हो रही है' },
      ],
      source: `Order book: stock in by day ${stockIn}`,
    });
  }

  // 3 · send_lot_packpoint and 4 · lot_received (Pack Point SKUs).
  for (const sku of packPointSkus(run)) {
    const due = d + C.PP_DROP_NOTICE_DAYS.value;
    const units = arrivalsOn(run, due, sku);
    if (units > 0) {
      add({
        id: `send_lot_packpoint:${sku}:${due}`,
        type: 'send_lot_packpoint',
        title: `Send your lot to the ${run.persona.city} Pack Point: ${units} units.`,
        titleHi: `${run.persona.city} पैक पॉइंट पर लॉट भेजें: ${units} यूनिट।`,
        body: `${nameOf(run, sku)}. Drop ${weekdayLabel(due)}, ${C.PP_DROP_WINDOW.value}.`,
        bodyHi: `${weekdayLabel(due)}, ${C.PP_DROP_WINDOW.value} के बीच जमा करें।`,
        dueDay: due,
        dueAt: `Drop ${weekdayLabel(due)}`,
        expiresDay: due,
        priority: 'today',
        cta: { label: 'Open Pack Point', labelHi: 'पैक पॉइंट खोलें', route: '/app/packpoint' },
        actions: [{ id: 'sent', label: 'Lot sent', labelHi: 'लॉट भेजा' }],
        sku,
        source: `Pack Point inbound planned for day ${due} (${units} units)`,
      });
    }
    const arrived = arrivalsOn(run, d, sku);
    if (arrived > 0) {
      const short = Math.round((arrived * C.PP_INBOUND_SHORTFALL_PCT.value) / 100);
      add({
        id: `lot_received:${sku}:${d}`,
        type: 'lot_received',
        title: `Lot received: ${arrived} counted and weighed${short > 0 ? `, ${short} short` : ''}. Stock linked.`,
        titleHi: `लॉट मिला: ${arrived} गिने और तौले गए${short > 0 ? `, ${short} कम` : ''}। स्टॉक लिंक हुआ।`,
        body: `${nameOf(run, sku)} at the ${run.persona.city} Pack Point (sent ${arrived + short}).`,
        bodyHi: `${run.persona.city} पैक पॉइंट पर।`,
        expiresDay: d + 2,
        priority: 'info',
        cta: { label: 'See lots', labelHi: 'लॉट देखें', route: '/app/packpoint' },
        sku,
        source: `Pack Point weigh-in: ${arrived} counted`,
      });
    }
  }

  // 5 · launch_live.
  if (d === live.min && eventsOn(run, d, 'live').length > 0) {
    add({
      id: 'launch_live',
      type: 'launch_live',
      title: `You're live in Factory Launch Week ${run.persona.launchWeekNo}.`,
      titleHi: `आप फ़ैक्टरी लॉन्च वीक ${run.persona.launchWeekNo} में लाइव हैं।`,
      body: `Live ${dateLabel(live.min)}–${dateLabel(live.max)} in the launch section.`,
      bodyHi: `${dateLabel(live.min)}–${dateLabel(live.max)} लॉन्च सेक्शन में लाइव।`,
      expiresDay: live.max,
      priority: 'info',
      cta: { label: 'Launch dashboard', labelHi: 'लॉन्च डैशबोर्ड', route: '/app/launch' },
      source: 'Launch Week live days start',
    });
  }

  // 6–9 · orders, Valmo pickup, deadlines (self-ship SKUs).
  const self = selfShipSkus(run);
  let pickupParcels = 0;
  for (const sku of self) {
    const today = skuDayOf(run, d, sku)?.orders ?? 0;
    if (today > 0) {
      add({
        id: `new_order_pack:${sku}:${d}`,
        type: 'new_order_pack',
        title: `New orders: ${today} × ${nameOf(run, sku)}. Pack and keep ready.`,
        titleHi: `नए ऑर्डर: ${today}। पैक करके तैयार रखें।`,
        body: 'Labels ready.',
        bodyHi: 'लेबल तैयार हैं।',
        expiresDay: d,
        priority: 'today',
        cta: { label: 'Open orders', labelHi: 'ऑर्डर खोलें', route: '/app/orders' },
        actions: [{ id: 'packed', label: 'Packed', labelHi: 'पैक हो गया' }],
        sku,
        source: `${today} orders placed today (self-ship)`,
      });
      if (!state.handed[`${sku}:${d}`]) pickupParcels += today;
    }
    const yesterday = skuDayOf(run, d - 1, sku)?.orders ?? 0;
    if (yesterday > 0 && state.notReady[`${sku}:${d - 1}`] && !state.handed[`${sku}:${d - 1}`]) {
      add({
        id: `dispatch_deadline:${sku}:${d - 1}`,
        type: 'dispatch_deadline',
        title: `${yesterday} order${yesterday > 1 ? 's' : ''} must be handed over by ${C.DISPATCH_HANDOVER_CUTOFF.value} tomorrow, or they auto-cancel.`,
        titleHi: `${yesterday} ऑर्डर कल ${C.DISPATCH_HANDOVER_CUTOFF.value} तक सौंपें, वरना रद्द हो जाएँगे।`,
        body: `${nameOf(run, sku)}, ordered ${dateLabel(d - 1)}. Dispatch within ${C.DISPATCH_SLA_HOURS.value.max} h.`,
        bodyHi: `${C.DISPATCH_SLA_HOURS.value.max} घंटे में डिस्पैच।`,
        dueDay: d + 1,
        dueAt: `${C.DISPATCH_HANDOVER_CUTOFF.value} ${dateLabel(d + 1)}`,
        expiresDay: d,
        priority: 'urgent',
        cta: { label: 'Open orders', labelHi: 'ऑर्डर खोलें', route: '/app/orders' },
        actions: [{ id: 'handed', label: 'Handed over', labelHi: 'सौंप दिया' }],
        sku,
        source: `Orders of ${dateLabel(d - 1)} marked not ready at pickup; ${C.DISPATCH_SLA_HOURS.value.max} h dispatch SLA`,
      });
      add({
        id: `pickup_missed:${sku}:${d - 1}`,
        type: 'pickup_missed',
        title: 'Pickup missed? Reschedule for tomorrow.',
        titleHi: 'पिकअप छूट गया? कल के लिए फिर से तय करें।',
        body: `${yesterday} parcel${yesterday > 1 ? 's' : ''} of ${nameOf(run, sku)} not confirmed with Valmo yesterday.`,
        bodyHi: `कल Valmo के साथ पुष्टि नहीं हुई।`,
        expiresDay: d,
        priority: 'today',
        cta: { label: 'Reschedule', labelHi: 'फिर से तय करें', route: '/app/orders' },
        actions: [{ id: 'rescheduled', label: 'Reschedule', labelHi: 'फिर से तय करें' }],
        sku,
        source: `Valmo pickup for ${dateLabel(d - 1)} not confirmed`,
      });
    }
  }
  if (pickupParcels > 0) {
    add({
      id: `valmo_pickup:${d}`,
      type: 'valmo_pickup',
      title: `Valmo pickup today, ${C.VALMO_PICKUP_WINDOW.value}: ${pickupParcels} parcels.`,
      titleHi: `आज Valmo पिकअप, ${C.VALMO_PICKUP_WINDOW.value}: ${pickupParcels} पार्सल।`,
      body: 'Valmo scans each parcel at pickup. Not ready? Tell us so we can reschedule.',
      bodyHi: 'Valmo पिकअप पर हर पार्सल स्कैन करता है। तैयार नहीं? बताएँ।',
      dueAt: C.VALMO_PICKUP_WINDOW.value,
      dueDay: d,
      expiresDay: d,
      priority: 'today',
      cta: { label: 'Open orders', labelHi: 'ऑर्डर खोलें', route: '/app/orders' },
      actions: [
        { id: 'handed', label: 'Handed over', labelHi: 'सौंप दिया' },
        { id: 'not_ready', label: 'Not ready today', labelHi: 'आज तैयार नहीं', dismiss: true },
      ],
      source: `${pickupParcels} parcels pending pickup (self-ship)`,
    });
  }

  // 10–12 · returns.
  for (const sku of allSkuIds(run)) {
    const pp = fulfilmentOf(run, sku) === 'packPoint';
    const tomorrow = skuDayOf(run, d + 1, sku);
    const incoming = tomorrow ? Object.values(tomorrow.returnsArrived ?? {}).reduce((a, b) => a + b, 0) : 0;
    if (!pp && incoming > 0) {
      add({
        id: `return_incoming:${sku}:${d + 1}`,
        type: 'return_incoming',
        title: `${incoming} return${incoming > 1 ? 's' : ''} arriving tomorrow. Check and grade ${incoming > 1 ? 'them' : 'it'}.`,
        titleHi: `कल ${incoming} रिटर्न आ रहे हैं। जाँचें और ग्रेड करें।`,
        body: `${nameOf(run, sku)}. Return fee by weight and zone; RTOs cost nothing when dispatched on time.`,
        bodyHi: 'रिटर्न शुल्क वज़न और ज़ोन के अनुसार।',
        expiresDay: d + 1,
        priority: 'today',
        cta: { label: 'See returns', labelHi: 'रिटर्न देखें', route: `/app/orders?tab=returns&ret=${sku}:${d + 1}` },
        sku,
        source: `${incoming} customer returns in transit`,
      });
    }
    const today = skuDayOf(run, d, sku);
    const swaps = today?.returnsArrived?.swap ?? 0;
    if (!pp && swaps > 0) {
      add({
        id: `claim_reminder:${sku}:${d}`,
        type: 'claim_reminder',
        title: 'File a claim with your unboxing video.',
        titleHi: 'अनबॉक्सिंग वीडियो के साथ क्लेम करें।',
        body: `${swaps} returned ${nameOf(run, sku)} ${swaps > 1 ? 'are' : 'is'} not the item you sent. A claim recovers about ${Math.round(C.CLAIM_RECOVERY_SHARE.value * 100)}%.`,
        bodyHi: `लौटाया गया सामान आपका नहीं है। क्लेम से लगभग आधा वापस मिलता है।`,
        expiresDay: d + C.RETURN_WINDOW_DAYS.value,
        priority: 'today',
        cta: { label: 'Open return', labelHi: 'रिटर्न खोलें', route: `/app/orders?tab=returns&ret=${sku}:${d}` },
        actions: [{ id: 'claimed', label: 'Claim filed', labelHi: 'क्लेम किया' }],
        sku,
        source: `Swapped item returned (self-ship): ${swaps}`,
      });
    }
    if (pp && today) {
      const back = (today.returnsArrived?.expectation ?? 0) + (today.returnsArrived?.size ?? 0) + (today.returnsArrived?.product ?? 0);
      const caught = run.events.filter((e) => e.day === d && e.kind === 'swapCaught' && e.skuId === sku).length;
      if (back > 0 || caught > 0) {
        const g = today.grades;
        add({
          id: `return_at_node:${sku}:${d}`,
          type: 'return_at_node',
          title:
            caught > 0
              ? 'A return at the node weighed less than dispatch: buyer swap, claim denied. Nothing to do.'
              : `Return${back > 1 ? 's' : ''} received at the node: graded ${[g.A ? `A ×${g.A}` : '', g.B ? `B ×${g.B}` : '', g.C ? `C ×${g.C}` : ''].filter(Boolean).join(', ')}. Nothing to do.`,
          titleHi: 'नोड पर रिटर्न मिला और ग्रेड हुआ। आपको कुछ नहीं करना है।',
          body: `${nameOf(run, sku)}. Returns go to the node, never the factory.`,
          bodyHi: 'रिटर्न नोड पर जाते हैं, फ़ैक्टरी पर नहीं।',
          expiresDay: d + 2,
          priority: 'info',
          cta: { label: 'See return', labelHi: 'रिटर्न देखें', route: `/app/orders?tab=returns&ret=${sku}:${d}` },
          sku,
          source: caught > 0 ? 'Pack Point weight check caught a swap' : `Pack Point graded ${back} return(s)`,
        });
      }
    }
  }

  // 13 · day30_result (and the rerun).
  for (const e of eventsOn(run, d, 'gate').filter((x) => x.data?.gate === 1)) {
    const decision = String(e.data?.decision);
    const rerun = !!e.data?.rerun;
    add({
      id: `day30_result:${d}`,
      type: 'day30_result',
      title: rerun ? `Your launch rerun: ${decision}. See what it means.` : `Your first 30 days: ${decision}. See what it means.`,
      titleHi: rerun ? `दोबारा लॉन्च का नतीजा: ${decision}।` : `आपके पहले 30 दिन: ${decision}।`,
      body: e.text,
      bodyHi: decision === 'Invest' ? 'लॉन्च कामयाब रहा।' : 'एक सुधार, फिर दोबारा लॉन्च।',
      expiresDay: d + 7,
      priority: 'today',
      cta: { label: 'See results', labelHi: 'नतीजे देखें', route: '/app/launch' },
      source: e.text,
    });
  }

  // 14 · restock_batch.
  for (const e of eventsOn(run, d, 'restockPrompt')) {
    const sku = e.skuId!;
    const rr = Number(e.data?.runRate ?? 0);
    const batch = Number(e.data?.batch ?? 0);
    const start = Number(e.data?.startDay ?? d);
    const onHand = Number(e.data?.onHand ?? 0);
    const runOut = rr > 0 ? d + Math.floor(onHand / rr) : d;
    add({
      id: `restock_batch:${sku}:${d}`,
      type: 'restock_batch',
      title: `Selling ${Math.round(rr)} a day. Make your next batch: ${batch} units of the ${nameOf(run, sku)}.`,
      titleHi: `रोज़ ${Math.round(rr)} बिक रहे हैं। अगला बैच बनाएँ: ${batch} यूनिट।`,
      body: `Start by ${dateLabel(start)} to avoid running out on ${dateLabel(runOut)}.`,
      bodyHi: `${dateLabel(start)} तक शुरू करें, वरना ${dateLabel(runOut)} को स्टॉक ख़त्म।`,
      dueDay: start,
      dueAt: `Start by ${dateLabel(start)}`,
      expiresDay: Math.max(start, d) + (specOf(run, sku)?.leadTimeDays ?? 0),
      priority: 'today',
      cta: { label: 'See product', labelHi: 'प्रोडक्ट देखें', route: `/app/products/${sku}` },
      actions: [{ id: 'started', label: 'Batch started', labelHi: 'बैच शुरू किया' }],
      sku,
      source: `run-rate ${+rr.toFixed(1)}/day · reorder point ${e.data?.reorderPoint} · ${onHand} on hand`,
    });
  }

  // 15 · send_next_lot: weekly for Pack Point SKUs.
  for (const sku of packPointSkus(run)) {
    const firstLive = run.days.find((x) => x.skus.some((s) => s.skuId === sku && s.live))?.day;
    if (firstLive === undefined || d <= firstLive || (d - firstLive) % 7 !== 0) continue;
    const week = run.days.filter((x) => x.day > d - 7 && x.day <= d).reduce((a, x) => a + (x.skus.find((s) => s.skuId === sku)?.orders ?? 0), 0);
    if (week <= 0) continue;
    // A batch drop already due this week covers it.
    if (run.days.some((x) => x.day > d && x.day <= d + 7 && arrivalsOn(run, x.day, sku) > 0)) continue;
    const drop = d + C.PP_DROP_NOTICE_DAYS.value;
    add({
      id: `send_next_lot:${sku}:${d}`,
      type: 'send_next_lot',
      title: `Send next week's lot: ${week} units, drop ${weekdayLabel(drop)}.`,
      titleHi: `अगले हफ़्ते का लॉट भेजें: ${week} यूनिट।`,
      body: `${nameOf(run, sku)}: one bulk lot a week to the ${run.persona.city} Pack Point.`,
      bodyHi: 'हफ़्ते में एक बार पैक पॉइंट पर लॉट।',
      dueDay: drop,
      dueAt: `Drop ${weekdayLabel(drop)}, ${C.PP_DROP_WINDOW.value}`,
      expiresDay: drop,
      priority: 'today',
      cta: { label: 'Open Pack Point', labelHi: 'पैक पॉइंट खोलें', route: '/app/packpoint' },
      actions: [{ id: 'sent', label: 'Lot sent', labelHi: 'लॉट भेजा' }],
      sku,
      source: `Weekly lot = last 7 days' orders (${week})`,
    });
  }

  // 16 · stock_out.
  for (const e of eventsOn(run, d, 'stockOut')) {
    const sku = e.skuId!;
    const back = run.days.find((x) => x.day > d && (x.skus.find((s) => s.skuId === sku)?.onHand ?? 0) > 0)?.day ?? C.TIMELINE_DAYS.value.max;
    add({
      id: `stock_out:${sku}:${d}`,
      type: 'stock_out',
      title: `Out of stock: your ${nameOf(run, sku)} has left ranked results.`,
      titleHi: 'स्टॉक ख़त्म: आपकी लिस्टिंग रैंकिंग से हट गई है।',
      body: 'The page stays up with "notify me"; restock to come back.',
      bodyHi: 'पेज बना रहता है; दोबारा स्टॉक करें।',
      expiresDay: back,
      priority: 'urgent',
      cta: { label: 'See product', labelHi: 'प्रोडक्ट देखें', route: `/app/products/${sku}` },
      sku,
      source: 'Stock reached zero',
    });
  }

  // 17–18 · storage at the node.
  for (const sku of packPointSkus(run)) {
    for (const lot of nodeLots(run, sku, d)) {
      const age = d - lot.arrival;
      if (age === C.PP_STORAGE_WARNING_DAY.value && lot.units > 0) {
        const left = C.PP_STORAGE_FREE_DAYS.value - age;
        add({
          id: `storage_warning:${sku}:${lot.arrival}`,
          type: 'storage_warning',
          title: `${lot.units} units stored ${age} days; free storage ends in ${left} days.`,
          titleHi: `${lot.units} यूनिट ${age} दिन से रखे हैं; मुफ़्त स्टोरेज ${left} दिन में ख़त्म।`,
          body: `${nameOf(run, sku)}, lot of ${dateLabel(lot.arrival)}. Then ₹${C.PP_STORAGE_PER_UNIT_DAY.value}/unit/day.`,
          bodyHi: `फिर ₹${C.PP_STORAGE_PER_UNIT_DAY.value}/यूनिट/दिन।`,
          expiresDay: lot.arrival + C.PP_STORAGE_FREE_DAYS.value,
          priority: 'today',
          cta: { label: 'Open Pack Point', labelHi: 'पैक पॉइंट खोलें', route: '/app/packpoint' },
          sku,
          source: `Lot of day ${lot.arrival} at day ${age} of storage`,
        });
      }
      if (age === C.PP_SLOW_STOCK_DECISION_DAY.value && lot.units > 0) {
        add({
          id: `storage_decision:${sku}:${lot.arrival}`,
          type: 'storage_decision',
          title: `${lot.units} units haven't moved in ${age} days. Keep, or stop and let them sell down.`,
          titleHi: `${lot.units} यूनिट ${age} दिन से नहीं बिके। रखें, या रोकें।`,
          body: `${nameOf(run, sku)}, lot of ${dateLabel(lot.arrival)}.`,
          bodyHi: 'फ़ैसला करें।',
          expiresDay: d + 7,
          priority: 'today',
          cta: { label: 'Decide', labelHi: 'फ़ैसला करें', route: `/app/products/${sku}` },
          actions: [
            { id: 'keep', label: 'Keep', labelHi: 'रखें' },
            { id: 'stop', label: 'Stop', labelHi: 'रोकें' },
          ],
          sku,
          source: `Lot of day ${lot.arrival} at day ${age} of storage`,
        });
      }
    }
  }

  // 19, 22 · coach fixes and prepaid nudges.
  for (const e of eventsOn(run, d, 'coachNudge')) {
    const sku = e.skuId!;
    const trigger = String(e.data?.trigger);
    if (trigger === 'refusals') continue; // handled by the prepaid rule below
    const sd = skuDayOf(run, d, sku);
    const spec = specOf(run, sku);
    const ctr = skuDayOf(run, d - 1, sku)?.ctrPct ?? sd?.ctrPct ?? 0;
    const w = run.days.filter((x) => x.day > d - C.FIX_RECHECK_DAYS.value && x.day <= d);
    const delivered = w.reduce((a, x) => a + (x.skus.find((s) => s.skuId === sku)?.delivered ?? 0), 0);
    const returns = w.reduce((a, x) => a + (x.skus.find((s) => s.skuId === sku)?.returnRequests ?? 0), 0);
    const retPct = delivered ? Math.round((100 * returns) / delivered) : 0;
    const copy: Record<string, [string, string, string]> = {
      weakListing: [`This week's fix: change your main photo (CTR ${ctr}% vs ${spec?.typeCtr.median}%).`, 'इस हफ़्ते का सुधार: मुख्य फ़ोटो बदलें।', 'Buyers see it but don’t click: shoot it on white, with a scale object.'],
      listingFix: [`This week's fix: add a scale photo and fix the description (returns ${retPct}% vs ${spec?.typeReturnP75Pct}%).`, 'इस हफ़्ते का सुधार: स्केल फ़ोटो और विवरण ठीक करें।', 'Buyers say it looks different from the photo.'],
      productFix: [`This week's fix: fix it on the next batch (product returns are high).`, 'इस हफ़्ते का सुधार: अगले बैच में प्रोडक्ट ठीक करें।', 'Returns say the product itself has a problem.'],
    };
    const [title, titleHi, body] = copy[trigger] ?? [`This week's fix: ${e.text}`, 'इस हफ़्ते का सुधार', ''];
    add({
      id: `coach_fix:${sku}:${d}`,
      type: 'coach_fix',
      title,
      titleHi,
      body,
      bodyHi: 'एक टैप में सुधार; 14 दिन बाद दोबारा जाँच।',
      dueDay: d,
      expiresDay: d + C.FIX_RECHECK_DAYS.value - 1,
      priority: 'today',
      cta: { label: 'Open coach', labelHi: 'कोच खोलें', route: '/app/coach' },
      actions: [
        { id: 'done', label: 'Fix in one tap', labelHi: 'एक टैप में सुधारें' },
        { id: 'dismissed', label: 'Not now', labelHi: 'अभी नहीं', dismiss: true },
      ],
      sku,
      source: `coach trigger ${trigger} · ${e.text.replace(/^Coach: /, '').replace(/ Hindi nudge.*$/, '')}`,
    });
  }
  // Prepaid: refusal rate above the type's 75th percentile, checked weekly (and when the coach flags it).
  const liveFrom = live.min;
  for (const sku of allSkuIds(run)) {
    const spec = specOf(run, sku);
    if (!spec) continue;
    const coachFlag = eventsOn(run, d, 'coachNudge').some((e) => e.skuId === sku && e.data?.trigger === 'refusals');
    const weekly = d >= liveFrom + C.PREPAID_CHECK_EVERY_DAYS.value && (d - liveFrom) % C.PREPAID_CHECK_EVERY_DAYS.value === 0;
    if (!coachFlag && !weekly) continue;
    const w = run.days.filter((x) => x.day > d - C.REFUSAL_WINDOW_DAYS.value && x.day <= d);
    const orders = w.reduce((a, x) => a + (x.skus.find((s) => s.skuId === sku)?.orders ?? 0), 0);
    const rto = w.reduce((a, x) => a + (x.skus.find((s) => s.skuId === sku)?.rto ?? 0), 0);
    if (orders < C.NAD_MIN_DELIVERIES.value / 2) continue;
    const ratePct = (100 * rto) / orders;
    if (!coachFlag && ratePct <= spec.typeRefusalP75Pct) continue;
    add({
      id: `prepaid_nudge:${sku}:${d}`,
      type: 'prepaid_nudge',
      title: 'Many COD orders are being refused. Turn on the prepaid offer and show a clearer delivery date.',
      titleHi: 'कई COD ऑर्डर लौट रहे हैं। प्रीपेड ऑफ़र चालू करें और डिलीवरी तारीख़ साफ़ दिखाएँ।',
      body: `${nameOf(run, sku)}: refusals ${Math.round(ratePct)}% over ${C.REFUSAL_WINDOW_DAYS.value} days vs ${spec.typeRefusalP75Pct}% (75th percentile for the type).`,
      bodyHi: `रिफ़्यूज़ल ${Math.round(ratePct)}%।`,
      expiresDay: d + C.PREPAID_CHECK_EVERY_DAYS.value - 1,
      priority: 'today',
      cta: { label: 'See product', labelHi: 'प्रोडक्ट देखें', route: `/app/products/${sku}` },
      actions: [
        { id: 'prepaid_on', label: 'Turn on prepaid offer', labelHi: 'प्रीपेड ऑफ़र चालू करें' },
        { id: 'dismissed', label: 'Not now', labelHi: 'अभी नहीं', dismiss: true },
      ],
      sku,
      source: `Refusal rate ${ratePct.toFixed(1)}% > ${spec.typeRefusalP75Pct}% (p75)${coachFlag ? ' · coach refusals trigger' : ''}`,
    });
  }

  // 20 · coach_recheck.
  for (const e of eventsOn(run, d, 'fixRecheck')) {
    const sku = e.skuId!;
    const ok = !!e.data?.success;
    const ctr = skuDayOf(run, d, sku)?.ctrPct;
    const wasPhoto = run.events.some((x) => x.kind === 'coachNudge' && x.skuId === sku && x.day === d - C.FIX_RECHECK_DAYS.value && x.data?.trigger === 'weakListing');
    add({
      id: `coach_recheck:${sku}:${d}`,
      type: 'coach_recheck',
      title: ok ? (wasPhoto ? `Your photo fix worked: CTR back to ${ctr}%.` : 'Your fix worked: back in band.') : 'The fix didn’t work yet. One more try this week.',
      titleHi: ok ? 'आपका सुधार काम कर गया।' : 'सुधार अभी काम नहीं किया।',
      body: e.text,
      bodyHi: '14 दिन बाद की जाँच।',
      expiresDay: d + 6,
      priority: 'info',
      cta: { label: 'Open coach', labelHi: 'कोच खोलें', route: '/app/coach' },
      sku,
      source: `Re-check ${C.FIX_RECHECK_DAYS.value} days after the fix: ${ok ? 'success' : 'failed'}`,
    });
  }

  // 21 · price_alert.
  for (const e of [...eventsOn(run, d, 'bMoved'), ...eventsOn(run, d, 'priceBreach')]) {
    const sku = e.skuId!;
    const holds = e.kind === 'bMoved' ? !!e.data?.holds : false;
    const to = Number(e.data?.to ?? skuDayOf(run, d, sku)?.B ?? 0);
    const price = Number(e.data?.price ?? skuDayOf(run, d, sku)?.price ?? 0);
    add({
      id: `price_alert:${sku}:${d}`,
      type: 'price_alert',
      title: holds ? `Benchmark moved to ${inr(to)}. Your ${inr(price)} still holds.` : 'Lower your price to keep your launch slot.',
      titleHi: holds ? `बेंचमार्क ${inr(to)} हुआ। आपकी कीमत ठीक है।` : 'लॉन्च स्लॉट बनाए रखने के लिए कीमत घटाएँ।',
      body: e.text,
      bodyHi: 'ऑटो प्राइस-होल्ड।',
      expiresDay: d + 6,
      priority: holds ? 'info' : 'urgent',
      cta: { label: 'See product', labelHi: 'प्रोडक्ट देखें', route: `/app/products/${sku}` },
      sku,
      source: `Benchmark B recalculated (${e.kind})`,
    });
  }

  // 23 · stop_sku and 24 · switch_sku.
  for (const e of eventsOn(run, d, 'slowSeller')) {
    const sku = e.skuId!;
    const left = Number(e.data?.unitsMoved ?? 0);
    add({
      id: `stop_sku:${sku}`,
      type: 'stop_sku',
      title: `Stop making the ${nameOf(run, sku)}.`,
      titleHi: `${nameOf(run, sku)} बनाना बंद करें।`,
      body: `${left} units left go back to your distributor channel at cost.`,
      bodyHi: `${left} बचे यूनिट आपके डिस्ट्रीब्यूटर चैनल में।`,
      expiresDay: d + 6,
      priority: 'today',
      cta: { label: 'See products', labelHi: 'प्रोडक्ट देखें', route: '/app/products' },
      actions: [{ id: 'stopped', label: 'Stop it', labelHi: 'बंद करें' }],
      sku,
      source: 'Slow seller 2+ weeks while the type is steady',
    });
  }
  for (const e of eventsOn(run, d, 'switch')) {
    const sku = e.skuId!;
    const spec = specOf(run, sku);
    if (!spec) continue;
    const liveDay = run.events.find((x) => x.kind === 'switchLive' && x.skuId === sku)?.day ?? d;
    const lot = arrivalsOn(run, liveDay, sku);
    const gap = Math.round((spec.openGapWeek.min + spec.openGapWeek.max) / 2);
    const expand = e.data?.why === 'expand';
    add({
      id: `switch_sku:${sku}`,
      type: 'switch_sku',
      title: `${expand ? 'Add a product' : 'Make this instead'}: ${spec.name}, ${gap}/week unserved, same material and machines.`,
      titleHi: `${expand ? 'नया प्रोडक्ट जोड़ें' : 'इसकी जगह यह बनाएँ'}: ${spec.name}, हर हफ़्ते ${gap} की माँग।`,
      body: `List it (2 min), then make ${lot} units by ${dateLabel(liveDay)}. ${inr(listPrice(spec.stack, spec.margin))}.`,
      bodyHi: `लिस्ट करें (2 मिनट), फिर ${dateLabel(liveDay)} तक ${lot} यूनिट बनाएँ।`,
      dueDay: liveDay,
      dueAt: `By ${dateLabel(liveDay)}`,
      expiresDay: liveDay,
      priority: 'today',
      cta: { label: 'List it', labelHi: 'लिस्ट करें', route: `/app/list/${sku}/product` },
      sku,
      source: `Open gap on the same material and process (${String(e.data?.why ?? 'switch')})`,
    });
  }

  // 25 · escalation_call: a fix failed twice (KAM case), or two nudges dismissed with "Not now". Once per account.
  const kam = eventsOn(run, d, 'kamCase')[0];
  const dismissals = Object.entries(state.actions)
    .filter(([id, a]) => a.action === 'dismissed' && !id.startsWith('valmo_pickup'))
    .map(([, a]) => a.day)
    .sort((a, b) => a - b);
  const secondDismissal = dismissals[C.KAM_ESCALATION_IGNORED_NUDGES.value - 1];
  const earlier =
    run.events.some((x) => x.kind === 'kamCase' && x.day < d) || (secondDismissal !== undefined && secondDismissal + 1 < d);
  const byIgnored = secondDismissal !== undefined && d === secondDismissal + 1;
  if (!earlier && (kam || byIgnored)) {
    add({
      id: 'escalation_call',
      type: 'escalation_call',
      title: kam
        ? `Our fix didn't work twice. A Meesho category manager will call you tomorrow at ${C.ESCALATION_CALL_TIME.value}.`
        : `You've set two fixes aside. A Meesho category manager will call you tomorrow at ${C.ESCALATION_CALL_TIME.value}.`,
      titleHi: `कल ${C.ESCALATION_CALL_TIME.value} बजे मीशो कैटेगरी मैनेजर आपको कॉल करेंगे।`,
      body: kam ? kam.text : 'Two nudges were set aside with "Not now".',
      bodyHi: 'हम मिलकर कारण ढूँढेंगे।',
      dueDay: d + 1,
      dueAt: `${dateLabel(d + 1)}, ${C.ESCALATION_CALL_TIME.value}`,
      expiresDay: d + 7,
      priority: 'urgent',
      cta: { label: 'See status', labelHi: 'स्थिति देखें', route: '/app/more' },
      sku: kam?.skuId,
      source: kam ? 'Fix failed twice → KAM case' : 'Two nudges dismissed → escalation',
    });
  }

  // 26 · payout.
  const ds = dayOf(run, d);
  if (ds && ds.money.payoutNet > 0) {
    add({
      id: `payout:${d}`,
      type: 'payout',
      title: `${inr(ds.money.payoutNet)} paid today for orders delivered ${C.PAYMENT_CYCLE_DAYS.value} days ago.`,
      titleHi: `आज ${inr(ds.money.payoutNet)} का भुगतान, ${C.PAYMENT_CYCLE_DAYS.value} दिन पहले डिलीवर हुए ऑर्डर के लिए।`,
      body: `TCS ${C.GST_TCS_PCT.value}% and TDS ${C.INCOME_TAX_TDS_PCT.value}% withheld are claimable credits.`,
      bodyHi: 'TCS और TDS क्लेम किए जा सकते हैं।',
      expiresDay: d,
      priority: 'info',
      cta: { label: 'See earnings', labelHi: 'कमाई देखें', route: '/app/earnings' },
      source: `Payout cycle: ${C.PAYMENT_CYCLE_DAYS.value} days after delivery`,
    });
  }

  return out;
}

/** Every nudge fired up to and including `toDay`. */
export function nudgeTimeline(account: NudgeAccount, state: NudgeState, toDay: number): Nudge[] {
  const out: Nudge[] = [];
  for (let d = C.TIMELINE_DAYS.value.min; d <= toDay; d++) out.push(...nudgesFiredOn(account, d, state));
  return out;
}

/** A nudge clears when its action is recorded (or the matching order action), and stops showing after it expires. */
export function isCleared(n: Nudge, state: NudgeState): boolean {
  // Any recorded action clears it, including "Not now" (which also counts towards escalation).
  if (state.actions[n.id]) return true;
  if (n.type === 'new_order_pack' && n.sku) return !!state.packed[`${n.sku}:${n.firedDay}`];
  if ((n.type === 'dispatch_deadline' || n.type === 'pickup_missed') && n.sku) return !!state.handed[`${n.sku}:${n.firedDay - 1}`];
  return false;
}

/** Active nudges on a day: fired, not cleared, not expired. Urgent first, then by due day. */
export function nudgesFor(account: NudgeAccount, day: number, state: NudgeState): Nudge[] {
  return nudgeTimeline(account, state, day)
    .filter((n) => n.expiresDay >= day && !isCleared(n, state))
    .sort((a, b) => urgentFirst[a.priority] - urgentFirst[b.priority] || (a.dueDay ?? a.firedDay) - (b.dueDay ?? b.firedDay));
}

/** The next day after `from` on which any nudge fires (for "Jump to next nudge"). */
export function nextNudgeDay(account: NudgeAccount, state: NudgeState, from: number): number | null {
  for (let d = from + 1; d <= C.TIMELINE_DAYS.value.max; d++) if (nudgesFiredOn(account, d, state).length > 0) return d;
  return null;
}
