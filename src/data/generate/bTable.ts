import { C } from '../constants';
import { benchmarkB, type BListing } from '../../engine/formulas';
import { mulberry32, randInt } from '../../engine/rng';

export interface BTableRow extends BListing {
  title: string;
}

export const MAKER_SELLER_ID = 'maker';

/**
 * A 10-listing B table for one product type: 6 eligible listings plus four shown as excluded
 * (the maker's own, below the quality floor, too few orders, different spec). Prices are
 * shifted so `benchmarkB` returns exactly `targetB`.
 */
export function generateBTable(productType: string, targetB: number, makerPrice: number, seed: number): BTableRow[] {
  const rng = mulberry32(seed);
  const n = C.GEN_B_TABLE_ELIGIBLE.value;
  const minOrders = C.B_MIN_DELIVERED_ORDERS.value;
  const eligible: BTableRow[] = Array.from({ length: n }, (_, i) => ({
    sellerId: `S-${100 + randInt(rng, 0, 899)}-${i}`,
    title: `${productType} · listing ${String.fromCharCode(65 + i)}`,
    pricePerUnit: Math.round(targetB * (0.96 + rng() * 0.36)),
    deliveredOrders: randInt(rng, minOrders * 2, minOrders * 6),
    aboveQualityFloor: true,
    sameSpec: true,
  }));
  // Shift prices so the weighted 25th percentile lands exactly on targetB.
  const shift = targetB - benchmarkB(eligible).B;
  for (const r of eligible) r.pricePerUnit += shift;
  // Listings below B sit just under it (realistic clustering), so B is robust to one extra cheap seller.
  const floor = Math.ceil(targetB * C.GEN_B_BELOW_FLOOR_SHARE.value);
  for (const r of eligible) if (r.pricePerUnit < targetB) r.pricePerUnit = Math.max(r.pricePerUnit, floor);

  const excluded: BTableRow[] = [
    { sellerId: MAKER_SELLER_ID, title: `${productType} · your listing`, pricePerUnit: makerPrice, deliveredOrders: 0, aboveQualityFloor: true, sameSpec: true },
    {
      sellerId: `S-Q${randInt(rng, 100, 999)}`,
      title: `${productType} · listing G`,
      pricePerUnit: Math.round(targetB * 0.8),
      deliveredOrders: randInt(rng, minOrders * 2, minOrders * 5),
      aboveQualityFloor: false,
      sameSpec: true,
    },
    {
      sellerId: `S-N${randInt(rng, 100, 999)}`,
      title: `${productType} · listing H`,
      pricePerUnit: Math.round(targetB * 0.86),
      deliveredOrders: randInt(rng, 1, minOrders - 1),
      aboveQualityFloor: true,
      sameSpec: true,
    },
    {
      sellerId: `S-X${randInt(rng, 100, 999)}`,
      title: `${productType} · listing I (smaller size)`,
      pricePerUnit: Math.round(targetB * 0.75),
      deliveredOrders: randInt(rng, minOrders * 2, minOrders * 5),
      aboveQualityFloor: true,
      sameSpec: false,
    },
  ];
  return [...eligible, ...excluded];
}
