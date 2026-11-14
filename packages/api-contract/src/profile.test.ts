import { describe, expect, it } from "vitest";
import {
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  ACCOUNT_EXPORT_SECTIONS,
  AccountExportBankConnection,
  AccountExportDocument,
  AccountExportMcpToken,
  DELETE_USER_CONFIRMATION,
  DeleteUserRequest,
  DeleteUserResponse,
  UpdateChecklistRequest,
  UpdateProfileRequest,
} from "./domains/profile.js";

describe("UpdateProfileRequest", () => {
  it("accepts https and image data-URL avatars, rejects other schemes", () => {
    const avatar = (avatarUrl: string) => UpdateProfileRequest.safeParse({ avatarUrl }).success;
    expect(avatar("https://example.com/a.png")).toBe(true);
    expect(avatar("data:image/png;base64,AAAA")).toBe(true);
    expect(avatar("http://example.com/a.png")).toBe(false);
    expect(avatar("data:text/html;base64,AAAA")).toBe(false);
    expect(avatar(`https://example.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("allows null on nullable columns and rejects bad percentages", () => {
    expect(UpdateProfileRequest.safeParse({ annualSalary: null, firstName: null }).success).toBe(
      true,
    );
    expect(UpdateProfileRequest.safeParse({ pensionPercent: 101 }).success).toBe(false);
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

describe("AccountExportDocument (BE-04)", () => {
  const empty = {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: "2026-11-14T09:00:00.000Z",
    userId: "user_01HZX3Q9V7C2M8N4P6R0S5T1WA",
    notes: ["a note"],
    profile: null,
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
