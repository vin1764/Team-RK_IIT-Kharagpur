import { useEffect } from 'react';
import { BookOpen, LayoutDashboard, Smartphone } from 'lucide-react';
import { Go } from '../app/Go';
import { Chip } from '../components/Chip';
import { FOOTER_NOTE } from '../data/copy';

/** `#/`: choose a surface. The maker app is the product; the ops console is Meesho's side. */
export default function RolePicker() {
  useEffect(() => {
    document.title = 'Meesho Factory · MVP';
  }, []);
  return (
    <main className="flex min-h-screen flex-col bg-cream text-ink">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-magenta">Team RK · IIT Kharagpur</p>
          <h1 className="font-display text-4xl font-bold text-plum">Meesho Factory: factories selling straight to buyers</h1>
          <p className="mt-2 max-w-2xl text-grey">
            A working MVP. Log in as one of three makers and run their first 90 days with the demo clock, or open Meesho’s ops console to see why
            every nudge fired.
          </p>
        </div>
        <Go
          to="/app"
          next
          className="group flex items-center gap-5 rounded-3xl bg-magenta p-6 text-white shadow-xl transition hover:brightness-105 md:p-8"
          label="Open the Maker app"
        >
          <Smartphone size={56} className="shrink-0" aria-hidden />
          <span>
            <span className="block font-display text-3xl font-bold">Maker app</span>
            <span className="mt-1 block text-white/90">
              Phone-first. Demand, cost check, listing bot, Launch Week, orders, returns, Pack Point, coach and earnings, with a nudge for every next
              step.
            </span>
          </span>
        </Go>
        <div className="grid gap-4 md:grid-cols-2">
          <Go to="/ops" className="flex items-start gap-4 rounded-2xl border-2 border-plum bg-white p-5 hover:bg-blush" label="Open the Meesho ops console">
            <LayoutDashboard size={36} className="shrink-0 text-plum" aria-hidden />
            <span>
              <span className="block text-xl font-semibold text-plum">Meesho ops console</span>
              <span className="block text-sm text-grey">Desktop. Demand engine, ledger, Launch Week, Pack Point node, nudge log, coach queue and cohort metrics.</span>
            </span>
          </Go>
          <Go to="/notes" className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 hover:bg-blush" label="Case notes">
            <BookOpen size={28} className="shrink-0 text-grey" aria-hidden />
            <span>
              <span className="block font-semibold text-ink">Case notes</span>
              <span className="block text-sm text-grey">The problem, category lab, 90-day journeys, economics and impact.</span>
            </span>
          </Go>
        </div>
      </div>
      <footer className="border-t border-line bg-white px-4 py-3 text-xs text-grey">
        <span className="mr-2 inline-block align-middle">
          <Chip kind="synthetic" />
        </span>
        {FOOTER_NOTE}
      </footer>
    </main>
  );
}
