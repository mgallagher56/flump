/**
 * The slice 3 contract (owner decision 10, option B): one assembler, two surfaces. It has two
 * halves, and together they say the AI and the web pages cannot drift apart.
 *
 * - This file, web half: for every persona, the web's real `loadWorkspacePicture`, reading the
 *   persona's rows as backend JSON through a stubbed `fetch` and parsing them with the strict
 *   `@flump/api-contract` schemas, builds exactly the picture the engine's `loadFinancialPicture`
 *   builds from an in-memory source over the same rows at the same `asOf`.
 * - packages/mcp/src/__tests__/consistency.test.ts, MCP half: every AI read tool and the context
 *   pack equal that same engine picture.
 *
 * Shared test infrastructure, not a component, so the colocation law does not apply.
 *
 * What the wire cannot carry. A persona row is mapped to contract JSON with `toContract*` below.
 * Two things in a persona have no faithful form on the wire, so `wirePersona` applies them to the
 * persona ONCE and both sides are built from its result (neither side sees the raw persona):
 *  1. Ids. The contract requires UUIDs for account, budget and tax record ids; persona ids are
 *     readable slugs ("heavy-current"). Each slug gets a fixed UUID, and detail rows follow
 *     their account's new id.
 *  2. Profile facts the contract holds NOT NULL. `pensionPercent`, `isSalarySacrifice`,
 *     `mortgageType` and `propertyOwnershipShare` cannot be null in UserProfileResponse, so an
 *     unanswered (null or absent) fact is sent as the backend's column default (5, false,
 *     "repayment", 100), as a real backend would return it. Today this changes newUser's pension
 *     facts, and mortgageType and propertyOwnershipShare for every persona that leaves them out.
 * Everything else the contract requires (owner ids, timestamps, detail ids and sources,
 * `hasReceipt`) is added on the wire only; the picture reads none of it, and the deep equality
 * below would fail if it did.
 */
import {
  type BudgetEntryItem,
  buildFinancialPicture,
  type FinancialPicture,
  isFigureKnown,
  loadFinancialPicture,
  type PictureRowSource,
  type ProfileFacts,
  profileFromFacts,
  type RawAccount,
  type RawAccountDetail,
  type TaxRecord,
} from "@flump/finance-engine";
import { PERSONAS, type PersonaFixture, type PersonaName } from "@flump/finance-engine/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadWorkspacePicture } from "~/services/backend-client.server";
import { jsonResponse } from "~/test/fixtures/contractResponses";

vi.mock("~/utils/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/utils/auth.server")>()),
  getAuthSession: vi.fn().mockResolvedValue({
    user: { id: "user_persona", email: "persona@example.com" },
    accessToken: "test_token_persona",
  }),
}));

const AS_OF = new Date("2026-11-13T12:00:00Z");
const OWNER_ID = "user_persona";
const STAMP = "2026-11-01T09:00:00.000Z";

/** The backend's column defaults for the NOT NULL profile facts (user-profile.entity.ts). */
const PROFILE_COLUMN_DEFAULTS = {
  pensionPercent: 5,
  isSalarySacrifice: false,
  mortgageType: "repayment",
  propertyOwnershipShare: 100,
} as const;

/** A fixed UUID per slug, in first-seen order, valid under `z.uuid()` (version 4, variant 8). */
function uuidMap() {
  const ids = new Map<string, string>();
  return (slug: unknown): string => {
    const key = String(slug);
    let id = ids.get(key);
    if (!id) {
      id = `00000000-0000-4000-8000-${String(ids.size + 1).padStart(12, "0")}`;
      ids.set(key, id);
    }
    return id;
  };
}

/** The persona as the wire can carry it (see the header). Both sides are built from this. */
function wirePersona(p: PersonaFixture): PersonaFixture {
  const uuid = uuidMap();
  const f = p.profile;
  const profile: ProfileFacts = {
    ...f,
    pensionPercent: f.pensionPercent ?? PROFILE_COLUMN_DEFAULTS.pensionPercent,
    isSalarySacrifice: f.isSalarySacrifice ?? PROFILE_COLUMN_DEFAULTS.isSalarySacrifice,
    mortgageType: f.mortgageType ?? PROFILE_COLUMN_DEFAULTS.mortgageType,
    propertyOwnershipShare:
      f.propertyOwnershipShare ?? PROFILE_COLUMN_DEFAULTS.propertyOwnershipShare,
  };
  return {
    ...p,
    profile,
    accounts: p.accounts.map((a) => ({ ...a, id: uuid(`account:${a.id}`) })),
    details: p.details.map((d) => ({ ...d, accountId: uuid(`account:${d.accountId}`) })),
    budget: p.budget.map((b) => ({ ...b, id: uuid(`budget:${b.id}`) })),
    taxRecords: p.taxRecords.map((t) => ({ ...t, id: uuid(`tax:${t.id}`) })),
  };
}

