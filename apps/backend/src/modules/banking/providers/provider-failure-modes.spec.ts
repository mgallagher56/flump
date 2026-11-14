/**
 * The provider failure-mode suite (audit H2, H5, M13, M23). Every bank provider runs the same
 * checks against a fake bank: 429 with and without a usable Retry-After, timeout, 5xx, network
 * error, revoked consent (401/403), malformed bodies, and token calls. The acceptance rule: no
 * provider returns a balance, or any data, when the call behind it failed.
 */
import {
  BankAuthExpiredError,
  BankMalformedResponseError,
  BankProviderError,
  BankRateLimitedError,
  BankRequestRejectedError,
  BankUnavailableError,
} from "@flump/banking/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeBank,
  type FakeBank,
  json,
  PROVIDER_ECHO_MARKER,
  status,
} from "./__fixtures__/fake-bank";
import { PROVIDER_CASES } from "./__fixtures__/provider-cases";

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Settles a provider call while fake timers drive its deadlines and back-offs. */
async function settle<T>(promise: Promise<T>): Promise<Outcome<T>> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  return settled;
}

function expectFailure<E extends BankProviderError>(
  outcome: Outcome<unknown>,
  type: new (...args: never[]) => E,
): E {
  expect(outcome.ok).toBe(false);
  if (outcome.ok) throw new Error("unreachable");
  expect(outcome.error).toBeInstanceOf(type);
  const error = outcome.error as E;
  // No provider body text (which can echo credentials) reaches the message.
  expect(error.message).not.toContain(PROVIDER_ECHO_MARKER);
  return error;
}

