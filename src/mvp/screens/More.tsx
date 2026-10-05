import { PhoneCall } from 'lucide-react';
import { Go } from '../../app/Go';
import { useApp } from '../../app/store';
import { C } from '../../data/constants';
import { dateLabel } from '../../engine/nudges';
import { Btn, Caption, Card, H2, Row, Screen, useV } from '../ui';

export default function More() {
  const v = useV();
  const toggleLang = useApp((s) => s.toggleLang);
  const esc = v.timeline.find((n) => n.type === 'escalation_call');
  return (
    <Screen title={v.t.moreTitle}>
      <Card>
        <H2>{v.t.account}</H2>
        <Row k="Name" v={v.persona.name} />
        <Row k="Business" v={v.persona.business} />
        <Row k="City" v={v.persona.city} />
        <Row k="Category" v={v.persona.category} />
        <Go to="/app" className="mt-2 block text-sm font-semibold text-magenta">
          {v.t.switchAccount} →
        </Go>
      </Card>
      <Card tone={esc ? 'orange' : 'white'}>
        <H2>{v.t.escalation}</H2>
        {esc ? (
          <div className="mt-1 space-y-1 text-sm" data-testid="escalation-status">
            <p className="flex items-start gap-2 font-semibold">
              <PhoneCall size={18} className="mt-0.5 shrink-0 text-plum" aria-hidden />
              {v.day <= esc.firedDay
                ? `A Meesho category manager will call you tomorrow at ${C.ESCALATION_CALL_TIME.value}.`
                : `A Meesho category manager called you on ${dateLabel(esc.firedDay + 1)} at ${C.ESCALATION_CALL_TIME.value}.`}
            </p>
            <Caption>Why: {esc.body}</Caption>
          </div>
        ) : (
          <p className="mt-1 text-sm text-grey">{v.t.noEscalation}</p>
        )}
      </Card>
      <Card>
        <H2>{v.t.languageSetting}</H2>
        <div className="mt-2">
          <Btn kind="secondary" onClick={toggleLang}>
            {v.lang === 'hi' ? 'English' : 'हिन्दी'}
          </Btn>
        </div>
      </Card>
      <Card>
        <H2>{v.t.help}</H2>
        <ul className="mt-1 space-y-1 text-sm">
          <li>Payments: {C.PAYMENT_CYCLE_DAYS.value} days after delivery, every day.</li>
          <li>Valmo pickup: {C.VALMO_PICKUP_WINDOW.value}, every working day.</li>
          <li>Orders must be handed over within {C.DISPATCH_SLA_HOURS.value.max} hours.</li>
        </ul>
      </Card>
      <Go to="/app/today" next className="block text-center text-sm font-semibold text-magenta">
        {v.t.backToToday}
      </Go>
    </Screen>
  );
}
