import type { NetWorthBasis } from "../net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "../portfolio.js";
import type { UserProfileData } from "../profile.js";
import type { TaxRecord } from "../tax-calculator.js";
import type { UkTaxYear } from "../types.js";
import { resolveUkTaxYear } from "../uk-tax-year.js";
import {
  type BudgetRowLike,
  buildFinancialPicture,
  type FinancialPicture,
  financialPictureInputFromRows,
} from "./build.js";
import type { FinancialPictureInput, ProfileFacts } from "./input.js";

/**
 * Every kind of saved row the picture is built from, for ONE user. Each method is required, so a
 * new caller cannot leave a table out (PP-6). Implementations must be scoped to one user: the
 * caller never hands rows in, the source reads them.
 *
 * `B` lets a source keep extra columns on its budget rows (the backend keeps `notes` for the
 * context pack); the picture reads only the `BudgetRowLike` fields.
 */
export interface PictureRowSource<B extends BudgetRowLike = BudgetRowLike> {
  profile(): Promise<Partial<UserProfileData> | null>;
  /** Current account rows, with the columns the picture needs. */
  accounts(): Promise<RawAccount[]>;
  /**
   * The monthly `account_details` rows. The current picture reads only `account.balance` for
   * every figure (PortfolioSnapshot: "the current figure is always account.balance"); the
   * snapshot keeps the rows as each account's history, which no picture selector reads today.
   * So the picture would be the same with only the latest row per account, or none. The read is
   * kept as it was (every row for the user) and not widened; narrowing it is a later change for
   * the callers that also list history.
   */
  accountDetails(): Promise<RawAccountDetail[]>;
  budgetEntries(): Promise<B[]>;
  taxRecords(): Promise<TaxRecord[]>;
}

/** What a source returned, for callers that also list rows. */
export interface LoadedPictureRows<B extends BudgetRowLike = BudgetRowLike> {
  profile: Partial<UserProfileData> | null;
  accounts: RawAccount[];
  accountDetails: RawAccountDetail[];
  budgetEntries: B[];
  taxRecords: TaxRecord[];
}

export interface LoadedFinancialPicture<B extends BudgetRowLike = BudgetRowLike> {
  rows: LoadedPictureRows<B>;
  input: FinancialPictureInput;
  snapshot: PortfolioSnapshot;
  picture: FinancialPicture;
  asOf: Date;
  /** The UK tax year whose rates apply at `asOf`, from the engine's resolver. */
  taxYear: UkTaxYear;
}

/**
 * The one server-side assembler (owner decision 10, option B). Reads every kind of row from the
 * source at once, maps them with the one row mapper and builds the picture for `asOf`. Errors
 * from the source propagate: a partial picture is never built.
 */
export async function loadFinancialPicture<B extends BudgetRowLike = BudgetRowLike>(
  source: PictureRowSource<B>,
  opts: { asOf: Date },
): Promise<LoadedFinancialPicture<B>> {
  const [profile, accounts, accountDetails, budgetEntries, taxRecords] = await Promise.all([
    source.profile(),
    source.accounts(),
    source.accountDetails(),
    source.budgetEntries(),
    source.taxRecords(),
  ]);
  const rows: LoadedPictureRows<B> = {
    profile: profile ?? null,
    accounts: accounts ?? [],
    accountDetails: accountDetails ?? [],
    budgetEntries: budgetEntries ?? [],
    taxRecords: taxRecords ?? [],
  };
  const asOf = opts.asOf;
  const taxYear = resolveUkTaxYear(undefined, asOf);
  const input = financialPictureInputFromRows(rows);
  const snapshot = new PortfolioSnapshot(input.accounts, input.details);
  const picture = buildFinancialPicture(input, { asOf, taxYear, snapshot });
  return { rows, input, snapshot, picture, asOf, taxYear };
}

/**
 * A stored-profile shape that maps back to exactly these facts and basis through
 * `profileFactsFromProfile` and `netWorthBasisFromProfile`. For in-memory sources (tests, the
 * local MCP server) that hold facts rather than a stored profile row. `pensionMethod` has no
 * profile column, so it does not survive the round trip.
 */
export function profileFromFacts(
  facts: ProfileFacts | null | undefined,
  basis?: NetWorthBasis | null,
): Partial<UserProfileData> {
  const profile: Partial<UserProfileData> = {};
  if (basis) {
    profile.netWorthCountsProperty = basis.countProperty;
    profile.netWorthCountsStudentLoan = basis.countStudentLoan;
  }
  if (!facts) return profile;
  if (facts.annualSalary !== null) profile.annualSalary = facts.annualSalary;
  if (facts.employmentType !== null) profile.employmentType = facts.employmentType;
  if (facts.taxRegion !== null) profile.taxRegion = facts.taxRegion;
  if (facts.studentLoanPlans !== null) profile.studentLoanPlans = [...facts.studentLoanPlans];
  if (facts.pensionPercent !== null) profile.pensionPercent = facts.pensionPercent;
  if (facts.isSalarySacrifice !== null) profile.isSalarySacrifice = facts.isSalarySacrifice;
  if (facts.housingStatus != null) profile.housingStatus = facts.housingStatus;
  if (facts.monthlyHousingCost != null) profile.monthlyHousingCost = facts.monthlyHousingCost;
  if (facts.mortgageType != null) profile.mortgageType = facts.mortgageType;
  if (facts.propertyOwnershipShare != null) {
    profile.propertyOwnershipShare = facts.propertyOwnershipShare;
  }
  return profile;
}
