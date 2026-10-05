import type { ReactNode } from 'react';
import { PageShell, Contents } from '../app/PageShell';
import { PAGES, page } from '../app/pages';

/** The page that links forward to `path` (the "back" target), or Home. */
export function previousOf(path: string): { to: string; label: string } {
  const prev = PAGES.find((p) => p.next === path && p.path !== '/styleguide');
  if (!prev) return { to: '/', label: 'Home' };
  return { to: prev.path.replace(':id', 'hiren'), label: prev.path === '/' ? 'Home' : prev.nav };
}

/** A top-level section page: breadcrumbs Home › Section, back to the previous section, next per the registry. */
export function SectionPage({ path, children }: { path: string; children?: ReactNode }) {
  const def = page(path);
  return (
    <PageShell def={def} trail={[{ label: 'Home', to: '/' }, { label: def.nav }]} back={previousOf(path)}>
      {children ?? <Contents def={def} />}
    </PageShell>
  );
}
