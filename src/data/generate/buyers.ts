import { mulberry32, pick } from '../../engine/rng';
import type { District } from './districts';

export interface Buyer {
  name: string;
  district: string;
  state: string;
}

const FIRST = [
  'Pooja', 'Rekha', 'Sunil', 'Kavita', 'Anil', 'Meena', 'Ravi', 'Lakshmi', 'Imran', 'Geeta', 'Suresh', 'Priya',
  'Manoj', 'Asha', 'Farhan', 'Deepa', 'Ramesh', 'Shabana', 'Vijay', 'Nisha', 'Arjun', 'Savita', 'Karan', 'Jyoti',
];
const LAST_INITIAL = ['K.', 'S.', 'M.', 'R.', 'P.', 'D.', 'B.', 'G.', 'T.', 'Y.'];

/** Seeded synthetic buyers for the buyer phone, spread over the simulation's districts. */
export function generateBuyers(seed: number, districts: District[], n: number): Buyer[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const d = pick(rng, districts);
    return { name: `${pick(rng, FIRST)} ${pick(rng, LAST_INITIAL)}`, district: d.name, state: d.state };
  });
}
