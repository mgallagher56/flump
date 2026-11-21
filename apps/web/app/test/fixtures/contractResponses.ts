/**
 * Backend response bodies that satisfy the v1 contract schemas (`@flump/api-contract`), copied
 * from the shapes in packages/api-contract/src/*.responses.test.ts. Tests that stub `fetch` under
 * `backendFetch` / `apiFetch` answer with these, because the clients validate every body (BE-10).
 */

export const ACCOUNT_ID = "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f";
/** The property a mortgage-with-property create returns beside the mortgage. */
const PROPERTY_ID = "7a2d3b5f-9c4e-4d6f-8a81-2b3c4d5e6f70";

export const accountDetailFixture = {
  id: 42,
  accountId: ACCOUNT_ID,
  userId: "user_01HXYZABCDEF",
  year: 2026,
  month: 10,
  value: 1100.1,
  asOfDate: "2026-10-31",
  source: "manual",
  importBatchId: null,
  updatedAt: "2026-10-31T20:00:00.000Z",
};

/** An account as create, update and the balance check-in return it (no `details`). */
export const accountFixture = {
  id: ACCOUNT_ID,
  name: "Everyday current",
  type: "Current",
  accountSubtype: null,
  balance: 1234.56,
  interestRate: null,
  monthlyContribution: null,
  creditLimit: null,
  promoZeroPercentUntil: null,
  termMonths: null,
  fixedRateEndDate: null,
  isCurrent: true,
  currency: "GBP",
  studentLoanPlan: null,
  connectionId: null,
  createdAt: "2026-01-04T09:12:00.000Z",
  updatedAt: "2026-01-05T10:00:00.000Z",
};

/** An account as the reads (`GET /accounts`, `GET /accounts/:id`) return it. */
export const accountWithDetailsFixture = { ...accountFixture, details: [accountDetailFixture] };

export const profileFixture = {
  id: "6f1c2b9e-3d4a-4b5c-8d6e-7f8091a2b3c4",
  userId: "user_01JABCDEF",
  email: "sam@example.com",
  firstName: "Sam",
  lastName: null,
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: "employed",
  annualSalary: 65000,
  monthlyTakeHome: 2750.5,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: true,
  mortgageType: "repayment",
  propertyOwnershipShare: 50,
  pensionPercent: 5,
  pensionEmployerPercent: 3,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  setupChecklistCompletedSteps: ["profile"],
  setupChecklistDismissed: false,
  customBudgetCategories: [],
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget"],
  dashboardWidgetOrder: [],
  hasResetFinancialData: false,
  onboardingCompleted: true,
  taxRegion: "SCOTLAND",
  birthYear: 1990,
  checkInDay: null,
  studentLoanPlans: [],
  housingStatus: "mortgage",
  monthlyHousingCost: 812.5,
  monthlyOtherOutgoings: null,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: false,
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-13T10:15:00.000Z",
};

export const budgetEntryFixture = {
  id: "8f6c2d1e-4b3a-4c5d-9e8f-1a2b3c4d5e6f",
  userId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  category: "housing",
  name: "Rent / Mortgage",
  amount: 1200,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: true,
  createdAt: "2026-04-06T09:15:00.000Z",
  updatedAt: "2026-04-06T09:15:00.000Z",
};

export const taxRecordFixture = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  userId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  type: "income",
  source: "rental",
  category: "rental_income",
  name: "Flat rent (2025/26)",
  amount: 1250.5,
  frequency: "annual",
  date: "2025-04-06",
  endDate: "2026-04-05",
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  hasReceipt: false,
  accountId: null,
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-11T08:30:00.000Z",
};

export const bankConnectionFixture = {
  id: "0b7e9d10-2c4f-4a8b-b1d2-3e4f5a6b7c8d",
  institutionId: "monzo",
  institutionName: "Monzo Bank",
  status: "connected",
  authType: "token",
  expiresAt: null,
  lastSyncedAt: "2026-11-01T08:00:00.000Z",
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-11-01T08:00:00.000Z",
};

/** A JSON response, as the backend sends it. */
export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const IMPORT_BATCH_ID = "b0000000-0000-4000-8000-000000000001";