describe.each(PROVIDER_CASES)("provider failure modes: $name", (providerCase) => {
  let bank: FakeBank;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    bank = createFakeBank(providerCase.routes);
    vi.stubGlobal("fetch", bank.fetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads accounts and balances from the fixtures", async () => {
    const outcome = await settle(providerCase.make().fetchAccounts("tok"));
    expect(outcome).toEqual({ ok: true, value: providerCase.expectedAccounts });
    expect(bank.unmatched).toEqual([]);
  });

  it("reads transactions from the fixtures", async () => {
    const { externalAccountId, expected } = providerCase.transactions;
    const outcome = await settle(providerCase.make().fetchTransactions("tok", externalAccountId));
    expect(outcome).toEqual({ ok: true, value: expected });
    expect(bank.unmatched).toEqual([]);
  });

  describe.each(providerCase.accountRouteKeys)("when the %s call fails", (routeKey) => {
    it("429 with a long Retry-After: rate limited, carries the wait, does not retry", async () => {
      bank.failAlways(routeKey, status(429, { "Retry-After": "120" }));
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankRateLimitedError,
      );
      expect(error.retryAfterSeconds).toBe(120);
      expect(error.code).toBe("RATE_LIMITED");
      expect(bank.callsTo(routeKey)).toHaveLength(1);
    });

    it("429 without Retry-After: rate limited, no blind retry", async () => {
      bank.failAlways(routeKey, status(429));
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankRateLimitedError,
      );
      expect(error.retryAfterSeconds).toBeUndefined();
      expect(bank.callsTo(routeKey)).toHaveLength(1);
    });

    it("429 with a short Retry-After: waits, retries once, then succeeds", async () => {
      bank.failNext(routeKey, status(429, { "Retry-After": "1" }));
      const outcome = await settle(providerCase.make().fetchAccounts("tok"));
      expect(outcome).toEqual({ ok: true, value: providerCase.expectedAccounts });
      expect(bank.callsTo(routeKey)).toHaveLength(2);
    });

    it("timeout: unavailable after one retry", async () => {
      bank.failAlways(routeKey, { kind: "timeout" });
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankUnavailableError,
      );
      expect(error.reason).toBe("timeout");
      expect(bank.callsTo(routeKey)).toHaveLength(2);
    });

    it("one timeout then success: the retry recovers", async () => {
      bank.failNext(routeKey, { kind: "timeout" });
      const outcome = await settle(providerCase.make().fetchAccounts("tok"));
      expect(outcome).toEqual({ ok: true, value: providerCase.expectedAccounts });
    });

    it("5xx: unavailable after one retry", async () => {
      bank.failAlways(routeKey, status(503));
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankUnavailableError,
      );
      expect(error.reason).toBe("server_error");
      expect(error.status).toBe(503);
      expect(bank.callsTo(routeKey)).toHaveLength(2);
    });

    it("network error: unavailable after one retry", async () => {
      bank.failAlways(routeKey, { kind: "network" });
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankUnavailableError,
      );
      expect(error.reason).toBe("network");
      expect(bank.callsTo(routeKey)).toHaveLength(2);
    });

    it.each([401, 403])("revoked consent (%i): auth expired, no retry", async (code) => {
      bank.failAlways(routeKey, status(code));
      const error = expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankAuthExpiredError,
      );
      expect(error.code).toBe("AUTH_EXPIRED");
      expect(error.retryable).toBe(false);
      expect(bank.callsTo(routeKey)).toHaveLength(1);
    });

    it("other 4xx: request rejected", async () => {
      bank.failAlways(routeKey, status(404));
      expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankRequestRejectedError,
      );
    });

    it("body that is not JSON: malformed", async () => {
      bank.failAlways(routeKey, { kind: "raw", text: "<html>gateway</html>" });
      expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankMalformedResponseError,
      );
    });

    it("JSON of the wrong shape: malformed", async () => {
      bank.failAlways(routeKey, json({ unexpected: true }));
      expectFailure(
        await settle(providerCase.make().fetchAccounts("tok")),
        BankMalformedResponseError,
      );
    });
  });

  it("an overall deadline stops the fetch without a retry", async () => {
    bank.failAlways(providerCase.balanceRouteKey, { kind: "timeout" });
    const deadline = new AbortController();
    setTimeout(() => deadline.abort(), 1_000);
    const error = expectFailure(
      await settle(providerCase.make().fetchAccounts("tok", { signal: deadline.signal })),
      BankUnavailableError,
    );
    expect(error.reason).toBe("timeout");
    expect(bank.callsTo(providerCase.balanceRouteKey)).toHaveLength(1);
  });

  it("never reports a balance when the balance answer lacks one (audit H2)", async () => {
    bank.failAlways(providerCase.balanceRouteKey, json(providerCase.balanceMissingBody));
    expectFailure(
      await settle(providerCase.make().fetchAccounts("tok")),
      BankMalformedResponseError,
    );
  });

  it("transactions: a failed call throws instead of returning an empty list", async () => {
    const { externalAccountId, routeKey } = providerCase.transactions;
    bank.failAlways(routeKey, status(503));
    expectFailure(
      await settle(providerCase.make().fetchTransactions("tok", externalAccountId)),
      BankUnavailableError,
    );
    bank.failAlways(routeKey, status(401));
    expectFailure(
      await settle(providerCase.make().fetchTransactions("tok", externalAccountId)),
      BankAuthExpiredError,
    );
  });

  describe("token calls", () => {
    it("exchangeCode posts an authorisation-code grant", async () => {
      const outcome = await settle(
        providerCase.make().exchangeCode("cid", "csecret", "https://app/cb", "code1"),
      );
      expect(outcome).toEqual({
        ok: true,
        value: { accessToken: "at", refreshToken: "rt", expiresIn: 3600 },
      });
      const form = new URLSearchParams(bank.callsTo(providerCase.tokenRouteKey)[0]?.body);
      expect(form.get("grant_type")).toBe("authorization_code");
      expect(form.get("code")).toBe("code1");
      expect(form.get("redirect_uri")).toBe("https://app/cb");
    });

    it("refreshToken posts a refresh-token grant (audit H3)", async () => {
      const outcome = await settle(providerCase.make().refreshToken("cid", "csecret", "rt-old"));
      expect(outcome.ok).toBe(true);
      const form = new URLSearchParams(bank.callsTo(providerCase.tokenRouteKey)[0]?.body);
      expect(form.get("grant_type")).toBe("refresh_token");
      expect(form.get("refresh_token")).toBe("rt-old");
      expect(form.get("code")).toBeNull();
    });

    it("a 5xx token call is never retried (a refresh token may rotate)", async () => {
      bank.failAlways(providerCase.tokenRouteKey, status(503));
      expectFailure(
        await settle(providerCase.make().refreshToken("cid", "cs", "rt")),
        BankUnavailableError,
      );
      expect(bank.callsTo(providerCase.tokenRouteKey)).toHaveLength(1);
    });

    it("a timed-out token call is not retried", async () => {
      bank.failAlways(providerCase.tokenRouteKey, { kind: "timeout" });
      expectFailure(
        await settle(providerCase.make().exchangeCode("cid", "cs", "https://app/cb", "c")),
        BankUnavailableError,
      );
      expect(bank.callsTo(providerCase.tokenRouteKey)).toHaveLength(1);
    });

    it("a refused code is rejected without echoing the provider's body", async () => {
      bank.failAlways(providerCase.tokenRouteKey, status(400));
      expectFailure(
        await settle(providerCase.make().exchangeCode("cid", "cs", "https://app/cb", "bad")),
        BankRequestRejectedError,
      );
    });

    it("a token answer without an access token is malformed", async () => {
      bank.failAlways(providerCase.tokenRouteKey, json({ token_type: "bearer" }));
      expectFailure(
        await settle(providerCase.make().exchangeCode("cid", "cs", "https://app/cb", "c")),
        BankMalformedResponseError,
      );
    });
  });

  it("revokeConnection revokes at the provider or says it cannot", async () => {
    const outcome = await settle(providerCase.make().revokeConnection("tok"));
    if (providerCase.revoke.supported) {
      expect(outcome).toEqual({ ok: true, value: { revoked: true } });
      const call = bank.callsTo(providerCase.revoke.routeKey)[0];
      expect(call?.headers.Authorization).toBe("Bearer tok");
    } else {
      expect(outcome).toEqual({ ok: true, value: { revoked: false, reason: "unsupported" } });
      expect(bank.calls).toHaveLength(0);
    }
  });

  if (providerCase.revoke.supported) {
    const revokeKey = providerCase.revoke.routeKey;
    it("a failed revoke is reported, not swallowed", async () => {
      bank.failAlways(revokeKey, status(401));
      expectFailure(
        await settle(providerCase.make().revokeConnection("tok")),
        BankAuthExpiredError,
      );
    });
  }
});
