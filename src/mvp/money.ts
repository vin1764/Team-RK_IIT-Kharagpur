import { C } from '../data/constants';
import type { AccountView } from './useAccount';

/** The next payout on or after today, from the simulated payout cycle. */
export function nextPayout(v: AccountView): { day: number; amount: number } | null {
  const d = v.run.days.find((x) => x.day >= v.day && x.money.payoutNet > 0);
  return d ? { day: d.day, amount: d.money.payoutNet } : null;
}

/** Money as at the demo day. Nothing exists before it is created: no stock before the commit. */
export function moneyAt(v: AccountView) {
  const m = v.ds.money;
  return {
    earned: m.takeHomeCum,
    paidOut: m.payoutsCum,
    credits: m.creditsCum,
    cashInStock: m.cashInStock,
    netCash: m.netCashCum,
  };
}

/** Run-rate per day over the last window (orders), for days of cover. */
export function runRateAt(v: AccountView, sku?: string): number {
  const w = C.RUN_RATE_WINDOW_DAYS.value;
  const days = v.run.days.filter((x) => x.day > v.day - w && x.day <= v.day);
  const orders = days.reduce((a, x) => a + (sku ? (x.skus.find((s) => s.skuId === sku)?.orders ?? 0) : x.orders), 0);
  return orders / w;
}
