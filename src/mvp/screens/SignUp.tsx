import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { eligibleForLaunch, useOnboard } from '../onboard';
import { launchSkus } from '../stage';
import type { SellerType } from '../state';
import { Caption, Card, GoBtn, H2, Screen, SimTag, useV } from '../ui';

/** Sign-up: seller type, then an automatic GST and Udyam check. */
export default function SignUp() {
  const v = useV();
  const onboard = useOnboard(v);
  const o = v.state.onboarding;
  const [type, setType] = useState<SellerType | undefined>(o.sellerType);
  const first = launchSkus(v)[0]!;
  const ok = type === 'manufacturer';
  const types: { id: SellerType; label: string }[] = [
    { id: 'manufacturer', label: v.t.manufacturer },
    { id: 'wholesaler', label: v.t.wholesaler },
    { id: 'reseller', label: v.t.reseller },
  ];
  const save = () => onboard(() => ({ sellerType: type, signedUp: true }));
  return (
    <Screen title={v.t.signUp} back={{ to: '/app/check', label: v.t.back }} sub={v.persona.business}>
      <Card>
        <H2>{v.t.sellerType}</H2>
        <div className="mt-2 space-y-2" role="radiogroup">
          {types.map((t) => (
            <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${type === t.id ? 'border-magenta bg-blush' : 'border-line'}`}>
              <input type="radio" name="seller-type" checked={type === t.id} onChange={() => setType(t.id)} className="accent-magenta" data-testid={`type-${t.id}`} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </Card>
      {type && (
        <Card>
          <div className="flex items-center justify-between">
            <H2>{v.t.recordsCheck}</H2>
            <SimTag />
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-good" aria-hidden /> GSTIN active, business name matches
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-good" aria-hidden /> Udyam: registered as a manufacturer ({v.persona.category})
            </li>
            <li className="flex items-center gap-2" data-testid="records-result">
              {ok ? <CheckCircle2 size={16} className="text-good" aria-hidden /> : <XCircle size={16} className="text-bad" aria-hidden />}
              {ok ? `${v.t.passed}: what you told us matches your records` : `Mismatch: you chose “${types.find((t) => t.id === type)!.label}” but Udyam says manufacturer`}
            </li>
          </ul>
          {!ok && (
            <p className="mt-2 rounded-lg bg-orange-soft p-2 text-sm">
              <b>{v.t.notEligible}.</b> Launch Week is for factories selling their own goods. If you make it yourself, change your answer above.
            </p>
          )}
        </Card>
      )}
      {type && ok ? (
        <GoBtn to={`/app/list/${first.id}/product`} next onClick={save}>
          {v.t.continueBtn}: {v.t.listingBot}
        </GoBtn>
      ) : (
        <>
          <Caption>Choose what you do to run the check.</Caption>
          <GoBtn to="/app/today" next kind="secondary">
            {v.t.backToToday}
          </GoBtn>
        </>
      )}
      {o.signedUp && !eligibleForLaunch(o) && <Caption>Saved earlier: not eligible for Launch Week.</Caption>}
    </Screen>
  );
}
