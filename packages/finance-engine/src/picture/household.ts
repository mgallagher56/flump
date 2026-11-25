import { categorizeAccountType, isLiabilityCategory } from "../account-category.js";
import { resolveAccountOwnership, resolveAccountSharePercent } from "../joint-share.js";
import { DEFAULT_NET_WORTH_BASIS, type NetWorthBasis } from "../net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount } from "../portfolio.js";
import type { UkTaxYear } from "../types.js";
import { type Figure, figureKnown, figureUnknown } from "./figure.js";
import type { MissingKey, ProfileFacts } from "./input.js";
import {
  type DebtTotals,
  type NetWorthTotals,
  selectDebtTotals,
  selectNetWorth,
} from "./selectors/portfolio-totals.js";
import { selectTakeHome } from "./selectors/take-home.js";

/**
 * E34 C2: a household picture from two person pictures. Engine only: no route, screen or tool
 * reads it yet (DECISIONS, 25 November 2026: no household is built before the charity review and
 * a household DPIA).
 *
 * Rules this function keeps (E34 plan sections 2, 3 and 7):
 * - Tax is worked out per person with the existing engine (`selectTakeHome` on each person's own
 *   profile, region included) and the results are added. Income is never pooled for tax. UK
 *   income tax is charged on each person separately (independent taxation, Finance Act 1988,
 *   HMRC Capital Gains Manual CG22100, https://www.gov.uk/hmrc-internal-manuals/capital-gains-manual/cg22100,
 *   read 25 November 2026).
 * - A joint account counts once. The caller says which of one person's accounts is the same
 *   item as which of the other's (`jointAccounts`); the engine never guesses a match by name.
 * - The result holds totals only. No figure in it says which person holds, counts or pays in
 *   what (G3, and "a shared total never shows who paid in what"): swapping the two people gives
 *   the same result.
 * - The caller passes only rows each person chose to share (G2). This function reads nothing else.
 */

/** The saved rows one person shares into the household picture. */
export interface HouseholdMemberRows {
  profile: ProfileFacts;
  accounts: readonly RawAccount[];
}

/** One joint item as each person saved it: an account id from each person's own rows. */
export interface JointAccountLink {
  a: string;
  b: string;
}

export interface HouseholdPictureInput {
  a: HouseholdMemberRows;
  b: HouseholdMemberRows;
  jointAccounts?: readonly JointAccountLink[];
  /** The household's own net worth choices (plan section 5), not either person's. */
  netWorthBasis?: NetWorthBasis;
}

/** Take-home pay of the two people added together. Each person's tax is their own. */
export interface HouseholdTakeHome {
  monthly: number;
  annual: number;
  /** Income tax of both, added; null when either take-home was typed rather than worked out. */
  incomeTax: number | null;
  /** National Insurance of both, added; null on the same terms. */
  nationalInsurance: number | null;
}

/**
 * How the joint links were used. Counts only: none names a person or an item.
 * - `countedOnce`: linked items whose whole figures agree, counted once in full.
 * - `sharesNotSummingTo100`: of those, items whose two shares do not add up to 100%. The whole is
 *   still counted once; the shares only split it for each person's own view.
 * - `wholesDiffer`: linked items whose saved whole figures (balance, monthly amount or rate)
 *   differ. Each person's share of their own figure is counted, as in their own picture, since
 *   picking either figure would be a guess.
 * - `notLinked`: joint accounts with no link. Counted at the share their owner gave.
 * - `ignoredLinks`: links that name a missing account, an account used by another link, an
 *   account that is not joint (ISAs and pensions never are), or two accounts of different kinds.
 */
export interface HouseholdJointItems {
  countedOnce: number;
  sharesNotSummingTo100: number;
  wholesDiffer: number;
  notLinked: number;
  ignoredLinks: number;
}

export interface HouseholdPicture {
  netWorth: NetWorthTotals;
  debt: DebtTotals;
  takeHome: Figure<HouseholdTakeHome>;
  jointItems: HouseholdJointItems;
}

