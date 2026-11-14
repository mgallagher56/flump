import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BankAuthExpiredError,
  BankMalformedResponseError,
  BankProviderError,
  BankRateLimitedError,
  BankRequestRejectedError,
  BankUnavailableError,
  isBankProviderError,
} from "./provider-errors.js";
import {
  asArray,
  asDate,
  asFiniteNumber,
  asRecord,
  asString,
  minorUnitsToMajor,
  optionalString,
  PROVIDER_TIMEOUT_MS,
  parseRetryAfterMs,
  pathSegment,
  providerFetch,
  providerFetchJson,
} from "./provider-fetch.js";

type Step =
  | { status: number; body?: string; headers?: Record<string, string> }
  | "network"
  | "hang"
  | "slow-body";

/** A fetch that answers with the given steps in order and records each call. */
function scripted(steps: Step[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)] as Step;
    if (step === "network") return Promise.reject(new TypeError("fetch failed"));
    const hang = () =>
      new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    if (step === "hang") return hang();
    if (step === "slow-body") {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null,
        text: hang,
      } as unknown as Response);
    }
    const cancel = vi.fn(() => Promise.resolve());
    return Promise.resolve({
      ok: step.status >= 200 && step.status < 300,
      status: step.status,
      headers: new Headers(step.headers),
      body: { cancel },
      text: () => Promise.resolve(step.body ?? ""),
    } as unknown as Response);
  };
  return { impl: impl as typeof fetch, calls };
}

const ctx = { provider: "testbank", operation: "fetch thing" };

async function settle<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  return settled;
}

