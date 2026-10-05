import { C } from '../constants';
import { mulberry32 } from '../../engine/rng';

export interface District {
  id: string;
  name: string;
  state: string;
  /** Share of the SKU's demand. */
  weight: number;
  /** Sees the launch section; the rest are the control group. */
  launch: boolean;
}

const POOL: [string, string][] = [
  ['Ramnagar', 'Uttarakhand'],
  ['Sitapur', 'Uttar Pradesh'],
  ['Bhilwara', 'Rajasthan'],
  ['Nanded', 'Maharashtra'],
  ['Karimnagar', 'Telangana'],
  ['Hassan', 'Karnataka'],
  ['Bareilly', 'Uttar Pradesh'],
  ['Jalgaon', 'Maharashtra'],
  ['Sambalpur', 'Odisha'],
  ['Purnia', 'Bihar'],
  ['Satna', 'Madhya Pradesh'],
  ['Ongole', 'Andhra Pradesh'],
  ['Hisar', 'Haryana'],
  ['Tirunelveli', 'Tamil Nadu'],
];

/** 12 districts, half see the launch section (control = the rest). Seeded. */
export function generateDistricts(seed: number): District[] {
  const rng = mulberry32(seed);
  const n = C.DISTRICTS.value;
  const pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const spread = C.GEN_DISTRICT_WEIGHT_SPREAD.value;
  const raw = pool.slice(0, n).map(([name, state], i) => ({
    id: `d${i + 1}`,
    name,
    state,
    weight: 1 - spread + rng() * 2 * spread,
    launch: i % 2 === 0,
  }));
  // Balance: launch and control groups carry equal demand weight so lift compares like with like.
  const launchCount = Math.round(n * C.SIM_LAUNCH_DISTRICT_SHARE.value);
  const groupTotal = (launch: boolean) => raw.filter((d) => d.launch === launch).reduce((a, d) => a + d.weight, 0);
  const lt = groupTotal(true);
  const ct = groupTotal(false);
  return raw.map((d) => ({
    ...d,
    weight: d.launch ? (d.weight / lt) * (launchCount / n) : (d.weight / ct) * ((n - launchCount) / n),
  }));
}
