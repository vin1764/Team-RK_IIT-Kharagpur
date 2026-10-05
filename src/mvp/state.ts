/**
 * Maker-app state, one record per demo account, saved in localStorage under a versioned key.
 * Every read and write is wrapped in try/catch and falls back to memory (private windows,
 * blocked storage). "Reset account" clears the record.
 */
import { create } from 'zustand';
import { C } from '../data/constants';
import type { PersonaId } from '../data/personas';

export const STATE_VERSION = 1;
const KEY = (id: PersonaId) => `meesho-mvp:v${STATE_VERSION}:account:${id}`;
const CURRENT_KEY = `meesho-mvp:v${STATE_VERSION}:current`;

export type SellerType = 'manufacturer' | 'wholesaler' | 'reseller';
export type Fulfilment = 'self' | 'packPoint';

export interface AccountState {
  v: number;
  day: number;
  onboarding: {
    entrySeen: boolean;
    costChecked: boolean;
    makingCost?: number;
    sellerType?: SellerType;
    signedUp: boolean;
    listed: Record<string, boolean>;
    margins: Record<string, number>;
    lots: Record<string, number>;
    fulfilment: Record<string, Fulfilment>;
    /** Day the maker committed the launch slot (null = not yet). */
    committedDay: number | null;
    stockReady: boolean;
  };
  /** Nudge id → recorded action (clears the nudge). */
  actions: Record<string, { day: number; action: string }>;
  read: Record<string, true>;
  /** `${sku}:${orderDay}` → packed / handed over. */
  packed: Record<string, true>;
  handed: Record<string, true>;
  notReady: Record<string, true>;
}

export function freshState(): AccountState {
  return {
    v: STATE_VERSION,
    day: C.TIMELINE_DAYS.value.min,
    onboarding: {
      entrySeen: false,
      costChecked: false,
      signedUp: false,
      listed: {},
      margins: {},
      lots: {},
      fulfilment: {},
      committedDay: null,
      stockReady: false,
    },
    actions: {},
    read: {},
    packed: {},
    handed: {},
    notReady: {},
  };
}

const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    /* storage blocked: use memory */
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string | null) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: memory only */
  }
}

export function loadState(id: PersonaId): AccountState {
  const raw = read(KEY(id));
  if (!raw) return freshState();
  try {
    const parsed = JSON.parse(raw) as AccountState;
    return parsed.v === STATE_VERSION ? { ...freshState(), ...parsed, onboarding: { ...freshState().onboarding, ...parsed.onboarding } } : freshState();
  } catch {
    return freshState();
  }
}

function saveState(id: PersonaId, s: AccountState) {
  write(KEY(id), JSON.stringify(s));
}

function loadCurrent(): PersonaId | null {
  const v = read(CURRENT_KEY);
  return v === 'hiren' || v === 'ayesha' || v === 'sunita' ? v : null;
}

interface MvpStore {
  current: PersonaId | null;
  states: Record<PersonaId, AccountState>;
  /** Log in as a demo account (or log out with null). */
  setCurrent: (id: PersonaId | null) => void;
  get: (id: PersonaId) => AccountState;
  update: (id: PersonaId, fn: (s: AccountState) => AccountState) => void;
  setDay: (id: PersonaId, day: number) => void;
  reset: (id: PersonaId) => void;
}

export const useMvp = create<MvpStore>((set, get) => ({
  current: loadCurrent(),
  states: { hiren: loadState('hiren'), ayesha: loadState('ayesha'), sunita: loadState('sunita') },
  setCurrent: (id) => {
    write(CURRENT_KEY, id);
    set({ current: id });
  },
  get: (id) => get().states[id],

  update: (id, fn) => {
    const next = fn(get().get(id));
    saveState(id, next);
    set((st) => ({ states: { ...st.states, [id]: next } }));
  },
  setDay: (id, day) => {
    const { min, max } = C.TIMELINE_DAYS.value;
    get().update(id, (s) => ({ ...s, day: Math.max(min, Math.min(max, day)) }));
  },
  reset: (id) => {
    write(KEY(id), null);
    const fresh = freshState();
    set((st) => ({ states: { ...st.states, [id]: fresh } }));
  },
}));

/** An account's state (re-renders on change). */
export function useAccountState(id: PersonaId): AccountState {
  return useMvp((st) => st.states[id]);
}
