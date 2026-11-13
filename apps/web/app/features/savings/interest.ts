/** Interest earned over the next 12 months, compounding monthly with a regular monthly saving. */
export function calculateOneYearCompoundInterest(
  balance: number,
  rate: number,
  monthly: number,
): number {
  if (rate <= 0) return 0;
  const monthlyRate = rate / 100 / 12;
  let b = balance;
  for (let m = 0; m < 12; m++) {
    b = b * (1 + monthlyRate) + monthly;
  }
  return Math.max(0, b - balance - monthly * 12);
}
