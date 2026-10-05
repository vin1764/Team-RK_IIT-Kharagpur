import { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C } from '../data/constants';
import type { SimResult } from '../engine/simulate';
import { Chip } from '../components/Chip';
import { inr, num, dayLabel } from '../lib/format';

type Metric = 'orders' | 'takeHome' | 'stock';

const METRICS: { id: Metric; label: string; fmt: (n: number) => string }[] = [
  { id: 'orders', label: 'Cumulative orders', fmt: (n) => num(n) },
  { id: 'takeHome', label: 'Take-home', fmt: (n) => inr(n) },
  { id: 'stock', label: 'Stock left', fmt: (n) => `${num(n)} units` },
];

function series(r: SimResult, m: Metric) {
  let cum = 0;
  return r.days.map((d) => {
    cum += d.orders;
    return m === 'orders' ? cum : m === 'takeHome' ? Math.round(d.money.takeHomeCum) : d.onHand;
  });
}

/** With vs without our solution, one persona, three metrics. The counterfactual overlays on toggle. */
export function CompareChart({ base, cf, day, showCf }: { base: SimResult; cf: SimResult; day: number; showCf: boolean }) {
  const [m, setM] = useState<Metric>('orders');
  const meta = METRICS.find((x) => x.id === m)!;
  const w = series(base, m);
  const wo = series(cf, m);
  const data = base.days.map((d, i) => ({ day: d.day, with: w[i]!, without: wo[i]! }));
  const at = data.find((x) => x.day === day) ?? data[data.length - 1]!;
  const gap = at.with - at.without;
  const churn = C.CF_CHURN_DAY.value;
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-plum">With vs without our solution</h3>
          <Chip kind="simulated" />
        </div>
        <div className="flex gap-1 rounded-full bg-blush p-0.5" role="tablist" aria-label="Metric">
          {METRICS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={m === x.id}
              onClick={() => setM(x.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${m === x.id ? 'bg-plum text-white' : 'text-plum'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-grey">{dayLabel(at.day)} · with: </span>
          <strong className="text-plum">{meta.fmt(at.with)}</strong>
        </span>
        {showCf && (
          <>
            <span>
              <span className="text-grey">today’s Meesho: </span>
              <strong className="text-grey">{meta.fmt(at.without)}</strong>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(m === 'stock' ? gap <= 0 : gap >= 0) ? 'bg-good/15 text-good' : 'bg-warn/20 text-ink'}`}>
              {gap >= 0 ? '+' : '−'}
              {meta.fmt(Math.abs(gap))} {m === 'stock' ? (gap >= 0 ? 'more in stock (still selling)' : 'less stuck') : 'vs today'}
            </span>
          </>
        )}
      </div>
      <div className="h-56" role="img" aria-label={`${meta.label}, with ${showCf ? 'and without ' : ''}our solution`}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="withFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5C1049" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5C1049" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A4E70' }} ticks={[C.TIMELINE_DAYS.value.min, 0, ...C.GATE_DAYS.value]} tickFormatter={(d: number) => dayLabel(d).replace('Day ', 'D')} />
            <YAxis tick={{ fontSize: 11, fill: '#7A4E70' }} width={56} tickFormatter={(v: number) => (m === 'takeHome' ? inr(v) : num(v))} />
            <Tooltip
              labelFormatter={(d) => dayLabel(Number(d))}
              formatter={(v, name) => [meta.fmt(Number(v)), name === 'with' ? 'With our solution' : 'Today’s Meesho']}
              contentStyle={{ borderRadius: 12, borderColor: '#F0C9E2', fontSize: 12 }}
            />
            {C.GATE_DAYS.value.map((g) => (
              <ReferenceLine key={g} x={g} stroke="#5C1049" strokeOpacity={0.25} />
            ))}
            <ReferenceLine x={C.LAUNCH_LIVE_DAYS.value.min} stroke="#FE9C01" strokeDasharray="4 3" label={{ value: 'Launch Week', fontSize: 10, fill: '#7A4E70', position: 'insideTopRight' }} />
            {showCf && <ReferenceLine x={churn} stroke="#D64545" strokeDasharray="4 3" label={{ value: 'Churns today', fontSize: 10, fill: '#D64545', position: 'insideTopLeft', offset: 22 }} />}
            <ReferenceLine x={day} stroke="#F43397" strokeWidth={2} />
            <Area type="monotone" dataKey="with" stroke="#5C1049" strokeWidth={2.5} fill="url(#withFill)" isAnimationActive={false} name="with" />
            {showCf && <Line type="monotone" dataKey="without" stroke="#7A4E70" strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} name="without" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-grey">
        {showCf
          ? `Today’s Meesho: no demand data (guessed lot of ${num(C.CF_GUESSED_LOT.value)}), no launch, no coach → churns around ${dayLabel(churn)} with unsold stock.`
          : 'Turn on “Without our solution” to overlay today’s Meesho.'}{' '}
        Synthetic, simulated; a forecast, not a guarantee.
      </p>
    </div>
  );
}
