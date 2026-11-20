import { Logger } from "@nestjs/common";
import { describe, expect, it, type Mock, vi } from "vitest";
import { fakeBetaMembership } from "../../testing/fake-beta-membership";
import { at } from "../../testing/must";
import { McpTokenService } from "./mcp-token.service";

describe("McpTokenService.findTokenByHash allowlist (E29-T8)", () => {
  const row = {
    id: "tok_1",
    userId: "friend",
    tokenHash: "h",
    scopes: [],
    anonymizeInstitutions: true,
    expiresAt: new Date(Date.now() + 86_400_000),
    revokedAt: null,
  };
  const membership = fakeBetaMembership();
  function withRepo(overrides: Partial<typeof row> | { expiresAt: null } = {}) {
    const repo = { findOne: vi.fn().mockResolvedValue({ ...row, ...overrides }) };
    return new McpTokenService(repo as never, membership);
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

  it("logs the denial with the token id, never the user id or the hash (S6)", async () => {
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
      expect(msgs.some((m) => m.includes("tok_1"))).toBe(true);
      expect(msgs.some((m) => m.includes("friend"))).toBe(false);
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
        BETA_OPEN: "true",
      };
      expect((await withRepo().findTokenByHash("h"))?.id).toBe("tok_1");
      process.env = {
        ...original,
        NODE_ENV: "production",
        MCP_OPEN_ACCESS: "true",
        BETA_OPEN: "true",
      };
      expect((await withRepo().findTokenByHash("h"))?.id).toBe("tok_1");
    } finally {
      process.env = original;
    }
  });

  const openMcp = { NODE_ENV: "production", MCP_OPEN_ACCESS: "true" };
  /** Production with MCP open and only the given beta variables. */
  const beta = (vars: Record<string, string>) => {
    process.env = { ...original, ...openMcp, ...vars };
    for (const name of [
      "BETA_ALLOWED_EMAILS",
      "BETA_ALLOWED_USER_IDS",
      "BETA_ADMIN_USER_IDS",
      "BETA_OPEN",
    ]) {
      if (!(name in vars)) delete process.env[name];
    }
  };
  const allowed = async () => (await withRepo().findTokenByHash("h"))?.id === "tok_1";

  it("refuses a token whose owner was removed from the closed beta (S1)", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      beta({ BETA_ALLOWED_USER_IDS: "someone-else" });
      expect(await withRepo().findTokenByHash("h")).toBeNull();
      const msgs = warn.mock.calls.map((c) => String(c[0]));
      expect(msgs.some((m) => m.includes("reason=beta_allowlist"))).toBe(true);
      expect(msgs.some((m) => m.includes("friend"))).toBe(false);
    } finally {
      warn.mockRestore();
      process.env = original;
    }
  });

  it("with only an email list, refuses an unlisted id: a token has no email (fail closed)", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      beta({ BETA_ALLOWED_EMAILS: "friend@example.com" });
      expect(await allowed()).toBe(false);
      beta({ BETA_ALLOWED_EMAILS: "friend@example.com", BETA_ALLOWED_USER_IDS: "someone-else" });
      expect(await allowed()).toBe(false);
    } finally {
      vi.restoreAllMocks();
      process.env = original;
    }
  });

  it("with an email list and the owner's id listed, accepts the token", async () => {
    try {
      beta({ BETA_ALLOWED_EMAILS: "friend@example.com", BETA_ALLOWED_USER_IDS: "friend" });
      expect(await allowed()).toBe(true);
    } finally {
      process.env = original;
    }
  });

  it("accepts a token whose owner is on the beta user-id list, or when the beta is open", async () => {
    try {
      beta({ BETA_ALLOWED_USER_IDS: "friend" });
      expect(await allowed()).toBe(true);
      beta({ BETA_OPEN: "true" });
      expect(await allowed()).toBe(true);
    } finally {
      process.env = original;
    }
  });

  it("accepts an admin's token and an active member's, and stops a removed member's at once", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      beta({ BETA_ADMIN_USER_IDS: "friend" });
      expect(await allowed()).toBe(true);
      beta({ BETA_ADMIN_USER_IDS: "owner" });
      membership.members.add("friend");
      expect(await allowed()).toBe(true);
      // Removal is read on the token's very next use: no cache, no revocation needed.
      membership.members.delete("friend");
      expect(await allowed()).toBe(false);
    } finally {
      membership.members.clear();
      vi.restoreAllMocks();
      process.env = original;
    }
  });

  it("refuses every token in production with no beta variables (invite-only, nobody listed)", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      beta({});
      expect(await allowed()).toBe(false);
    } finally {
      vi.restoreAllMocks();
      process.env = original;
    }
  });

  it("refuses a row with no expiry (S2)", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      beta({ BETA_OPEN: "true" });
      expect(await withRepo({ expiresAt: null }).findTokenByHash("h")).toBeNull();
    } finally {
      vi.restoreAllMocks();
      process.env = original;
    }
  });
});

type UpdateBuilder = { update: Mock; set: Mock; where: Mock; setParameter: Mock; execute: Mock };

/** A chainable update query builder whose `execute` resolves. */
const fakeUpdateBuilder = (): UpdateBuilder => {
  const qb = {} as UpdateBuilder;
  for (const m of ["update", "set", "where", "setParameter"] as const) qb[m] = vi.fn(() => qb);
  qb.execute = vi.fn().mockResolvedValue(undefined);
  return qb;
};

describe("McpTokenService.recordRequest (E17-N6)", () => {
  it("issues one atomic UPDATE adding the count and setting lastUsedAt", async () => {
    const qb = fakeUpdateBuilder();
    const query = vi.fn().mockResolvedValue([]);
    const repo = { createQueryBuilder: vi.fn(() => qb), query };
    const service = new McpTokenService(repo as never, fakeBetaMembership());
    await service.recordRequest("tok_1", 3);
    // BE-06: AI-connection use marks the owner active (at most daily), keyed by the token id.
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"last_active_at" = now()'), [
      "tok_1",
    ]);
    const set = at(qb.set.mock.calls, 0)[0];
    expect(set.totalToolCalls()).toBe("total_tool_calls + :n");
    expect(set.lastUsedAt()).toBe("now()");
    expect(qb.setParameter).toHaveBeenCalledWith("n", 3);
    expect(qb.where).toHaveBeenCalledWith("id = :id", { id: "tok_1" });
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });

  it("never fails the MCP request when the activity write fails", async () => {
    const qb = fakeUpdateBuilder();
    const repo = {
      createQueryBuilder: vi.fn(() => qb),
      query: vi.fn().mockRejectedValue(new Error("x")),
    };
    await expect(
      new McpTokenService(repo as never, fakeBetaMembership()).recordRequest("tok_1", 1),
    ).resolves.toBeUndefined();
  });
});
