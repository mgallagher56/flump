import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContractShadowInterceptor,
  resolveContractMode,
  resolveEnforcedGroups,
  shouldCheckResponse,
  shouldLogOccurrence,
} from "./contract-shadow.interceptor";

const run = (
  interceptor: ContractShadowInterceptor,
  req: Record<string, unknown>,
  type = "http",
) => {
  const next = { handle: vi.fn(() => of("handled")) };
  const context = {
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => req }),
  };
  interceptor.intercept(context as never, next);
  return next;
};

const warnings = (spy: { mock: { calls: unknown[][] } }): Array<Record<string, any>> =>
  spy.mock.calls.map(([message]) => JSON.parse(message as string));

describe("ContractShadowInterceptor", () => {
  // These cases pin shadow behaviour; enforce is the default and has its own block below.
  beforeEach(() => {
    process.env.CONTRACT_MODE = "shadow";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CONTRACT_MODE;
    delete process.env.CONTRACT_ENFORCE_GROUPS;
  });

  it("logs a violation with paths and codes only, and passes the request through untouched", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const body = { name: "secret-name", type: "Current", balance: "oops", userId: "u1" };
    const req = { method: "POST", route: { path: "/accounts" }, params: {}, query: {}, body };
    const next = run(new ContractShadowInterceptor(), req);

    expect(next.handle).toHaveBeenCalledOnce();
    expect(req.body).toBe(body);
    const [violation] = warnings(warn);
    expect(violation).toMatchObject({
      event: "contract_violation",
      routeId: "accounts.create",
      part: "body",
      count: 1,
    });
    expect(violation.issues).toEqual(
      expect.arrayContaining([
        { path: "balance", code: "invalid_type" },
        { path: "userId", code: "unrecognized_keys" },
      ]),
    );
    expect(JSON.stringify(violation)).not.toContain("secret-name");
  });

  it("counts violations per route and stays quiet for valid requests", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const interceptor = new ContractShadowInterceptor();
    const bad = { method: "PATCH", route: { path: "/accounts/:id" }, params: { id: "nope" } };
    run(interceptor, bad);
    run(interceptor, bad);
    expect(warnings(warn).map((v) => v.count)).toEqual([1, 2]);

    warn.mockClear();
    run(interceptor, {
      method: "PATCH",
      route: { path: "/accounts/:id" },
      params: { id: "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f" },
      body: { balance: 10 },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("ignores unknown routes and non-http contexts", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    run(new ContractShadowInterceptor(), { method: "POST", route: { path: "/mcp" }, body: 1 });
    run(new ContractShadowInterceptor(), { method: "GET", route: { path: "/elsewhere" } });
    run(new ContractShadowInterceptor(), { method: "POST", route: { path: "/accounts" } }, "rpc");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does nothing when CONTRACT_MODE=off", () => {
    process.env.CONTRACT_MODE = "off";
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const next = run(new ContractShadowInterceptor(), {
      method: "POST",
      route: { path: "/accounts" },
      body: {},
    });
    expect(next.handle).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it("never throws, even if the request is malformed", () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const next = run(new ContractShadowInterceptor(), {
      method: "POST",
      route: { path: "/accounts" },
      get body(): unknown {
        throw new Error("boom");
      },
    });
    expect(next.handle).toHaveBeenCalledOnce();
  });

  it("resolves the mode from env: enforce unless shadow or off is asked for", () => {
    expect(resolveContractMode({})).toBe("enforce");
    expect(resolveContractMode({ CONTRACT_MODE: "OFF" })).toBe("off");
    expect(resolveContractMode({ CONTRACT_MODE: "shadow" })).toBe("shadow");
    expect(resolveContractMode({ CONTRACT_MODE: "shdow" })).toBe("enforce");
  });
});

describe("response shape check", () => {
  const listAccounts = { method: "GET", route: { path: "/accounts" }, params: {}, query: {} };
  const respond = (body: unknown, req: Record<string, unknown> = listAccounts) => {
    const next = { handle: vi.fn(() => of(body)) };
    const context = { getType: () => "http", switchToHttp: () => ({ getRequest: () => req }) };
    let received: unknown;
    new ContractShadowInterceptor().intercept(context as never, next).subscribe((value) => {
      received = value;
    });
    return received;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CONTRACT_MODE;
  });

  it("logs a response violation, paths and codes only, and still returns the body untouched", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const body = [{ id: "secret-id", name: "secret-name" }];
    expect(respond(body)).toBe(body);
    const [violation] = warnings(warn);
    expect(violation).toMatchObject({
      event: "contract_response_violation",
      routeId: "accounts.list",
      part: "response",
      count: 1,
    });
    expect(JSON.stringify(violation)).not.toContain("secret-name");
  });

  it("stays quiet for a valid body", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    respond([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does nothing when CONTRACT_MODE=off, and never throws on an unserialisable body", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(respond(cyclic)).toBe(cyclic);
    expect(String(warn.mock.calls[0]?.[0])).toContain("contract response check failed");

    warn.mockClear();
    process.env.CONTRACT_MODE = "off";
    respond([{ wrong: true }]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("response check sampling", () => {
  it("checks every response outside production", () => {
    for (const n of [1, 21, 49, 1000])
      expect(shouldCheckResponse(n, { NODE_ENV: "test" })).toBe(true);
  });

  it("checks the first 20 per route in production, then 1 in 50", () => {
    const prod = { NODE_ENV: "production" };
    const checked = Array.from({ length: 200 }, (_, i) => i + 1).filter((n) =>
      shouldCheckResponse(n, prod),
    );
    expect(checked).toEqual([...Array.from({ length: 20 }, (_, i) => i + 1), 50, 100, 150, 200]);
  });
});

describe("log volume limits", () => {
  beforeEach(() => {
    process.env.CONTRACT_MODE = "shadow";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CONTRACT_MODE;
  });

  it("logs only the 1st, 2nd and 10th occurrence, then every 100th", () => {
    const logged = Array.from({ length: 300 }, (_, i) => i + 1).filter(shouldLogOccurrence);
    expect(logged).toEqual([1, 2, 10, 100, 200, 300]);
  });

  it("caps logged issues at 20 and truncates long paths", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const body = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [`${"k".repeat(200)}${i}`, 1]),
    );
    run(new ContractShadowInterceptor(), {
      method: "POST",
      route: { path: "/accounts" },
      body: { name: "x", type: "Current", balance: 1, ...body },
    });
    const [violation] = warnings(warn);
    expect(violation.issues).toHaveLength(20);
    for (const issue of violation.issues) expect(issue.path.length).toBeLessThanOrEqual(80);
  });

  describe("enforce mode", () => {
    const badAccount = {
      method: "POST",
      route: { path: "/accounts" },
      params: {},
      query: {},
      body: { name: "secret-name", type: "Current", balance: "oops" },
    };

    it("rejects invalid requests with 400, paths and codes only", () => {
      process.env.CONTRACT_MODE = "enforce";
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const next = { handle: vi.fn(() => of("handled")) };
      const context = {
        getType: () => "http",
        switchToHttp: () => ({ getRequest: () => badAccount }),
      };
      let error: any;
      try {
        new ContractShadowInterceptor().intercept(context as never, next);
      } catch (e) {
        error = e;
      }
      expect(error?.getStatus()).toBe(400);
      expect(error.getResponse().code).toBe("validation_failed");
      expect(error.getResponse().issues).toEqual([
        { path: "body.balance", code: "invalid_type", message: expect.any(String) },
      ]);
      expect(JSON.stringify(error.getResponse())).not.toContain("secret-name");
      const rejected = warn.mock.calls
        .map(([m]) => JSON.parse(String(m)))
        .find((entry) => entry.event === "contract_rejected");
      expect(rejected).toMatchObject({ routeId: "accounts.create", pathTemplate: "/accounts" });
      expect(JSON.stringify(rejected)).not.toContain("secret-name");
      expect(next.handle).not.toHaveBeenCalled();
    });

    const rejectionOf = (req: Record<string, unknown>) => {
      const next = { handle: vi.fn(() => of("handled")) };
      const context = { getType: () => "http", switchToHttp: () => ({ getRequest: () => req }) };
      try {
        new ContractShadowInterceptor().intercept(context as never, next);
      } catch (e) {
        return { error: e as { getStatus(): number; getResponse(): any }, next };
      }
      return { error: undefined, next };
    };

    it("rejects unknown keys in the body, params and query (BE-09: strict schemas)", () => {
      process.env.CONTRACT_MODE = "enforce";
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const body = rejectionOf({
        ...badAccount,
        body: { name: "x", type: "Current", balance: 1, userId: "victim" },
      });
      expect(body.error?.getStatus()).toBe(400);
      expect(body.error?.getResponse().issues).toEqual([
        { path: "body.userId", code: "unrecognized_keys", message: "Unknown field" },
      ]);
      expect(body.next.handle).not.toHaveBeenCalled();

      const nested = rejectionOf({
        method: "PATCH",
        route: { path: "/accounts/balances" },
        params: {},
        query: {},
        body: { balances: [{ id: "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f", balance: 1, x: 1 }] },
      });
      expect(nested.error?.getResponse().issues).toEqual([
        expect.objectContaining({ path: "body.balances.0.x", code: "unrecognized_keys" }),
      ]);

      const query = rejectionOf({
        method: "GET",
        route: { path: "/transactions" },
        params: {},
        query: { accountId: "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f", cacheBust: "1" },
      });
      expect(query.error?.getResponse().issues).toEqual([
        expect.objectContaining({ path: "query.cacheBust", code: "unrecognized_keys" }),
      ]);
    });

    it("replaces body, query and params with the parsed contract output", () => {
      process.env.CONTRACT_MODE = "enforce";
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const id = "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f";
      const create: Record<string, unknown> = {
        ...badAccount,
        body: { name: "  Everyday  ", type: "Current", balance: 12.5 },
      };
      const created = rejectionOf(create);
      expect(created.error).toBeUndefined();
      expect(created.next.handle).toHaveBeenCalledOnce();
      // Name is trimmed by the contract; the handler sees the parsed value, not the raw one.
      expect(create.body).toEqual({ name: "Everyday", type: "Current", balance: 12.5 });

      // Express 5 makes req.query a getter: the interceptor must still replace it.
      const raw = { limit: "25" };
      const activity = Object.defineProperty(
        { method: "GET", route: { path: "/mcp-tokens/:id/activity" }, params: { id } },
        "query",
        { get: () => raw, configurable: true, enumerable: true },
      ) as Record<string, unknown>;
      expect(rejectionOf(activity).error).toBeUndefined();
      expect(activity.query).toEqual({ limit: 25 });
      expect(activity.params).toEqual({ id });
    });

    it("leaves the request untouched in shadow mode", () => {
      process.env.CONTRACT_MODE = "shadow";
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const body = { name: "  Everyday  ", type: "Current", balance: 1, extra: true };
      const req = { ...badAccount, body };
      const { error, next } = rejectionOf(req);
      expect(error).toBeUndefined();
      expect(next.handle).toHaveBeenCalledOnce();
      expect(req.body).toBe(body);
    });

    it("only enforces the groups listed in CONTRACT_ENFORCE_GROUPS", () => {
      process.env.CONTRACT_MODE = "enforce";
      process.env.CONTRACT_ENFORCE_GROUPS = "budget";
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const next = run(new ContractShadowInterceptor(), badAccount);
      expect(next.handle).toHaveBeenCalledOnce();
    });

    it("resolves modes and groups, ignoring unknown group names", () => {
      expect(resolveContractMode({ CONTRACT_MODE: " Enforce " })).toBe("enforce");
      expect(resolveContractMode({})).toBe("enforce");
      expect(resolveEnforcedGroups({})).toEqual(
        new Set([
          "accounts",
          "budget",
          "tax",
          "profile",
          "bank-connections",
          "transactions",
          "snapshots",
          "imports",
          "mcp-tokens",
          "app",
        ]),
      );
      expect(resolveEnforcedGroups({ CONTRACT_ENFORCE_GROUPS: "all" })).toBe("all");
      expect(resolveEnforcedGroups({ CONTRACT_ENFORCE_GROUPS: "accounts, nope" })).toEqual(
        new Set(["accounts"]),
      );
    });
  });
});
