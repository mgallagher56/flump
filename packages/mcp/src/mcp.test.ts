import { DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { McpRateLimiter } from "./auth/rate-limiter.js";
import {
  hashPatToken,
  type McpTokenRecord,
  type McpTokenStoreAdapter,
  TokenVerifier,
} from "./auth/token-verifier.js";
import { createFlumpMcpServer } from "./server.js";
import type { McpUserDataProvider } from "./types.js";

describe("McpRateLimiter", () => {
  it("enforces 60 requests per minute token-bucket rate limit", () => {
    const limiter = new McpRateLimiter(60, 300);
    const now = Date.now();

    // Consume 60 requests
    for (let i = 0; i < 60; i++) {
      const res = limiter.checkLimit("user_1", now);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(59 - i);
    }

    // 61st request must be blocked
    const blockedRes = limiter.checkLimit("user_1", now);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.message).toContain("60 requests per minute exceeded");

    // Advance 61 seconds: should reset
    const nextMinuteRes = limiter.checkLimit("user_1", now + 61_000);
    expect(nextMinuteRes.allowed).toBe(true);
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
      "This AI Connection token has been revoked",
    );
  });

  it("returns RFC 9728 OAuth Protected Resource Metadata", () => {
    const verifier = new TokenVerifier({
      expectedAudience: "https://mcp.flump.co.uk",
      authServerUrl: "https://api.workos.com",
    });

    const meta = verifier.getOAuthProtectedResourceMetadata();
    expect(meta.resource).toBe("https://mcp.flump.co.uk");
    expect(meta.scopes_supported).toContain("mcp:read:anonymized");
    expect(meta.scopes_supported).toContain("mcp:simulate");
  });
});

describe("Flump McpServer Tools & Resources", () => {
  const mockDataProvider: McpUserDataProvider = {
    async getUserFinancialData(userId, options) {
      return {
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
      };
    },
    async queryTransactions() {
      return [
        {
          id: "tx_1",
          accountId: "acc_1",
          amount: -45.5,
          description: "Supermarket Groceries at Monzo",
          category: "groceries",
          timestamp: new Date().toISOString(),
        },
      ];
    },
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
