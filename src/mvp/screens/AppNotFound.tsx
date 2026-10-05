import { GoBtn, Screen, useV } from '../ui';

export default function AppNotFound() {
  const v = useV();
  return (
    <div data-testid="not-found">
      <Screen title="This screen doesn’t exist">
        <p className="text-sm text-grey">The link may be from an older version of the app.</p>
        <GoBtn to="/app/today" next>
          {v.t.backToToday}
        </GoBtn>
      </Screen>
    </div>
  );
}
