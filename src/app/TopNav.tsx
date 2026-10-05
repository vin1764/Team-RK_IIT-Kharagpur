import { PlayCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Go } from './Go';
import { NAV_PAGES } from './pages';
import { useApp } from './store';
import { TourBar } from './TourBar';

export function TopNav() {
  const setTourStep = useApp((s) => s.setTourStep);
  const ops = useLocation().pathname === '/ops';
  return (
    <header className="sticky top-0 z-40 bg-plum text-white shadow-md">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-2">
        <Go to="/" className="flex items-baseline gap-2" label="Home: choose a surface">
          <span className="font-display text-xl font-bold">Meesho C2M</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{ops ? 'Ops console' : 'Case notes'}</span>
          <span className="hidden text-xs text-white/70 md:inline">Team RK · IIT Kharagpur</span>
        </Go>
        <button
          type="button"
          onClick={() => setTourStep(0)}
          data-testid="header-start-tour"
          className="flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-sm font-semibold text-ink hover:brightness-105"
        >
          <PlayCircle size={16} aria-hidden /> Judge tour
        </button>
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
      <TourBar />
    </header>
  );
}
