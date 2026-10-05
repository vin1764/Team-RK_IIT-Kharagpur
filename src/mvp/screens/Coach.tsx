import { C } from '../../data/constants';
import { dateLabel } from '../../engine/nudges';
import { dayLabel } from '../../lib/format';
import { specById } from '../stage';
import { Caption, Card, GoBtn, H2, NudgeCard, Screen, useV } from '../ui';

/** Coach: this week's one fix (one tap), the re-check date, and the history of fixes. */
export default function Coach() {
  const v = useV();
  const fixes = v.active.filter((n) => n.type === 'coach_fix' || n.type === 'prepaid_nudge' || n.type === 'coach_recheck');
  const history = v.run.events.filter((e) => ['coachNudge', 'fixRecheck', 'kamCase', 'newRule'].includes(e.kind) && e.day <= v.day).reverse();
  const lastFix = v.run.events.filter((e) => e.kind === 'coachNudge' && e.day <= v.day).at(-1);
  const recheck = lastFix ? lastFix.day + C.FIX_RECHECK_DAYS.value : null;
  return (
    <Screen title={v.t.coachTitle} back={{ to: '/app/products', label: v.t.productsTitle }} sub="One fix a week, checked after 14 days">
      <section className="space-y-2" aria-label={v.t.thisWeek}>
        <H2>{v.t.thisWeek}</H2>
        {fixes.length === 0 && (
          <Card>
            <p className="text-sm text-grey">No fix this week: your listings are inside the type’s band.</p>
          </Card>
        )}
        {fixes.map((n) => (
          <div key={n.id} className="space-y-1">
            <NudgeCard n={n} v={v} />
            {v.lang === 'en' && n.type !== 'coach_recheck' && (
              <p className="px-1 text-sm text-plum" lang="hi">
                हिंदी: {n.titleHi}
              </p>
            )}
          </div>
        ))}
        {recheck !== null && recheck >= v.day && (
          <Caption>
            {v.t.recheckOn}: {dateLabel(recheck)} ({dayLabel(recheck)})
          </Caption>
        )}
      </section>
      <Card>
        <H2>{v.t.history}</H2>
        {history.length === 0 && <Caption>Nothing yet. The coach starts watching after day {C.GATE_DAYS.value[0]}.</Caption>}
        <ol className="mt-1 space-y-2 text-sm">
          {history.map((e, i) => {
            const ok = e.kind === 'fixRecheck' ? !!e.data?.success : undefined;
            return (
              <li key={i} className={`border-l-4 pl-2 ${e.kind === 'kamCase' || e.kind === 'newRule' ? 'border-plum' : ok === false ? 'border-bad' : ok ? 'border-good' : 'border-orange'}`}>
                <div className="text-xs text-grey">
                  {dayLabel(e.day)} · {specById(v, e.skuId)?.name ?? ''}
                  {ok !== undefined && <b className={ok ? 'text-good' : 'text-bad'}> · {ok ? v.t.worked : v.t.notYet}</b>}
                </div>
                <div>{e.text.replace(/^Coach: /, '')}</div>
              </li>
            );
          })}
        </ol>
      </Card>
      <GoBtn to="/app/products" kind="secondary" next>
        {v.t.productsTitle}
      </GoBtn>
    </Screen>
  );
}