// ---------------------------------------------------------------------------------------------
// Persona rows to contract JSON (AccountListResponse, UserProfileResponse, BudgetEntryListResponse,
// TaxRecordListResponse). Every key is listed because the DTOs are strict objects.
// ---------------------------------------------------------------------------------------------

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function toContractDetail(d: RawAccountDetail, index: number) {
  const month = String(d.month).padStart(2, "0");
  return {
    id: index + 1,
    accountId: String(d.accountId),
    userId: OWNER_ID,
    year: Number(d.year),
    month: Number(d.month),
    value: Number(d.value),
    asOfDate: `${d.year}-${month}-01`,
    source: "manual",
    importBatchId: null,
    updatedAt: STAMP,
  };
}

function toContractAccounts(p: PersonaFixture) {
  const details = p.details.map(toContractDetail);
  return p.accounts.map((a: RawAccount) => ({
    id: String(a.id),
    name: String(a.name),
    type: a.type,
    accountSubtype: a.accountSubtype ?? null,
    balance: Number(a.balance),
    interestRate: num(a.interestRate),
    monthlyContribution: num(a.monthlyContribution),
    creditLimit: num(a.creditLimit),
    promoZeroPercentUntil: a.promoZeroPercentUntil ?? null,
    termMonths: a.termMonths ?? null,
    fixedRateEndDate: a.fixedRateEndDate ?? null,
    isCurrent: a.isCurrent ?? true,
    currency: a.currency ?? "GBP",
    studentLoanPlan: a.studentLoanPlan ?? null,
    ...(a.ownership != null ? { ownership: a.ownership } : {}),
    ...(a.sharePercent != null ? { sharePercent: Number(a.sharePercent) } : {}),
    // System audit slice 4: a mortgage's linked property and repayment type travel with the row.
    linkedAccountId: a.linkedAccountId ?? null,
    repaymentType: (a.repaymentType as "repayment" | "interest-only" | null | undefined) ?? null,
    connectionId: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    details: details.filter((d) => d.accountId === a.id),
  }));
}

