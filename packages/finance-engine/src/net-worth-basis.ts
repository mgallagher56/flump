import { type AccountCategory, categorizeAccountType } from "./account-category.js";
import { isBuyToLetAccountName } from "./picture/selectors/loan-to-value.js";

/**
 * The user's two choices about what net worth counts (owner ruling, net worth choices). Every
 * net worth, total assets, total liabilities and history figure is computed under one of these;
 * there is no basis-free net worth.
 *
 * - `countProperty`: every Property account value and every Mortgage balance count (equity).
 *   Off: neither counts. Never one side alone.
 * - `countStudentLoan`: student loans count as a debt in net worth and total liabilities. They
 *   never enter consumer debt or debt payoff, whatever the choice.
 *
 * Other loans, including ones secured on a home (type "Loan"), always count.
 */
export interface NetWorthBasis {
  countProperty: boolean;
  countStudentLoan: boolean;
}

/** Today's behaviour, so no existing figure changes: property counts, student loans do not (D-5-B). */
export const DEFAULT_NET_WORTH_BASIS: Readonly<NetWorthBasis> = Object.freeze({
  countProperty: true,
  countStudentLoan: false,
});

/** The profile fields the choices are stored in (user_profiles). */
export interface NetWorthBasisProfileFields {
  netWorthCountsProperty?: boolean | null;
  netWorthCountsStudentLoan?: boolean | null;
}

/** The user's basis from their profile. A missing profile or field means the default. */
export function netWorthBasisFromProfile(
  profile: NetWorthBasisProfileFields | null | undefined,
): NetWorthBasis {
  const p = profile ?? {};
  return {
    countProperty:
      typeof p.netWorthCountsProperty === "boolean"
        ? p.netWorthCountsProperty
        : DEFAULT_NET_WORTH_BASIS.countProperty,
    countStudentLoan:
      typeof p.netWorthCountsStudentLoan === "boolean"
        ? p.netWorthCountsStudentLoan
        : DEFAULT_NET_WORTH_BASIS.countStudentLoan,
  };
}

/** Whether an account of this category counts towards net worth under the basis. */
export function countsTowardNetWorth(category: AccountCategory, basis: NetWorthBasis): boolean {
  if (category === "property" || category === "mortgages") return basis.countProperty;
  if (category === "studentLoans") return basis.countStudentLoan;
  return true;
}

/**
 * What a net worth figure leaves out, in the fixed order surfaces list them. Only kinds the user
 * has accounts for appear.
 *
 * - `property`, `mortgage`, `studentLoan`: accounts of that kind exist and the basis leaves them out.
 * - `homeValueMissing`: property counts and a mortgage with a balance has no Property value saved
 *   for it (main home and buy-to-let checked separately, buy-to-let known by name). The mortgage
 *   still counts; surfaces ask for a home value instead of showing a leave-out line.
 */
export type NetWorthLeftOut = "property" | "mortgage" | "studentLoan" | "homeValueMissing";

export const NET_WORTH_LEFT_OUT_ORDER: readonly NetWorthLeftOut[] = [
  "property",
  "mortgage",
  "studentLoan",
  "homeValueMissing",
];

/** An account as any caller holds it: a raw row, an API DTO or a fixture. */
export interface NetWorthScopeAccount {
  id?: string | number | null;
  name?: string | null;
  type?: string | null;
  balance?: number | string | null;
}

export interface NetWorthScope {
  basis: NetWorthBasis;
  /** Whether the account counts towards net worth. Unknown ids do not count. */
  counts(accountId: string): boolean;
  leftOut: NetWorthLeftOut[];
}

function positiveAmount(value: number | string | null | undefined): number {
  const n = Math.abs(Number(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Which accounts count under the basis, and what the figure leaves out. Account ids default to
 * `acc_<index>` when missing, matching PortfolioSnapshot.
 */
export function resolveNetWorthScope(
  accounts: readonly NetWorthScopeAccount[],
  basis: NetWorthBasis,
): NetWorthScope {
  const counted = new Set<string>();
  const present = new Set<AccountCategory>();
  const groups = {
    home: { value: 0, mortgage: 0 },
    buyToLet: { value: 0, mortgage: 0 },
  };

  accounts.forEach((acc, index) => {
    const id = String(acc.id ?? `acc_${index}`);
    const category = categorizeAccountType(acc.type ?? "other");
    present.add(category);
    if (countsTowardNetWorth(category, basis)) counted.add(id);
    if (category === "property" || category === "mortgages") {
      const group = isBuyToLetAccountName(acc.name ?? "") ? groups.buyToLet : groups.home;
      if (category === "property") group.value += positiveAmount(acc.balance);
      else group.mortgage += positiveAmount(acc.balance);
    }
  });

  const leftOut: NetWorthLeftOut[] = [];
  if (!basis.countProperty && present.has("property")) leftOut.push("property");
  if (!basis.countProperty && present.has("mortgages")) leftOut.push("mortgage");
  if (!basis.countStudentLoan && present.has("studentLoans")) leftOut.push("studentLoan");
  if (basis.countProperty && Object.values(groups).some((g) => g.mortgage > 0 && g.value <= 0)) {
    leftOut.push("homeValueMissing");
  }

  return {
    basis: { ...basis },
    counts: (accountId: string) => counted.has(accountId),
    leftOut,
  };
}

const LEFT_OUT_WORDS: Record<Exclude<NetWorthLeftOut, "homeValueMissing">, string> = {
  property: "property",
  mortgage: "mortgage",
  studentLoan: "student loan",
};

/**
 * "property, mortgage or student loan": the leave-out items in their fixed order, joined by
 * commas and "or". Empty when nothing is left out.
 */
export function joinNetWorthLeftOut(leftOut: readonly NetWorthLeftOut[]): string {
  const words = leftOut
    .filter((k): k is Exclude<NetWorthLeftOut, "homeValueMissing"> => k !== "homeValueMissing")
    .map((k) => LEFT_OUT_WORDS[k]);
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}