const importBatchFixture = {
  batchId: IMPORT_BATCH_ID,
  status: "committed",
  counts: { staged: 6, new: 3, overwrite: 1, unchanged: 1, skipped: 1, errors: 0 },
  rows: 8,
  validationErrors: [],
  skippedManual: [],
  revert: null,
  createdAt: "2026-11-01T09:00:00.000Z",
  expiresAt: "2026-11-02T09:00:00.000Z",
  committedAt: "2026-11-01T09:05:00.000Z",
  revertedAt: null,
};

const importPreviewFixture = {
  batchId: IMPORT_BATCH_ID,
  status: "staged",
  expiresAt: "2026-11-02T09:00:00.000Z",
  accounts: [
    {
      ref: "saver",
      name: "Saver",
      type: "Saving",
      mappedAccountId: null,
      suggestedAccountId: null,
    },
  ],
  rows: [],
  totals: { new: 0, overwrite: 0, unchanged: 0, needsTick: 0, errors: 0 },
};

const mcpTokenFixture = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  name: "Claude",
  // Built at runtime with zeros so secret scanners do not read it as a token.
  tokenPrefix: ["flump", "pat", "0000...0000"].join("_"),
  scopes: ["read"],
  anonymizeInstitutions: true,
  expiresAt: null,
  lastUsedAt: null,
  totalToolCalls: 0,
  createdAt: "2026-11-01T09:00:00.000Z",
  isRevoked: false,
  isExpired: false,
};

const snapshotResponseFixture = { month: "2026-11", values: [], completed: true };

export const retirementPlanFixture = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: "user_01JABCDEF",
  retirementAge: 67,
  planToAge: 90,
  target: { kind: "typed" as const, yearlyAmount: 26_000 },
  housingOverride: null,
  statePensionAge: 67,
  statePensionAnnualForecastGbp: null,
  statePensionQualifyingYears: 35,
  growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
  inflationRate: 0.02,
  cashSavingsNominalRate: null,
  realRentGrowthRate: 0,
  excludedAccountIds: [],
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

/**
 * GET /retirement-plan before anything is saved: the default plan, with no row id, no timestamps
 * and no ages, target or State Pension details (the backend's `defaultPlan`).
 */
export const retirementPlanUnsavedFixture = {
  id: null,
  userId: "user_01JABCDEF",
  retirementAge: null,
  planToAge: null,
  target: null,
  housingOverride: null,
  statePensionAge: null,
  statePensionAnnualForecastGbp: null,
  statePensionQualifyingYears: null,
  growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
  inflationRate: 0.02,
  cashSavingsNominalRate: null,
  realRentGrowthRate: 0,
  excludedAccountIds: [],
  createdAt: null,
  updatedAt: null,
};

const invoicingSettingsFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  defaultHourlyRate: 85,
  businessName: "Sam Consulting",
  businessAddress: "10 High Street, London",
  businessEmail: "sam@example.com",
  vatNumber: null,
  invoicePrefix: "INV-",
  nextInvoiceSequence: 1,
  defaultPaymentTermsDays: 30,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