function toContractProfile(p: PersonaFixture) {
  const f = p.profile;
  return {
    id: "00000000-0000-4000-8000-0000000000aa",
    userId: OWNER_ID,
    email: null,
    displayName: null,
    firstName: null,
    lastName: null,
    avatarUrl: null,
    currency: "GBP",
    country: "GB",
    employmentType: f.employmentType,
    annualSalary: f.annualSalary,
    // A typed take-home is a fact now (owner decision 2 option A), so it round-trips too.
    monthlyTakeHome: f.monthlyTakeHome ?? null,
    hasSecondIncome: false,
    secondIncomeMonthly: null,
    hasRentalIncome: false,
    rentalIncomeMonthly: null,
    hasMortgage: false,
    mortgageType: f.mortgageType,
    propertyOwnershipShare: f.propertyOwnershipShare,
    hasBuyToLet: false,
    buyToLetCount: 0,
    buyToLetPropertyValue: null,
    buyToLetMonthlyRental: null,
    buyToLetMortgageBalance: null,
    buyToLetMortgageRate: null,
    buyToLetMortgageType: "interest-only",
    pensionPercent: f.pensionPercent,
    // Not a persona fact, so never answered: null (owner decision 3, the column has no default).
    // A stored rate, 5% and 3% included, is the user's answer and never changes the facts.
    pensionEmployerPercent: null,
    isSalarySacrifice: f.isSalarySacrifice,
    isSalarySacrificeEmployerNi: false,
    monthlySavingsTarget: null,
    savingsAllocationMode: "per_account",
    savingsDefaultInterestRate: 0,
    setupChecklistCompletedSteps: [],
    customBudgetCategories: [],
    enabledPages: [],
    dashboardWidgets: [],
    dashboardWidgetOrder: [],
    dashboardWidgetSizes: {},
    dashboardWidgetConfig: {},
    hasResetFinancialData: false,
    onboardingCompleted: true,
    taxRegion: f.taxRegion,
    birthYear: null,
    checkInDay: null,
    studentLoanPlans: f.studentLoanPlans,
    housingStatus: f.housingStatus ?? null,
    monthlyHousingCost: f.monthlyHousingCost ?? null,
    monthlyOtherOutgoings: null,
    netWorthCountsProperty: p.netWorthBasis.countProperty,
    netWorthCountsStudentLoan: p.netWorthBasis.countStudentLoan,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function toContractBudget(p: PersonaFixture) {
  return p.budget.map((b: BudgetEntryItem) => ({
    id: b.id,
    userId: OWNER_ID,
    category: b.category,
    name: b.name,
    amount: b.amount,
    frequency: b.frequency,
    isIncome: b.isIncome,
    isPrimaryIncome: b.isPrimaryIncome === true,
    isEssential: b.isEssential,
    notes: b.notes ?? null,
    isDefault: false,
    // A linked row (budget_entries.link_kind) stores £0 and takes its figure from the saved fact.
    linkKind: b.linkKind ?? null,
    ...(b.ownership != null ? { ownership: b.ownership } : {}),
    ...(b.sharePercent != null ? { sharePercent: b.sharePercent } : {}),
    createdAt: STAMP,
    updatedAt: STAMP,
  }));
}

/** `receiptData` is never on a read (E20-N15); `hasReceipt` says whether there is one. */
function toContractTaxRecords(p: PersonaFixture) {
  return p.taxRecords.map((t: TaxRecord) => ({
    id: t.id,
    userId: OWNER_ID,
    type: t.type,
    source: t.source,
    category: t.category,
    name: t.name,
    amount: Number(t.amount),
    frequency: t.frequency,
    date: t.date,
    endDate: t.endDate,
    notes: t.notes,
    receiptFilename: t.receiptFilename,
    receiptMimeType: t.receiptMimeType,
    hasReceipt: false,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/** A `fetch` stub that serves one persona as the v1 backend would. */
function personaFetch(p: PersonaFixture) {
  const bodies: Record<string, unknown> = {
    "/v1/accounts": toContractAccounts(p),
    "/v1/user-profile": toContractProfile(p),
    "/v1/budget-entries": toContractBudget(p),
    "/v1/tax-records": toContractTaxRecords(p),
  };
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      "http://backend.test",
    );
    const body = bodies[url.pathname];
    return body === undefined ? new Response("Not found", { status: 404 }) : jsonResponse(body);
  });
}

/** The engine side: the persona's rows straight from memory, no wire, no contract. */
function inMemorySource(p: PersonaFixture): PictureRowSource {
  return {
    profile: async () => profileFromFacts(p.profile, p.netWorthBasis),
    accounts: async () => [...p.accounts],
    accountDetails: async () => [...p.details],
    budgetEntries: async () => [...p.budget],
    taxRecords: async () => [...p.taxRecords],
  };
}

/** The figures pages and AI tools both show, named so a failure says which one drifted. */
function sharedFigures(picture: FinancialPicture) {
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  return {
    netWorth: picture.netWorth.netWorth,
    leftOverEachMonth: budget?.hasIncome ? budget.surplus : null,
    breathingRoomMonths: isFigureKnown(picture.monthsOfCover)
      ? picture.monthsOfCover.value.months
      : null,
    debtTotal: picture.debt.consumerDebt,
    debtFreeDate: picture.debtSummary?.debtFreeDate ?? null,
    savingsBalance: picture.savings.balance,
    isaUsed: picture.isaAllowanceUsed,
    estimatedTaxDue: isFigureKnown(picture.estimatedTaxDue)
      ? picture.estimatedTaxDue.value.amount
      : null,
  };
}

const NAMES = Object.keys(PERSONAS) as PersonaName[];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AS_OF);
});
afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe.each(NAMES)("persona %s: the web loader's picture equals the engine loader's", (name) => {
  const raw = PERSONAS[name].fixture;
  const persona = wirePersona(raw);

  async function bothPictures() {
    globalThis.fetch = personaFetch(persona) as typeof fetch;
    const web = await loadWorkspacePicture({ request: new Request("http://x/") } as never);
    const engine = await loadFinancialPicture(inMemorySource(persona), { asOf: AS_OF });
    return { web: web.picture, engine: engine.picture };
  }

  it("shared figures: net worth, left over, Breathing room, debt, savings, ISA, tax due", async () => {
    const { web, engine } = await bothPictures();
    expect(web).not.toBeNull();
    const w = sharedFigures(web as FinancialPicture);
    const e = sharedFigures(engine);
    expect(w.netWorth, "net worth").toBe(e.netWorth);
    expect(w.leftOverEachMonth, "left over each month (budget surplus)").toBe(e.leftOverEachMonth);
    expect(w.breathingRoomMonths, "Breathing room months").toBe(e.breathingRoomMonths);
    expect(w.debtTotal, "debt total").toBe(e.debtTotal);
    expect(w.debtFreeDate, "debt-free date").toBe(e.debtFreeDate);
    expect(w.savingsBalance, "savings balance").toBe(e.savingsBalance);
    expect(w.isaUsed, "ISA allowance used").toBe(e.isaUsed);
    expect(w.estimatedTaxDue, "estimated tax due").toBe(e.estimatedTaxDue);
  });

  it("the whole picture deep-equals", async () => {
    const { web, engine } = await bothPictures();
    expect(web).toEqual(engine);
  });

  it("the wire mapping leaves the money figures as the raw persona has them", () => {
    // Remapped ids and defaulted profile facts must not move a money figure; otherwise this test
    // would be comparing a different persona. Built straight from the rows, no loader.
    const before = sharedFigures(buildFinancialPicture(raw, { asOf: AS_OF }));
    const after = sharedFigures(buildFinancialPicture(persona, { asOf: AS_OF }));
    expect(after.netWorth).toBe(before.netWorth);
    expect(after.leftOverEachMonth).toBe(before.leftOverEachMonth);
    expect(after.breathingRoomMonths).toBe(before.breathingRoomMonths);
    expect(after.debtTotal).toBe(before.debtTotal);
    expect(after.debtFreeDate).toBe(before.debtFreeDate);
    expect(after.savingsBalance).toBe(before.savingsBalance);
    expect(after.isaUsed).toBe(before.isaUsed);
  });
});

