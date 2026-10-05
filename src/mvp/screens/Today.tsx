import { CheckCircle2, Circle } from 'lucide-react';
import { Go } from '../../app/Go';
import { dateLabel, weekdayLabel } from '../../engine/nudges';
import { inr, num } from '../../lib/format';
import { setupSteps, committedOf } from '../stage';
import { Card, GoBtn, H2, NudgeCard, Screen, Stat, useV } from '../ui';
import { nextPayout } from '../money';
import { ready } from '../ready';

export default function Today() {
  const v = useV();
  const steps = setupSteps(v);
  const committed = committedOf(v);
  const nextStep = steps.find((s) => !s.done);
  const urgent = v.active.filter((n) => n.priority !== 'info');
  const info = v.active.filter((n) => n.priority === 'info');
  const live = v.ds.skus.some((s) => s.live);
  const payout = nextPayout(v);
  return (
    <Screen title={`${v.t.greeting}, ${v.persona.name.split(' ')[0]}`} sub={weekdayLabel(v.day)}>
      {ready('setup') && committed === null && nextStep && (
        <Card tone="orange">
          <H2>{v.t.setupTitle}</H2>
          <ol className="my-2 space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                {s.done ? <CheckCircle2 size={16} className="text-good" aria-hidden /> : <Circle size={16} className="text-grey" aria-hidden />}
                <span className={s.done ? 'text-grey line-through' : ''}>{s.label}</span>
              </li>
            ))}
          </ol>
          <GoBtn to={nextStep.route} kind="do">
            {v.t.continueSetup}: {nextStep.label}
          </GoBtn>
        </Card>
      )}
      {live && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label={v.t.liveOrders} value={num(v.ds.orders)} />
          <Stat label={v.t.stockLeft} value={num(v.ds.onHand)} />
          <Stat label={v.t.nextPayout} value={payout ? inr(payout.amount) : '—'} caption={payout ? dateLabel(payout.day) : undefined} />
        </div>
      )}
      {ready('nudges') && (
      <section className="space-y-2" aria-label="To do">
        {urgent.map((n) => (
          <NudgeCard key={n.id} n={n} v={v} />
        ))}
        {urgent.length === 0 && committed !== null && (
          <Card>
            <p className="text-sm text-grey">{v.t.nothingToday}</p>
          </Card>
        )}
      </section>
      )}
      {ready('nudges') && info.length > 0 && (
        <section className="space-y-2" aria-label="Updates">
          <H2>Updates</H2>
          {info.map((n) => (
            <NudgeCard key={n.id} n={n} v={v} />
          ))}
        </section>
      )}
      {ready('nudges') && (
        <Go to="/app/inbox" className="block text-center text-sm font-semibold text-magenta">
          {v.t.inbox} →
        </Go>
      )}
    </Screen>
  );
}
