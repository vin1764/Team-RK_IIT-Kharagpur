import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BadgeIndianRupee,
  Box,
  CalendarCheck,
  Factory,
  Megaphone,
  PackageCheck,
  PhoneCall,
  RotateCcw,
  Sparkles,
  Tag,
  Truck,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Go } from '../app/Go';
import { Chip } from '../components/Chip';
import { fulfilmentOf, type Nudge, type NudgeAction, type NudgeType } from '../engine/nudges';
import type { AccountState } from './state';
import { useMvp } from './state';
import type { AccountView } from './useAccount';

/** The current account, from the maker shell. */
export const useV = () => useOutletContext<AccountView>();

/** A maker-app screen: back path, one h1, content. */
export function Screen({ title, back, children, sub }: { title: string; back?: { to: string; label: string }; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="space-y-3 px-4 pb-6 pt-3 text-[15px]">
      {back && (
        <Go to={back.to} className="inline-flex items-center gap-1 text-sm font-semibold text-plum">
          <ArrowLeft size={16} aria-hidden /> {back.label}
        </Go>
      )}
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">{title}</h1>
        {sub && <div className="mt-0.5 text-sm text-grey">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = '', tone = 'white' }: { children: ReactNode; className?: string; tone?: 'white' | 'orange' | 'blush' }) {
  const bg = tone === 'orange' ? 'bg-orange-soft border-orange' : tone === 'blush' ? 'bg-blush border-line' : 'bg-white border-line';
  return <section className={`rounded-xl border p-3 shadow-sm ${bg} ${className}`}>{children}</section>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-ink">{children}</h2>;
}

export function Caption({ children }: { children: ReactNode }) {
  return <p className="text-xs text-grey">{children}</p>;
}

/** Primary (magenta) button. */
export function Btn({ children, onClick, disabled, kind = 'primary', testId, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'secondary' | 'do'; testId?: string; type?: 'button' | 'submit' }) {
  const cls =
    kind === 'primary'
      ? 'bg-magenta text-white'
      : kind === 'do'
        ? 'bg-orange text-ink'
        : 'border border-magenta bg-white text-magenta';
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`w-full rounded-lg px-4 py-2.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

/** Primary button that navigates. */
export function GoBtn({ to, children, next, kind = 'primary', onClick }: { to: string; children: ReactNode; next?: boolean; kind?: 'primary' | 'secondary' | 'do'; onClick?: () => void }) {
  const cls =
    kind === 'primary'
      ? 'bg-magenta text-white'
      : kind === 'do'
        ? 'bg-orange text-ink'
        : 'border border-magenta bg-white text-magenta';
  return (
    <Go to={to} next={next} onClick={onClick} className={`block w-full rounded-lg px-4 py-2.5 text-center text-[15px] font-semibold ${cls}`}>
      {children}
    </Go>
  );
}

export function Row({ k, v, strong }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'font-semibold' : ''}`}>
      <span className="text-grey">{k}</span>
      <span className="text-right tabular-nums">{v}</span>
    </div>
  );
}

export function Stat({ label, value, caption }: { label: string; value: ReactNode; caption?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-2.5">
      <div className="text-xs text-grey">{label}</div>
      <div className="text-lg font-bold tabular-nums text-ink">{value}</div>
      {caption && <div className="text-xs text-grey">{caption}</div>}
    </div>
  );
}

export const SimTag = () => <Chip kind="simulated" />;

const ICON: Record<NudgeType, typeof Bell> = {
  make_first_lot: Factory,
  stock_in_reminder: CalendarCheck,
  send_lot_packpoint: Warehouse,
  lot_received: PackageCheck,
  launch_live: Megaphone,
  new_order_pack: Box,
  valmo_pickup: Truck,
  dispatch_deadline: AlertTriangle,
  pickup_missed: Truck,
  return_incoming: RotateCcw,
  claim_reminder: RotateCcw,
  return_at_node: Warehouse,
  day30_result: Sparkles,
  restock_batch: Factory,
  send_next_lot: Warehouse,
  stock_out: AlertTriangle,
  storage_warning: Warehouse,
  storage_decision: Warehouse,
  coach_fix: Wrench,
  coach_recheck: Wrench,
  price_alert: Tag,
  prepaid_nudge: BadgeIndianRupee,
  stop_sku: Factory,
  switch_sku: Sparkles,
  escalation_call: PhoneCall,
  payout: BadgeIndianRupee,
};

