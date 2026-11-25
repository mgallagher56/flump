import type { TokenResult, WorkosClient } from "../data/workos";
import { NotSignedInError, runSignInCheck } from "./signInCheck";
import type { TokenStore } from "./tokenStore";

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
// Runtime-built token shapes; the check reads claims, never verifies them.
const access = (claims: Record<string, unknown>) => `${b64({ alg: "RS256" })}.${b64(claims)}.sig`;

function store(initial: string | null) {
  let value = initial;
  const tokens: TokenStore & { peek(): string | null } = {
    read: async () => value,
    save: async (t) => {
      value = t;
    },
    clear: async () => {
      value = null;
      return true;
    },
    peek: () => value,
  };
  return tokens;
}

/** A WorkOS stand-in answering each refresh token once from a table, then rejecting it. */
function workosFrom(answers: Record<string, TokenResult>): WorkosClient {
  const left = { ...answers };
  return {
    exchangeCode: jest.fn(),
    refresh: jest.fn(async (token: string): Promise<TokenResult> => {
      const answer = left[token];
      delete left[token];
      return answer ?? { ok: false, reason: "rejected" };
    }),
  };
}

const claims = { iss: "https://issuer.test.invalid/x", sub: "u", sid: "s", iat: 1000, exp: 1300 };

describe("runSignInCheck", () => {
  it("refuses to run when nothing is stored", async () => {
    await expect(
      runSignInCheck({ tokens: store(null), workos: workosFrom({}), checkAccountWith: jest.fn() }),
    ).rejects.toBeInstanceOf(NotSignedInError);
  });

  it("strict rotation: replaced, the old token refused, the replacement still works", async () => {
    const tokens = store("r1");
    const checkAccountWith = jest.fn(async () => "ok" as const);
    const report = await runSignInCheck({
      tokens,
      workos: workosFrom({
        r1: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r2" } },
        r2: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r3" } },
      }),
      checkAccountWith,
    });
    expect(report).toEqual({
      issuer: "https://issuer.test.invalid/x",
      claimNames: ["exp", "iat", "iss", "sid", "sub"],
      // 1300 - 1000.
      accessLifetimeSeconds: 300,
      refreshWithoutSecret: "accepted",
      refreshTokenReplaced: true,
      oldRefreshTokenReused: "rejected",
      replacementAfterReuse: "accepted",
      backend: "ok",
    });
    expect(checkAccountWith).toHaveBeenCalledWith(access(claims));
    expect(tokens.peek()).toBe("r3");
  });

  it("reuse detection: a refused reuse also kills the replacement, and the store is cleared", async () => {
    const tokens = store("r1");
    // Only r1 is ever answered: r2 is refused after the reuse, as reuse detection would.
    const report = await runSignInCheck({
      tokens,
      workos: workosFrom({
        r1: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r2" } },
      }),
      checkAccountWith: async () => "ok",
    });
    expect(report.oldRefreshTokenReused).toBe("rejected");
    expect(report.replacementAfterReuse).toBe("rejected");
    expect(tokens.peek()).toBeNull();
  });

  it("lenient: the old token still works, and the newest token is kept", async () => {
    const tokens = store("r1");
    let calls = 0;
    const workos: WorkosClient = {
      exchangeCode: jest.fn(),
      refresh: jest.fn(async (): Promise<TokenResult> => {
        calls += 1;
        return { ok: true, tokens: { accessToken: access(claims), refreshToken: `r${calls + 1}` } };
      }),
    };
    const report = await runSignInCheck({ tokens, workos, checkAccountWith: async () => "ok" });
    expect(report.oldRefreshTokenReused).toBe("accepted");
    expect(report.replacementAfterReuse).toBe("not-tried");
    expect(tokens.peek()).toBe("r3");
  });

  it("not replaced: no reuse is tried", async () => {
    const workos = workosFrom({
      r1: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r1" } },
    });
    const report = await runSignInCheck({
      tokens: store("r1"),
      workos,
      checkAccountWith: async () => "ok",
    });
    expect(report.refreshTokenReplaced).toBe(false);
    expect(report.oldRefreshTokenReused).toBe("not-tried");
    expect(workos.refresh).toHaveBeenCalledTimes(1);
  });

  it.each(["rejected", "unavailable"] as const)(
    "a %s refresh answers only that",
    async (reason) => {
      const checkAccountWith = jest.fn();
      const report = await runSignInCheck({
        tokens: store("r1"),
        workos: workosFrom({ r1: { ok: false, reason } }),
        checkAccountWith,
      });
      expect(report.refreshWithoutSecret).toBe(reason);
      expect(report.backend).toBe("not-tried");
      expect(checkAccountWith).not.toHaveBeenCalled();
    },
  );

  it("a token without iat or exp has no lifetime, and the report has no token values", async () => {
    const secretish = access({ iss: "https://i.test.invalid", sub: "u" });
    const report = await runSignInCheck({
      tokens: store("r1"),
      workos: workosFrom({
        r1: { ok: true, tokens: { accessToken: secretish, refreshToken: "r1" } },
      }),
      checkAccountWith: async () => "not-invited",
    });
    expect(report.accessLifetimeSeconds).toBeNull();
    expect(JSON.stringify(report)).not.toContain(secretish);
    expect(JSON.stringify(report)).not.toContain("r1");
    expect(report.backend).toBe("not-invited");
  });
});
