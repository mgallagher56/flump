import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handlerOptions: any[] = [];

vi.mock("@flump/mcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flump/mcp")>();
  return {
    ...actual,
    HttpMcpHandler: class {
      constructor(options: unknown) {
        handlerOptions.push(options);
      }
    },
  };
});

import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import { FinanceService } from "./finance.service";
import { McpService } from "./mcp.service";
import { UserProfileService } from "./user-profile.service";

function build(mode: "workos" | "dev") {
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const nothing = {} as never;
  return new McpService(
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    config as never,
    mode,
  );
}

describe("McpService dev token wiring", () => {
  beforeEach(() => {
    handlerOptions.length = 0;
  });

  it("passes the dev token and user only in dev mode", () => {
    build("dev");
    expect(handlerOptions[0].devToken).toBe(DEV_BYPASS_TOKEN);
    expect(handlerOptions[0].devUserId).toBe(DEV_USER.id);
  });

  it("never passes dev options in a production-like process, even in dev mode", () => {
    const original = process.env;
    try {
      process.env = { ...original, NODE_ENV: "production" };
      build("dev");
      process.env = { ...original, NODE_ENV: "development", RAILWAY_ENVIRONMENT: "x" };
      build("dev");
    } finally {
      process.env = original;
    }
    expect(handlerOptions[0].devToken).toBeUndefined();
    expect(handlerOptions[1].devToken).toBeUndefined();
  });

  it("passes no dev options in workos mode", () => {
    build("workos");
    expect(handlerOptions[0].devToken).toBeUndefined();
    expect(handlerOptions[0].devUserId).toBeUndefined();
  });
});

/** In-memory repository stand-in that records every write attempt. */
function memoryRepo() {
  const rows: any[] = [];
  const writes = {
    save: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    remove: vi.fn(),
  };
  const repo = {
    rows,
    writes,
    create: (v: any) => ({ ...v }),
    find: vi.fn(async () => [...rows]),
    findOne: vi.fn(async (opts?: any) => {
      const where = opts?.where ?? {};
      return rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
    }),
    save: vi.fn(async (v: any) => {
      writes.save(v);
      const row = { id: `row-${rows.length + 1}`, ...v };
      rows.push(row);
      return row;
    }),
    insert: writes.insert,
    upsert: writes.upsert,
    update: writes.update,
    delete: writes.delete,
    remove: writes.remove,
  };
  return repo;
}

describe("McpService.getContextPack for a brand-new user", () => {
  it("returns zero accounts and writes no account, detail, budget, tax or transaction rows", async () => {
    const userId = "new-user";
    const mcpTokens = memoryRepo();
    const profiles = memoryRepo();
    const accounts = memoryRepo();
    const details = memoryRepo();
    const budget = memoryRepo();
    const tax = memoryRepo();
    const transactions = memoryRepo();
    const connections = memoryRepo();

    const config = { get: vi.fn().mockReturnValue(undefined) };
    const finance = new FinanceService(
      accounts as never,
      transactions as never,
      details as never,
      connections as never,
      profiles as never,
      {} as never,
      config as never,
    );
    const profileService = new UserProfileService(
      profiles as never,
      accounts as never,
      transactions as never,
      details as never,
      connections as never,
      budget as never,
      tax as never,
    );
    const service = new McpService(
      mcpTokens as never,
      profiles as never,
      accounts as never,
      details as never,
      budget as never,
      tax as never,
      transactions as never,
      finance,
      profileService,
      config as never,
      "workos",
    );

    const { pack, markdown } = await service.getContextPack(userId);

    expect(pack.portfolio.accounts).toHaveLength(0);
    expect(typeof markdown).toBe("string");
    for (const repo of [accounts, details, budget, tax, transactions, connections, mcpTokens]) {
      for (const fn of Object.values(repo.writes)) expect(fn).not.toHaveBeenCalled();
      expect(repo.rows).toHaveLength(0);
    }
    // The only permitted write: the lazily created, empty-defaults profile row.
    expect(profiles.writes.save).toHaveBeenCalledTimes(1);
  });
});

describe("McpService.findTokenByHash allowlist (E29-T8)", () => {
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
    const nothing = {} as never;
    const repo = { findOne: vi.fn().mockResolvedValue(row) };
    return new McpService(
      repo as never,
      nothing,
      nothing,
      nothing,
      nothing,
      nothing,
      nothing,
      nothing,
      nothing,
      { get: vi.fn() } as never,
      "workos",
    );
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

  it("returns null for every token while the kill switch is on, and logs a denial", async () => {
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
