/** The adult ISA allowance for a tax year. */
export const ISA_ALLOWANCE = 20_000;

/**
 * An account counts towards the adult allowance when its name says it is an ISA ("Cash ISA",
 * "Stocks and Shares ISA", "Lifetime ISA", "LISA"). Junior ISAs ("Junior ISA", "JISA") have their
 * own allowance and are left out.
 */
export const isIsaAccount = (name: string | null | undefined): boolean => {
  const text = name ?? "";
  if (/\bjunior\s+isa\b|\bjisa\b/i.test(text)) return false;
  return /\b(?:l?isa)\b/i.test(text);
};

/**
 * Months of the current tax year (from 6 April) that have started, counting the current one:
 * 1 on 6 April, 12 on 5 April.
 */
export function monthsIntoTaxYear(today: Date): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const afterStart = month > 3 || (month === 3 && day >= 6);
  const startYear = afterStart ? year : year - 1;
  const months = (year - startYear) * 12 + (month - 3) + (day >= 6 ? 1 : 0);
  return Math.min(12, Math.max(1, months));
}

/**
 * ISA allowance used this tax year, worked out from the monthly amount saved into ISA accounts.
 * Null when no ISA account stores a monthly amount above 0: nothing is assumed.
 */
export function estimateIsaUsed(
  accounts: ReadonlyArray<{ name?: string | null; monthlyContribution?: number | string | null }>,
  today: Date = new Date(),
): number | null {
  const monthly = accounts
    .filter((acc) => isIsaAccount(acc.name))
    .reduce((sum, acc) => sum + (Number(acc.monthlyContribution) || 0), 0);
  if (!(monthly > 0)) return null;
  return Math.min(ISA_ALLOWANCE, Math.round(monthly * monthsIntoTaxYear(today)));
}
