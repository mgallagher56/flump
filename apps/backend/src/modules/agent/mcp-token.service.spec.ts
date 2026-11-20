import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";
import { encodeCursor } from "../../contract/pagination";
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

describe("McpTokenService.listTokens expiry label", () => {
  // The MCP verifier refuses a token once now has reached its expiry (token-verifier.ts:
  // `expiresAtMs <= Date.now()`), as a JWT exp works. The list must label the same token expired
  // at that same instant, or for one millisecond the page says "active" for a token that is refused.
  const expiresAt = new Date("2026-11-20T12:00:00.000Z");
  const token = {
    id: "tok_1",
    userId: "u_1",
    name: "Laptop",
    tokenPrefix: "flp_abc",
    scopes: [],
    anonymizeInstitutions: true,
    expiresAt,
    lastUsedAt: null,
    totalToolCalls: 0,
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    revokedAt: null,
  };
  const service = () =>
    new McpTokenService(
      { find: vi.fn().mockResolvedValue([token]) } as never,
      fakeBetaMembership(),
    );

  afterEach(() => vi.useRealTimers());

  it("labels a token expired at its exact expiry instant", async () => {
    vi.useFakeTimers({ now: expiresAt, toFake: ["Date"] });
    const [item] = await service().listTokens("u_1");
    expect(item?.isExpired).toBe(true);
  });

  it("labels it not expired one millisecond before", async () => {
    vi.useFakeTimers({ now: expiresAt.getTime() - 1, toFake: ["Date"] });
    const [item] = await service().listTokens("u_1");
    expect(item?.isExpired).toBe(false);
  });

  it("asks only for the caller's own tokens, newest first", async () => {
    // Tenancy contract: the lookup is filtered by the caller's user id, so one user never sees
    // another's tokens; the list reads newest first.
    const find = vi.fn().mockResolvedValue([]);
    await new McpTokenService({ find } as never).listTokens("u_1");
    expect(find).toHaveBeenCalledWith({ where: { userId: "u_1" }, order: { createdAt: "DESC" } });
  });
});

describe("McpTokenService.listTokensPage (GET /mcp-tokens, BE-09)", () => {
  /** A chainable stand-in for TypeORM's query builder that records each call. */
  const builder = () => {
    const calls: Array<[string, unknown[]]> = [];
    const qb: Record<string, unknown> = {};
    for (const m of ["where", "andWhere", "addSelect", "orderBy", "addOrderBy", "limit"]) {
      qb[m] = (...args: unknown[]) => {
        calls.push([m, args]);
        return qb;
      };
    }
    qb.getRawAndEntities = async () => ({ entities: [], raw: [] });
    return { repo: { createQueryBuilder: () => qb }, calls };
  };

  it("filters by the caller and orders newest first with the id as tiebreak", async () => {
    const { repo, calls } = builder();
    const page = await new McpTokenService(repo as never).listTokensPage("u_1", { limit: 10 });
    expect(calls).toContainEqual(["where", ["t.userId = :userId", { userId: "u_1" }]]);
    // Documented order: created_at descending, then id descending for equal times.
    expect(calls).toContainEqual(["orderBy", ['"t"."created_at"', "DESC"]]);
    expect(calls).toContainEqual(["addOrderBy", ['"t"."id"', "DESC"]]);
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("accepts a cursor made of a creation time and a token id", async () => {
    // The cursor is the last row's (created_at, id): a microsecond timestamp and a UUID.
    const { repo } = builder();
    const cursor = encodeCursor([
      "2026-11-20T12:00:00.000000",
      "0b6f4e1a-9c2d-4e3f-a1b2-c3d4e5f60711",
    ]);
    await expect(
      new McpTokenService(repo as never).listTokensPage("u_1", { limit: 10, cursor }),
    ).resolves.toEqual({ items: [], nextCursor: null });
  });
});
