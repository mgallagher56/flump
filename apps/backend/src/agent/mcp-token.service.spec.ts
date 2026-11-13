import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { McpTokenService } from "./mcp-token.service";

describe("McpTokenService.findTokenByHash allowlist (E29-T8)", () => {
  const row = {
    id: "tok_1",
    userId: "friend",
    tokenHash: "h",
    scopes: [],
    anonymizeInstitutions: true,
    expiresAt: null,
    revokedAt: null,
  };
  function withRepo() {
    const repo = { findOne: vi.fn().mockResolvedValue(row) };
    return new McpTokenService(repo as never);
  }
  const original = process.env;

  it("returns null for a token whose owner is not allowlisted in production", async () => {
    process.env = {
      ...original,
      NODE_ENV: "production",
      MCP_ALLOWED_USER_IDS: "owner",
      MCP_OPEN_ACCESS: "",
    };
    try {
      expect(await withRepo().findTokenByHash("h")).toBeNull();
    } finally {
      process.env = original;
    }
  });

  it("returns null for every token while the kill switch is on, even with open access", async () => {
    process.env = {
      ...original,
      NODE_ENV: "production",
      MCP_ENABLED: "false",
      MCP_OPEN_ACCESS: "true",
    };
    try {
      expect(await withRepo().findTokenByHash("h")).toBeNull();
    } finally {
      process.env = original;
    }
  });

  it("logs the denial with token id and user id, never the hash", async () => {
    process.env = {
      ...original,
      NODE_ENV: "production",
      MCP_ALLOWED_USER_IDS: "owner",
      MCP_OPEN_ACCESS: "",
    };
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      await withRepo().findTokenByHash("secret-hash");
      const msgs = warn.mock.calls.map((c) => String(c[0]));
      expect(msgs.some((m) => m.includes("tok_1") && m.includes("friend"))).toBe(true);
      expect(msgs.some((m) => m.includes("secret-hash"))).toBe(false);
    } finally {
      warn.mockRestore();
      process.env = original;
    }
  });

  it("returns the record for an allowlisted owner or when open", async () => {
    try {
      process.env = {
        ...original,
        NODE_ENV: "production",
        MCP_ALLOWED_USER_IDS: "friend",
        MCP_OPEN_ACCESS: "",
      };
      expect((await withRepo().findTokenByHash("h"))?.id).toBe("tok_1");
      process.env = { ...original, NODE_ENV: "production", MCP_OPEN_ACCESS: "true" };
      expect((await withRepo().findTokenByHash("h"))?.id).toBe("tok_1");
    } finally {
      process.env = original;
    }
  });
});

describe("McpTokenService.recordRequest (E17-N6)", () => {
  it("issues one atomic UPDATE adding the count and setting lastUsedAt", async () => {
    const qb: any = {};
    for (const m of ["update", "set", "where", "setParameter"]) qb[m] = vi.fn(() => qb);
    qb.execute = vi.fn().mockResolvedValue(undefined);
    const repo = { createQueryBuilder: vi.fn(() => qb) };
    const service = new McpTokenService(repo as never);
    await service.recordRequest("tok_1", 3);
    const set = qb.set.mock.calls[0][0];
    expect(set.totalToolCalls()).toBe("total_tool_calls + :n");
    expect(set.lastUsedAt()).toBe("now()");
    expect(qb.setParameter).toHaveBeenCalledWith("n", 3);
    expect(qb.where).toHaveBeenCalledWith("id = :id", { id: "tok_1" });
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });
});
