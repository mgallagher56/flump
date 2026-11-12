/**
 * Round to 2 decimal places. The API contract (E21) rejects money and percentages with more than
 * 2 decimals, so values typed or derived in the browser are rounded before they are sent.
 */
export const roundTo2dp = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