/**
 * Linked budget lines (budget_entries.link_kind, PR 783): each stores £0 and takes its figure from
 * the saved fact. No persona has one, so this builds one. The salary is £12,570, the personal
 * allowance and the National Insurance primary threshold for 2026/27, with no pension and no
 * student loan, so no tax and no NI are due and take-home is worked out by hand.
 */
function linkedPersona(salary: number | null): PersonaFixture {
  const row = (
    id: string,
    category: string,
    name: string,
    amount: number,
    extra: Partial<BudgetEntryItem> = {},
  ): BudgetEntryItem => ({
    id,
    category,
    name,
    amount,
    frequency: "monthly",
    isIncome: false,
    isEssential: false,
    ...extra,
  });
  return {
    netWorthBasis: PERSONAS.dan.fixture.netWorthBasis,
    profile: {
      annualSalary: salary,
      employmentType: "employed",
      taxRegion: "ENGLAND",
      studentLoanPlans: [],
      pensionPercent: 0,
      isSalarySacrifice: false,
      housingStatus: "renting",
      monthlyHousingCost: 850,
    },
    accounts: [{ id: "linked-current", name: "Current account", type: "Current", balance: 5000 }],
    details: [],
    budget: [
      // Stored £0: the figure comes from the take-home pay and the saved rent.
      row("linked-pay", "income", "Take-home pay", 0, { isIncome: true, linkKind: "take_home" }),
      row("linked-rent", "housing", "Rent", 0, { isEssential: true, linkKind: "housing" }),
      row("linked-food", "food", "Groceries", 300, { isEssential: true }),
      row("linked-fun", "entertainment", "Going out", 100),
    ],
    taxRecords: [],
  } as PersonaFixture;
}

describe("linked budget lines: the web loader's picture equals the engine loader's", () => {
  async function bothPictures(p: PersonaFixture) {
    const persona = wirePersona(p);
    globalThis.fetch = personaFetch(persona) as typeof fetch;
    const web = await loadWorkspacePicture({ request: new Request("http://x/") } as never);
    const engine = await loadFinancialPicture(inMemorySource(persona), { asOf: AS_OF });
    return { web: web.picture as FinancialPicture, engine: engine.picture };
  }

  it("a linked line counts its saved fact, never the stored £0", async () => {
    const { web, engine } = await bothPictures(linkedPersona(12570));
    expect(web).toEqual(engine);
    // By hand: take-home = 12,570 a year (no tax, no NI, no pension) / 12 = 1,047.50, which the
    // take-home figure gives in whole pounds (Math.round), so income = 1,048.
    // Essentials = rent 850 (the saved fact) + groceries 300 = 1,150. Discretionary = 100.
    // Left over = 1,048 - 1,150 - 100 = -202.
    expect(isFigureKnown(web.budget)).toBe(true);
    if (!isFigureKnown(web.budget)) return;
    expect(web.budget.value.income).toBe(1048);
    expect(web.budget.value.essentials).toBe(1150);
    expect(web.budget.value.discretionary).toBe(100);
    expect(web.budget.value.surplus).toBe(-202);
  });

  it("a linked line whose saved fact is not set leaves the totals unknown, naming the fact", async () => {
    const { web, engine } = await bothPictures(linkedPersona(null));
    expect(web).toEqual(engine);
    // No salary saved: the take-home line has no figure, so left over is unknown, not 0 - 1,250.
    expect(isFigureKnown(web.budget)).toBe(false);
    if (isFigureKnown(web.budget)) return;
    expect(web.budget.missing).toEqual(["annualSalary"]);
  });
});
