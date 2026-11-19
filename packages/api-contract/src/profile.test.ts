import { describe, expect, it } from "vitest";
import {
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  ACCOUNT_EXPORT_SECTIONS,
  AcceptTermsRequest,
  AcceptTermsResponse,
  AccountExportBankConnection,
  AccountExportDocument,
  AccountExportMcpToken,
  DELETE_USER_CONFIRMATION,
  DeleteUserRequest,
  DeleteUserResponse,
  HousingStatus,
  UpdateChecklistRequest,
  UpdateProfileRequest,
} from "./domains/profile.js";
import { ERROR_CODES } from "./errors.js";
import { routes } from "./manifest.js";

/**
 * System audit slice 9: profile fields retired in part two and accepted-and-ignored for one
 * release. That release has happened and their columns are dropped, so the request refuses them.
 */
const RETIRED_PROFILE_FIELDS: Record<string, unknown> = {
  hasBuyToLet: true,
  buyToLetCount: 1,
  buyToLetPropertyValue: 165000,
  buyToLetMonthlyRental: 875,
  buyToLetMortgageBalance: 92000,
  buyToLetMortgageRate: 5.1,
  buyToLetMortgageType: "interest-only",
  monthlySavingsTarget: 300,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 4.25,
  dashboardWidgetSizes: { accounts: "wide" },
  dashboardWidgetConfig: {},
};

/**
 * System audit slice 9 part three: profile fields whose only reader was the deleted mobile app.
 * The responses no longer carry them; PATCH accepts and ignores them for one release.
 */
const RETIRED_PART_THREE_FIELDS: Record<string, unknown> = {
  displayName: "Sam Taylor",
  hasSecondIncome: true,
};

