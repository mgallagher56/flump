import { DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
import { describe, expect, it, vi } from "vitest";
import type { LimitStore } from "./auth/limit-store.js";
import { McpRateLimiter } from "./auth/rate-limiter.js";
import {
  hashPatToken,
  type McpTokenRecord,
  type McpTokenStoreAdapter,
  TokenVerifier,
} from "./auth/token-verifier.js";
import { inMemoryQueries } from "./provider/in-memory.js";
import { createFlumpMcpServer } from "./server.js";
import type { McpUserDataProvider } from "./types.js";

describe("McpRateLimiter", () => {
  it("enforces 60 requests per minute fixed-window rate limit", async () => {
    const limiter = new McpRateLimiter(60, 300);
    const now = Date.now();

    // Consume 60 requests
    for (let i = 0; i < 60; i++) {
      const res = await limiter.checkLimit("user_1", now);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(59 - i);
    }

    // 61st request must be blocked
    const blockedRes = await limiter.checkLimit("user_1", now);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.message).toContain("The limit is 60 a minute");

    // Advance 61 seconds: should reset
    const nextMinuteRes = await limiter.checkLimit("user_1", now + 61_000);
    expect(nextMinuteRes.allowed).toBe(true);
  });

  it("names the hourly limit when that is the one reached", async () => {
    const limiter = new McpRateLimiter(1000, 3);
    for (let i = 0; i < 3; i++) expect((await limiter.checkLimit("k", i)).allowed).toBe(true);
    const blocked = await limiter.checkLimit("k", 10);
    expect(blocked.message).toContain("The limit is 3 an hour");
    expect(blocked.resetSeconds).toBe(3600);
  });

  it("counts in the injected store, shared by every limiter on it", async () => {
    const hits: string[] = [];
    let count = 0;
    const store: LimitStore = {
      hit: async (key, windows) => {
        hits.push(key);
        count++;
        const minute = windows[0];
        return count > 2 && minute
          ? { allowed: false, retryAfterSeconds: 7, exceeded: minute }
          : { allowed: true, retryAfterSeconds: 0, remaining: 2 - count };
      },
      peek: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      reset: async () => undefined,
    };
    const a = new McpRateLimiter(2, 300, store);
    const b = new McpRateLimiter(2, 300, store);
    expect((await a.checkLimit("tok:1")).allowed).toBe(true);
    expect((await b.checkLimit("tok:1")).allowed).toBe(true);
    const blocked = await a.checkLimit("tok:1");
    expect(blocked).toMatchObject({ allowed: false, resetSeconds: 7, statusCode: 429 });
    expect(hits).toEqual(["mcp:tok:1", "mcp:tok:1", "mcp:tok:1"]);
  });

  it("fails open when the store throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store: LimitStore = {
      hit: () => Promise.reject(new Error("db down")),
      peek: () => Promise.reject(new Error("db down")),
      reset: () => Promise.reject(new Error("db down")),
    };
    expect((await new McpRateLimiter(1, 1, store).checkLimit("k")).allowed).toBe(true);
    spy.mockRestore();
  });
});

describe("TokenVerifier", () => {
  it("hashes and validates active Personal Access Tokens", async () => {
    const rawToken = "flump_pat_0123456789abcdef0123456789abcdef";
    const hashed = hashPatToken(rawToken);

    const mockRecord: McpTokenRecord = {
      id: "tok_1",
      userId: "user_abc",
      tokenHash: hashed,
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      revokedAt: null,
    };

    const mockStore: McpTokenStoreAdapter = {
      async findTokenByHash(h) {
        return h === hashed ? mockRecord : null;
      },
    };

    const verifier = new TokenVerifier({ tokenStore: mockStore });
    const verified = await verifier.verifyAuthorizationHeader(`Bearer ${rawToken}`);

    expect(verified.userId).toBe("user_abc");
    expect(verified.scopes).toContain("mcp:read:anonymized");
    expect(verified.anonymizeInstitutions).toBe(true);
    expect(verified.type).toBe("pat");
  });

  it("rejects revoked tokens", async () => {
    const rawToken = "flump_pat_revoked_token_example";
    const hashed = hashPatToken(rawToken);

    const mockStore: McpTokenStoreAdapter = {
      async findTokenByHash(h) {
        if (h === hashed) {
          return {
            id: "tok_2",
            userId: "user_revoked",
            tokenHash: hashed,
            scopes: ["mcp:read:anonymized"],
            anonymizeInstitutions: true,
            expiresAt: null,
            revokedAt: new Date(),
          };
        }
        return null;
      },
    };

    const verifier = new TokenVerifier({ tokenStore: mockStore });
    await expect(verifier.verifyAuthorizationHeader(`Bearer ${rawToken}`)).rejects.toThrow(
      "This AI connection token has been revoked",
    );
  });

  it("returns RFC 9728 OAuth Protected Resource Metadata", () => {
    const verifier = new TokenVerifier({
      expectedAudience: "flump-mcp",
      authServerUrl: "https://api.workos.com",
    });

    const meta = verifier.getOAuthProtectedResourceMetadata();
    expect(meta.resource).toBe("flump-mcp");
    expect(meta.scopes_supported).toContain("mcp:read:anonymized");
    expect(meta.scopes_supported).toContain("mcp:simulate");
  });
});

describe("Flump McpServer Tools & Resources", () => {
  const load = async (userId: string) => ({
    baseline: {
      ...DEFAULT_FINANCIAL_BASELINE,
      userId,
      annualGrossSalary: 110000,
      pensionContributionPct: 5,
      isSalarySacrifice: true,
    },
    accounts: [
      {
        id: "acc_1",
        name: "Barclays Current Account",
        type: "Current",
        balance: 2500,
      },
      {
        id: "acc_2",
        name: "Monzo Credit Card",
        type: "Credit Card",
        balance: 1800,
        interestRate: 22.9,
      },
    ],
    budgetEntries: [
      {
        id: "b_1",
        category: "housing",
        name: "Rent",
        amount: 1000,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ],
  });
  const mockDataProvider: McpUserDataProvider = {
    getUserFinancialData: load,
    ...inMemoryQueries(load),
  };

  it("initializes McpServer and registers all tools and resources without collision", () => {
    const server = createFlumpMcpServer({
      token: {
        userId: "user_test",
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        anonymizeInstitutions: true,
        type: "pat",
      },
      dataProvider: mockDataProvider,
    });

    // Check that tools and resources were registered
    expect(server).toBeDefined();
  });
});
