import { useMemo } from 'react';
import { runSim } from '../app/useSim';
import { useApp } from '../app/store';
import { personaById, type PersonaId, type PersonaSpec } from '../data/personas';
import { en, type MakerStrings } from '../i18n/en';
import { hi } from '../i18n/hi';
import { nudgeTimeline, nudgesFor, type Nudge, type NudgeAccount } from '../engine/nudges';
import type { SimResult, DayState } from '../engine/simulate';
import { useMvp, useAccountState, type AccountState } from './state';

export interface AccountView {
  id: PersonaId;
  persona: PersonaSpec;
  run: SimResult;
  account: NudgeAccount;
  state: AccountState;
  day: number;
  ds: DayState;
  active: Nudge[];
  timeline: Nudge[];
  t: MakerStrings;
  lang: 'en' | 'hi';
}

/** Everything a maker-app screen needs for one account at its current demo day. */
export function useAccountView(id: PersonaId): AccountView {
  const state = useAccountState(id);
  const lang = useApp((s) => s.lang);
  return useMemo(() => {
    const persona = personaById(id)!;
    const run = runSim({ personaId: id });
    const account: NudgeAccount = { id, persona: run.persona, run };
    const day = state.day;
    const ds = run.days.find((d) => d.day === day) ?? run.days[0]!;
    return {
      id,
      persona,
      run,
      account,
      state,
      day,
      ds,
      active: nudgesFor(account, day, state),
      timeline: nudgeTimeline(account, state, day),
      t: lang === 'hi' ? hi : en,
      lang,
    };
  }, [id, state, lang]);
}

/** The logged-in account, if any. */
export function useCurrentId(): PersonaId | null {
  return useMvp((s) => s.current);
}
