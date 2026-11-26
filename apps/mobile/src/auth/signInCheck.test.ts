import type { TokenResult, WorkosClient } from "../data/workos";
import { NotSignedInError, REUSE_WAIT_MS, runSignInCheck } from "./signInCheck";
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

const noWait = () => jest.fn(async (_ms: number) => {});

/**
 * WorkOS as documented and as seen on the owner's devices: each refresh token is replaced on use,
 * and a used one sent again within 30 seconds gives back the same new pair; after that it is
 * refused. The clock moves only when the check waits.
 */
function workosWithGrace() {
  let clock = 0;
  let issued = 1;
  const live = new Set(["r1"]);
  const used = new Map<string, { refreshToken: string; at: number }>();
  const workos: WorkosClient = {
    exchangeCode: jest.fn(),
    refresh: jest.fn(async (token: string): Promise<TokenResult> => {
      const replay = used.get(token);
      if (replay) {
        return clock - replay.at < 30_000
          ? { ok: true, tokens: { accessToken: access(claims), refreshToken: replay.refreshToken } }
          : { ok: false, reason: "rejected" };
      }
      if (!live.delete(token)) return { ok: false, reason: "rejected" };
      issued += 1;
      const refreshToken = `r${issued}`;
      live.add(refreshToken);
      used.set(token, { refreshToken, at: clock });
      return { ok: true, tokens: { accessToken: access(claims), refreshToken } };
    }),
  };
  const wait = jest.fn(async (ms: number) => {
    clock += ms;
  });
  return { workos, wait };
}

const claims = { iss: "https://issuer.test.invalid/x", sub: "u", sid: "s", iat: 1000, exp: 1300 };

describe("runSignInCheck", () => {
  it("refuses to run when nothing is stored", async () => {
    await expect(
      runSignInCheck({
        tokens: store(null),
        workos: workosFrom({}),
        checkAccountWith: jest.fn(),
        wait: noWait(),
      }),
    ).rejects.toBeInstanceOf(NotSignedInError);
  });

  it("strict rotation: replaced, the old token refused at once, no wait, the replacement still works", async () => {
    const tokens = store("r1");
    const wait = noWait();
    const checkAccountWith = jest.fn(async () => "ok" as const);
    const report = await runSignInCheck({
      tokens,
      workos: workosFrom({
        r1: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r2" } },
        r2: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r3" } },
      }),
      checkAccountWith,
      wait,
    });
    expect(report).toEqual({
      issuer: "https://issuer.test.invalid/x",
      claimNames: ["exp", "iat", "iss", "sid", "sub"],
      // 1300 - 1000.
      accessLifetimeSeconds: 300,
      refreshWithoutSecret: "accepted",
      refreshTokenReplaced: true,
      oldRefreshTokenReused: "rejected",
      reuseGaveSameTokens: null,
      oldRefreshTokenAfterWait: "not-tried",
      replacementAfterReuse: "accepted",
      backend: "ok",
    });
    expect(checkAccountWith).toHaveBeenCalledWith(access(claims));
    expect(wait).not.toHaveBeenCalled();
    expect(tokens.peek()).toBe("r3");
  });

  it("WorkOS's grace period: the same pair at once, refused after the wait, the newest still works", async () => {
    const tokens = store("r1");
    const { workos, wait } = workosWithGrace();
    const report = await runSignInCheck({
      tokens,
      workos,
      checkAccountWith: async () => "ok",
      wait,
    });
    expect(report).toMatchObject({
      refreshTokenReplaced: true,
      oldRefreshTokenReused: "accepted",
      reuseGaveSameTokens: true,
      oldRefreshTokenAfterWait: "rejected",
      replacementAfterReuse: "accepted",
    });
    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(REUSE_WAIT_MS);
    // 65 seconds: past the documented 30 second grace period with room to spare.
    expect(REUSE_WAIT_MS).toBe(65_000);
    // r1 -> r2 (the refresh), r2 again (the replay), refused after the wait, r2 -> r3.
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
      wait: noWait(),
    });
    expect(report.oldRefreshTokenReused).toBe("rejected");
    expect(report.replacementAfterReuse).toBe("rejected");
    expect(tokens.peek()).toBeNull();
  });

  it("no rotation check at all: the old token works even after the wait, and the newest token is kept", async () => {
    const tokens = store("r1");
    let calls = 0;
    const workos: WorkosClient = {
      exchangeCode: jest.fn(),
      refresh: jest.fn(async (): Promise<TokenResult> => {
        calls += 1;
        return { ok: true, tokens: { accessToken: access(claims), refreshToken: `r${calls + 1}` } };
      }),
    };
    const report = await runSignInCheck({
      tokens,
      workos,
      checkAccountWith: async () => "ok",
      wait: noWait(),
    });
    expect(report).toMatchObject({
      oldRefreshTokenReused: "accepted",
      reuseGaveSameTokens: false,
      oldRefreshTokenAfterWait: "accepted",
      replacementAfterReuse: "accepted",
    });
    // r1 -> r2, r1 -> r3, r1 -> r4 after the wait, r4 -> r5.
    expect(tokens.peek()).toBe("r5");
  });

  it("not replaced: no reuse is tried", async () => {
    const workos = workosFrom({
      r1: { ok: true, tokens: { accessToken: access(claims), refreshToken: "r1" } },
    });
    const report = await runSignInCheck({
      tokens: store("r1"),
      workos,
      checkAccountWith: async () => "ok",
      wait: noWait(),
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
        wait: noWait(),
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
      wait: noWait(),
    });
    expect(report.accessLifetimeSeconds).toBeNull();
    expect(JSON.stringify(report)).not.toContain(secretish);
    expect(JSON.stringify(report)).not.toContain("r1");
    expect(report.backend).toBe("not-invited");
  });
});
