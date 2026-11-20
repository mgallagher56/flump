import { type BuildContextPackInput, DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
import type { HttpTransportOptions } from "@flump/mcp";
import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBetaMembership } from "../../testing/fake-beta-membership";

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
import { FinancialPictureService } from "./financial-picture.service";
import { McpService } from "./mcp.service";
import { McpTokenService } from "./mcp-token.service";

/** The service with its picture loader built from the same mocks (old positional order). */
function agentData(
  budget: never,
  tax: never,
  transactions: never,
  finance: never,
  profile: never,
  accounts: never,
  details: never,
  plans: never,
): AgentDataService {
  const picture = new FinancialPictureService(budget, tax, finance, profile);
  return new AgentDataService(tax, transactions, profile, accounts, details, plans, picture);
}

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

  it("logs a failed audit write by the error's name only, never its message", async () => {
    const failure = Object.assign(new Error("insert failed for user u1"), {
      name: "QueryFailedError",
    });
    const { options } = make(vi.fn().mockRejectedValue(failure));
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    try {
      await must(options.audit)(
        { token: { userId: "u1", scopes: [], anonymizeInstitutions: true, type: "pat" } },
        { tool: "list_accounts", outcome: "ok", durationMs: 1, responseBytes: 1, scopesUsed: [] },
      );
      expect(error).toHaveBeenCalledTimes(1);
      const line = String(error.mock.calls[0]?.[0]);
      expect(line).toContain("QueryFailedError");
      expect(line).not.toContain("u1");
    } finally {
      error.mockRestore();
    }
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

  it("offers every tool to every caller, the retirement ones included (owner, 20 Nov 2026)", () => {
    build("workos");
    expect(at(handlerOptions, 0).isToolAvailable).toBeUndefined();
  });

  it("passes no dev options in workos mode", () => {
    build("workos");
    expect(at(handlerOptions, 0).devToken).toBeUndefined();
    expect(at(handlerOptions, 0).devUserId).toBeUndefined();
  });

  it("advertises the configured audience and auth server, and the defaults when unset", () => {
    const settings: Record<string, string> = {
      MCP_AUDIENCE: "https://mcp.example.test",
      AUTH_SERVER_URL: "https://auth.example.test",
    };
    const nothing = {} as never;
    const configured = { get: vi.fn((name: string) => settings[name]) };
    new McpService(nothing, nothing, configured as never, "workos", nothing, nothing);
    expect(at(handlerOptions, 0).expectedAudience).toBe("https://mcp.example.test");
    expect(at(handlerOptions, 0).authServerUrl).toBe("https://auth.example.test");
    // Unset (or empty): the documented defaults, the "flump-mcp" audience and WorkOS's API.
    build("workos");
    expect(at(handlerOptions, 1).expectedAudience).toBe("flump-mcp");
    expect(at(handlerOptions, 1).authServerUrl).toBe("https://api.workos.com");
  });
});

