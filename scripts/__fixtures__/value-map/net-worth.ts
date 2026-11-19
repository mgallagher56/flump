// Fixture engine selector for scripts/check-value-map.test.ts. Read as text, never imported.
export function selectNetWorth(balances: number[]): number {
  return balances.reduce((sum, b) => sum + b, 0);
}
