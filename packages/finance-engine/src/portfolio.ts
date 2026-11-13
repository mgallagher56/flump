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
  /**
   * Display balance for the current figure (`account.balance`): the real sign for assets (an
   * overdrawn current account is negative) and the positive amount owed for liabilities.
   */
  nominalBalance: number;
  /** Signed contribution to net worth: real sign for assets, -owed for liabilities, 0 for student loans. */
  netWorthBalance: number;
  latestBalance: number; // Same as nominalBalance
  /** Portion of a negative asset balance (overdrawn current account), as a positive amount. */
  overdrawnAmount: number;
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

const MONTH_NAMES = [
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

function isValidHistoryYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1900 && year <= 2200;
}

function isValidHistoryMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
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
  if (t === "credit card" || t === "credit_card" || t === "loan" || t === "overdraft") {
    return "debt";
  }
  // "Owed" is money someone owes the user (an IOU): an asset, not cash in hand and never a debt
  // to pay off. Web and mobile have always treated it so; the engine had it as debt (E23).
  if (t === "owed") return "other";
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
    // At most one row per (account, year, month): a later row replaces an earlier one, so
    // duplicates are never double counted. Rows without a valid year, month or value are skipped.
    const rowsByAccount = new Map<
      string,
      Map<number, { year: number; month: number; value: number }>
    >();

    for (const d of accountDetails) {
      const accId = String(d.accountId || d.account_id || "");
      if (!accId) continue;

      const rawMonth = d.month as unknown;
      const rawYear = d.year as unknown;
      const rawValue = d.value as unknown;
      if (
        rawMonth === null ||
        rawMonth === undefined ||
        rawMonth === "" ||
        rawYear === null ||
        rawYear === undefined ||
        rawYear === "" ||
        rawValue === null ||
        rawValue === undefined ||
        rawValue === ""
      ) {
        continue;
      }
      const numMonth = Number(rawMonth);
      const numYear = Number(rawYear);
      const numVal = Number(rawValue);
      if (!isValidHistoryYear(numYear) || !isValidHistoryMonth(numMonth)) continue;
      if (!Number.isFinite(numVal)) continue;

      const rows =
        rowsByAccount.get(accId) ??
        new Map<number, { year: number; month: number; value: number }>();
      rows.set(numYear * 12 + (numMonth - 1), { year: numYear, month: numMonth, value: numVal });
      rowsByAccount.set(accId, rows);
    }

    // Each account's details, chronologically ascending
    const detailsByAccount = new Map<
      string,
      Array<{ year: number; month: number; value: number }>
    >();
    for (const [accId, rows] of rowsByAccount) {
      detailsByAccount.set(
        accId,
        [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row),
      );
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
      let latestMonth: number | undefined;
      let latestYear: number | undefined;

      // The current figure is always `account.balance` ("now"). History rows only describe past
      // months, so a PATCHed balance must win even when history exists (D22).
      const rawBalance = Number(acc.balance);
      const currentValue = Number.isFinite(rawBalance) ? rawBalance : 0;

      if (history.length > 0) {
        const latest = history[history.length - 1]!;
        latestMonth = latest.month;
        latestYear = latest.year;
      }

      // Assets keep their real sign (C-15); liabilities are normalised by type.
      const nominalBalance = isAsset ? currentValue : Math.abs(currentValue);
      const netWorthBalance =
        category === "studentLoans" ? 0 : isLiability ? -nominalBalance : nominalBalance;
      const overdrawnAmount = isAsset && currentValue < 0 ? -currentValue : 0;
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
        overdrawnAmount,
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

  /** Positive asset balances only; an overdrawn account counts under liabilities instead. */
  getTotalAssets(): number {
    return this.resolvedAccounts
      .filter((a) => a.isAsset)
      .reduce((sum, a) => sum + Math.max(0, a.nominalBalance), 0);
  }

  /** Amounts owed plus any overdrawn asset balances, so assets minus liabilities is net worth. */
  getTotalLiabilities(): number {
    return this.resolvedAccounts.reduce(
      (sum, a) => sum + (a.isLiability ? a.nominalBalance : a.overdrawnAmount),
      0,
    );
  }

  /** Positive liquid balances only: an overdrawn current account is counted as debt, not netted here. */
  getTotalLiquidCash(): number {
    return this.resolvedAccounts
      .filter((a) => a.category === "cash" || a.category === "savings")
      .reduce((sum, a) => sum + Math.max(0, a.nominalBalance), 0);
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

  /** Consumer debt plus the overdrawn portion of current accounts. */
  getTotalConsumerDebt(): number {
    return this.resolvedAccounts.reduce(
      (sum, a) =>
        sum +
        (a.category === "debt" ? a.nominalBalance : a.category === "cash" ? a.overdrawnAmount : 0),
      0,
    );
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
   *
   * Overdrawn cash accounts are deliberately NOT emitted: a DebtItem carries the real account id,
   * and the Debt page edits and deletes by that id, so it would delete the current account.
   * Their overdrawn amount is in getTotalConsumerDebt()/getTotalLiabilities(). Follow-up: an
   * overdraft line on the Debt page needs a read-only derived item (no account id actions).
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
   *
   * Every month between the first and last recorded month is present. Each account carries its
   * last known value forward (C-16) and contributes nothing before its first row. Assets keep
   * their real sign: a negative asset value counts as a liability so assets minus liabilities
   * is the signed sum. Student loans are excluded.
   */
  getMonthlyHistory(monthsCount = 12): MonthlyPortfolioHistoryPoint[] {
    const tracked = this.resolvedAccounts.filter(
      (a) => a.category !== "studentLoans" && a.history.length > 0,
    );
    if (tracked.length === 0) return [];

    let first = Number.POSITIVE_INFINITY;
    let last = Number.NEGATIVE_INFINITY;
    for (const acc of tracked) {
      for (const h of acc.history) {
        const idx = h.year * 12 + (h.month - 1);
        if (idx < first) first = idx;
        if (idx > last) last = idx;
      }
    }

    const start = Math.max(first, last - Math.max(0, Math.floor(monthsCount)) + 1);
    const pointers = new Map<string, number>(); // accountId -> index of last row at or before idx
    const lastKnown = new Map<string, number>();
    const points: MonthlyPortfolioHistoryPoint[] = [];

    for (let idx = first; idx <= last; idx++) {
      let assets = 0;
      let liabilities = 0;
      for (const acc of tracked) {
        let p = pointers.get(acc.id) ?? 0;
        while (p < acc.history.length) {
          const row = acc.history[p]!;
          if (row.year * 12 + (row.month - 1) > idx) break;
          lastKnown.set(acc.id, row.value);
          p++;
        }
        pointers.set(acc.id, p);

        const value = lastKnown.get(acc.id);
        if (value === undefined) continue;
        if (acc.isLiability) {
          liabilities += Math.abs(value);
        } else if (value >= 0) {
          assets += value;
        } else {
          liabilities += -value;
        }
      }

      if (idx < start) continue;
      const year = Math.floor(idx / 12);
      const month = (idx % 12) + 1;
      points.push({
        year,
        month,
        label: `${MONTH_NAMES[month - 1]} ${year}`,
        netWorth: assets - liabilities,
        totalAssets: assets,
        totalLiabilities: liabilities,
      });
    }

    return points;
  }
}