describe("McpService.getInput (GET /mcp/input) anonymises as the remote tools do", () => {
  const raw: BuildContextPackInput = {
    baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "user_real" },
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    accounts: [
      { id: "acc-1", name: "Jane's joint 4471", type: "Jane's ISA 4471", balance: "500.00" },
    ],
    accountDetails: [],
    budgetEntries: [],
    taxRecords: [],
  };
  const make = () => {
    const agentData = { getUserFinancialData: vi.fn().mockResolvedValue(raw) };
    const audit = { record: vi.fn().mockResolvedValue(undefined), fingerprint: vi.fn() };
    const service = new McpService(
      {} as never,
      agentData as never,
      { get: vi.fn().mockReturnValue(undefined) } as never,
      "workos",
      audit as never,
      {} as never,
    );
    return { service, agentData };
  };
  const caller = (anonymizeInstitutions: boolean, scopes: string[]) => ({
    token: { userId: "user_real", tokenId: "tok-1", scopes, anonymizeInstitutions, type: "pat" },
  });

  it("a legacy row with the flag off but only the anonymised scope gets no real name or type", async () => {
    const { service, agentData } = make();
    const body = await service.getInput(caller(false, ["mcp:read:anonymized"]) as never);
    const text = JSON.stringify(body);
    for (const hidden of ["Jane", "4471", "user_real"]) expect(text, hidden).not.toContain(hidden);
    expect(body.token.anonymizeInstitutions).toBe(true);
    expect(body.input.accounts[0]).toMatchObject({ name: "Other Account #1", type: "Other" });
    expect(agentData.getUserFinancialData).toHaveBeenCalledWith("user_real");
  });

  it("a full-read token with the flag off still gets the real names", async () => {
    const { service } = make();
    const body = await service.getInput(caller(false, ["mcp:read:full"]) as never);
    expect(body.token.anonymizeInstitutions).toBe(false);
    expect(body.input.accounts[0]).toMatchObject({
      name: "Jane's joint 4471",
      type: "Jane's ISA 4471",
    });
  });

  it("tells an older local server the retirement tools are available, for everyone", async () => {
    const { service } = make();
    const body = await service.getInput(caller(false, ["mcp:read:full"]) as never);
    expect(body.retirementAvailable).toBe(true);
  });

  it("records a failed read as an error with no bytes sent, then passes the failure on", async () => {
    const failure = new Error("load failed");
    const agentData = { getUserFinancialData: vi.fn().mockRejectedValue(failure) };
    const audit = { record: vi.fn().mockResolvedValue(undefined), fingerprint: vi.fn() };
    const service = new McpService(
      {} as never,
      agentData as never,
      { get: vi.fn().mockReturnValue(undefined) } as never,
      "workos",
      audit as never,
      {} as never,
    );
    await expect(service.getInput(caller(true, ["mcp:read:anonymized"]) as never)).rejects.toBe(
      failure,
    );
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_real", outcome: "error", responseBytes: 0 }),
    );
  });
});

describe("McpService.getContextPack anonymises by default", () => {
  it("asks for anonymised institutions when the caller does not say", async () => {
    const raw: BuildContextPackInput = {
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u1" },
      netWorthBasis: { countProperty: true, countStudentLoan: false },
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [],
    };
    const agentData = { getUserFinancialData: vi.fn().mockResolvedValue(raw) };
    const service = new McpService(
      {} as never,
      agentData as never,
      { get: vi.fn().mockReturnValue(undefined) } as never,
      "workos",
      {} as never,
      {} as never,
    );
    await service.getContextPack("u1");
    expect(agentData.getUserFinancialData).toHaveBeenCalledWith("u1", {
      anonymizeInstitutions: true,
    });
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
    const retirementPlans = memoryRepo();

    const config = { get: vi.fn().mockReturnValue(undefined) };
    const finance = financeServiceWithIntake(
      accounts as never,
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
    const dataService = agentData(
      budget as never,
      tax as never,
      transactions as never,
      finance as never,
      profileService as never,
      accounts as never,
      details as never,
      retirementPlans as never,
    );
    const service = new McpService(
      new McpTokenService(mcpTokens as never, fakeBetaMembership()),
      dataService,
      config as never,
      "workos",
      {} as never,
      {} as never,
    );

    const { pack, markdown } = await service.getContextPack(userId);

    expect(pack.portfolio.accounts).toHaveLength(0);
    expect(typeof markdown).toBe("string");
    for (const repo of [
      accounts,
      details,
      budget,
      tax,
      transactions,
      connections,
      mcpTokens,
      retirementPlans,
    ]) {
      for (const fn of Object.values(repo.writes)) expect(fn).not.toHaveBeenCalled();
      expect(repo.rows).toHaveLength(0);
    }
    // The only permitted write: the lazily created, empty-defaults profile row.
    expect(profiles.writes.save).toHaveBeenCalledTimes(1);
  });
});
