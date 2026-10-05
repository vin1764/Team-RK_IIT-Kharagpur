/** Display formatting only: no business numbers live here. */

export const inr = (n: number, decimals = 0) =>
  `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const num = (n: number, decimals = 0) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const pctText = (n: number, decimals = 0) => `${num(n, decimals)}%`;

export const dayLabel = (d: number) => (d < 0 ? `Day −${Math.abs(d)}` : `Day ${d}`);

/** Render any constant value as text for Verify mode. */
export function valueText(value: unknown): string {
  if (typeof value === 'number') return num(value, Number.isInteger(value) ? 0 : 2);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(valueText).join(' · ');
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if ('min' in o && 'max' in o) return `${valueText(o.min)}–${valueText(o.max)}`;
    return Object.entries(o)
      .map(([k, x]) => `${k}: ${valueText(x)}`)
      .join(' · ');
  }
  return String(value);
}
