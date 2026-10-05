import { useState } from 'react';
import { PageShell } from '../app/PageShell';
import { page } from '../app/pages';
import { C, STATUSES } from '../data/constants';
import { SCORECARD } from '../data/categories';
import { BUYER_COPY } from '../data/copy';
import {
  breakEven,
  categoryScore,
  heroCostStack,
  listPrice,
  nextBatch,
  packPointFeeTier,
  priceBand,
  priceDropPctOfB,
  reorderPoint,
  takeHome,
  ordersOfContributionPerAvoidedRto,
  blendedRto,
} from '../engine/formulas';
import { inr, num, pctText, dayLabel } from '../lib/format';
import { TitleTab } from '../components/TitleTab';
import { StagePill } from '../components/StagePill';
import { DashedPanel } from '../components/DashedPanel';
import { MetricTile } from '../components/MetricTile';
import { Chip, AnswersPs, type ChipKind } from '../components/Chip';
import { SourceBadge } from '../components/SourceBadge';
import { Num } from '../components/FormulaPopover';
import { DecisionCard } from '../components/DecisionCard';
import { Timeline } from '../components/Timeline';
import { EventLog } from '../components/EventLog';
import { ImpactTracker } from '../components/ImpactTracker';
import { MakerPhone } from '../components/MakerPhone';
import { BuyerPhone } from '../components/BuyerPhone';

const SWATCHES = [
  ['plum', 'bg-plum', '#5C1049'],
  ['plum-deep', 'bg-plum-deep', '#4A0D3B'],
  ['magenta', 'bg-magenta', '#9F2089'],
  ['pink', 'bg-pink', '#F43397'],
  ['orange', 'bg-orange', '#FE9C01'],
  ['orange-soft', 'bg-orange-soft', '#FFE3B8'],
  ['cream', 'bg-cream', '#FFF4E5'],
  ['blush', 'bg-blush', '#FCE4F1'],
  ['ink', 'bg-ink', '#2B1026'],
  ['grey', 'bg-grey', '#7A4E70'],
  ['line', 'bg-line', '#F0C9E2'],
  ['good', 'bg-good', '#1E9E5A'],
  ['warn', 'bg-warn', '#E8A317'],
  ['bad', 'bg-bad', '#D64545'],
] as const;

const CHIPS: ChipKind[] = ['existing', 'new', 'partner', 'simulated', 'synthetic'];

