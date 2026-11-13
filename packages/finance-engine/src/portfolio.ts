import type { DebtItem, DebtType } from "./types.js";

export type RawAccountType =
  | "Current"
  | "Saving"
  | "Mortgage"
  | "Loan"
  | "Credit Card"
  | "Owed"
  | "Investment"
  | "Pension"
  | "Property"
  | "Student Loan"
  | "Overdraft"
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "other"
  | string;

export type AccountCategory =
  | "cash"
  | "savings"
  | "investments"
  | "pensions"
  | "debt"
  | "mortgages"
  | "property"
  | "studentLoans"
  | "other";

export interface RawAccount {
  id?: string;
  name?: string;
  type?: RawAccountType;
  balance?: number | string;
  interestRate?: number | string | null;
  monthlyContribution?: number | string | null;
  termMonths?: number | null;
  fixedRateEndDate?: string | null;
  currency?: string;
  isCurrent?: boolean;
  [key: string]: any;
}

export interface RawAccountDetail {
  id?: number | string;
  accountId?: string;
  account_id?: string;
  month: number;
  year: number;
  value: number | string;
  [key: string]: any;
}

export interface ResolvedAccount {
  id: string;
  name: string;
  rawType: string;
  category: AccountCategory;
  isAsset: boolean;
  isLiability: boolean;
  nominalBalance: number; // Always positive magnitude
  netWorthBalance: number; // Signed (+ for assets, - for liabilities)
  latestBalance: number; // Contextual balance (positive magnitude)
  interestRate: number;
  /** False when the stored interest rate is null or missing (0 is a known rate). */
  interestRateKnown: boolean;
  monthlyContribution: number;
  /** False when no monthly contribution is stored. */
  monthlyContributionKnown: boolean;
  currency: string;
  latestMonth?: number;
  latestYear?: number;
  history: Array<{ year: number; month: number; value: number }>;
}