describe("UpdateProfileRequest", () => {
  it.each(Object.entries(RETIRED_PART_THREE_FIELDS))(
    "still accepts %s for one release (system audit slice 9 part three)",
    (key, value) => {
      expect(UpdateProfileRequest.safeParse({ [key]: value }).success).toBe(true);
    },
  );

  it("accepts an old-shaped payload with displayName, hasSecondIncome and current fields", () => {
    const parsed = UpdateProfileRequest.safeParse({
      ...RETIRED_PART_THREE_FIELDS,
      displayName: null,
      secondIncomeMonthly: 400,
      annualSalary: 41000,
    });
    expect(parsed.success).toBe(true);
    expect(
      UpdateProfileRequest.safeParse({ ...RETIRED_PART_THREE_FIELDS, annualSalary: 41000 }).success,
    ).toBe(true);
  });

  it.each(Object.entries(RETIRED_PROFILE_FIELDS))(
    "refuses the retired field %s as an unknown key",
    (key, value) => {
      const parsed = UpdateProfileRequest.safeParse({ [key]: value });
      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues.map((issue) => issue.code)).toEqual(["unrecognized_keys"]);
    },
  );

  it("still accepts the current fields on their own", () => {
    const parsed = UpdateProfileRequest.safeParse({
      annualSalary: 41000,
      housingStatus: "renting",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts https and image data-URL avatars, rejects other schemes", () => {
    const avatar = (avatarUrl: string) => UpdateProfileRequest.safeParse({ avatarUrl }).success;
    expect(avatar("https://example.com/a.png")).toBe(true);
    expect(avatar("data:image/png;base64,AAAA")).toBe(true);
    expect(avatar("http://example.com/a.png")).toBe(false);
    expect(avatar("data:text/html;base64,AAAA")).toBe(false);
    expect(avatar(`https://example.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("takes a section order of known sections, each once, and rejects anything else", () => {
    const order = (dashboardWidgetOrder: unknown) =>
      UpdateProfileRequest.safeParse({ dashboardWidgetOrder }).success;
    expect(order([])).toBe(true);
    expect(order(["tax", "debt", "accounts"])).toBe(true);
    expect(order(["debt", "mortgage", "savings", "pension", "tax", "budget", "accounts"])).toBe(
      true,
    );
    // Unknown, retired and repeated ids are refused, so a stored order only ever holds sections.
    expect(order(["tax", "forecast"])).toBe(false);
    expect(order(["retirement"])).toBe(false);
    expect(order(["tax", "debt", "tax"])).toBe(false);
  });

  it("allows null on nullable columns and rejects bad percentages", () => {
    expect(UpdateProfileRequest.safeParse({ annualSalary: null, firstName: null }).success).toBe(
      true,
    );
    expect(UpdateProfileRequest.safeParse({ pensionPercent: 101 }).success).toBe(false);
  });

  it("allows four decimal places on the pension rates only", () => {
    const parse = (patch: Record<string, unknown>) => UpdateProfileRequest.safeParse(patch).success;
    // £100 a month on £37,260: 100 × 12 / 37,260 = 3.2206% to four places.
    expect(parse({ pensionPercent: 3.2206 })).toBe(true);
    expect(parse({ pensionEmployerPercent: 3.2206 })).toBe(true);
    expect(parse({ pensionPercent: 3.22064 })).toBe(false);
    expect(parse({ pensionEmployerPercent: 100.0001 })).toBe(false);
    // Other percentages keep the two-place rule.
    expect(parse({ propertyOwnershipShare: 33.3333 })).toBe(false);
  });

  it("accepts a check-in day from 1 to 31 or null, and rejects 0, 32 and fractions", () => {
    const parse = (checkInDay: unknown) => UpdateProfileRequest.safeParse({ checkInDay }).success;
    expect(parse(1)).toBe(true);
    expect(parse(31)).toBe(true);
    expect(parse(null)).toBe(true);
    expect(parse(0)).toBe(false);
    expect(parse(32)).toBe(false);
    expect(parse(15.5)).toBe(false);
  });

  it("accepts the net worth choices as booleans only, never null", () => {
    const parse = (body: Record<string, unknown>) => UpdateProfileRequest.safeParse(body).success;
    expect(parse({ netWorthCountsProperty: false, netWorthCountsStudentLoan: true })).toBe(true);
    expect(parse({ netWorthCountsStudentLoan: false })).toBe(true);
    expect(parse({ netWorthCountsProperty: null })).toBe(false);
    expect(parse({ netWorthCountsStudentLoan: "yes" })).toBe(false);
  });

  it("accepts living with family or friends, with £0 or no amount, and rejects unknown statuses", () => {
    const parse = (body: Record<string, unknown>) => UpdateProfileRequest.safeParse(body).success;
    expect(parse({ housingStatus: "living_with_family" })).toBe(true);
    expect(parse({ housingStatus: "living_with_family", monthlyHousingCost: 0 })).toBe(true);
    expect(parse({ housingStatus: "living_with_family", monthlyHousingCost: null })).toBe(true);
    expect(parse({ housingStatus: null })).toBe(true);
    expect(parse({ housingStatus: "castle" })).toBe(false);
    expect(HousingStatus.options).toEqual([
      "renting",
      "mortgage",
      "own_outright",
      "living_with_family",
    ]);
  });
});

describe("UpdateChecklistRequest", () => {
  it("requires a step and a boolean", () => {
    expect(UpdateChecklistRequest.safeParse({ step: "profile", completed: true }).success).toBe(
      true,
    );
    expect(UpdateChecklistRequest.safeParse({ step: "profile", completed: "yes" }).success).toBe(
      false,
    );
  });

  it("accepts a dismissal on its own, never mixed with a step (decision 13)", () => {
    expect(UpdateChecklistRequest.safeParse({ dismissed: true }).success).toBe(true);
    expect(UpdateChecklistRequest.safeParse({ dismissed: true, step: "budget" }).success).toBe(
      false,
    );
    expect(UpdateChecklistRequest.safeParse({ step: "budget" }).success).toBe(false);
    expect(UpdateChecklistRequest.safeParse({}).success).toBe(false);
  });
});

describe("DeleteUserRequest and DeleteUserResponse (BE-04)", () => {
  it("accepts only the exact DELETE phrase and no extra keys", () => {
    expect(DeleteUserRequest.safeParse({ confirmation: DELETE_USER_CONFIRMATION }).success).toBe(
      true,
    );
    expect(DeleteUserRequest.safeParse({ confirmation: "delete" }).success).toBe(false);
    expect(DeleteUserRequest.safeParse({ confirmation: "RESET" }).success).toBe(false);
    expect(DeleteUserRequest.safeParse({}).success).toBe(false);
    expect(DeleteUserRequest.safeParse({ confirmation: "DELETE", userId: "x" }).success).toBe(
      false,
    );
  });

  it("has exactly two outcomes", () => {
    expect(DeleteUserResponse.safeParse({ status: "deleted" }).success).toBe(true);
    expect(DeleteUserResponse.safeParse({ status: "identity_pending" }).success).toBe(true);
    expect(DeleteUserResponse.safeParse({ status: "failed" }).success).toBe(false);
  });
});

describe("AcceptTermsRequest and AcceptTermsResponse (BE-15, M-PRIV3)", () => {
  it("accepts a short version identifier and nothing else", () => {
    expect(AcceptTermsRequest.safeParse({ version: "2026-11-01" }).success).toBe(true);
    expect(AcceptTermsRequest.safeParse({ version: "v1.2_b" }).success).toBe(true);
    expect(AcceptTermsRequest.safeParse({ version: "" }).success).toBe(false);
    expect(AcceptTermsRequest.safeParse({ version: "I agree" }).success).toBe(false);
    expect(AcceptTermsRequest.safeParse({ version: "v".repeat(65) }).success).toBe(false);
    expect(AcceptTermsRequest.safeParse({}).success).toBe(false);
    expect(AcceptTermsRequest.safeParse({ version: "2026-11-01", userId: "x" }).success).toBe(
      false,
    );
  });

  it("answers the version and whether this call recorded it", () => {
    expect(AcceptTermsResponse.safeParse({ version: "2026-11-01", recorded: true }).success).toBe(
      true,
    );
    expect(AcceptTermsResponse.safeParse({ version: "2026-11-01", recorded: false }).success).toBe(
      true,
    );
    expect(AcceptTermsResponse.safeParse({ version: "2026-11-01" }).success).toBe(false);
  });

  it("is a user-owned profile route with request and response schemas", () => {
    const route = routes.profile.acceptTerms;
    expect(route).toMatchObject({
      method: "POST",
      path: "user-profile/terms-acceptance",
      auth: "user",
      ownership: "user",
    });
    expect(route.body).toBe(AcceptTermsRequest);
    expect(route.response).toBe(AcceptTermsResponse);
  });

  it("lists the BE-15 error codes", () => {
    for (const code of [
      "terms_not_configured",
      "terms_version_mismatch",
      "account_deletion_unavailable",
    ]) {
      expect(ERROR_CODES).toContain(code);
    }
  });
});

describe("AccountExportDocument (BE-04)", () => {
  const empty = {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: "2026-11-14T09:00:00.000Z",
    userId: "user_01HZX3Q9V7C2M8N4P6R0S5T1WA",
    notes: ["a note"],
    profile: null,
    retirementPlan: null,
    accounts: [],
    accountDetails: [],
    transactions: [],
    bankConnections: [],
    bankOAuthStates: [],
    budgetEntries: [],
    taxRecords: [],
    snapshotCheckins: [],
    importBatches: [],
    mcpTokens: [],
    agentAuditEvents: [],
    idempotencyKeys: [],
    auditEvents: [],
    consents: [],
  };

  it("accepts an empty export and requires every section", () => {
    expect(AccountExportDocument.safeParse(empty).success).toBe(true);
    const { accounts: _accounts, ...missing } = empty;
    expect(AccountExportDocument.safeParse(missing).success).toBe(false);
    expect(AccountExportDocument.safeParse({ ...empty, schemaVersion: 2 }).success).toBe(false);
  });

  it("has one section schema per data key, in document order", () => {
    const docKeys = Object.keys(AccountExportDocument.shape).filter(
      (k) => !["schemaVersion", "exportedAt", "userId", "notes"].includes(k),
    );
    expect(Object.keys(ACCOUNT_EXPORT_SECTIONS)).toEqual(docKeys);
  });

  it("rejects secrets: an MCP token hash or a bank access or refresh token is an unknown key", () => {
    const token = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Claude",
      tokenPrefix: "flp_abcd",
      scopes: ["mcp:read:anonymized"],
      anonymizeInstitutions: true,
      expiresAt: null,
      lastUsedAt: null,
      totalToolCalls: 0,
      revokedAt: null,
      createdAt: "2026-11-14T09:00:00.000Z",
    };
    expect(AccountExportMcpToken.safeParse(token).success).toBe(true);
    expect(AccountExportMcpToken.safeParse({ ...token, tokenHash: "x" }).success).toBe(false);
    const connection = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      institutionId: "monzo",
      institutionName: "Monzo",
      status: "connected",
      authType: "oauth",
      expiresAt: null,
      lastSyncedAt: "2026-11-14T09:00:00.000Z",
      createdAt: "2026-11-14T09:00:00.000Z",
      updatedAt: "2026-11-14T09:00:00.000Z",
    };
    expect(AccountExportBankConnection.safeParse(connection).success).toBe(true);
    for (const secret of ["accessToken", "refreshToken"]) {
      expect(AccountExportBankConnection.safeParse({ ...connection, [secret]: "x" }).success).toBe(
        false,
      );
    }
  });
});
