/**
 * Backend response bodies that satisfy the v1 contract schemas (`@flump/api-contract`), copied
 * from the shapes in packages/api-contract/src/*.responses.test.ts. Tests that stub `fetch` under
 * `backendFetch` / `apiFetch` answer with these, because the clients validate every body (BE-10).
 */

export const ACCOUNT_ID = "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f";

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
  balance: 1234.56,
  interestRate: null,
  monthlyContribution: null,
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
  displayName: null,
  firstName: "Sam",
  lastName: null,
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: "employed",
  annualSalary: 65000,
  monthlyTakeHome: 2750.5,
  hasSecondIncome: false,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: true,
  mortgageType: "repayment",
  propertyOwnershipShare: 50,
  hasBuyToLet: false,
  buyToLetCount: 1,
  buyToLetPropertyValue: null,
  buyToLetMonthlyRental: null,
  buyToLetMortgageBalance: null,
  buyToLetMortgageRate: null,
  buyToLetMortgageType: "interest-only",
  pensionPercent: 5,
  pensionEmployerPercent: 3,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: 300,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 4.25,
  setupChecklistCompletedSteps: ["profile"],
  customBudgetCategories: [],
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget"],
  dashboardWidgetOrder: ["accounts", "budget"],
  dashboardWidgetSizes: { accounts: "wide" },
  dashboardWidgetConfig: {},
  hasResetFinancialData: false,
  onboardingCompleted: true,
  taxRegion: "SCOTLAND",
  birthYear: 1990,
  studentLoanPlans: [],
  housingStatus: "mortgage",
  monthlyHousingCost: 812.5,
  monthlyOtherOutgoings: null,
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

export const portfolioSnapshotFixture = {
  netWorth: 15000,
  totalAssets: 20000,
  totalLiabilities: 5000,
  totalLiquidCash: 20000,
  totalInvestments: 0,
  totalPensions: 0,
  totalConsumerDebt: 5000,
  totalMortgageBalance: 0,
  totalProperty: 0,
  totalStudentLoans: 0,
  resolvedAccounts: [],
  monthlyHistory: [],
  currency: "GBP",
};

/** A JSON response, as the backend sends it. */
export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export const IMPORT_BATCH_ID = "b0000000-0000-4000-8000-000000000001";

export const importBatchFixture = {
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

export const importPreviewFixture = {
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

export const mcpTokenFixture = {
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

export const snapshotResponseFixture = { month: "2026-11", values: [], completed: true };

const success = { success: true };

/**
 * A contract-valid body for `method path` (path with the `/v1` prefix, no query), for tests that
 * stub `fetch` and only care which calls are made. Unknown routes answer `{ success: true }`.
 */
export function contractBody(method: string, path: string): unknown {
  const p = path.replace(/^\/(v1|api)(?=\/)/, "");
  const m = method.toUpperCase();
  if (m === "DELETE") {
    return /^\/bank-connections\//.test(p) ? { success: true, consentRevoked: false } : success;
  }
  if (p === "/accounts") return m === "GET" ? [accountWithDetailsFixture] : accountFixture;
  if (p === "/account-details") return [accountDetailFixture];
  if (/^\/accounts\/[^/]+$/.test(p))
    return m === "GET" ? accountWithDetailsFixture : accountFixture;
  if (p === "/portfolio-snapshot") return portfolioSnapshotFixture;
  if (p === "/user-profile" || p === "/user-profile/checklist") return profileFixture;
  if (p === "/user-profile/reset-financial-data") {
    return { success: true, message: "Financial data reset", profile: profileFixture };
  }
  if (p === "/budget-entries" || p === "/budget-entries/seed-defaults") {
    return m === "GET" || p.endsWith("seed-defaults") ? [budgetEntryFixture] : budgetEntryFixture;
  }
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
