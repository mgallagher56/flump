import {
  calculatedMortgageInterest,
  calculatedSavingsInterest,
  isIsaAccount,
  isRecordActiveInTaxYear,
  type MonthlyBalance,
  type RentalShares,
  rentalSharesFromAccounts,
  resolveAccountSharePercent,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";

/**
 * The account fields the Self Assessment pages read: which accounts a record can be linked to,
 * the share of each rental property (owner decision 6) and the "Calculated" interest figures
 * (owner decision 5). Loader accounts carry their monthly history in `details`.
 */
export interface TaxAccount {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  accountSubtype?: string | null;
  ownership?: string | null;
  sharePercent?: number | string | null;
  linkedAccountId?: string | null;
  interestRate?: number | string | null;
  balance?: number | string | null;
  details?: readonly MonthlyBalance[] | null;
}

type WithId = TaxAccount & { id: string };

const hasId = (a: TaxAccount): a is WithId => typeof a.id === "string" && a.id !== "";

const isRentalProperty = (a: TaxAccount) => a.type === "Property" && a.accountSubtype === "rental";

/**
 * The accounts a record from this source can be linked to: rent and its costs to a rental
 * Property or a Mortgage, savings income to a Saving or Investment account. Self-employed and
 * PAYE records are never linked.
 */
export function linkableAccountsFor(source: TaxSource, accounts: readonly TaxAccount[]): WithId[] {
  const withIds = accounts.filter(hasId);
  if (source === "rental") {
    return withIds.filter((a) => isRentalProperty(a) || a.type === "Mortgage");
  }
  if (source === "savings") {
    return withIds.filter((a) => a.type === "Saving" || a.type === "Investment");
  }
  return [];
}

/** True when the account is one a record from this source can be linked to. */
export function linkFits(
  source: TaxSource,
  accountId: string | null | undefined,
  accounts: readonly TaxAccount[],
): boolean {
  if (!accountId) return false;
  return linkableAccountsFor(source, accounts).some((a) => a.id === accountId);
}

/**
 * A buy-to-let mortgage, by the engine's rule for the rental share (`rentalSharesFromAccounts`):
 * the `btl_mortgage` subtype, or a Mortgage linked to a rental Property.
 */
function isBtlMortgage(account: TaxAccount, rentalIds: ReadonlySet<string>): boolean {
  if (account.type !== "Mortgage") return false;
  if (account.accountSubtype === "btl_mortgage") return true;
  return !!account.linkedAccountId && rentalIds.has(account.linkedAccountId);
}

export interface CalculatedInterestOffer {
  kind: "mortgage_interest" | "savings_interest";
  accountId: string;
  accountName: string;
  ratePct: number;
  /** Pounds, to the penny. Mortgage: the whole loan's interest. Savings: the person's share. */
  amount: number;
  /** The person's share of the account, 0 to 100. */
  sharePercent: number;
}

const hasLinkedRecord = (
  records: readonly TaxRecord[],
  accountId: string,
  category: string,
  taxYear: string,
) =>
  records.some(
    (r) =>
      r.accountId === accountId && r.category === category && isRecordActiveInTaxYear(r, taxYear),
  );

/**
 * The "Calculated" figures to offer for the tax year (owner decision 5): interest on each
 * buy-to-let mortgage, and taxable interest on each savings account that is not an ISA, worked
 * out by the engine from the account's monthly balances and rate. An account already given a
 * record of that kind linked to it in the year, or whose figure cannot be worked out, is left out.
 */
export function calculatedInterestOffers({
  accounts,
  records,
  taxYear,
}: {
  accounts: readonly TaxAccount[];
  records: readonly TaxRecord[];
  taxYear: string;
}): CalculatedInterestOffer[] {
  const withIds = accounts.filter(hasId);
  const rentalIds = new Set(withIds.filter(isRentalProperty).map((a) => a.id));
  const offers: CalculatedInterestOffer[] = [];

  for (const account of withIds) {
    const balances = account.details ?? [];
    const ratePct = Number(account.interestRate);
    if (isBtlMortgage(account, rentalIds)) {
      if (hasLinkedRecord(records, account.id, "mortgage_interest", taxYear)) continue;
      const figure = calculatedMortgageInterest({
        taxYear,
        ratePct: account.interestRate,
        balances,
      });
      if (figure && figure.amount > 0) {
        offers.push({
          kind: "mortgage_interest",
          accountId: account.id,
          accountName: account.name?.trim() || "Buy-to-let mortgage",
          ratePct,
          amount: figure.amount,
          sharePercent: 100,
        });
      }
    } else if (account.type === "Saving" && !isIsaAccount(account)) {
      if (hasLinkedRecord(records, account.id, "savings_interest", taxYear)) continue;
      const sharePercent = resolveAccountSharePercent(account);
      const figure = calculatedSavingsInterest({
        taxYear,
        aerPct: account.interestRate,
        balances,
        sharePercent,
      });
      if (figure && figure.amount > 0) {
        offers.push({
          kind: "savings_interest",
          accountId: account.id,
          accountName: account.name?.trim() || "Savings account",
          ratePct,
          amount: figure.amount,
          sharePercent,
        });
      }
    }
  }
  return offers;
}

const rentalRecordsInYear = (records: readonly TaxRecord[], taxYear: string) =>
  records.filter((r) => r.source === "rental" && isRecordActiveInTaxYear(r, taxYear));

/** True for a rental record whose link names an account the shares know. */
const isLinked = (record: TaxRecord, shares: RentalShares) =>
  !!record.accountId && shares.byAccountId[record.accountId] !== undefined;

/**
 * Why unlinked rental records are counted in full, when they are: no rental property saved
 * (`no-rental-property`), or rental properties with different shares (`shares-differ`). null when
 * every rental record in the year is linked, or the one share of the rental properties applies.
 */
export function rentalShareNotice(
  accounts: readonly TaxAccount[],
  records: readonly TaxRecord[],
  taxYear: string,
): "no-rental-property" | "shares-differ" | null {
  const shares = rentalSharesFromAccounts(accounts);
  const unlinked = rentalRecordsInYear(records, taxYear).some((r) => !isLinked(r, shares));
  if (!unlinked) return null;
  const { basis } = shares.unlinked;
  return basis === "only-rental" ? null : basis;
}

export interface RentalShareLine {
  accountId: string;
  name: string;
  sharePercent: number;
}

/**
 * The share each rental property or buy-to-let mortgage gives the year's rental records, read
 * from Accounts: each account a record is linked to, and the rental properties whose one share
 * the unlinked records use.
 */
export function rentalShareLines(
  accounts: readonly TaxAccount[],
  records: readonly TaxRecord[],
  taxYear: string,
): RentalShareLine[] {
  const shares = rentalSharesFromAccounts(accounts);
  const inYear = rentalRecordsInYear(records, taxYear);
  const used = new Set(inYear.filter((r) => isLinked(r, shares)).map((r) => r.accountId as string));
  if (shares.unlinked.basis === "only-rental" && inYear.some((r) => !isLinked(r, shares))) {
    for (const a of accounts.filter(hasId).filter(isRentalProperty)) used.add(a.id);
  }
  return accounts
    .filter(hasId)
    .filter((a) => used.has(a.id))
    .map((a) => ({
      accountId: a.id,
      name: a.name?.trim() || "Rental property",
      sharePercent: shares.byAccountId[a.id] as number,
    }));
}

/**
 * The one share every rental record in the year uses, or null when they use different shares
 * (or there are none). The source page's allowance comparison names it.
 */
export function uniformRentalShare(
  accounts: readonly TaxAccount[],
  records: readonly TaxRecord[],
  taxYear: string,
): number | null {
  const shares = rentalSharesFromAccounts(accounts);
  const used = new Set(
    rentalRecordsInYear(records, taxYear).map((r) =>
      isLinked(r, shares)
        ? (shares.byAccountId[r.accountId as string] as number)
        : shares.unlinked.share,
    ),
  );
  return used.size === 1 ? ([...used][0] as number) : null;
}
