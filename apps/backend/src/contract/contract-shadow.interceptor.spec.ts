import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { of } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ContractShadowInterceptor,
  resolveContractMode,
  resolveEnforcedGroups,
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

  it("resolves the mode from env", () => {
    expect(resolveContractMode({})).toBe("shadow");
    expect(resolveContractMode({ CONTRACT_MODE: "OFF" })).toBe("off");
    expect(resolveContractMode({ CONTRACT_MODE: "enforce" })).toBe("enforce");
  });
});

describe("log volume limits", () => {
  afterEach(() => vi.restoreAllMocks());

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
      expect(error.getResponse().issues).toEqual([{ path: "body.balance", code: "invalid_type" }]);
      expect(JSON.stringify(error.getResponse())).not.toContain("secret-name");
      const rejected = warn.mock.calls
        .map(([m]) => JSON.parse(String(m)))
        .find((entry) => entry.event === "contract_rejected");
      expect(rejected).toMatchObject({ routeId: "accounts.create", pathTemplate: "/accounts" });
      expect(JSON.stringify(rejected)).not.toContain("secret-name");
      expect(next.handle).not.toHaveBeenCalled();
    });

    it("lets unknown keys through (the web sends fields the backend drops)", () => {
      process.env.CONTRACT_MODE = "enforce";
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const next = run(new ContractShadowInterceptor(), {
        ...badAccount,
        body: { name: "x", type: "Current", balance: 1, isDefault: true },
      });
      expect(next.handle).toHaveBeenCalledOnce();
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
      expect(resolveContractMode({})).toBe("shadow");
      expect(resolveEnforcedGroups({})).toEqual(
        new Set([
          "accounts",
          "budget",
          "tax",
          "profile",
          "bank-connections",
          "transactions",
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