export interface BuildHouseholdPictureOptions {
  taxYear?: UkTaxYear;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A stored number, or null when missing or unreadable (so two missing values agree). */
function storedNumber(value: unknown): number | null {
  // Number(null) and Number("") are 0, so both are caught first; undefined becomes NaN below.
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function categoryOf(account: RawAccount) {
  return categorizeAccountType(String(account.type || "other"));
}

/**
 * The whole figures two copies of one joint item must agree on to count once: the balance (a
 * liability may be stored either sign, an asset keeps its sign), the monthly amount and the rate.
 * Two copies are of the same kind (checked by the caller), so one liability test covers both.
 */
function wholesAgree(x: RawAccount, y: RawAccount): boolean {
  const unsigned = isLiabilityCategory(categoryOf(x));
  const balance = (acc: RawAccount) => {
    const n = storedNumber(acc.balance);
    return n === null ? null : round2(unsigned ? Math.abs(n) : n);
  };
  const balanceAgrees = balance(x) === balance(y);
  return (
    balanceAgrees &&
    storedNumber(x.monthlyContribution) === storedNumber(y.monthlyContribution) &&
    storedNumber(x.interestRate) === storedNumber(y.interestRate)
  );
}

/** Ids are prefixed per person so two people's rows never collide. */
function prefixed(account: RawAccount, index: number, prefix: string): RawAccount {
  const id = `${prefix}${String(account.id || `acc_${index}`)}`;
  const linked =
    typeof account.linkedAccountId === "string" && account.linkedAccountId !== ""
      ? `${prefix}${account.linkedAccountId}`
      : account.linkedAccountId;
  return { ...account, id, linkedAccountId: linked };
}

/** A saved account that counts as joint (a missing one, an ISA or a pension never does). */
function isJoint(account: RawAccount | undefined): account is RawAccount {
  return resolveAccountOwnership(account) === "joint";
}

function ownId(account: RawAccount, index: number): string {
  return String(account.id || `acc_${index}`);
}

/** The household's account rows, each joint item once where the links allow, and the counts. */
export function combineHouseholdAccounts(
  a: readonly RawAccount[],
  b: readonly RawAccount[],
  links: readonly JointAccountLink[] = [],
): { accounts: RawAccount[]; jointItems: HouseholdJointItems } {
  const aById = new Map(a.map((acc, i) => [ownId(acc, i), acc]));
  const bById = new Map(b.map((acc, i) => [ownId(acc, i), acc]));
  const usedA = new Set<string>();
  const usedB = new Set<string>();
  /** A's row to count in full, by A id; B's copy is then dropped. */
  const wholeInA = new Map<string, RawAccount>();
  const droppedB = new Set<string>();
  const jointItems: HouseholdJointItems = {
    countedOnce: 0,
    sharesNotSummingTo100: 0,
    wholesDiffer: 0,
    notLinked: 0,
    ignoredLinks: 0,
  };

  for (const link of links) {
    const x = aById.get(link.a);
    const y = bById.get(link.b);
    if (
      !isJoint(x) ||
      !isJoint(y) ||
      usedA.has(link.a) ||
      usedB.has(link.b) ||
      categoryOf(x) !== categoryOf(y)
    ) {
      jointItems.ignoredLinks += 1;
      continue;
    }
    usedA.add(link.a);
    usedB.add(link.b);
    if (!wholesAgree(x, y)) {
      jointItems.wholesDiffer += 1;
      continue;
    }
    jointItems.countedOnce += 1;
    // Each share as the person's own picture counts it (C1: 50% when none is saved).
    if (resolveAccountSharePercent(x) + resolveAccountSharePercent(y) !== 100)
      jointItems.sharesNotSummingTo100 += 1;
    // Counted at 100%: the whole, once.
    wholeInA.set(link.a, { ...x, sharePercent: 100 });
    droppedB.add(link.b);
  }

  for (const [id, acc] of aById) {
    if (!usedA.has(id) && isJoint(acc)) jointItems.notLinked += 1;
  }
  for (const [id, acc] of bById) {
    if (!usedB.has(id) && isJoint(acc)) jointItems.notLinked += 1;
  }

  const accounts = [
    ...a.map((acc, i) => prefixed(wholeInA.get(ownId(acc, i)) ?? acc, i, "a:")),
    ...b.flatMap((acc, i) => (droppedB.has(ownId(acc, i)) ? [] : [prefixed(acc, i, "b:")])),
  ];
  return { accounts, jointItems };
}

/**
 * Each person's take-home from their own profile, added. Unknown when either is unknown, naming
 * the missing facts without saying whose they are.
 */
export function selectHouseholdTakeHome(
  a: ProfileFacts,
  b: ProfileFacts,
  opts: BuildHouseholdPictureOptions = {},
): Figure<HouseholdTakeHome> {
  const x = selectTakeHome(a, { taxYear: opts.taxYear });
  const y = selectTakeHome(b, { taxYear: opts.taxYear });
  if (x.status !== "known" || y.status !== "known") {
    const unknowns = [x, y].filter((f) => f.status === "unknown");
    const missing = [...new Set(unknowns.flatMap((f) => f.missing))] as MissingKey[];
    const first = unknowns[0];
    return figureUnknown<HouseholdTakeHome>(missing, first?.reason, first?.notice);
  }
  const sumOrNull = (p: number | null, q: number | null) =>
    p === null || q === null ? null : round2(p + q);
  const value: HouseholdTakeHome = {
    monthly: round2(x.value.monthly + y.value.monthly),
    annual: round2(x.value.annual + y.value.annual),
    incomeTax: sumOrNull(x.value.incomeTax, y.value.incomeTax),
    nationalInsurance: sumOrNull(x.value.nationalInsurance, y.value.nationalInsurance),
  };
  // A sum the engine made, so "derived"; an assumption behind either part carries into it.
  const assumptions = [...new Set([...(x.assumptions ?? []), ...(y.assumptions ?? [])])];
  return figureKnown(value, assumptions.length > 0 ? "assumption" : "derived", assumptions);
}

/** The household picture: totals of two people's shared rows, each joint item once. */
export function buildHouseholdPicture(
  input: HouseholdPictureInput,
  opts: BuildHouseholdPictureOptions = {},
): HouseholdPicture {
  const { accounts, jointItems } = combineHouseholdAccounts(
    input.a.accounts,
    input.b.accounts,
    input.jointAccounts,
  );
  const snapshot = new PortfolioSnapshot(accounts);
  return {
    netWorth: selectNetWorth(snapshot, input.netWorthBasis ?? DEFAULT_NET_WORTH_BASIS),
    debt: selectDebtTotals(snapshot),
    takeHome: selectHouseholdTakeHome(input.a.profile, input.b.profile, opts),
    jointItems,
  };
}