describe("providerFetch", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] }));
  afterEach(() => vi.useRealTimers());

  it("returns the body of a 2xx answer", async () => {
    const { impl } = scripted([{ status: 200, body: '{"a":1}' }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect(out).toMatchObject({ ok: true, value: { status: 200, text: '{"a":1}' } });
  });

  it("aborts a hung call at the 8 s deadline, retries a GET once, then gives up", async () => {
    const { impl, calls } = scripted(["hang"]);
    const started = Date.now();
    const out = await settle(
      providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl, random: () => 0 }),
    );
    expect(out.ok).toBe(false);
    expect((out as { error: BankUnavailableError }).error).toBeInstanceOf(BankUnavailableError);
    expect((out as { error: BankUnavailableError }).error.reason).toBe("timeout");
    expect(calls).toHaveLength(2);
    // Two deadlines and one 250 ms back-off.
    expect(Date.now() - started).toBe(2 * PROVIDER_TIMEOUT_MS + 250);
  });

  it("the deadline covers a body that never finishes", async () => {
    const { impl, calls } = scripted(["slow-body"]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect((out as { error: BankUnavailableError }).error).toBeInstanceOf(BankUnavailableError);
    expect(calls).toHaveLength(2);
  });

  it("passes an abort signal, method, headers and body to fetch", async () => {
    const { impl, calls } = scripted([{ status: 200 }]);
    await settle(
      providerFetch(
        "https://bank/x",
        { method: "POST", headers: { A: "b" }, body: "q=1" },
        { ...ctx, fetchImpl: impl },
      ),
    );
    expect(calls[0]?.init).toMatchObject({ method: "POST", headers: { A: "b" }, body: "q=1" });
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("retries a GET once on 5xx and returns the recovered answer", async () => {
    const { impl, calls } = scripted([{ status: 502 }, { status: 200, body: "ok" }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect(out).toMatchObject({ ok: true, value: { text: "ok" } });
    expect(calls).toHaveLength(2);
  });

  it("the retry pause is jittered between 250 and 750 ms", async () => {
    for (const [random, pause] of [
      [0, 250],
      [1, 750],
    ] as const) {
      const { impl } = scripted([{ status: 500 }, { status: 200 }]);
      const started = Date.now();
      await settle(
        providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl, random: () => random }),
      );
      expect(Date.now() - started).toBe(pause);
    }
  });

  it("never retries a POST", async () => {
    for (const step of [{ status: 503 }, "network", "hang"] as Step[]) {
      const { impl, calls } = scripted([step]);
      const out = await settle(
        providerFetch("https://bank/token", { method: "POST" }, { ...ctx, fetchImpl: impl }),
      );
      expect((out as { error: unknown }).error).toBeInstanceOf(BankUnavailableError);
      expect(calls).toHaveLength(1);
    }
  });

  it("maps a network failure to unavailable, keeping the cause", async () => {
    const { impl } = scripted(["network"]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    const error = (out as { error: BankUnavailableError }).error;
    expect(error.reason).toBe("network");
    expect(error.cause).toBeInstanceOf(TypeError);
    expect(error.retryable).toBe(true);
  });

  it.each([401, 403])("maps %i to auth expired without retrying", async (code) => {
    const { impl, calls } = scripted([{ status: code, body: "secret-echo" }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    const error = (out as { error: BankAuthExpiredError }).error;
    expect(error).toBeInstanceOf(BankAuthExpiredError);
    expect(error.status).toBe(code);
    expect(error.message).not.toContain("secret-echo");
    expect(calls).toHaveLength(1);
  });

  it("maps other 4xx to request rejected", async () => {
    const { impl } = scripted([{ status: 422 }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect((out as { error: unknown }).error).toBeInstanceOf(BankRequestRejectedError);
  });

  it("honours a short Retry-After on 429, then retries once", async () => {
    const { impl, calls } = scripted([
      { status: 429, headers: { "Retry-After": "2" } },
      { status: 200 },
    ]);
    const started = Date.now();
    const out = await settle(
      providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl, random: () => 0 }),
    );
    expect(out.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(Date.now() - started).toBe(2000);
  });

  it("returns rate limited with the wait when Retry-After is too long to wait", async () => {
    const { impl, calls } = scripted([{ status: 429, headers: { "Retry-After": "30" } }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    const error = (out as { error: BankRateLimitedError }).error;
    expect(error).toBeInstanceOf(BankRateLimitedError);
    expect(error.retryAfterSeconds).toBe(30);
    expect(calls).toHaveLength(1);
  });

  it("a second 429 after waiting is final", async () => {
    const { impl, calls } = scripted([{ status: 429, headers: { "Retry-After": "1" } }]);
    const out = await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect((out as { error: unknown }).error).toBeInstanceOf(BankRateLimitedError);
    expect(calls).toHaveLength(2);
  });

  it("a POST does not wait out a 429", async () => {
    const { impl, calls } = scripted([{ status: 429, headers: { "Retry-After": "1" } }]);
    const out = await settle(
      providerFetch("https://bank/x", { method: "POST" }, { ...ctx, fetchImpl: impl }),
    );
    expect((out as { error: unknown }).error).toBeInstanceOf(BankRateLimitedError);
    expect(calls).toHaveLength(1);
  });

  it("discards the body of a failed answer", async () => {
    const cancel = vi.fn(() => Promise.resolve());
    const impl = (() =>
      Promise.resolve({
        ok: false,
        status: 404,
        headers: new Headers(),
        body: { cancel },
        text: vi.fn(),
      })) as unknown as typeof fetch;
    await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect(cancel).toHaveBeenCalled();
  });

  it("refuses redirects, so credentials never follow one", async () => {
    const { impl, calls } = scripted([{ status: 200 }]);
    await settle(providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl }));
    expect(calls[0]?.init?.redirect).toBe("error");
  });

  it("an overall deadline stops the call and blocks the retry", async () => {
    const { impl, calls } = scripted(["hang"]);
    const deadline = new AbortController();
    setTimeout(() => deadline.abort(), 1_000);
    const started = Date.now();
    const out = await settle(
      providerFetch("https://bank/x", {}, { ...ctx, fetchImpl: impl, deadline: deadline.signal }),
    );
    const error = (out as { error: BankUnavailableError }).error;
    expect(error).toBeInstanceOf(BankUnavailableError);
    expect(error.reason).toBe("timeout");
    expect(calls).toHaveLength(1);
    expect(Date.now() - started).toBe(1_000);
  });

  it("an already-expired deadline makes no call", async () => {
    const { impl, calls } = scripted([{ status: 200 }]);
    const out = await settle(
      providerFetch(
        "https://bank/x",
        {},
        { ...ctx, fetchImpl: impl, deadline: AbortSignal.abort() },
      ),
    );
    expect((out as { error: unknown }).error).toBeInstanceOf(BankUnavailableError);
    expect(calls).toHaveLength(0);
  });

  it("a deadline that expires during the back-off stops the retry", async () => {
    const { impl, calls } = scripted([{ status: 503 }, { status: 200 }]);
    const deadline = new AbortController();
    setTimeout(() => deadline.abort(), 100);
    const out = await settle(
      providerFetch(
        "https://bank/x",
        {},
        { ...ctx, fetchImpl: impl, deadline: deadline.signal, random: () => 0 },
      ),
    );
    expect((out as { error: unknown }).error).toBeInstanceOf(BankUnavailableError);
    expect(calls).toHaveLength(1);
  });

  it("uses the global fetch by default", async () => {
    const { impl, calls } = scripted([{ status: 200 }]);
    vi.stubGlobal("fetch", impl);
    try {
      await settle(providerFetch("https://bank/x", {}, ctx));
      expect(calls).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("providerFetchJson", () => {
  it("parses JSON", async () => {
    const { impl } = scripted([{ status: 200, body: '{"a":[1]}' }]);
    await expect(
      providerFetchJson("https://bank/x", {}, { ...ctx, fetchImpl: impl }),
    ).resolves.toEqual({ a: [1] });
  });

  it("rejects a body that is not JSON as malformed", async () => {
    const { impl } = scripted([{ status: 200, body: "<html>" }]);
    await expect(
      providerFetchJson("https://bank/x", {}, { ...ctx, fetchImpl: impl }),
    ).rejects.toBeInstanceOf(BankMalformedResponseError);
  });

  it("does not keep the parse error, which would quote the body (a token)", async () => {
    const { impl } = scripted([{ status: 200, body: '{"access_token":"tok_secret' }]);
    const error = await providerFetchJson(
      "https://bank/token",
      {},
      { ...ctx, fetchImpl: impl },
    ).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(BankMalformedResponseError);
    expect((error as Error).cause).toBeUndefined();
    expect((error as Error).message).not.toContain("tok_secret");
  });
});

describe("parseRetryAfterMs", () => {
  it("reads delta-seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("5")).toBe(5000);
    const now = Date.parse("2026-11-14T10:00:00Z");
    expect(parseRetryAfterMs("Sat, 14 Nov 2026 10:00:30 GMT", now)).toBe(30_000);
    expect(parseRetryAfterMs("Sat, 14 Nov 2026 09:00:00 GMT", now)).toBe(0);
  });

  it("ignores missing or junk values", () => {
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs("  ")).toBeUndefined();
    expect(parseRetryAfterMs("soon")).toBeUndefined();
    expect(parseRetryAfterMs("-3")).toBeUndefined();
  });
});

describe("body readers never default", () => {
  it("asRecord, asArray and asString reject the wrong shape", () => {
    expect(asRecord({ a: 1 }, "f", ctx)).toEqual({ a: 1 });
    expect(() => asRecord([], "f", ctx)).toThrow(BankMalformedResponseError);
    expect(() => asRecord(null, "f", ctx)).toThrow(BankMalformedResponseError);
    expect(asArray([1], "f", ctx)).toEqual([1]);
    expect(() => asArray(undefined, "f", ctx)).toThrow(BankMalformedResponseError);
    expect(asString("x", "f", ctx)).toBe("x");
    expect(() => asString("", "f", ctx)).toThrow(BankMalformedResponseError);
  });

  it("asFiniteNumber accepts numbers and numeric strings only", () => {
    expect(asFiniteNumber(12.5, "f", ctx)).toBe(12.5);
    expect(asFiniteNumber("-3.20", "f", ctx)).toBe(-3.2);
    for (const bad of [
      undefined,
      null,
      "",
      "1e3",
      "12,50",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
    ]) {
      expect(() => asFiniteNumber(bad, "balance", ctx)).toThrow(BankMalformedResponseError);
    }
  });

  it("minorUnitsToMajor needs whole pence", () => {
    expect(minorUnitsToMajor(12345, "f", ctx)).toBe(123.45);
    expect(minorUnitsToMajor(-5, "f", ctx)).toBe(-0.05);
    expect(() => minorUnitsToMajor(1.5, "f", ctx)).toThrow(BankMalformedResponseError);
    expect(() => minorUnitsToMajor(undefined, "f", ctx)).toThrow(BankMalformedResponseError);
  });

  it("asDate needs a parseable date", () => {
    expect(asDate("2026-11-01T00:00:00Z", "f", ctx).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(() => asDate("not a date", "f", ctx)).toThrow(BankMalformedResponseError);
  });

  it("pathSegment encodes ids and rejects dot segments", () => {
    expect(pathSegment("a/b c", "id", ctx)).toBe("a%2Fb%20c");
    for (const bad of ["", ".", ".."]) {
      expect(() => pathSegment(bad, "id", ctx)).toThrow(BankMalformedResponseError);
    }
  });

  it("optionalString returns non-empty strings only", () => {
    expect(optionalString("a")).toBe("a");
    expect(optionalString("")).toBeUndefined();
    expect(optionalString(3)).toBeUndefined();
  });

  it("names the field in the message", () => {
    expect(() => asFiniteNumber(undefined, "balance", ctx)).toThrow(
      "testbank fetch thing: unexpected response (balance)",
    );
  });
});

describe("BankProviderError", () => {
  it("classifies retryable errors and is detectable", () => {
    const limited = new BankRateLimitedError({ ...ctx, retryAfterSeconds: 5 });
    expect(limited.retryable).toBe(true);
    expect(limited.name).toBe("BankRateLimitedError");
    expect(new BankMalformedResponseError(ctx).retryable).toBe(false);
    expect(new BankRequestRejectedError({ ...ctx, status: 400 }).message).toContain("HTTP 400");
    expect(isBankProviderError(limited)).toBe(true);
    expect(limited).toBeInstanceOf(BankProviderError);
    expect(isBankProviderError(new Error("x"))).toBe(false);
  });
});
