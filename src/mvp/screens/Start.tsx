import { C } from '../../data/constants';
import { channelTakeHome } from '../../engine/formulas';
import { inr, num, pctText } from '../../lib/format';
import { bAt, listingNumbers, useOnboard, demandFor } from '../onboard';
import { Caption, Card, GoBtn, H2, Row, Screen, SimTag, useV } from '../ui';
import { Chip } from '../../components/Chip';

/** Entry: each maker starts from the question they actually have. */
export default function Start() {
  const v = useV();
  const onboard = useOnboard(v);
  const hero = v.run.persona.skus[0]!;
  const seen = () => onboard(() => ({ entrySeen: true }));
  const win = v.run.persona.winBack;
  const d = demandFor(hero);

  if (v.persona.cohort === 'Churned from Meesho' && win) {
    return (
      <Screen title="Why your old listings didn’t sell" back={{ to: '/app/today', label: v.t.backToToday }} sub={`${v.persona.business} · ${v.persona.city}`}>
        <Card>
          <H2>{v.t.oldListing}</H2>
          <p className="text-sm text-grey">{win.listingsBefore}</p>
          <div className="my-2 flex items-end gap-3" aria-label="Views to clicks">
            <div className="flex-1">
              <div className="h-3 rounded bg-plum" />
              <div className="mt-1 text-sm">
                <b>{num(win.views)}</b> views
              </div>
            </div>
            <div style={{ width: `${Math.max(4, (100 * win.clicks) / win.views)}%` }}>
              <div className="h-3 rounded bg-magenta" />
              <div className="mt-1 whitespace-nowrap text-sm">
                <b>{num(win.clicks)}</b> clicks
              </div>
            </div>
          </div>
          <Row k="COD refusals, yours" v={<b className="text-bad">{pctText(win.refusalPct)}</b>} />
          <Row k="Category average" v={pctText(win.categoryRefusalPct)} />
          <p className="mt-2 rounded-lg bg-blush p-2 text-sm">
            <b>Likely reason:</b> {win.likelyReason}
          </p>
          <div className="mt-2 flex gap-2">
            <SimTag />
          </div>
        </Card>
        <Card>
          <H2>This time</H2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>The listing bot redoes your photos and title, so buyers who see it click.</li>
            <li>The prepaid offer and a clear delivery date cut refusals.</li>
            <li>Factory Launch Week puts you in front of buyers for {C.LAUNCH_LIVE_DAYS.value.max - C.LAUNCH_LIVE_DAYS.value.min + 1} days.</li>
          </ul>
        </Card>
        <GoBtn to="/app/check" next onClick={seen}>
          {v.t.fixAndRelist}
        </GoBtn>
      </Screen>
    );
  }

  if (v.persona.cohort === 'Online elsewhere') {
    const n = listingNumbers(v, hero, hero.margin);
    const amazonPrice = C.AYESHA_AMAZON_PRICE.value;
    const ch = channelTakeHome(n.price, amazonPrice, n.stack, n.gst);
    return (
      <Screen title={v.t.takeHomeCalc} back={{ to: '/app/today', label: v.t.backToToday }} sub={`${hero.name}: what you keep per unit`}>
        <Card>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-blush p-2">
              <div className="text-xs text-grey">Meesho at {inr(n.price)}</div>
              <div className="text-2xl font-bold text-plum" data-testid="th-meesho">
                {inr(ch.meesho)}
              </div>
            </div>
            <div className="rounded-lg bg-cream p-2">
              <div className="text-xs text-grey">Amazon at {inr(amazonPrice)}</div>
              <div className="text-2xl font-bold text-ink">{inr(ch.amazon)}</div>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <Row k="Meesho fees (0% commission + shipping)" v={inr(ch.meeshoFees)} />
            <Row k={`Amazon fees (${C.AMZ_REFERRAL_PCT.value}% referral + closing + shipping)`} v={inr(ch.amazonFees)} />
            <Row k="RTOs on Meesho" v="No charge when dispatched on time" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip kind="synthetic">Amazon fees: team estimate</Chip>
          </div>
          <Caption>Same making cost ({inr(n.stack.makingCost)}), packaging and returns buffer on both. GST inside the price is passed on.</Caption>
        </Card>
        <Card>
          <H2>Lower price, same take-home</H2>
          <p className="text-sm">
            On Meesho you can sell at {inr(n.price)} (cap {inr(bAt(hero, v.day))}) and keep {inr(ch.meesho)}, against {inr(ch.amazon)} at {inr(amazonPrice)} on
            Amazon.
          </p>
        </Card>
        <GoBtn to="/app/check" next onClick={seen}>
          {v.t.checkIfPays}
        </GoBtn>
      </Screen>
    );
  }

  return (
    <Screen title="Buyers are asking for this" back={{ to: '/app/today', label: v.t.backToToday }} sub={`${v.persona.business} · ${v.persona.city}`}>
      <Card tone="blush">
        <div className="text-sm text-grey">{v.t.teaser}</div>
        <div className="text-lg font-semibold">{hero.productType}</div>
        <div className="my-1 font-display text-3xl font-bold text-plum" data-testid="demand-range">
          {num(d.gap.min)}–{num(d.gap.max)} / week
        </div>
        <p className="text-sm">orders on Meesho that no seller is set up to fill at a fair price.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <SimTag />
          <span className="text-xs text-grey">{v.t.forecast}</span>
        </div>
      </Card>
      <Card>
        <H2>What you’d do</H2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Check your price clears the market cap ({inr(bAt(hero, v.day))}).</li>
          <li>List with {C.SAMPLE_PHOTOS.value.min} photos; the bot writes the rest.</li>
          <li>Make one first lot. We tell you how many.</li>
        </ul>
      </Card>
      <GoBtn to="/app/check" next onClick={seen}>
        {v.t.checkIfPays}
      </GoBtn>
    </Screen>
  );
}
