import { useState } from 'react';
import { C } from '../../data/constants';
import { withheldCredits } from '../../engine/formulas';
import { inr } from '../../lib/format';
import { listingNumbers, useOnboard } from '../onboard';
import { Caption, Card, GoBtn, H2, Row, Screen, useV } from '../ui';
import { Chip } from '../../components/Chip';

const VERDICT = {
  pass: { label: 'It pays', cls: 'bg-good text-white', line: 'Your price fits under the market cap with your margin.' },
  nearMiss: { label: 'Near miss', cls: 'bg-warn text-ink', line: 'You clear break-even, but your margin pushes the price above the cap.' },
  notFit: { label: 'Not a fit yet', cls: 'bg-bad text-white', line: 'Your break-even is above the cap: buyers get it cheaper today.' },
  noData: { label: 'No data', cls: 'bg-line text-ink', line: 'Enter your making cost to see the verdict.' },
} as const;

/** 5-minute cost check against the market cap B. */
export default function CostCheck() {
  const v = useV();
  const onboard = useOnboard(v);
  const hero = v.run.persona.skus[0]!;
  const [making, setMaking] = useState<string>(String(v.state.onboarding.makingCost ?? hero.stack.makingCost));
  const [margin, setMargin] = useState<string>(String(v.state.onboarding.margins[hero.id] ?? hero.margin));
  const m = Number(making);
  const mg = margin === '' ? hero.margin : Number(margin);
  const valid = making !== '' && Number.isFinite(m) && m > 0 && Number.isFinite(mg) && mg >= 0;
  const stackHero = { ...hero, stack: { ...hero.stack, makingCost: valid ? m : hero.stack.makingCost } };
  const n = listingNumbers({ ...v, state: { ...v.state, onboarding: { ...v.state.onboarding, makingCost: valid ? m : undefined } } }, stackHero, mg);
  const verdict = valid ? n.verdict : 'noData';
  const vd = VERDICT[verdict];
  const credits = withheldCredits(n.price);
  return (
    <Screen title={v.t.costCheck} back={{ to: '/app/start', label: v.t.back }} sub={hero.name}>
      <Card>
        <label className="block text-sm font-semibold" htmlFor="making">
          {v.t.makingCost} (₹ per unit)
        </label>
        <input id="making" inputMode="numeric" value={making} onChange={(e) => setMaking(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-lg" data-testid="making-cost" />
        <label className="mt-2 block text-sm font-semibold" htmlFor="margin">
          {v.t.margin} (₹ per unit, optional)
        </label>
        <input id="margin" inputMode="numeric" value={margin} onChange={(e) => setMargin(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-lg" />
      </Card>
      <Card>
        <H2>Your cost stack (pre-filled)</H2>
        <div className="text-sm">
          <Row k={v.t.makingCost} v={valid ? inr(m) : '—'} />
          <Row k="Packaging" v={inr(n.stack.packaging)} />
          <Row k="Shipping + fixed fee (by weight and zone)" v={inr(n.stack.shippingAndFee)} />
          <Row k="Returns buffer" v={inr(n.stack.returnsBuffer)} />
          <Row k={`GST ${n.gst}% (passed on)`} v="inside the price" />
          <Row k="Commission" v={`${C.COMMISSION_PCT.value}%`} />
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <H2>Verdict</H2>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${vd.cls}`} data-testid="verdict">
            {vd.label}
          </span>
        </div>
        <p className="mt-1 text-sm">{vd.line}</p>
        {valid && (
          <div className="mt-2 text-sm">
            <Row k={v.t.breakEven} v={<span data-testid="break-even">{inr(n.be)}</span>} />
            <Row k={v.t.listPrice} v={<span data-testid="list-price">{inr(n.price)}</span>} strong />
            <Row k={v.t.priceCap} v={inr(n.B)} />
            <Row k={v.t.takeHome} v={<span data-testid="take-home">{inr(n.keep)}</span>} strong />
            {verdict === 'nearMiss' && <p className="mt-1 rounded bg-orange-soft p-2">Lower your margin to {inr(n.maxMargin)} or less to fit under {inr(n.B)}.</p>}
            <p className="mt-2 text-xs text-grey">
              Withheld from each payout: TCS {C.GST_TCS_PCT.value}% ({inr(credits.tcs, 2)}) and TDS {C.INCOME_TAX_TDS_PCT.value}% ({inr(credits.tds, 2)}). Both are
              claimable credits, not costs.
            </p>
          </div>
        )}
        <div className="mt-2">
          <Chip kind="existing">Existing Meesho fee rules</Chip>
        </div>
      </Card>
      {verdict === 'notFit' ? (
        <>
          <Caption>We’ll tell you when a product on your machines has an open gap you can price under the cap.</Caption>
          <GoBtn to="/app/today" next>
            {v.t.backToToday}
          </GoBtn>
        </>
      ) : (
        <GoBtn
          to="/app/signup"
          next
          onClick={() =>
            valid &&
            onboard((o) => ({
              costChecked: true,
              makingCost: m,
              margins: { ...o.margins, [hero.id]: verdict === 'nearMiss' ? n.maxMargin : mg },
            }))
          }
        >
          {verdict === 'nearMiss' ? `Use margin ${inr(n.maxMargin)} and sign up` : `${v.t.continueBtn}: ${v.t.signUp}`}
        </GoBtn>
      )}
    </Screen>
  );
}
