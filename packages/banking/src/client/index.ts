import { isAssetCategory, isLiabilityCategory } from "../core/sign-enforcement.js";
import type {
  ConsentStatus,
  FlumpAccountCategory,
  FlumpBudgetBucket,
  NormalizedAccount,
} from "../core/types.js";

export * from "../core/sign-enforcement.js";
export * from "../core/types.js";

/**
 * Checks whether an Open Banking consent is expiring soon (< 7 days until 90-day UK FCA renewal limit).
 */
export function getConsentStatus(
  consentExpiresAt: string | undefined,
  referenceDate = new Date(),
): ConsentStatus {
  if (!consentExpiresAt) return "MANUAL";

  const expiry = new Date(consentExpiresAt);
  const diffMs = expiry.getTime() - referenceDate.getTime();
  const daysRemaining = diffMs / (1000 * 60 * 60 * 24);

  if (daysRemaining <= 0) {
    return "REAUTH_REQUIRED";
  }
  if (daysRemaining <= 7) {
    return "EXPIRING_SOON";
  }
  return "ACTIVE";
}

/**
 * Client display metadata for Flump account categories.
 */
export function getAccountCategoryMetadata(category: FlumpAccountCategory): {
  label: string;
  group: "CASH" | "SAVINGS_ISA" | "INVESTMENTS_PENSIONS" | "CREDIT_DEBT" | "MORTGAGES";
  isAsset: boolean;
} {
  switch (category) {
    case "CURRENT":
      return { label: "Current Account", group: "CASH", isAsset: true };
    case "SAVINGS":
      return { label: "High-Yield Savings", group: "SAVINGS_ISA", isAsset: true };
    case "CASH_ISA":
      return { label: "Cash ISA (Tax-Free)", group: "SAVINGS_ISA", isAsset: true };
    case "STOCKS_ISA":
      return { label: "Stocks & Shares ISA", group: "SAVINGS_ISA", isAsset: true };
    case "GENERAL_INVESTMENT":
      return { label: "General Investment Account", group: "INVESTMENTS_PENSIONS", isAsset: true };
    case "PENSION_WORKPLACE":
      return { label: "Workplace Pension", group: "INVESTMENTS_PENSIONS", isAsset: true };
    case "PENSION_SIPP":
      return {
        label: "Self-Invested Personal Pension (SIPP)",
        group: "INVESTMENTS_PENSIONS",
        isAsset: true,
      };
    case "CREDIT_CARD":
      return { label: "Credit Card", group: "CREDIT_DEBT", isAsset: false };
    case "OVERDRAFT":
      return { label: "Arranged Overdraft", group: "CREDIT_DEBT", isAsset: false };
    case "LOAN_PERSONAL":
      return { label: "Personal Loan", group: "CREDIT_DEBT", isAsset: false };
    case "CAR_FINANCE_PCP_HP":
      return { label: "Car Finance (PCP/HP)", group: "CREDIT_DEBT", isAsset: false };
    case "MORTGAGE_RESIDENTIAL":
      return { label: "Residential Mortgage", group: "MORTGAGES", isAsset: false };
    case "MORTGAGE_BTL":
      return { label: "Buy-to-Let Mortgage", group: "MORTGAGES", isAsset: false };
  }
}

/**
 * Client display metadata for Flump budget buckets.
 */
export function getBudgetBucketMetadata(bucket: FlumpBudgetBucket): {
  label: string;
  isPriority: boolean;
  color: string;
} {
  switch (bucket) {
    case "PRIORITY_HOUSING_COUNCIL_ENERGY":
      return {
        label: "Priority Bills (Housing, Council Tax, Energy)",
        isPriority: true,
        color: "#dc2626", // Red
      };
    case "ESSENTIAL_BILLS_GROCERIES":
      return {
        label: "Essential Groceries & Living",
        isPriority: false,
        color: "#ea580c", // Orange
      };
    case "DEBT_MINIMUM_REPAYMENT":
      return {
        label: "Debt Minimum Payments",
        isPriority: false,
        color: "#d97706", // Amber
      };
    case "DEBT_OVERPAYMENT":
      return {
        label: "Debt Overpayment Acceleration",
        isPriority: false,
        color: "#0284c7", // Sky
      };
    case "DISCRETIONARY_WANTS":
      return {
        label: "Discretionary / Flexible Wants",
        isPriority: false,
        color: "#6b7280", // Gray
      };
    case "SAVINGS_INVESTMENTS_TRANSFER":
      return {
        label: "Savings & Investments Transfer",
        isPriority: false,
        color: "#16a34a", // Emerald
      };
    case "INCOME":
      return {
        label: "Income & Inflows",
        isPriority: false,
        color: "#10b981", // Green
      };
  }
}

/**
 * Calculates aggregate Net Worth from normalized accounts.
 */
export function calculateNetWorth(accounts: NormalizedAccount[]): {
  totalNetWorthGbp: number;
  totalAssetsGbp: number;
  totalLiabilitiesGbp: number;
  liquidCashGbp: number;
  weightedAverageSavingsYieldApr: number;
} {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidCash = 0;
  let weightedYieldSum = 0;
  let yieldingCashSum = 0;

  for (const acc of accounts) {
    if (isAssetCategory(acc.category)) {
      totalAssets += acc.netWorthImpactGbp;
      if (acc.category === "CURRENT" || acc.category === "SAVINGS" || acc.category === "CASH_ISA") {
        liquidCash += acc.netWorthImpactGbp;
        if (acc.interestRateApr && acc.interestRateApr > 0) {
          weightedYieldSum += acc.netWorthImpactGbp * acc.interestRateApr;
          yieldingCashSum += acc.netWorthImpactGbp;
        }
      }
    } else if (isLiabilityCategory(acc.category)) {
      totalLiabilities += acc.principalOwedGbp;
    }
  }

  const netWorth = totalAssets - totalLiabilities;
  const weightedYield =
    yieldingCashSum > 0 ? Math.round((weightedYieldSum / yieldingCashSum) * 100) / 100 : 0;

  return {
    totalNetWorthGbp: Math.round(netWorth * 100) / 100,
    totalAssetsGbp: Math.round(totalAssets * 100) / 100,
    totalLiabilitiesGbp: Math.round(totalLiabilities * 100) / 100,
    liquidCashGbp: Math.round(liquidCash * 100) / 100,
    weightedAverageSavingsYieldApr: weightedYield,
  };
}
