import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C, type ConstantKey } from '../data/constants';
import { FORMULA_INFO, type FormulaId } from '../engine/formulas';
import { useApp } from '../app/store';
import { valueText } from '../lib/format';
import { SourceBadge } from './SourceBadge';

export interface NumInput {
  label: string;
  value: string;
  /** If the input is a constant, its source and status are shown. */
  c?: ConstantKey;
}

/**
 * A displayed number. In Verify mode it gets a dotted underline; clicking opens a popover
 * with the formula, its inputs, the source and the status.
 * Pass `c` for a constant, or `f` (+ `inputs`) for a computed value.
 */
export function Num({ children, c, f, inputs = [] }: { children: ReactNode; c?: ConstantKey; f?: FormulaId; inputs?: NumInput[] }) {
  const verify = useApp((s) => s.verify);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!verify) setOpen(false);
  }, [verify]);

  if (!verify) return <span data-testid="num">{children}</span>;

  const constant = c ? C[c] : undefined;
  const formula = f ? FORMULA_INFO[f] : undefined;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        data-testid="num"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="cursor-help underline decoration-magenta decoration-dotted decoration-2 underline-offset-4"
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="dialog"
            data-testid="formula-popover"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 block w-80 rounded-xl border border-line bg-white p-3 text-left text-xs font-normal text-ink shadow-xl"
          >
            <span className="block font-semibold text-plum">{formula?.label ?? constant?.label}</span>
            {formula && <span className="mt-1 block rounded bg-blush px-2 py-1 font-mono text-[11px] text-ink">{formula.expression}</span>}
            {inputs.length > 0 && (
              <span className="mt-2 block">
                {inputs.map((i) => (
                  <span key={i.label} className="flex items-center justify-between gap-2 border-b border-line/60 py-0.5 last:border-0">
                    <span className="text-grey">{i.label}</span>
                    <span className="flex items-center gap-1 font-medium">
                      {i.value}
                      {i.c && <SourceBadge status={C[i.c].status} />}
                    </span>
                  </span>
                ))}
              </span>
            )}
            {constant && (
              <>
                <span className="mt-2 block">
                  Value: <strong>{valueText(constant.value)}</strong> {constant.unit}
                </span>
                <span className="mt-1 block text-grey">Source: {constant.source}</span>
                <span className="mt-1 block">
                  <SourceBadge status={constant.status} />
                </span>
                {constant.note && <span className="mt-1 block italic text-grey">{constant.note}</span>}
              </>
            )}
            {!constant && formula && <span className="mt-2 block text-grey">Computed in formulas.ts</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