export default function Styleguide() {
  const def = page('/styleguide');
  const stack = heroCostStack();
  const be = breakEven(stack);
  const price = listPrice(stack, C.HERO_MARGIN.value);
  const keep = takeHome(price, stack);
  const B = C.HERO_B.value;
  const band = priceBand(price, Math.round(be), B);
  const heroDrop = priceDropPctOfB([{ B, price, orders: 1 }]);
  const target = C.PRICE_DROP_TARGET_PCT_OF_B.value;
  const rate = C.HERO_RUN_RATE_DAY_33.value;
  const rop = reorderPoint(rate, C.HERO_LEAD_TIME_DAYS.value, C.HERO_SAFETY_DAYS.value);
  const batch = nextBatch(rate, C.HERO_MIN_RUN.value);
  const refMakers = C.PP_REFERENCE_MAKERS.value;
  const fee = packPointFeeTier(refMakers).fee;
  const live = C.LAUNCH_LIVE_DAYS.value;
  const [day, setDay] = useState(live.min);

  const priceInputs = [
    { label: 'Making cost', value: inr(stack.makingCost), c: 'HERO_MAKING_COST' as const },
    { label: 'Packaging', value: inr(stack.packaging), c: 'HERO_PACKAGING' as const },
    { label: 'Shipping + fixed fee', value: inr(stack.shippingAndFee), c: 'HERO_SHIPPING_AND_FEE' as const },
    { label: 'Returns buffer', value: inr(stack.returnsBuffer), c: 'HERO_RETURNS_BUFFER' as const },
    { label: 'GST (inside price)', value: pctText(C.GST_RATE_PCT.value), c: 'GST_RATE_PCT' as const },
  ];

  return (
    <PageShell def={def} trail={[{ label: 'Home', to: '/' }, { label: 'Styleguide' }]} back={{ to: '/', label: 'Home' }}>
      <div className="space-y-8" data-testid="styleguide">
        <DashedPanel title="Palette" tone="white">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map(([name, cls, hex]) => (
              <div key={name} className="overflow-hidden rounded-lg border border-line">
                <div className={`h-12 ${cls}`} />
                <div className="px-2 py-1 text-[11px]">
                  <div className="font-semibold">{name}</div>
                  <div className="font-mono text-grey">{hex}</div>
                </div>
              </div>
            ))}
          </div>
        </DashedPanel>

        <DashedPanel title="Type and headings" tone="white">
          <div className="space-y-3">
            <TitleTab size="lg">Display · Cardo (TitleTab lg)</TitleTab>
            <div>
              <TitleTab size="md">TitleTab md</TitleTab> <TitleTab size="sm">TitleTab sm</TitleTab>
            </div>
            <p className="font-sans text-base">Body · Poppins. Orange = maker action, magenta = bot/system, plum = Meesho; green/amber/red = status only.</p>
            <div className="flex flex-wrap gap-2">
              <StagePill>① Factory Onboarding</StagePill>
              <StagePill>② Factory Launch Week</StagePill>
              <StagePill>③ Growth Loop</StagePill>
              <StagePill tone="plum">Meesho</StagePill>
              <StagePill tone="magenta">Bot</StagePill>
            </div>
          </div>
        </DashedPanel>

        <DashedPanel title="Tags, badges and the PS chip" tone="white">
          <div className="flex flex-wrap items-center gap-2">
            {CHIPS.map((k) => (
              <Chip key={k} kind={k} />
            ))}
            <AnswersPs q={['Q3']} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <SourceBadge key={s} status={s} />
            ))}
          </div>
        </DashedPanel>

        <DashedPanel title="Numbers with Verify (turn Verify on in the header, then click a number)" tone="white">
          <div className="flex flex-wrap gap-6 text-lg" data-testid="verify-demo">
            <span>
              Break-even:{' '}
              <Num f="breakEven" inputs={priceInputs}>
                {inr(be)}
              </Num>
            </span>
            <span>
              List price:{' '}
              <Num f="listPrice" inputs={[...priceInputs, { label: 'Margin', value: inr(C.HERO_MARGIN.value), c: 'HERO_MARGIN' }]}>
                {inr(price)}
              </Num>
            </span>
            <span>
              Take-home:{' '}
              <Num f="takeHome" inputs={[{ label: 'Price', value: inr(price) }, ...priceInputs]}>
                {inr(keep)}
              </Num>
            </span>
            <span>
              Commission: <Num c="COMMISSION_PCT">{pctText(C.COMMISSION_PCT.value)}</Num>
            </span>
            <span>
              Blended RTO: <Num f="blendedRto" inputs={[
                { label: 'COD share', value: pctText(C.COD_SHARE_PCT.value, 2), c: 'COD_SHARE_PCT' },
                { label: 'COD success', value: pctText(C.COD_SUCCESS_PCT.value, 2), c: 'COD_SUCCESS_PCT' },
                { label: 'Prepaid success', value: pctText(C.PREPAID_SUCCESS_PCT.value, 2), c: 'PREPAID_SUCCESS_PCT' },
              ]}>{pctText(blendedRto() * 100, 1)}</Num>
            </span>
          </div>
        </DashedPanel>

        <DashedPanel title="MetricTile" tone="white">
          <div className="flex flex-wrap gap-3">
            <MetricTile label="Take-home per unit" value={<Num f="takeHome" inputs={priceInputs}>{inr(keep)}</Num>} />
            <MetricTile
              label="Price drop vs B (hero)"
              value={<Num f="priceDropDelivered">{pctText(heroDrop, 1)}</Num>}
              target={`≥ ${pctText(target)} at cohort level`}
              status={heroDrop >= target ? 'good' : 'warn'}
            />
            <MetricTile
              label={`Pack Point fee at ${num(refMakers)} makers`}
              value={<Num f="packPointFee">{inr(fee)}</Num>}
              target={`≤ ${inr(C.T_PACK_POINT_FEE.value)}`}
              status={fee <= C.T_PACK_POINT_FEE.value ? 'good' : 'bad'}
            />
            <MetricTile
              label="Orders of contribution per avoided RTO"
              value={<Num f="ordersPerAvoidedRto">{num(ordersOfContributionPerAvoidedRto())}</Num>}
            />
          </div>
        </DashedPanel>

        <DashedPanel title="DecisionCard (example: every input exactly at its threshold)" tone="white">
          <div className="grid gap-3 md:grid-cols-3">
            <DecisionCard
              decision="Invest"
              gate={`Gate 1 · ${dayLabel(C.GATE_DAYS.value[0]!)}`}
              rule={`Invest if stick rate ≥ ${C.T_STICK_RATE_D30.value} AND lift ≥ ${C.T_DEMAND_LIFT.value}× AND sell-through ≥ ${C.T_SELL_THROUGH_PCT.value}% AND prices held.`}
              inputs={[
                { label: 'Stick rate', value: num(C.T_STICK_RATE_D30.value, 1), pass: true },
                { label: 'Lift', value: `${num(C.T_DEMAND_LIFT.value, 1)}×`, pass: true },
                { label: 'Sell-through', value: pctText(C.T_SELL_THROUGH_PCT.value), pass: true },
                { label: 'Prices held', value: pctText(C.T_PRICES_HELD_PCT.value), pass: true },
              ]}
            />
            <DecisionCard
              decision="Tighten"
              gate="Gate 1 · example"
              rule="Tighten if lift is positive but below target, or stick rate is below target → adjust B or eligibility, rerun once."
              inputs={[
                { label: 'Stick rate', value: `< ${num(C.T_STICK_RATE_D30.value, 1)}`, pass: false },
                { label: 'Lift', value: `< ${num(C.T_DEMAND_LIFT.value, 1)}×`, pass: false },
              ]}
            />
            <DecisionCard
              decision="Stop"
              gate="Gate 1 · example"
              rule="Stop if there's no lift or prices didn't hold."
              inputs={[{ label: 'Prices held', value: `< ${pctText(C.T_PRICES_HELD_PCT.value)}`, pass: false }]}
            />
          </div>
        </DashedPanel>

        <DashedPanel title="Timeline and EventLog" tone="white">
          <Timeline
            day={day}
            onChange={setDay}
            markers={[
              { day: live.min, label: 'Launch Week', kind: 'chapter' },
              ...C.GATE_DAYS.value.map((d) => ({ day: d, label: `Gate at day ${d}`, kind: 'gate' as const })),
            ]}
          />
          <div className="mt-3">
            <EventLog
              events={[
                { day: live.min, actor: 'meesho', text: `${BUYER_COPY.launchSection} goes live; launch section shown in launch districts only` },
                { day: C.LAUNCH_COMMIT_BY_DAY.value, actor: 'maker', text: `Commits at ${inr(price)}: band ${inr(band.low)}–${inr(band.high)}, in band` },
                { day: C.HERO_RESTOCK_DAY.value, actor: 'system', text: `Restock math: reorder at ${num(rop)}, next batch ${num(batch)}` },
                { day: live.max, actor: 'buyer', text: `RTO: no reverse shipping charged to the maker (dispatched on time)` },
              ]}
            />
          </div>
        </DashedPanel>

        <DashedPanel title="Phones and ImpactTracker" tone="white">
          <div className="flex flex-wrap items-start gap-6">
            <MakerPhone>
              {(t) => (
                <>
                  <p className="text-2xl font-semibold">{t.greeting}, Hiren ji</p>
                  <div className="rounded-2xl border-2 border-orange bg-orange-soft/60 p-4">
                    <div className="text-sm font-semibold text-grey">{t.costCheck}</div>
                    <div className="mt-2 flex justify-between">
                      <span>{t.makingCost}</span>
                      <strong>{inr(stack.makingCost)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.listPrice}</span>
                      <strong>{inr(price)}</strong>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>{t.takeHome}</span>
                      <strong className="text-good">{inr(keep)}</strong>
                    </div>
                    <div className="mt-2 inline-block rounded-full bg-good px-3 py-0.5 text-sm font-semibold text-white">{t.inBand}</div>
                  </div>
                  <p className="text-sm italic text-grey" data-testid="maker-forecast">
                    {t.forecast}
                  </p>
                  <button type="button" className="w-full rounded-xl bg-orange py-3 text-lg font-semibold text-ink">
                    {t.nextStep}
                  </button>
                </>
              )}
            </MakerPhone>
            <BuyerPhone query="steel bottle 1L">
              <div className="rounded-xl bg-plum px-3 py-2 text-sm font-semibold text-white">{BUYER_COPY.launchSection}</div>
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="mb-2 flex h-36 items-center justify-center rounded-lg bg-blush">
                  <svg viewBox="0 0 40 100" className="h-28" aria-label="Steel bottle illustration">
                    <rect x="13" y="2" width="14" height="10" rx="2" fill="#7A4E70" />
                    <rect x="8" y="12" width="24" height="84" rx="8" fill="#C9C3CC" stroke="#7A4E70" strokeWidth="1.5" />
                    <rect x="12" y="20" width="4" height="66" rx="2" fill="#FFFFFF" opacity="0.6" />
                  </svg>
                </div>
                <div className="text-sm">Stainless steel bottle, 1 L</div>
                <div className="text-xl font-bold">{inr(price)}</div>
                <div className="text-xs text-good">{BUYER_COPY.pricePosition}</div>
                <div className="text-xs text-grey">{BUYER_COPY.madeBy}</div>
                <div className="text-xs text-grey">{BUYER_COPY.cod}</div>
              </div>
            </BuyerPhone>
            <div className="w-72">
              <ImpactTracker
                lit={['makers', 'priceDrop']}
                maker={[
                  { label: 'List price', value: inr(price) },
                  { label: 'Take-home / unit', value: inr(keep) },
                ]}
                buyer={[
                  { label: 'Price vs B', value: `${inr(price)} vs ${inr(B)}` },
                  { label: 'Below B', value: pctText(heroDrop, 1) },
                ]}
                meesho={[
                  { label: 'Contribution / order', value: inr(C.CONTRIBUTION_PER_ORDER.value, 2) },
                  { label: 'Orders per avoided RTO', value: num(ordersOfContributionPerAvoidedRto()) },
                ]}
              />
            </div>
          </div>
        </DashedPanel>

        <DashedPanel title="Formula check: category scores and Pack Point fees" tone="white">
          <div className="flex flex-wrap gap-6 text-sm">
            <ul>
              {SCORECARD.map((c) => (
                <li key={c.id}>
                  {c.name}: <Num f="categoryScore">{num(categoryScore(c.ratings))}</Num>
                </li>
              ))}
            </ul>
            <ul>
              {C.PP_FEE_TIER_MAKERS.value.map((m) => (
                <li key={m}>
                  {num(m)} makers: <Num f="packPointFee">{inr(packPointFeeTier(m).fee)}</Num> per delivered order
                </li>
              ))}
            </ul>
          </div>
        </DashedPanel>
      </div>
    </PageShell>
  );
}