const workLogEntryFixture = {
  id: "22222222-2222-4222-8222-222222222222",
  date: "2026-11-15",
  description: "Product design sprint",
  hoursWorked: 7.5,
  hourlyRate: 85,
  amount: 637.5,
  clientName: "Northwind Studio",
  incomeSource: "self-employed" as const,
  invoiceId: null,
  notes: null,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

const invoiceFixture = {
  id: "33333333-3333-4333-8333-333333333333",
  invoiceNumber: "INV-0001",
  status: "draft" as const,
  clientName: "Northwind Studio",
  clientAddress: null,
  clientEmail: null,
  issueDate: "2026-11-16",
  dueDate: "2026-12-16",
  paidDate: null,
  lineItems: [
    {
      workLogId: null,
      date: "2026-11-15",
      description: "Product design sprint",
      hoursWorked: 7.5,
      hourlyRate: 85,
      amount: 637.5,
    },
  ],
  subtotal: 637.5,
  vatRatePct: null,
  vatAmount: 0,
  total: 637.5,
  paymentMethod: null,
  paymentReference: null,
  notes: null,
  taxRecordId: null,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

const success = { success: true };

/**
 * A contract-valid body for `method path` (path with the `/v1` prefix, no query), for tests that
 * stub `fetch` and only care which calls are made. Unknown routes answer `{ success: true }`.
 */
export function contractBody(method: string, path: string): unknown {
  const p = path.replace(/^\/(v1|api)(?=\/)/, "");
  const m = method.toUpperCase();
  if (m === "DELETE") {
    if (/^\/work-logs\/[^/]+$/.test(p)) return { id: workLogEntryFixture.id };
    if (/^\/invoices\/[^/]+$/.test(p)) return { id: invoiceFixture.id };
    return /^\/bank-connections\//.test(p) ? { success: true, consentRevoked: false } : success;
  }
  if (p === "/accounts") return m === "GET" ? [accountWithDetailsFixture] : accountFixture;
  if (p === "/accounts/mortgage-with-property") {
    return {
      mortgage: { ...accountFixture, name: "Residential Mortgage", type: "Mortgage" },
      property: {
        ...accountFixture,
        id: PROPERTY_ID,
        name: "Home (your estimate)",
        type: "Property",
      },
    };
  }
  if (p === "/account-details") return [accountDetailFixture];
  if (/^\/accounts\/[^/]+$/.test(p))
    return m === "GET" ? accountWithDetailsFixture : accountFixture;
  if (p === "/user-profile" || p === "/user-profile/checklist") return profileFixture;
  if (p === "/user-profile/reset-financial-data") {
    return { success: true, message: "Financial data reset", profile: profileFixture };
  }
  if (p === "/budget-entries") return m === "GET" ? [budgetEntryFixture] : budgetEntryFixture;
  if (/^\/budget-entries\/categories$/.test(p)) return { success: true, categories: ["living"] };
  if (/^\/budget-entries\/[^/]+$/.test(p)) return budgetEntryFixture;
  if (p === "/tax-records" || p === "/tax-records/bulk") {
    return m === "GET" || p.endsWith("bulk") ? [taxRecordFixture] : taxRecordFixture;
  }
  if (/^\/tax-records\/[^/]+$/.test(p)) return taxRecordFixture;
  if (p === "/bank-connections") {
    return m === "GET"
      ? [bankConnectionFixture]
      : { success: true, connection: bankConnectionFixture, message: "Connected" };
  }
  if (p === "/bank-connections/capability") return { enabled: false };
  if (/^\/bank-connections\/[^/]+\/(refresh|sync)$/.test(p)) {
    return { success: true, connection: bankConnectionFixture, message: "Synced" };
  }
  if (p === "/imports") return [importBatchFixture];
  if (/^\/imports\/[^/]+\/preview$/.test(p)) return importPreviewFixture;
  if (/^\/imports\/[^/]+(\/commit|\/revert)?$/.test(p)) return importBatchFixture;
  if (p === "/mcp-tokens") return [mcpTokenFixture];
  if (p === "/beta/admin") return { admin: true };
  if (p === "/beta/admin/invites" && m === "GET") return { invites: [] };
  if (p === "/beta/admin/members") return { members: [] };
  if (p === "/beta/invites/redeem") return { status: "joined" };
  if (p === "/retirement-plan") return { plan: retirementPlanFixture };
  if (p === "/invoicing/settings") return { settings: invoicingSettingsFixture };
  if (p === "/work-logs") {
    return m === "GET" ? { entries: [], nextCursor: null } : { entry: workLogEntryFixture };
  }
  if (/^\/work-logs\/[^/]+$/.test(p)) return { entry: workLogEntryFixture };
  if (p === "/invoices") {
    return m === "GET" ? { invoices: [], nextCursor: null } : { invoice: invoiceFixture };
  }
  if (/^\/invoices\/[^/]+(\/issue|\/mark-paid|\/void)?$/.test(p)) {
    return { invoice: invoiceFixture };
  }
  if (p === "/snapshots/check-ins") return { latestCompletedMonth: "2026-10" };
  if (/^\/snapshots\/[^/]+$/.test(p)) return snapshotResponseFixture;
  return success;
}

/** A `fetch` stub answering every call with `contractBody` and `status`. */
export const contractFetch =
  (status = 200) =>
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      "http://backend.test",
    );
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    return jsonResponse(contractBody(method, url.pathname), status);
  };
