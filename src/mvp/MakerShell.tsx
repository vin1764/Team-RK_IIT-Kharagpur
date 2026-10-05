import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Bell, CalendarClock, ChevronDown, ChevronUp, Eye, Home, IndianRupee, Languages, Menu, Package, RotateCcw, SkipForward, StepForward, Truck } from 'lucide-react';
import { Go } from '../app/Go';
import { useApp } from '../app/store';
import { C } from '../data/constants';
import type { PersonaId } from '../data/personas';
import { nextNudgeDay, dateLabel } from '../engine/nudges';
import { useMvp } from './state';
import { useAccountView, useCurrentId, type AccountView } from './useAccount';
import { inr, num, dayLabel } from '../lib/format';
import Login from './screens/Login';
import { stageOf } from './stage';
import { ready } from './ready';

const VALID = (x: string | null): x is PersonaId => x === 'hiren' || x === 'ayesha' || x === 'sunita';

function useIsDesktop() {
  const q = '(min-width: 768px)';
  const [m, setM] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(q).matches));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/** The phone: 390 wide; height fits the window so it is never cut off (projector check). */
function PhoneBox({ children, desktop }: { children: ReactNode; desktop: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(844);
  useLayoutEffect(() => {
    if (!desktop) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setH(Math.max(520, Math.min(844, Math.floor(window.innerHeight - top - 12))));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [desktop]);
  if (!desktop) return <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f6f2f4]" role="region" aria-label="Maker app">{children}</div>;
  return (
    <div ref={ref} style={{ width: 390, height: h }} className="flex shrink-0 flex-col overflow-hidden rounded-[36px] border-[8px] border-ink bg-[#f6f2f4] shadow-2xl" role="region" aria-label="Maker app">
      {children}
    </div>
  );
}

const TABS = [
  { to: '/app/today', key: 'tabToday', id: 'today', icon: Home, match: ['/app/today', '/app/inbox', '/app/start', '/app/list', '/app/launch'] },
  { to: '/app/products', key: 'tabProducts', id: 'products', icon: Package, match: ['/app/products', '/app/coach'] },
  { to: '/app/orders', key: 'tabOrders', id: 'orders', icon: Truck, match: ['/app/orders', '/app/packpoint'] },
  { to: '/app/earnings', key: 'tabEarnings', id: 'earnings', icon: IndianRupee, match: ['/app/earnings'] },
  { to: '/app/more', key: 'tabMore', id: 'more', icon: Menu, match: ['/app/more'] },
] as const;

function BottomTabs({ v }: { v: AccountView }) {
  const { pathname } = useLocation();
  const urgent = v.active.some((n) => n.priority === 'urgent');
  const tabs = TABS.filter((t) => ready(t.id));
  const activeIdx = tabs.findIndex((t) => t.match.some((m) => pathname.startsWith(m)));
  return (
    <nav aria-label="App tabs" className="grid shrink-0 border-t border-line bg-white" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        const on = i === activeIdx;
        return (
          <Go
            key={tab.to}
            to={tab.to}
            next={i === (activeIdx + 1) % tabs.length}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${on ? 'text-magenta' : 'text-grey'}`}
          >
            <Icon size={20} aria-hidden />
            {v.t[tab.key]}
            {i === 0 && urgent && <span className="absolute right-6 top-1.5 h-2.5 w-2.5 rounded-full bg-bad" data-testid="urgent-dot" aria-label="Urgent nudges" />}
          </Go>
        );
      })}
    </nav>
  );
}

function AppHeader({ v }: { v: AccountView }) {
  const toggleLang = useApp((s) => s.toggleLang);
  const unread = v.active.filter((n) => !v.state.read[n.id]).length;
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 bg-plum px-4 py-2.5 text-white">
      <div className="min-w-0">
        <div className="text-base font-semibold leading-tight">{v.t.appName}</div>
        <div className="truncate text-xs text-white/80">{v.persona.business}</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggleLang} aria-label={v.t.languageLabel} data-testid="lang-toggle" className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          <Languages size={16} aria-hidden />
          {v.t.language}
        </button>
        {ready('nudges') && (
        <Go to="/app/inbox" label={`${v.t.inbox}: ${unread}`} className="relative rounded-full bg-white/15 p-1.5">
          <Bell size={18} aria-hidden />
          {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-orange px-1.5 text-xs font-bold text-ink">{unread > 99 ? '99+' : unread}</span>}
        </Go>
        )}
      </div>
    </header>
  );
}

function StageBanner({ v }: { v: AccountView }) {
  const s = stageOf(v);
  return (
    <div className="shrink-0 bg-orange-soft px-4 py-1.5 text-sm font-semibold text-ink" data-testid="stage-banner">
      {s}
    </div>
  );
}

/** Demo controls: never inside the phone UI. */
function DemoClock({ v, desktop }: { v: AccountView; desktop: boolean }) {
  const [open, setOpen] = useState(desktop);
  const [confirm, setConfirm] = useState(false);
  const setDay = useMvp((s) => s.setDay);
  const reset = useMvp((s) => s.reset);
  const next = nextNudgeDay(v.account, v.state, v.day);
  const { min, max } = C.TIMELINE_DAYS.value;
  const body = (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-2xl font-bold text-plum" data-testid="demo-day">
          {dayLabel(v.day)}
        </div>
        <div className="text-sm text-grey">{dateLabel(v.day)}</div>
      </div>
      <input type="range" min={min} max={max} value={v.day} onChange={(e) => setDay(v.id, Number(e.target.value))} className="w-full accent-plum" aria-label="Demo day" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDay(v.id, v.day + 1)} disabled={v.day >= max} data-testid="next-day" className="flex items-center justify-center gap-1 rounded-lg bg-plum px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
          <StepForward size={16} aria-hidden /> Next day
        </button>
        <button type="button" onClick={() => next !== null && setDay(v.id, next)} disabled={next === null} data-testid="jump-nudge" className="flex items-center justify-center gap-1 rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-ink disabled:opacity-40">
          <SkipForward size={16} aria-hidden /> Next nudge
        </button>
      </div>
      <div className="text-xs text-grey">{next === null ? 'No more nudges after today.' : `Next nudge: ${dayLabel(next)} (${dateLabel(next)})`}</div>
      {confirm ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              reset(v.id);
              setConfirm(false);
            }}
            data-testid="confirm-reset"
            className="flex-1 rounded-lg bg-bad px-3 py-2 text-sm font-semibold text-white"
          >
            Reset {v.persona.name.split(' ')[0]}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-line px-3 py-2 text-sm">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} data-testid="reset-account" className="flex w-full items-center justify-center gap-1 rounded-lg border border-plum px-3 py-2 text-sm font-semibold text-plum">
          <RotateCcw size={14} aria-hidden /> Reset account
        </button>
      )}
    </div>
  );
  if (!desktop && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-20 right-3 z-50 flex items-center gap-1 rounded-full border-2 border-plum bg-white px-3 py-2 text-sm font-semibold text-plum shadow-lg" data-testid="demo-open">
        <CalendarClock size={16} aria-hidden /> {dayLabel(v.day)} <ChevronUp size={16} aria-hidden />
      </button>
    );
  }
  if (!desktop) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t-2 border-plum bg-white p-3 shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }} role="region" aria-label="Demo controls">
        <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-semibold text-plum">
          <span className="flex items-center gap-1">
            <CalendarClock size={16} aria-hidden /> Demo controls · {dayLabel(v.day)}
          </span>
          {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        {open && <div className="mt-2">{body}</div>}
      </div>
    );
  }
  return (
    <section className="w-72 rounded-2xl border-2 border-dashed border-plum/60 bg-white p-3" role="region" aria-label="Demo controls">
      <button type="button" onClick={() => setOpen(!open)} className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-plum">
        <span className="flex items-center gap-1">
          <CalendarClock size={16} aria-hidden /> Demo controls
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && body}
    </section>
  );
}

/** Read-only ops data for what the maker is looking at. */
function MeeshoSees({ v }: { v: AccountView }) {
  const [open, setOpen] = useState(true);
  const primary = v.ds.skus[0];
  return (
    <section className="w-72 rounded-2xl border border-line bg-white p-3 text-sm" aria-label="What Meesho sees">
      <button type="button" onClick={() => setOpen(!open)} className="mb-1 flex w-full items-center justify-between font-semibold text-plum">
        <span className="flex items-center gap-1">
          <Eye size={16} aria-hidden /> What Meesho sees
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="space-y-1.5">
          {v.day >= 0 && primary && (
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-grey">Orders today</span>
              <span className="text-right font-semibold">{num(v.ds.orders)}</span>
              <span className="text-grey">Stock on hand</span>
              <span className="text-right font-semibold">{num(v.ds.onHand)}</span>
              {v.persona.node && (
                <>
                  <span className="text-grey">Node makers · fee</span>
                  <span className="text-right font-semibold">
                    {v.ds.nodeMakers} · {inr(v.ds.packPointFee)}
                  </span>
                </>
              )}
            </div>
          )}
          <div className="text-xs font-semibold text-grey">Why these nudges fired</div>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {v.active.slice(0, 8).map((n) => (
              <li key={n.id} className="rounded bg-cream px-2 py-1">
                <span className="font-semibold text-magenta">{n.type}</span> · {n.source}
              </li>
            ))}
            {v.active.length === 0 && <li className="text-grey">No active nudges.</li>}
          </ul>
          <Go to="/ops" className="block text-xs font-semibold text-magenta hover:underline">
            Open the ops console →
          </Go>
        </div>
      )}
    </section>
  );
}

function TopBar({ signedIn, hideOnPhone }: { signedIn: boolean; hideOnPhone: boolean }) {
  return (
    <div className={`${hideOnPhone ? 'hidden md:flex' : 'flex'} items-center justify-between gap-2 bg-plum-deep px-4 py-2 text-sm text-white`}>
      <Go to="/" className="font-display text-lg font-bold">
        Meesho Factory · Maker app
      </Go>
      <nav aria-label="Surfaces" className="flex items-center gap-3">
        {signedIn && (
          <Go to="/app" className="hover:underline">
            Switch account
          </Go>
        )}
        <Go to="/ops" className="hover:underline">
          Ops console
        </Go>
        <Go to="/notes" className="hover:underline">
          Case notes
        </Go>
      </nav>
    </div>
  );
}

function Signed({ id, desktop }: { id: PersonaId; desktop: boolean }) {
  const v = useAccountView(id);
  return (
    <div className={desktop ? 'flex items-start justify-center gap-6 px-4 py-3' : ''}>
      <PhoneBox desktop={desktop}>
        <AppHeader v={v} />
        <StageBanner v={v} />
        <div className="flex-1 overflow-y-auto" data-testid="app-scroll">
          <Outlet context={v} />
        </div>
        <BottomTabs v={v} />
      </PhoneBox>
      {desktop ? (
        <div className="space-y-3">
          <DemoClock v={v} desktop />
          <MeeshoSees v={v} />
        </div>
      ) : (
        <DemoClock v={v} desktop={false} />
      )}
    </div>
  );
}

export default function MakerShell() {
  const [params] = useSearchParams();
  const as = params.get('as');
  const current = useCurrentId();
  const setCurrent = useMvp((s) => s.setCurrent);
  const { pathname } = useLocation();
  const desktop = useIsDesktop();
  useEffect(() => {
    if (VALID(as) && as !== current) setCurrent(as);
  }, [as, current, setCurrent]);
  const id = VALID(as) ? as : current;
  const login = pathname === '/app' || pathname === '/app/' || !id;
  useEffect(() => {
    document.title = 'Maker app · Meesho Factory MVP';
  }, []);
  return (
    <main className="min-h-screen bg-cream text-ink">
      <TopBar signedIn={!login} hideOnPhone={!login} />
      {login ? <Login /> : <Signed id={id!} desktop={desktop} />}
    </main>
  );
}
