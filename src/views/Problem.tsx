import { C } from '../data/constants';
import { PS_QUESTIONS, type PsQuestion } from '../data/copy';
import { PS_MAP } from '../app/pages';
import { Go } from '../app/Go';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TitleTab } from '../components/TitleTab';
import { Num } from '../components/FormulaPopover';
import { inr, pctText } from '../lib/format';
import { SectionPage } from './SectionPage';

const CHALLENGES = [
  ['Operational hassle', 'Single-order packing, reverse logistics'],
  ['Inventory risk', 'Stock made for a channel that may not buy'],
  ['Unproven demand', '“Will there be enough scale?”'],
  ['Weak early scale-up', 'A small share of orders in the first 30 days'],
] as const;

const SLICES: { key: keyof typeof C.PROBLEM_SPLIT_AT_AOV.value; who: string; color: string; why: string }[] = [
  { key: 'exWorks', who: 'Factory (ex-works)', color: '#5C1049', why: 'What the maker gets for making the product. An integrated maker owns the input and the machines.' },
  { key: 'logistics', who: 'Meesho logistics, RTO and fixed fee', color: '#7A4E70', why: 'Shipping by weight and zone, the cost of failed deliveries (RTO) and the fixed fee. Commission is 0%.' },
  { key: 'distributor', who: 'Distributor', color: '#9F2089', why: 'Buys in bulk from the factory and sells on to wholesalers.' },
  { key: 'wholesaler', who: 'Wholesaler', color: '#F43397', why: 'Breaks bulk for resellers in the market.' },
  { key: 'reseller', who: 'Reseller', color: '#FE9C01', why: 'Lists the product and takes the largest single cut. This is the margin a maker selling direct can pass to the buyer.' },
];

function Donut() {
  const split = C.PROBLEM_SPLIT_AT_AOV.value;
  const aov = C.AOV.value;
  const [sel, setSel] = useState<(typeof SLICES)[number]['key']>('reseller');
  const data = SLICES.map((s) => ({ ...s, value: split[s.key] }));
  const total = data.reduce((a, d) => a + d.value, 0);
  const middlemen = split.distributor + split.wholesaler + split.reseller;
  const s = data.find((d) => d.key === sel)!;
  return (
    <div className="mb-8 grid items-center gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="relative h-80" role="img" aria-label={`Who takes what on a ${inr(aov)} order`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="who"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onClick={(d: { key?: string }) => d.key && setSel(d.key as typeof sel)}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} stroke={d.key === sel ? '#2B1026' : '#fff'} strokeWidth={d.key === sel ? 3 : 1} cursor="pointer" />
              ))}
            </Pie>
            <Tooltip formatter={(v) => inr(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-3xl font-bold text-plum">{inr(total)}</div>
          <div className="text-xs text-grey">one order (AOV)</div>
        </div>
      </div>
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {data.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={sel === d.key}
              onClick={() => setSel(d.key)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${sel === d.key ? 'border-ink bg-white font-semibold' : 'border-line bg-white'}`}
            >
              <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
              {d.who} · {inr(d.value)}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border-2 border-plum bg-white p-4">
          <div className="text-sm text-grey">Click a slice</div>
          <div className="font-display text-2xl font-bold text-plum">
            {s.who}: {inr(s.value)} ({pctText((100 * s.value) / total, 1)})
          </div>
          <p className="mt-1 text-base">{s.why}</p>
        </div>
        <p className="mt-3 text-sm text-grey">
          Middlemen take <Num c="PROBLEM_SPLIT_AT_AOV">{inr(middlemen)}</Num> of every {inr(aov)} order. A self-shipping integrated maker can pass{' '}
          {inr(middlemen - C.SELF_SHIP_OWN_COST.value)} of it to the buyer (after own packing and returns); via the Pack Point, less the node fee.
        </p>
      </div>
    </div>
  );
}

export default function Problem() {
  return (
    <SectionPage path="/problem">
      <blockquote className="mb-6 rounded-2xl bg-plum p-5 font-display text-2xl text-white">
        “Design a strategy to meaningfully grow Meesho’s C2M seller base and their long-term contribution to price competitiveness.”
      </blockquote>
      <TitleTab size="sm" className="mb-3">
        The {inr(C.AOV.value)} order: who takes what
      </TitleTab>
      <Donut />
      <TitleTab size="sm" className="mb-3">
        Two problems × four challenges
      </TitleTab>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-display text-lg font-bold text-plum">1 · Large manufacturers don’t come onto B2C</h3>
          <p className="text-sm text-grey">Built for bulk and made-to-order with no returns; B2C means new operations, inventory risk and a real cost of failure.</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-display text-lg font-bold text-plum">2 · Those who onboard don’t stay</h3>
          <p className="text-sm text-grey">Weak early orders, and conviction erodes.</p>
        </div>
        {CHALLENGES.map(([h, b]) => (
          <div key={h} className="rounded-xl bg-blush p-3">
            <div className="font-semibold text-magenta">{h}</div>
            <div className="text-sm">{b}</div>
          </div>
        ))}
      </div>

      <TitleTab size="sm" className="mb-3">
        Where each PS question is answered
      </TitleTab>
      <div className="grid gap-3 md:grid-cols-2" data-testid="ps-map">
        {(Object.keys(PS_MAP) as PsQuestion[]).map((q) => (
          <div key={q} className="rounded-xl border border-line bg-white p-3">
            <div className="text-sm">
              <span className="mr-1 rounded bg-pink px-1.5 py-0.5 text-xs font-bold text-white">{q}</span>
              {PS_QUESTIONS[q]}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PS_MAP[q].map((l) => (
                <Go key={l.label} to={l.to} className="rounded-full border border-magenta px-3 py-0.5 text-xs font-semibold text-magenta hover:bg-blush">
                  {l.label} →
                </Go>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}
