import { ISA_ACCOUNT_SUBTYPES } from "../../joint-share.js";
import { getUkTaxYearRules, resolveUkTaxYear } from "../../uk-tax-year.js";

/** The account fields the ISA estimate reads. */
export interface IsaAllowanceAccount {
  name?: string | null;
  accountSubtype?: string | null;
  monthlyContribution?: number | string | null;
}

/**
 * True when the account counts towards the ADULT ISA allowance: its subtype is an ISA, or, with
 * no subtype, its name says it is one ("Cash ISA", "Stocks and Shares ISA", "Lifetime ISA",
 * "LISA"). Junior ISAs ("Junior ISA", "JISA") have their own allowance and are left out.
 *
 * Not the same rule as `isIsaAccount` in joint-share.ts (which also counts Junior ISAs, for the
 * joint-ownership rule); this one is the Savings page's allowance rule, moved here unchanged.
 */
export function isAdultIsaAccount(
  nameOrAccount: string | IsaAllowanceAccount | null | undefined,
): boolean {
  if (nameOrAccount && typeof nameOrAccount === "object") {
    if (nameOrAccount.accountSubtype) return ISA_ACCOUNT_SUBTYPES.has(nameOrAccount.accountSubtype);
    return isAdultIsaAccount(nameOrAccount.name);
  }
  const text = typeof nameOrAccount === "string" ? nameOrAccount : "";
  if (/\bjunior\s+isa\b|\bjisa\b/i.test(text)) return false;
  return /\b(?:l?isa)\b/i.test(text);
}

/**
 * Months of the current tax year (from 6 April) that have started, counting the current one:
 * 1 on 6 April, 12 on 5 April.
 *
 * Reads the date with local-time getters, as the Savings page always has. On a server running in
 * UTC this can be a day out from the London date around midnight; kept as it is for now.
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

/** The adult ISA allowance for the tax year containing `asOf`, from the engine's tax year rules. */
export function isaAllowanceFor(asOf: Date = new Date()): number {
  return getUkTaxYearRules(resolveUkTaxYear(undefined, asOf)).isaAllowance;
}

/**
 * ISA allowance used this tax year, estimated from the monthly amount saved into adult ISA
 * accounts times the months of the tax year that have started, capped at the allowance (SD-3).
 * Null when no adult ISA stores a monthly amount above 0: nothing is assumed. Lump sums and
 * transfers are not stored, so they are not counted.
 */
export function estimateIsaUsed(
  accounts: ReadonlyArray<IsaAllowanceAccount>,
  today: Date = new Date(),
): number | null {
  const monthly = accounts
    .filter((acc) => isAdultIsaAccount(acc))
    .reduce((sum, acc) => sum + (Number(acc.monthlyContribution) || 0), 0);
  if (!(monthly > 0)) return null;
  return Math.min(isaAllowanceFor(today), Math.round(monthly * monthsIntoTaxYear(today)));
}

/** The picture's ISA allowance used: the same estimate the Savings page shows. */
export function selectIsaAllowanceUsed(
  accounts: ReadonlyArray<IsaAllowanceAccount>,
  asOf: Date = new Date(),
): number | null {
  return estimateIsaUsed(accounts, asOf);
}
