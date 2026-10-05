import type { ReactNode } from 'react';
import type { ConstantKey } from '../data/constants';
import type { FormulaId } from '../engine/formulas';

/** A displayed number. (The formula/source props are kept as documentation of where it comes from.) */
export function Num({ children }: { children: ReactNode; c?: ConstantKey; f?: FormulaId; inputs?: unknown[] }) {
  return <span data-testid="num">{children}</span>;
}
