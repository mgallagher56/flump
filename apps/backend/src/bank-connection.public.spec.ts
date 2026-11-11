import { describe, expect, it } from "vitest";
import { toPublicConnection } from "./bank-connection.public";
import type { BankConnection } from "./entities/bank-connection.entity";

describe("toPublicConnection", () => {
  it("drops tokens and userId and keeps the public fields", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = toPublicConnection({
      id: "c1",
      userId: "u1",
      institutionId: "monzo",
      institutionName: "Monzo Bank",
      status: "connected",
      accessToken: "enc-access",
      refreshToken: "enc-refresh",
      expiresAt: null,
      authType: "token",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    } as BankConnection);

    const keys = Object.keys(result);
    expect(keys).not.toContain("accessToken");
    expect(keys).not.toContain("refreshToken");
    expect(keys).not.toContain("userId");
    expect(result).toEqual({
      id: "c1",
      institutionId: "monzo",
      institutionName: "Monzo Bank",
      status: "connected",
      authType: "token",
      expiresAt: null,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
});
