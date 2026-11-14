import type { HttpTransportOptions } from "@flump/mcp";
import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handlerOptions: HttpTransportOptions[] = [];

vi.mock("@flump/mcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flump/mcp")>();
  return {
    ...actual,
    HttpMcpHandler: class {
      constructor(options: HttpTransportOptions) {
        handlerOptions.push(options);
      }
    },
  };
});

import { DEV_BYPASS_TOKEN, DEV_USER } from "../../auth/dev-bypass.verifier";
import { financeServiceWithIntake } from "../../testing/finance-service";
import { at, must } from "../../testing/must";
import { UserProfileService } from "../profile/user-profile.service";
import { AgentDataService } from "./agent-data.service";
import { McpService } from "./mcp.service";
import { McpTokenService } from "./mcp-token.service";

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
    return { service, audit, adapter, options: at(handlerOptions, 0) };
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
    expect(at(handlerOptions, 0).limitStore).toBe(store);
    handlerOptions.length = 0;
    make();
    expect(at(handlerOptions, 0).limitStore).toBeUndefined();
  });

  it("hands the handler the import adapter, the audit sink and the fingerprint hook", () => {
    const { options, adapter, audit } = make();
    expect(options.imports).toBe(adapter);
    expect(options.fingerprintArgs?.({ x: 1 })).toBe("a".repeat(64));
    expect(audit.fingerprint).toHaveBeenCalledWith({ x: 1 });
    expect(typeof options.audit).toBe("function");
  });

  it("hands the handler a Nest logger so MCP logs never go to console (L6)", () => {
    const { options } = make();
    expect(options.logger).toBeInstanceOf(Logger);
    expect(typeof options.logger?.warn).toBe("function");
    expect(typeof options.logger?.error).toBe("function");
  });

  it("records a prompt or resource read under its fixed audit name (H12)", async () => {
    const { options, audit } = make();
    await must(options.audit)(
      {
        token: {
          userId: "u1",
          tokenId: "t1",
          scopes: [],
          anonymizeInstitutions: true,
          type: "pat",
        },
      },
      {
        tool: "resource_read_schema",
        outcome: "ok",
        durationMs: 1,
        responseBytes: 10,
        scopesUsed: ["mcp:read:anonymized"],
      },
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "resource_read_schema", outcome: "ok" }),
    );
  });

  it("records one audit row per tool call with the caller's identifiers", async () => {
    const { options, audit } = make();
    await must(options.audit)(
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
      must(options.audit)(
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
    expect(at(handlerOptions, 0).devToken).toBe(DEV_BYPASS_TOKEN);
    expect(at(handlerOptions, 0).devUserId).toBe(DEV_USER.id);
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
    expect(at(handlerOptions, 0).devToken).toBeUndefined();
    expect(at(handlerOptions, 1).devToken).toBeUndefined();
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
      const opts = at(handlerOptions, 0);
      expect(opts.allowedOrigins).toEqual(["https://a.example", "https://b.example"]);
      expect(opts.isEnabled?.()).toBe(true);
      process.env = { ...process.env, MCP_ENABLED: "false" };
      expect(opts.isEnabled?.()).toBe(false);
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
    expect(at(handlerOptions, 0).allowedOrigins).toEqual([]);
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
    expect(at(handlerOptions, 0).allowedOrigins).toEqual([]);
  });

  it("passes no dev options in workos mode", () => {
    build("workos");
    expect(at(handlerOptions, 0).devToken).toBeUndefined();
    expect(at(handlerOptions, 0).devUserId).toBeUndefined();
  });
});

/** In-memory repository stand-in that records every write attempt. */
function memoryRepo() {
  const rows: Record<string, unknown>[] = [];
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
    create: (v: Record<string, unknown>) => ({ ...v }),
    find: vi.fn(async () => [...rows]),
    findOne: vi.fn(async (opts?: { where?: Record<string, unknown> }) => {
      const where = opts?.where ?? {};
      return rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
    }),
    save: vi.fn(async (v: Record<string, unknown>) => {
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
    const finance = financeServiceWithIntake(
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
      details as never,
      connections as never,
      {} as never,
      {} as never,
      {} as never,
      { isErased: async () => false } as never,
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