export interface MonthlyPortfolioHistoryPoint {
  year: number;
  month: number;
  label: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

function hasStoredNumber(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

export function categorizeAccountType(rawType?: string | null): AccountCategory {
  if (!rawType) return "other";
  const t = rawType.trim().toLowerCase();

  if (t === "current" || t === "checking") return "cash";
  if (t === "saving" || t === "savings") return "savings";
  if (t === "investment" || t === "investments" || t === "isa" || t === "gia") return "investments";
  if (t === "pension" || t === "pensions" || t === "sipp") return "pensions";
  if (
    t === "credit card" ||
    t === "credit_card" ||
    t === "loan" ||
    t === "owed" ||
    t === "overdraft"
  ) {
    return "debt";
  }
  if (t === "property") return "property";
  if (t === "student loan" || t === "student_loan") return "studentLoans";
  if (t === "mortgage" || t === "mortgages") return "mortgages";

  return "other";
}

export function isLiabilityCategory(category: AccountCategory): boolean {
  return category === "debt" || category === "mortgages";
}

/**
 * Encapsulates the entire domain logic for portfolio balance resolution,
 * chronological history snapshots, category grouping, and financial engine bridging.
 */
export class PortfolioSnapshot {
  private readonly resolvedAccounts: ResolvedAccount[];
  private readonly accountsById: Map<string, ResolvedAccount>;

  constructor(accounts: RawAccount[] = [], accountDetails: RawAccountDetail[] = []) {
    // 1. Group account details by account ID
    const detailsByAccount = new Map<
      string,
      Array<{ year: number; month: number; value: number }>
    >();

    for (const d of accountDetails) {
      const accId = String(d.accountId || d.account_id || "");
      if (!accId) continue;

      const numVal = Number(d.value) || 0;
      const numMonth = Number(d.month) || 1;
      const numYear = Number(d.year) || 2025;

      const list = detailsByAccount.get(accId) ?? [];
      list.push({ year: numYear, month: numMonth, value: numVal });
      detailsByAccount.set(accId, list);
    }

    // Sort each account's details chronologically ascending
    for (const list of detailsByAccount.values()) {
      list.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
    }

    // 2. Resolve each account
    this.resolvedAccounts = (accounts || []).map((acc, index) => {
      const accId = String(acc.id || `acc_${index}`);
      const rawType = String(acc.type || "other");
      const category = categorizeAccountType(rawType);
      const isLiability = isLiabilityCategory(category);
      // Student loans (D-5-B) are income-contingent: neither an asset nor a liability here.
      const isAsset = !isLiability && category !== "studentLoans";

      const history = detailsByAccount.get(accId) ?? [];
      let latestRawVal: number;
      let latestMonth: number | undefined;
      let latestYear: number | undefined;

      if (history.length > 0) {
        const latest = history[history.length - 1]!;
        latestRawVal = latest.value;
        latestMonth = latest.month;
        latestYear = latest.year;
      } else {
        latestRawVal = Number(acc.balance) || 0;
      }

      const nominalBalance = Math.abs(latestRawVal);
      const netWorthBalance =
        category === "studentLoans" ? 0 : isLiability ? -nominalBalance : nominalBalance;
      const interestRate = Number(acc.interestRate) || 0;
      const interestRateKnown = hasStoredNumber(acc.interestRate);
      const monthlyContribution = Number(acc.monthlyContribution) || 0;
      const monthlyContributionKnown = hasStoredNumber(acc.monthlyContribution);
      const currency = acc.currency || "GBP";

      return {
        id: accId,
        name: acc.name || "Unnamed Account",
        rawType,
        category,
        isAsset,
        isLiability,
        nominalBalance,
        netWorthBalance,
        latestBalance: nominalBalance,
        interestRate,
        interestRateKnown,
        monthlyContribution,
        monthlyContributionKnown,
        currency,
        latestMonth,
        latestYear,
        history,
      };
    });

    this.accountsById = new Map(this.resolvedAccounts.map((a) => [a.id, a]));
  }

  getResolvedAccounts(): ResolvedAccount[] {
    return [...this.resolvedAccounts];
  }

  getAccount(id: string): ResolvedAccount | undefined {
    return this.accountsById.get(id);
  }

  getLatestBalance(id: string): number {
    return this.accountsById.get(id)?.nominalBalance ?? 0;
  }

  getAccountsByCategory(category: AccountCategory): ResolvedAccount[] {
    return this.resolvedAccounts.filter((a) => a.category === category);
  }

  getTotalNetWorth(): number {
    return this.resolvedAccounts.reduce((sum, a) => sum + a.netWorthBalance, 0);
  }

  getTotalAssets(): number {
    return this.resolvedAccounts
      .filter((a) => a.isAsset)
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalLiabilities(): number {
    return this.resolvedAccounts
      .filter((a) => a.isLiability)
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalLiquidCash(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "cash" || a.category === "savings")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalInvestments(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "investments")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalPensions(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "pensions")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalConsumerDebt(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "debt")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  /** Property value counts towards net worth but is not liquid. */
  getTotalProperty(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "property")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  /** Income-contingent student loans: reported separately, never in net worth or debt totals. */
  getTotalStudentLoans(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "studentLoans")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getTotalMortgageBalance(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "mortgages")
      .reduce((sum, a) => sum + a.nominalBalance, 0);
  }

  getWeightedSavingsRate(defaultRate = 5.0): number {
    const savingsAccounts = this.resolvedAccounts.filter(
      (a) => a.category === "savings" || a.category === "investments",
    );
    const totalBalance = savingsAccounts.reduce((sum, a) => sum + a.nominalBalance, 0);
    if (totalBalance <= 0) return defaultRate;

    const weightedSum = savingsAccounts.reduce(
      (sum, a) => sum + (a.nominalBalance / totalBalance) * a.interestRate,
      0,
    );
    return Math.round(weightedSum * 100) / 100;
  }

  /**
   * Translates consumer debt accounts directly into DebtItem[] for consumption by the debt engine.
   */
  toDebtItems(): DebtItem[] {
    return this.resolvedAccounts
      .filter((a) => a.category === "debt")
      .map((a) => {
        const rawLower = a.rawType.toLowerCase();
        let type: DebtType = "loan";
        if (rawLower.includes("card")) {
          type = "credit_card";
        } else if (rawLower.includes("overdraft")) {
          type = "overdraft";
        } else if (rawLower.includes("car")) {
          type = "car_finance";
        }

        // A stored monthly contribution is the minimum payment. Otherwise estimate it with the
        // standard UK rule (greater of £25 or 2.5% of balance) and flag it as estimated.
        const minimumPaymentEstimated = !(a.monthlyContributionKnown && a.monthlyContribution > 0);
        const minimumPayment = minimumPaymentEstimated
          ? Math.max(25, Math.round(a.nominalBalance * 0.025))
          : a.monthlyContribution;
        // Never invent an APR: an unset rate is 0 with aprKnown false (0% is a known rate).
        const apr = a.interestRateKnown ? a.interestRate : 0;

        return {
          id: a.id,
          name: a.name,
          balance: a.nominalBalance,
          balanceGbp: a.nominalBalance,
          apr,
          interestRateApr: apr,
          aprKnown: a.interestRateKnown,
          minimumPayment,
          minimumPaymentGbp: minimumPayment,
          minimumPaymentEstimated,
          type,
        };
      });
  }

  /**
   * Generates a timeline of portfolio history across recent months.
   */
  getMonthlyHistory(monthsCount = 12): MonthlyPortfolioHistoryPoint[] {
    const monthMap = new Map<
      string,
      { year: number; month: number; assets: number; liabilities: number }
    >();

    for (const acc of this.resolvedAccounts) {
      if (acc.category === "studentLoans") continue;
      for (const h of acc.history) {
        const key = `${h.year}-${String(h.month).padStart(2, "0")}`;
        const existing = monthMap.get(key) ?? {
          year: h.year,
          month: h.month,
          assets: 0,
          liabilities: 0,
        };

        const val = Math.abs(h.value);
        if (acc.isLiability) {
          existing.liabilities += val;
        } else {
          existing.assets += val;
        }
        monthMap.set(key, existing);
      }
    }

    const sortedKeys = Array.from(monthMap.keys()).sort();
    const recentKeys = sortedKeys.slice(-monthsCount);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return recentKeys.map((key) => {
      const data = monthMap.get(key)!;
      const label = `${monthNames[(data.month - 1) % 12]} ${data.year}`;
      return {
        year: data.year,
        month: data.month,
        label,
        netWorth: data.assets - data.liabilities,
        totalAssets: data.assets,
        totalLiabilities: data.liabilities,
      };
    });
  }
}
