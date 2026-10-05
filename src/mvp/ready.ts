/**
 * Maker-app features built so far. An unfinished screen's entry points stay hidden
 * (no dead links); each MVP phase adds to this set.
 */
export const READY_APP = new Set<string>(['today', 'more', 'setup']);
export const ready = (k: string) => READY_APP.has(k);
