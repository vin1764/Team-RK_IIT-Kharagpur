import { useEffect, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Go } from './Go';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { PAGES, type PageDef } from './pages';
import { TitleTab } from '../components/TitleTab';
import { AnswersPs } from '../components/Chip';

const titleOf = (path: string) => PAGES.find((p) => p.path === path.replace(/\/(hiren|ayesha|sunita)$/, '/:id'))?.nav ?? 'Next';

/**
 * Frame for every page: breadcrumbs, title tab, PS chip, content, and a way back and a way forward.
 */
export function PageShell({
  def,
  title,
  trail,
  next,
  back,
  children,
  actions,
  hideSummary = false,
}: {
  def: PageDef;
  /** Overrides def.title (persona pages). */
  title?: string;
  trail: Crumb[];
  /** Overrides def.next (persona pages). */
  next?: { to: string; label: string };
  back?: { to: string; label: string };
  children: ReactNode;
  actions?: ReactNode;
  hideSummary?: boolean;
}) {
  const heading = title ?? def.title;
  const nextLink = next ?? { to: def.next, label: def.next === '/' ? 'Home' : titleOf(def.next) };

  useEffect(() => {
    document.title = `${heading} · Meesho C2M prototype`;
  }, [heading]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 lg:px-8"
    >
      <Breadcrumbs trail={trail} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-4 border-plum pb-0">
        <TitleTab as="h1" size="lg">
          {heading}
        </TitleTab>
        <div className="flex items-center gap-2 pb-2">
          <AnswersPs q={def.ps} />
          {actions}
        </div>
      </div>
      {!hideSummary && <p className="mb-6 max-w-3xl text-base text-grey">{def.summary}</p>}

      {children}

      <nav aria-label="Page navigation" className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {back ? (
          <Go to={back.to} className="flex items-center gap-1.5 rounded-full border border-plum px-4 py-2 text-sm font-semibold text-plum hover:bg-blush">
            <ArrowLeft size={16} aria-hidden /> {back.label}
          </Go>
        ) : (
          <span />
        )}
        <Go
          to={nextLink.to}
          next
          className="flex items-center gap-1.5 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-ink shadow-sm hover:brightness-105"
        >
          Next: {nextLink.label} <ArrowRight size={16} aria-hidden />
        </Go>
      </nav>
    </motion.main>
  );
}

/** Generic content for a page whose full build comes in a later phase: what it contains. */
export function Contents({ def }: { def: PageDef }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {def.contains.map((c) => (
        <div key={c} className="rounded-xl border border-line bg-white p-4 text-sm font-medium text-ink shadow-sm">
          {c}
        </div>
      ))}
    </div>
  );
}
