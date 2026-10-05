import { create } from 'zustand';

export type Lang = 'en' | 'hi';

interface AppState {
  lang: Lang;
  toggleLang: () => void;
  /** Judge tour: null when not touring; otherwise the current step. */
  tourStep: number | null;
  setTourStep: (n: number | null) => void;
}

export const useApp = create<AppState>((set) => ({
  lang: 'en',
  toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'hi' : 'en' })),
  tourStep: null,
  setTourStep: (n) => set({ tourStep: n }),
}));
