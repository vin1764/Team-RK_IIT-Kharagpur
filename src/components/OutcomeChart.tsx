import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C } from '../data/constants';
import { cumulative } from '../app/useSim';
import type { SimResult } from '../engine/simulate';
import { dayLabel, num } from '../lib/format';

/** With vs without our solution: cumulative orders, one persona, from the engine. */
export function OutcomeChart({ base, cf, height = 220 }: { base: SimResult; cf: SimResult; height?: number }) {
  const data = cumulative(base, cf);
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Cumulative orders with and without our solution">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#F0C9E2" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A4E70' }} tickFormatter={(d: number) => String(d)} interval={14} />
          <YAxis tick={{ fontSize: 11, fill: '#7A4E70' }} width={44} />
          <Tooltip labelFormatter={(d) => dayLabel(Number(d))} formatter={(v) => num(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine x={C.LAUNCH_LIVE_DAYS.value.min} stroke="#FE9C01" strokeDasharray="4 3" label={{ value: 'Launch', fontSize: 10, fill: '#7A4E70', position: 'insideTopLeft', offset: 4 }} />
          <ReferenceLine x={C.CF_CHURN_DAY.value} stroke="#D64545" strokeDasharray="4 3" label={{ value: 'Churns today', fontSize: 10, fill: '#D64545', position: 'insideTopRight', offset: 18 }} />
          <Line type="monotone" dataKey="ordersWith" name="With our solution" stroke="#5C1049" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="ordersWithout" name="Today’s Meesho (counterfactual)" stroke="#7A4E70" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