/** Order keys (`sku:orderDay`) a pickup or order nudge covers: self-ship SKUs with orders that day. */
function orderKeys(v: AccountView, n: Nudge, orderDay: number): string[] {
  const day = v.run.days.find((d) => d.day === orderDay);
  return (day?.skus ?? [])
    .filter((s) => s.orders > 0 && (!n.sku || s.skuId === n.sku) && fulfilmentOf(v.run, s.skuId) === 'self')
    .map((s) => `${s.skuId}:${orderDay}`);
}

/** Record a nudge action (clears it), with its effect on orders: packed, handed over, not ready. */
export function applyAction(v: AccountView, s: AccountState, n: Nudge, a: NudgeAction): AccountState {
  const next: AccountState = {
    ...s,
    actions: { ...s.actions, [n.id]: { day: v.day, action: a.dismiss ? 'dismissed' : a.id } },
    read: { ...s.read, [n.id]: true },
  };
  const mark = (field: 'packed' | 'handed' | 'notReady', keys: string[]) => {
    next[field] = { ...next[field], ...Object.fromEntries(keys.map((k) => [k, true as const])) };
  };
  if (n.type === 'new_order_pack' && a.id === 'packed') mark('packed', orderKeys(v, n, n.firedDay));
  if (n.type === 'valmo_pickup' && a.id === 'handed') mark('handed', orderKeys(v, n, n.firedDay));
  if (n.type === 'valmo_pickup' && a.id === 'not_ready') mark('notReady', orderKeys(v, n, n.firedDay));
  if (n.type === 'dispatch_deadline' && a.id === 'handed') mark('handed', orderKeys(v, n, n.firedDay - 1));
  return next;
}

/** Record a nudge action or mark it read. */
export function useNudgeActions(v: AccountView) {
  const update = useMvp((s) => s.update);
  return {
    act: (n: Nudge, a: NudgeAction) => update(v.id, (s) => applyAction(v, s, n, a)),
    markRead: (n: Nudge) => update(v.id, (s) => (s.read[n.id] ? s : { ...s, read: { ...s.read, [n.id]: true } })),
  };
}

/** Nudge card: icon, title, one line, due, one CTA (urgent: red left border). */
export function NudgeCard({ n, v, showActions = true, compact = false }: { n: Nudge; v: AccountView; showActions?: boolean; compact?: boolean }) {
  const { act, markRead } = useNudgeActions(v);
  const Icon = ICON[n.type];
  const hi = v.lang === 'hi';
  const border = n.priority === 'urgent' ? 'border-l-4 border-l-bad' : n.priority === 'today' ? 'border-l-4 border-l-orange' : 'border-l-4 border-l-line';
  const cleared = !!v.state.actions[n.id];
  return (
    <article className={`rounded-xl border border-line bg-white p-3 shadow-sm ${border}`} data-testid={`nudge-${n.type}`} data-nudge-id={n.id}>
      <div className="flex gap-2.5">
        <Icon size={20} className={n.priority === 'urgent' ? 'mt-0.5 shrink-0 text-bad' : 'mt-0.5 shrink-0 text-plum'} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-snug text-ink">{hi ? n.titleHi : n.title}</div>
          {!compact && <div className="mt-0.5 text-sm text-grey">{hi ? n.bodyHi : n.body}</div>}
          {n.dueAt && (
            <div className="mt-1 text-xs font-semibold text-plum">
              {v.t.due}: {n.dueAt}
            </div>
          )}
        </div>
      </div>
      {!cleared && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Go to={n.cta.route} onClick={() => markRead(n)} className="rounded-lg bg-magenta px-3 py-1.5 text-sm font-semibold text-white">
            {hi ? n.cta.labelHi : n.cta.label}
          </Go>
          {showActions &&
            n.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => act(n, a)}
                data-testid={`act-${a.id}`}
                className={a.dismiss ? 'px-2 py-1.5 text-sm text-grey underline' : 'rounded-lg border border-plum px-3 py-1.5 text-sm font-semibold text-plum'}
              >
                {hi ? a.labelHi : a.label}
              </button>
            ))}
        </div>
      )}
      {cleared && <div className="mt-2 text-xs font-semibold text-good">✓ {v.state.actions[n.id]!.action === 'dismissed' ? 'Set aside' : 'Done'}</div>}
    </article>
  );
}

/** Active nudges whose CTA opens this screen, shown at its top so the action can be taken here. */
export function ScreenNudges({ v, route, sku, types }: { v: AccountView; route: string; sku?: string; types?: NudgeType[] }) {
  const list = v.active.filter((n) => n.cta.route.split('?')[0] === route && (!sku || n.sku === sku) && (!types || types.includes(n.type)));
  if (list.length === 0) return null;
  return (
    <div className="space-y-2">
      {list.slice(0, 4).map((n) => (
        <NudgeCard key={n.id} n={n} v={v} compact />
      ))}
    </div>
  );
}
