import {
  type AccountCategory,
  categorizeAccountType,
  isLiabilityCategory,
} from "./account-category.js";
import { type AccountOwnership, type AccountShareInput, applyAccountShare } from "./joint-share.js";
import { countsTowardNetWorth, type NetWorthBasis } from "./net-worth-basis.js";
import type { DebtItem, DebtType } from "./types.js";

export {
  type AccountCategory,
  categorizeAccountType,
  isLiabilityCategory,
} from "./account-category.js";

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

export interface RawAccount {
  id?: string;
  name?: string;
  type?: RawAccountType;
  accountSubtype?: string | null;
  /** Mortgage accounts: the Property account it is on (system audit slice 4), or null. */
  linkedAccountId?: string | null;
  balance?: number | string;
  interestRate?: number | string | null;
  monthlyContribution?: number | string | null;
  creditLimit?: number | string | null;
  promoZeroPercentUntil?: string | null;
  termMonths?: number | null;
  fixedRateEndDate?: string | null;
  currency?: string;
  isCurrent?: boolean;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
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
  /**
   * Signed contribution to net worth under DEFAULT_NET_WORTH_BASIS: real sign for assets, -owed
   * for liabilities, 0 for student loans. Totals use the user's basis instead.
   */
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

/**
 * Encapsulates the entire domain logic for portfolio balance resolution,
 * chronological history snapshots, category grouping, and financial engine bridging.
 */
export class PortfolioSnapshot {
  private readonly resolvedAccounts: ResolvedAccount[];
  private readonly accountsById: Map<string, ResolvedAccount>;
  private readonly rawById: Map<string, RawAccount>;

  constructor(accounts: RawAccount[] = [], accountDetails: RawAccountDetail[] = []) {
    const shareInputByAccount = new Map<string, AccountShareInput>();
    this.rawById = new Map();
    (accounts || []).forEach((acc, index) => {
      const accId = String(acc.id || `acc_${index}`);
      this.rawById.set(accId, acc);
      shareInputByAccount.set(accId, {
        name: acc.name,
        type: acc.type,
        accountSubtype: acc.accountSubtype,
        ownership: acc.ownership,
        sharePercent: acc.sharePercent,
      });
    });

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
      const rawVal = Number(rawValue);
      if (!isValidHistoryYear(numYear) || !isValidHistoryMonth(numMonth)) continue;
      if (!Number.isFinite(rawVal)) continue;
      const numVal = applyAccountShare(rawVal, shareInputByAccount.get(accId));

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
      const shareInput = shareInputByAccount.get(accId);
      const rawBalance = Number(acc.balance);
      const currentValue = Number.isFinite(rawBalance)
        ? applyAccountShare(rawBalance, shareInput)
        : 0;

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
      const rawMonthlyContribution = Number(acc.monthlyContribution) || 0;
      const monthlyContributionKnown = hasStoredNumber(acc.monthlyContribution);
      const monthlyContribution = monthlyContributionKnown
        ? applyAccountShare(rawMonthlyContribution, shareInput)
        : 0;
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

  /** The subtype the user chose for an account (`btl_mortgage`, `cash_isa`, ...), or null. */
  getAccountSubtype(id: string): string | null {
    const subtype = this.rawById.get(id)?.accountSubtype;
    return typeof subtype === "string" && subtype !== "" ? subtype : null;
  }

  /** The Property account a mortgage is linked to, or null when it has none. */
  getLinkedAccountId(id: string): string | null {
    const linked = this.rawById.get(id)?.linkedAccountId;
    return typeof linked === "string" && linked !== "" ? linked : null;
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

  /**
   * Signed contribution of each account under the basis: real sign for assets, minus the amount
   * owed for liabilities and (when counted) student loans, 0 for accounts the basis leaves out.
   */
  netWorthBalanceOf(a: ResolvedAccount, basis: NetWorthBasis): number {
    if (!countsTowardNetWorth(a.category, basis)) return 0;
    if (a.category === "studentLoans") return -a.nominalBalance;
    return a.isLiability ? -a.nominalBalance : a.nominalBalance;
  }

  getTotalNetWorth(basis: NetWorthBasis): number {
    return this.resolvedAccounts.reduce((sum, a) => sum + this.netWorthBalanceOf(a, basis), 0);
  }

  /** Positive asset balances only; an overdrawn account counts under liabilities instead. */
  getTotalAssets(basis: NetWorthBasis): number {
    return this.resolvedAccounts
      .filter((a) => a.isAsset && countsTowardNetWorth(a.category, basis))
      .reduce((sum, a) => sum + Math.max(0, a.nominalBalance), 0);
  }

  /**
   * Amounts owed (student loans when the basis counts them) plus any overdrawn asset balances,
   * so assets minus liabilities is net worth.
   */
  getTotalLiabilities(basis: NetWorthBasis): number {
    return this.resolvedAccounts.reduce((sum, a) => {
      if (!countsTowardNetWorth(a.category, basis)) return sum;
      if (a.isLiability || a.category === "studentLoans") return sum + a.nominalBalance;
      return sum + a.overdrawnAmount;
    }, 0);
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

  /** Income-contingent student loans: reported separately, never in debt totals; net worth per the basis. */
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
        const raw = this.rawById.get(a.id);
        const creditLimit =
          raw && hasStoredNumber(raw.creditLimit) && Number(raw.creditLimit) >= 0
            ? Number(raw.creditLimit)
            : undefined;
        const promoAprExpiryDate =
          raw && typeof raw.promoZeroPercentUntil === "string" && raw.promoZeroPercentUntil !== ""
            ? raw.promoZeroPercentUntil
            : undefined;

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
          ...(creditLimit !== undefined ? { creditLimitGbp: creditLimit } : {}),
          ...(promoAprExpiryDate !== undefined ? { promoAprExpiryDate } : {}),
        };
      });
  }
}
