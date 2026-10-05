import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Settings, PlayCircle, RotateCcw } from 'lucide-react';
import { Go } from './Go';
import { NAV_PAGES } from './pages';
import { useApp } from './store';

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { seed, setSeed, resetScenario } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-2 text-white hover:bg-white/10"
      >
        <Settings size={18} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-white p-3 text-sm text-ink shadow-xl">
          <label className="block text-xs font-semibold text-grey" htmlFor="seed">
            Simulation seed
          </label>
          <input
            id="seed"
            type="number"
            value={seed}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setSeed(Math.trunc(n));
            }}
            className="mt-1 w-full rounded-md border border-line px-2 py-1"
          />
          <p className="mt-1 text-[11px] text-grey">Same seed and settings always give the same story.</p>
          <button
            type="button"
            onClick={() => {
              resetScenario();
              setOpen(false);
            }}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-plum px-3 py-1.5 font-semibold text-white"
          >
            <RotateCcw size={14} aria-hidden /> Reset scenario
          </button>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const { verify, toggleVerify } = useApp();
  return (
    <header className="sticky top-0 z-40 bg-plum text-white shadow-md">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-2">
        <Go to="/" nav className="flex items-baseline gap-2" label="Home">
          <span className="font-display text-xl font-bold">Meesho C2M</span>
          <span className="hidden text-xs text-white/70 md:inline">Team RK · IIT Kharagpur</span>
        </Go>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVerify}
            aria-pressed={verify}
            data-testid="verify-toggle"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${verify ? 'bg-orange text-ink' : 'bg-white/15 text-white hover:bg-white/25'}`}
          >
            {verify ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
            Verify {verify ? 'on' : 'off'}
          </button>
          <Go to="/tour" className="flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-sm font-semibold text-ink hover:brightness-105">
            <PlayCircle size={16} aria-hidden /> Judge tour
          </Go>
          <SettingsMenu />
        </div>
      </div>
      <nav aria-label="Sections" className="bg-plum-deep">
        <ul className="mx-auto flex max-w-[1800px] gap-1 overflow-x-auto px-4">
          {NAV_PAGES.map((p) => {
            const to = p.path.replace(':id', 'hiren');
            return (
              <li key={p.path}>
                <Go
                  to={to}
                  nav
                  className="block whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-white/80 hover:text-white aria-[current=page]:border-orange aria-[current=page]:text-white"
                >
                  {p.nav}
                </Go>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
