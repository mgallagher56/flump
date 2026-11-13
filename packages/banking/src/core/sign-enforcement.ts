import type { FlumpAccountCategory, NormalizedAccount } from "./types.js";

export const ASSET_CATEGORIES: ReadonlySet<FlumpAccountCategory> = new Set<FlumpAccountCategory>([
  "CURRENT",
  "SAVINGS",
  "CASH_ISA",
  "STOCKS_ISA",
  "GENERAL_INVESTMENT",
  "PENSION_WORKPLACE",
  "PENSION_SIPP",
]);

export const LIABILITY_CATEGORIES: ReadonlySet<FlumpAccountCategory> =
  new Set<FlumpAccountCategory>([
    "CREDIT_CARD",
    "OVERDRAFT",
    "LOAN_PERSONAL",
    "CAR_FINANCE_PCP_HP",
    "MORTGAGE_RESIDENTIAL",
    "MORTGAGE_BTL",
  ]);

export function isAssetCategory(category: FlumpAccountCategory): boolean {
  return ASSET_CATEGORIES.has(category);
}

export function isLiabilityCategory(category: FlumpAccountCategory): boolean {
  return LIABILITY_CATEGORIES.has(category);
}

/**
 * Enforces the Flump SIGN CONVENTION LAW on an account:
 * - Assets (Current, Savings, ISA, Pension) keep their real sign for Net Worth (an overdrawn
 *   current account is negative), principalOwedGbp is 0.
 * - Liabilities (Credit Card, Overdraft, Loan, Mortgage) are NEGATIVE for Net Worth,
 *   while principalOwedGbp is POSITIVE for payoff engines.
 */
export function enforceSignConvention(account: NormalizedAccount): NormalizedAccount {
  const isAsset = isAssetCategory(account.category);

  if (isAsset) {
    return {
      ...account,
      principalOwedGbp: 0,
    };
  }

  // Liability
  const owed = Math.max(
    account.principalOwedGbp > 0 ? account.principalOwedGbp : Math.abs(account.netWorthImpactGbp),
    0,
  );

  return {
    ...account,
    netWorthImpactGbp: -owed,
    principalOwedGbp: owed,
  };
}

/**
 * Validates whether an account strictly adheres to the SIGN CONVENTION LAW.
 */
export function validateSignConvention(account: NormalizedAccount): boolean {
  if (isAssetCategory(account.category)) {
    return account.principalOwedGbp === 0;
  }
  if (isLiabilityCategory(account.category)) {
    return (
      account.netWorthImpactGbp <= 0 &&
      account.principalOwedGbp >= 0 &&
      Math.abs(account.netWorthImpactGbp + account.principalOwedGbp) < 0.001
    );
  }
  return true;
}
