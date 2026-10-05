import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { packPointFeeFor } from '../../engine/formulas';
import { C } from '../../data/constants';
import { inr } from '../../lib/format';
import { Chip } from '../../components/Chip';
import { listingNumbers, nodeAt, ppRecommended, useOnboard } from '../onboard';
import { launchSkus, specById } from '../stage';
import type { Fulfilment as F } from '../state';
import { Caption, Card, GoBtn, H2, Row, Screen, useV } from '../ui';
import AppNotFound from './AppNotFound';
import { ready } from '../ready';

/** Who packs it: ship myself, or the Pack Point when the node is big enough and the price high enough. */
export default function Fulfilment() {
  const v = useV();
  const onboard = useOnboard(v);
  const { sku } = useParams();
  const spec = specById(v, sku);
  if (!spec) return <AppNotFound />;
  const n = listingNumbers(v, spec, v.state.onboarding.margins[spec.id] ?? spec.margin);
  const node = nodeAt(v, Math.max(v.day, 0));
  const priceOk = ppRecommended(n.price);
  const ppNow = !!node && node.pays && priceOk;
  const rec: F = ppNow ? 'packPoint' : 'self';
  const chosen = v.state.onboarding.fulfilment[spec.id];
  const nextUnlisted = launchSkus(v).find((s) => s.id !== spec.id && !v.state.onboarding.listed[s.id]);
  const isLaunch = launchSkus(v).some((s) => s.id === spec.id);
  const nextRoute = !isLaunch ? (ready('products') ? `/app/products/${spec.id}` : '/app/today') : nextUnlisted ? `/app/list/${nextUnlisted.id}/product` : '/app/launch';
  const choose = (f: F) => onboard((o) => ({ fulfilment: { ...o.fulfilment, [spec.id]: f } }));

  const reason = !node
    ? `There’s no Pack Point in ${v.persona.city} yet. Ship it yourself; Valmo picks up from your door.`
    : !priceOk
      ? `At ${inr(n.price)} (under ${inr(C.PACK_POINT_MIN_PRICE.value)}), the Pack Point fee eats your take-home. Ship it yourself.`
      : !node.pays
        ? `The ${v.persona.city} node has ${node.makers} makers; the fee drops to ${inr(packPointFeeFor(C.PP_REFERENCE_MAKERS.value))} at ${C.PP_REFERENCE_MAKERS.value}. Pack Point waits; ship yourself meanwhile.`
        : `The ${v.persona.city} node has ${node.makers} makers: ${inr(node.fee)} per delivered order, and returns go to the node, not your factory.`;

  const Option = ({ f, title, lines, tag }: { f: F; title: string; lines: string[]; tag: ReactNode }) => (
    <button
      type="button"
      onClick={() => choose(f)}
      className={`w-full rounded-xl border-2 p-3 text-left ${chosen === f ? 'border-magenta bg-blush' : 'border-line bg-white'}`}
      data-testid={`ff-${f}`}
      aria-pressed={chosen === f}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{title}</span>
        {rec === f && <span className="rounded-full bg-good px-2 py-0.5 text-xs font-bold text-white">{v.t.recommended}</span>}
      </div>
      <ul className="mt-1 list-disc pl-5 text-sm text-grey">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="mt-1">{tag}</div>
    </button>
  );

  return (
    <Screen title={v.t.fulfilment} back={{ to: `/app/list/${spec.id}/price`, label: v.t.back }} sub={`${spec.name} · ${inr(n.price)}`}>
      <Card tone="blush">
        <p className="text-sm" data-testid="ff-reason">
          {reason}
        </p>
      </Card>
      <Option
        f="self"
        title={v.t.selfShip}
        lines={[`You pack; Valmo picks up ${C.VALMO_PICKUP_WINDOW.value}`, `Hand over within ${C.DISPATCH_SLA_HOURS.value.max} h`, 'Returns come back to you']}
        tag={<Chip kind="existing">Valmo</Chip>}
      />
      {node ? (
        <Option
          f="packPoint"
          title={v.t.packPoint}
          lines={[`Fee at today’s node size (${node.makers} makers): ${inr(node.fee)} per delivered order`, 'Send one bulk lot a week; they pack and dispatch', 'Returns graded at the node; swaps caught by weight']}
          tag={<Chip kind="partner" />}
        />
      ) : (
        <Card>
          <H2>{v.t.packPoint}</H2>
          <Caption>Not in {v.persona.city} yet.</Caption>
        </Card>
      )}
      {node && (
        <Card>
          <Row k="Node makers today" v={node.makers} />
          <Row k="Fee now" v={inr(node.fee)} />
          <Row k="Pack Point recommended above" v={inr(C.PACK_POINT_MIN_PRICE.value)} />
        </Card>
      )}
      {chosen ? (
        <GoBtn to={nextRoute} next>
          {v.t.continueBtn}
        </GoBtn>
      ) : (
        <Caption>Choose one to continue.</Caption>
      )}
    </Screen>
  );
}
