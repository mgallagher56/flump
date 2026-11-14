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

import { AgentDataService } from "./agent/agent-data.service";
import { McpTokenService } from "./agent/mcp-token.service";
import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import { FinanceService } from "./finance.service";
import { McpService } from "./mcp.service";
import { UserProfileService } from "./user-profile.service";

function build(mode: "workos" | "dev") {
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const nothing = {} as never;
  return new McpService(nothing, nothing, config as never, mode, nothing, nothing);
}

describe("McpService audit and staging wiring (E17 re-plan PR D)", () => {
  beforeEach(() => {
    handlerOptions.length = 0;
  });

  const make = (record = vi.fn().mockResolvedValue(undefined)) => {
    const audit = { record, fingerprint: vi.fn().mockReturnValue("a".repeat(64)) };
    const adapter = { stageImport: vi.fn(), getImportStatus: vi.fn() };
    const config = { get: vi.fn().mockReturnValue(undefined) };
    const service = new McpService(
      {} as never,
      {} as never,
      config as never,
      "workos",
      audit as never,
      adapter as never,
    );
    return { service, audit, adapter, options: handlerOptions[0] };
  };

  it("hands the handler the shared rate-limit store for both MCP limiters (BE-07, M10)", () => {
    const store = { hit: vi.fn(), peek: vi.fn(), reset: vi.fn(), refund: vi.fn() };
    new McpService(
      {} as never,
      {} as never,
      { get: vi.fn().mockReturnValue(undefined) } as never,
      "workos",
      {} as never,
      {} as never,
      store as never,
    );
    expect(handlerOptions[0].limitStore).toBe(store);
    handlerOptions.length = 0;
    make();
    expect(handlerOptions[0].limitStore).toBeUndefined();
  });

  it("hands the handler the import adapter, the audit sink and the fingerprint hook", () => {
    const { options, adapter, audit } = make();
    expect(options.imports).toBe(adapter);
    expect(options.fingerprintArgs({ x: 1 })).toBe("a".repeat(64));
    expect(audit.fingerprint).toHaveBeenCalledWith({ x: 1 });
    expect(typeof options.audit).toBe("function");
  });

  it("records one audit row per tool call with the caller's identifiers", async () => {
    const { options, audit } = make();
    await options.audit(
      {
        token: {
          userId: "u1",
          tokenId: "00000000-0000-4000-8000-000000000001",
          scopes: [],
          anonymizeInstitutions: true,
          type: "pat",
        },
        clientName: "claude-ai/1.0",
      },
      {
        tool: "stage_import",
        outcome: "denied",
        errorCode: "INSUFFICIENT_SCOPE",
        durationMs: 3,
        responseBytes: 120,
        scopesUsed: ["mcp:read:anonymized"],
        argsFingerprint: "b".repeat(64),
      },
    );
    expect(audit.record).toHaveBeenCalledWith({
      userId: "u1",
      tokenId: "00000000-0000-4000-8000-000000000001",
      clientName: "claude-ai/1.0",
      toolName: "stage_import",
      scopesUsed: ["mcp:read:anonymized"],
      outcome: "denied",
      errorCode: "INSUFFICIENT_SCOPE",
      latencyMs: 3,
      responseBytes: 120,
      argsFingerprint: "b".repeat(64),
    });
  });

  it("never fails a call when the audit write fails", async () => {
    const { options } = make(vi.fn().mockRejectedValue(new Error("db down")));
    await expect(
      options.audit(
        { token: { userId: "u1", scopes: [], anonymizeInstitutions: true, type: "pat" } },
        { tool: "list_accounts", outcome: "ok", durationMs: 1, responseBytes: 1, scopesUsed: [] },
      ),
    ).resolves.toBeUndefined();
  });
});

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

  it("wires isEnabled and allowedOrigins from the environment into the handler (E20-N18)", () => {
    const original = process.env;
    try {
      process.env = {
        ...original,
        MCP_ENABLED: "true",
        MCP_ALLOWED_ORIGINS: "https://a.example/, https://b.example",
      };
      build("workos");
      const opts = handlerOptions[0];
      expect(opts.allowedOrigins).toEqual(["https://a.example", "https://b.example"]);
      expect(opts.isEnabled()).toBe(true);
      process.env = { ...process.env, MCP_ENABLED: "false" };
      expect(opts.isEnabled()).toBe(false);
    } finally {
      process.env = original;
    }
  });

  it('does not pass "null" or "*" through as allowed origins', () => {
    const original = process.env;
    try {
      process.env = { ...original, MCP_ALLOWED_ORIGINS: "null,*" };
      build("workos");
    } finally {
      process.env = original;
    }
    expect(handlerOptions[0].allowedOrigins).toEqual([]);
  });

  it("passes an empty origin list by default", () => {
    const original = process.env;
    try {
      const { MCP_ALLOWED_ORIGINS: _drop, ...rest } = original;
      process.env = rest;
      build("workos");
    } finally {
      process.env = original;
    }
    expect(handlerOptions[0].allowedOrigins).toEqual([]);
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
    const agentData = new AgentDataService(
      budget as never,
      tax as never,
      transactions as never,
      finance,
      profileService,
      accounts as never,
      details as never,
    );
    const service = new McpService(
      new McpTokenService(mcpTokens as never),
      agentData,
      config as never,
      "workos",
      {} as never,
      {} as never,
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
