import { formatMoney } from "@repo/ui";

/**
 * Round a long-range estimate to three significant figures (E16 P8: precision implies certainty).
 * £205,628 becomes £206,000, £41,512 becomes £41,500 and £13,852 becomes £13,900. Values under
 * £1,000 keep whole pounds. One rule for every long projection (pension and savings).
 */
export const roundEstimate = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.abs(value);
  if (magnitude < 1000) return Math.round(value);
  const step = 10 ** (Math.floor(Math.log10(magnitude)) - 2);
  const rounded = Math.round(value / step) * step;
  return rounded === 0 ? 0 : rounded;
};

/** "About £206,000": a rounded estimate in en-GB pounds. */
export const formatEstimate = (value: number): string =>
  `About ${formatMoney(roundEstimate(value), { fractionDigits: 0 }).text}`;
