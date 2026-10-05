import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { FOOTER_NOTE } from '../data/copy';
import { Chip } from '../components/Chip';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <TopNav />
      <Outlet />
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 px-4 py-3 text-xs text-grey lg:px-8">
          <Chip kind="synthetic" />
          <span>{FOOTER_NOTE}</span>
        </div>
      </footer>
    </div>
  );
}
