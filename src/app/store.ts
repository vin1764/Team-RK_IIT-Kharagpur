import { create } from 'zustand';
import { C } from '../data/constants';

export type Lang = 'en' | 'hi';

interface AppState {
  /** Verify mode: every number gets a dotted underline and opens its formula and source. */
  verify: boolean;
  seed: number;
  lang: Lang;
  toggleVerify: () => void;
  setSeed: (seed: number) => void;
  toggleLang: () => void;
  resetScenario: () => void;
  /** Judge tour: null when not touring; otherwise the current step. */
  tourStep: number | null;
  setTourStep: (n: number | null) => void;
}

export const useApp = create<AppState>((set) => ({
  verify: false,
  seed: C.DEFAULT_SEED.value,
  lang: 'en',
  toggleVerify: () => set((s) => ({ verify: !s.verify })),
  setSeed: (seed) => set({ seed }),
  toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'hi' : 'en' })),
  resetScenario: () => set({ seed: C.DEFAULT_SEED.value }),
  tourStep: null,
  setTourStep: (n) => set({ tourStep: n }),
}));
