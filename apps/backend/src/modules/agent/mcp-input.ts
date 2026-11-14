import type { McpInputResponse } from "@flump/api-contract";
import { anonymiseContextPackInput, type BuildContextPackInput } from "@flump/finance-engine";
import type { VerifiedToken } from "@flump/mcp";

type WireInput = McpInputResponse["input"];

const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : num(value);
/** An optional figure: left out when absent or not a finite number (JSON would send null). */
const optionalNum = (value: number | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);
/** JSON drops undefined; the strict contract schema does not, so optional keys are left out. */
const defined = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

/**
 * The engine input as `GET /mcp/input` sends it. Every field is named here: a column added to an
 * entity, or a key added to an engine type, reaches a token only when it is added to this mapper
 * and to the contract schema. An anonymised token gets the input after
 * `anonymiseContextPackInput`, so no account, entry or record name, no note and no user id leave
 * the backend for it, the same rule the remote MCP tools apply to their answers.
 */
export function toMcpInputWire(raw: BuildContextPackInput, anonymise: boolean): WireInput {
  const input = anonymise ? anonymiseContextPackInput(raw) : raw;
  const b = input.baseline;
  // A history row is sent only for an account in this same input (defence in depth: a row
  // mislabelled with this user's id but pointing at someone else's account never leaves).
  const owned = new Set((input.accounts ?? []).map((a) => String(a.id ?? "")));
  const facts = input.profileFacts;
  return {
    baseline: defined({
      userId: b.userId,
      age: optionalNum(b.age),
      taxYear: b.taxYear,
      ukRegion: b.ukRegion,
      ukRegionAssumed: b.ukRegionAssumed,
      employmentStatus: b.employmentStatus,
      annualGrossSalary: num(b.annualGrossSalary),
      monthlyTakeHomeOverride: optionalNum(b.monthlyTakeHomeOverride),
      annualBonusOrSideIncome: num(b.annualBonusOrSideIncome),
      housingStatus: b.housingStatus,
      monthlyHousingCost: optionalNum(b.monthlyHousingCost),
      propertyValue: optionalNum(b.propertyValue),
      mortgageBalance: optionalNum(b.mortgageBalance),
      monthlyOtherOutgoings: optionalNum(b.monthlyOtherOutgoings),
      totalCashSavings: optionalNum(b.totalCashSavings),
      totalPensionPot: optionalNum(b.totalPensionPot),
      totalUnsecuredDebt: optionalNum(b.totalUnsecuredDebt),
      pensionContributionPct: num(b.pensionContributionPct),
      employerPensionMatchPct: num(b.employerPensionMatchPct),
      isSalarySacrifice: b.isSalarySacrifice,
      studentLoanPlan: b.studentLoanPlan,
      propertyOwnershipSharePct: num(b.propertyOwnershipSharePct),
      financialStage: b.financialStage,
      enabledModules: [...b.enabledModules],
    }),
    profileFacts: {
      annualSalary: facts?.annualSalary ?? null,
      employmentType: facts?.employmentType ?? null,
      taxRegion: facts?.taxRegion ?? null,
      studentLoanPlans: facts?.studentLoanPlans ?? null,
      pensionPercent: facts?.pensionPercent ?? null,
      isSalarySacrifice: facts?.isSalarySacrifice ?? null,
      housingStatus: facts?.housingStatus ?? null,
      monthlyHousingCost: facts?.monthlyHousingCost ?? null,
      mortgageType: facts?.mortgageType ?? null,
      propertyOwnershipShare: facts?.propertyOwnershipShare ?? null,
    },
    netWorthBasis: {
      countProperty: input.netWorthBasis.countProperty,
      countStudentLoan: input.netWorthBasis.countStudentLoan,
    },
    accounts: (input.accounts ?? []).map((a) => ({
      id: String(a.id ?? ""),
      name: String(a.name ?? ""),
      type: String(a.type ?? ""),
      balance: num(a.balance),
      interestRate: numOrNull(a.interestRate),
      monthlyContribution: numOrNull(a.monthlyContribution),
      termMonths: numOrNull(a.termMonths),
      fixedRateEndDate: textOrNull(a.fixedRateEndDate),
      currency: String(a.currency ?? "GBP"),
      isCurrent: a.isCurrent !== false,
    })),
    accountDetails: (input.accountDetails ?? [])
      .map((d) => ({
        accountId: String(d.accountId ?? d.account_id ?? ""),
        year: num(d.year),
        month: num(d.month),
        value: num(d.value),
        source: typeof d.source === "string" ? d.source : "manual",
      }))
      .filter((d) => owned.has(d.accountId)),
    budgetEntries: (input.budgetEntries ?? []).map((e) => ({
      id: e.id,
      category: e.category,
      name: e.name,
      amount: num(e.amount),
      frequency: e.frequency,
      isIncome: e.isIncome,
      isEssential: e.isEssential,
      // Present only for a token that may read names; the anonymised input has none.
      ...(e.notes === undefined ? {} : { notes: e.notes }),
    })),
    taxRecords: (input.taxRecords ?? []).map((t) => ({
      id: t.id,
      // `type` and `frequency` are plain text columns checked only on write. A stored value
      // outside the list is read the way the tax tools read it, so one old row cannot fail the
      // whole response.
      type: t.type === "income" ? ("income" as const) : ("expense" as const),
      source: t.source,
      category: t.category,
      name: t.name,
      amount: num(t.amount),
      frequency:
        t.frequency === "monthly" || t.frequency === "annual" ? t.frequency : ("one-off" as const),
      date: t.date,
      endDate: t.endDate ?? null,
      notes: t.notes ?? null,
    })),
  };
}

/** What the token may do, as the local MCP server needs it. Never the owner's user id. */
export function toMcpInputToken(token: VerifiedToken): McpInputResponse["token"] {
  return {
    id: token.tokenId ?? null,
    scopes: [...token.scopes],
    anonymizeInstitutions: token.anonymizeInstitutions,
  };
}
