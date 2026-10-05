import { C } from '../../data/constants';
import { daysOfCover } from '../../engine/formulas';
import { dateLabel } from '../../engine/nudges';
import { inr, num } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { moneyAt, nextPayout, runRateAt } from '../money';
import { listingNumbers } from '../onboard';
import { allSpecs } from '../stage';
import { Caption, Card, GoBtn, H2, Row, Screen, ScreenNudges, Stat, useV } from '../ui';

/** Earnings: earned (accrued), paid out, cash in stock at cost, days of cover, net cash position. */
export default function Earnings() {
  const v = useV();
  const m = moneyAt(v);
  const cover = daysOfCover(v.ds.onHand, runRateAt(v));
  const payout = nextPayout(v);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = v.day - 7 * (7 - i);
    const amt = v.run.days.filter((d) => d.day > end - 7 && d.day <= end).reduce((a, d) => a + d.money.payoutNet, 0);
    return { end, amt };
  });
  const max = Math.max(1, ...weeks.map((w) => w.amt));
  const live = allSpecs(v).filter((s) => v.ds.skus.some((x) => x.skuId === s.id && x.live));
  return (
    <Screen title={v.t.earningsTitle} sub={`As of ${dateLabel(v.day)}`}>
      <ScreenNudges v={v} route="/app/earnings" />
      <div className="grid grid-cols-2 gap-2">
        <Stat label={v.t.earned} value={<span data-testid="earned">{inr(m.earned)}</span>} caption="take-home on orders kept" />
        <Stat label={v.t.paidOut} value={<span data-testid="paid-out">{inr(m.paidOut)}</span>} caption={`${C.PAYMENT_CYCLE_DAYS.value} days after delivery`} />
        <Stat label={v.t.cashInStock} value={inr(m.cashInStock)} caption="money in unsold units" />
        <Stat label={v.t.daysCover} value={cover === null ? '—' : num(cover)} caption={`${num(v.ds.onHand)} units`} />
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <H2>{v.t.netCash}</H2>
          <span className={`text-lg font-bold ${m.netCash >= 0 ? 'text-good' : 'text-ink'}`}>{inr(m.netCash)}</span>
        </div>
        <details className="mt-1 text-sm text-grey">
          <summary className="cursor-pointer text-plum">What is this?</summary>
          Cash in (payouts, stock recovered, claims) minus cash out (making stock, packing, fees, GST paid). It dips below zero while your money sits in stock
          and in the {C.PAYMENT_CYCLE_DAYS.value}-day payout cycle, and climbs back as orders are paid.
        </details>
      </Card>
      <Card>
        <H2>Weekly payouts</H2>
        <div className="mt-2 flex h-24 items-end gap-1" aria-label="Payouts by week">
          {weeks.map((w) => (
            <div key={w.end} className="flex flex-1 flex-col items-center justify-end" title={`${dateLabel(w.end)}: ${inr(w.amt)}`}>
              <div className="w-full rounded-t bg-magenta" style={{ height: `${(100 * w.amt) / max}%` }} />
            </div>
          ))}
        </div>
        <Row k={v.t.nextPayout} v={payout ? `${inr(payout.amount)} on ${dateLabel(payout.day)}` : '—'} />
        <Row k={v.t.credits} v={inr(m.credits)} />
        <div className="mt-1">
          <Chip kind="existing">Meesho payouts</Chip>
        </div>
      </Card>
      {live.length > 0 && (
        <Card>
          <H2>{v.t.takeHome}</H2>
          {live.map((s) => {
            const n = listingNumbers(v, s, v.state.onboarding.margins[s.id] ?? s.margin);
            return <Row key={s.id} k={s.name} v={inr(Math.max(0, n.keep))} />;
          })}
          <Caption>After GST passed on, shipping, packaging and the returns buffer. Commission is {C.COMMISSION_PCT.value}%.</Caption>
        </Card>
      )}
      <GoBtn to="/app/products" kind="secondary" next>
        {v.t.productsTitle}
      </GoBtn>
    </Screen>
  );
}
