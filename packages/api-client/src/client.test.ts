import { afterEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "./backend-error.js";
import { type ApiClient, createApiClient, isBelowMin } from "./client.js";
import type { ContractSchema } from "./transport.js";

function respond(status: number, body?: string) {
  return new Response(body ?? null, { status });
}

function setup(overrides: Partial<Parameters<typeof createApiClient>[0]> = {}) {
  const fetchMock = vi.fn();
  const client = createApiClient({
    baseUrl: "https://api.example.test/",
    getAccessToken: () => "tok",
    fetch: fetchMock as unknown as typeof fetch,
    ...overrides,
  });
  return { fetchMock, client };
}

/** Accepts any JSON body: these tests are about the transport, not a contract shape. */
const anyJson: ContractSchema<unknown> = {
  safeParse: (u: unknown) => ({ success: true, data: u }),
};

type CallOpts = Omit<Parameters<ApiClient["request"]>[1], "schema" | "allowEmpty"> & {
  allowEmpty?: boolean;
};
const call = (client: ApiClient, path: string, { allowEmpty, ...opts }: CallOpts = {}) =>
  allowEmpty
    ? client.request(path, { ...opts, schema: anyJson, allowEmpty: true })
    : client.request(path, { ...opts, schema: anyJson });

const hang = (_url: string, init: RequestInit) =>
  new Promise((_resolve, reject) => {
    if (init.signal?.aborted) reject(init.signal.reason);
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

describe("request core", () => {
  it("joins the base URL, sends the bearer token and parses JSON", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(respond(200, JSON.stringify({ ok: 1 })));
    await expect(call(client, "/accounts")).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/accounts");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.method).toBe("GET");
  });

  it("sends a JSON body with the method", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await call(client, "/x", { method: "PATCH", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("throws unauthorised without a request when the token is missing", async () => {
    for (const token of [null, undefined, ""]) {
      const { client, fetchMock } = setup({ getAccessToken: async () => token });
      await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unauthorised" });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it("maps statuses to kinds", async () => {
    const { client, fetchMock } = setup();
    for (const [status, kind] of [
      [401, "unauthorised"],
      [403, "forbidden"],
      [404, "not-found"],
      [400, "client"],
      [503, "server"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(respond(status));
      await expect(call(client, "/x")).rejects.toMatchObject({ kind, status });
    }
  });

  it("exposes 4xx message as detail without leaking it into message", async () => {
    const { client, fetchMock } = setup();
    for (const status of [400, 404, 422]) {
      fetchMock.mockResolvedValueOnce(
        respond(status, JSON.stringify({ message: "Weak password" })),
      );
      const err = (await call(client, "/x").catch((e) => e)) as BackendError;
      expect(err.detail).toBe("Weak password");
      expect(err.message).not.toContain("Weak password");
    }
  });

  it("ignores unusable 4xx bodies", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(respond(400, "not json"));
    fetchMock.mockResolvedValueOnce(respond(400, JSON.stringify({ message: 5 })));
    for (let i = 0; i < 2; i++) {
      const err = (await call(client, "/x").catch((e) => e)) as BackendError;
      expect(err.detail).toBeUndefined();
    }
  });

  it("never surfaces detail for 401, 403 or 5xx", async () => {
    const { client, fetchMock } = setup();
    for (const status of [401, 403, 500, 503]) {
      fetchMock.mockResolvedValueOnce(respond(status, JSON.stringify({ message: "Secret" })));
      const err = (await call(client, "/x").catch((e) => e)) as BackendError;
      expect(err.detail).toBeUndefined();
    }
  });

  it("maps network failure to unavailable", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("returns undefined for 204 and empty bodies only when allowEmpty is set", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(call(client, "/x", { allowEmpty: true })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(respond(200, ""));
    await expect(call(client, "/x", { allowEmpty: true })).resolves.toBeUndefined();
  });

  it("treats an empty or 204 body as bad-response by default", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "bad-response" });
    fetchMock.mockResolvedValueOnce(respond(200, "  "));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "bad-response" });
  });

  it("maps malformed JSON to bad-response without carrying the body", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(respond(200, "<html>secret</html>"));
    const err = (await call(client, "/x").catch((e) => e)) as BackendError;
    expect(err.kind).toBe("bad-response");
    expect(err.cause).toBeUndefined();
    expect(JSON.stringify(err)).not.toContain("secret");
  });

  it("validates with the schema and maps a mismatch to bad-response without the body", async () => {
    const { client, fetchMock } = setup();
    const schema: ContractSchema<{ n: number }> = {
      safeParse: (u: unknown) => {
        const n: unknown = typeof u === "object" && u !== null ? Reflect.get(u, "n") : undefined;
        return typeof n === "number"
          ? { success: true, data: { n } }
          : { success: false, error: { issues: [{ path: ["n"] }] } };
      },
    };
    fetchMock.mockResolvedValueOnce(respond(200, '{"n":2}'));
    await expect(client.request("/x", { schema })).resolves.toEqual({ n: 2 });
    fetchMock.mockResolvedValueOnce(
      new Response('{"n":"secret"}', { status: 200, headers: { "x-request-id": "req-9" } }),
    );
    const err = (await client.request("/x", { schema }).catch((e) => e)) as BackendError;
    expect(err.kind).toBe("bad-response");
    expect(err.requestId).toBe("req-9");
    expect(err.issuePaths).toEqual(["n"]);
    expect(err.cause).toBeUndefined();
    expect(err.message).not.toContain("secret");
    expect(JSON.stringify(err)).not.toContain("secret");
  });

  it("maps a body read failure to bad-response, and to unavailable when aborted", async () => {
    const { client, fetchMock } = setup();
    const broken = () => {
      const res = respond(200, "{}");
      vi.spyOn(res, "text").mockRejectedValue(new Error("stream"));
      return res;
    };
    fetchMock.mockResolvedValueOnce(broken());
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "bad-response" });

    const controller = new AbortController();
    const reason = new DOMException("Aborted", "AbortError");
    const res = respond(200, "{}");
    vi.spyOn(res, "text").mockImplementation(async () => {
      controller.abort(reason);
      throw reason;
    });
    fetchMock.mockResolvedValueOnce(res);
    await expect(call(client, "/x", { signal: controller.signal })).rejects.toBe(reason);
  });

  describe("timeout and abort", () => {
    afterEach(() => vi.useRealTimers());

    it("aborts after the default 15000 ms and reports unavailable", async () => {
      vi.useFakeTimers();
      const { client, fetchMock } = setup();
      fetchMock.mockImplementation(hang);
      const result = call(client, "/x").catch((e) => e);
      await vi.advanceTimersByTimeAsync(14999);
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      const err = (await result) as BackendError;
      expect(err).toBeInstanceOf(BackendError);
      expect(err.kind).toBe("unavailable");
    });

    it("honours a custom timeoutMs", async () => {
      vi.useFakeTimers();
      const { client, fetchMock } = setup({ timeoutMs: 100 });
      fetchMock.mockImplementation(hang);
      const result = call(client, "/x").catch((e) => e);
      await vi.advanceTimersByTimeAsync(101);
      expect(((await result) as BackendError).kind).toBe("unavailable");
    });

    it("rethrows a caller abort as is, not as a backend failure", async () => {
      const { client, fetchMock } = setup();
      const controller = new AbortController();
      const reason = new DOMException("Aborted", "AbortError");
      fetchMock.mockImplementation(hang);
      const result = call(client, "/x", { signal: controller.signal }).catch((e) => e);
      await Promise.resolve();
      await Promise.resolve();
      controller.abort(reason);
      const err = await result;
      expect(err).toBe(reason);
      expect(err).not.toBeInstanceOf(BackendError);
    });

    it("rethrows an already-aborted caller signal as is", async () => {
      const { client, fetchMock } = setup();
      const controller = new AbortController();
      const reason = new DOMException("Aborted", "AbortError");
      controller.abort(reason);
      fetchMock.mockImplementation(hang);
      await expect(call(client, "/x", { signal: controller.signal })).rejects.toBe(reason);
    });
  });
});

describe("401 single-flight refresh", () => {
  function tokenStore() {
    let token = "old";
    return {
      get: () => token,
      set: (t: string) => {
        token = t;
      },
    };
  }

  function bearerAwareFetch(fetchMock: ReturnType<typeof vi.fn>) {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer new" ? respond(200, '{"ok":true}') : respond(401);
    });
  }

  it("calls onUnauthorised once for ten concurrent 401s and retries with the new token", async () => {
    const store = tokenStore();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const onUnauthorised = vi.fn(async () => {
      await gate;
      store.set("new");
      return "refreshed" as const;
    });
    const { client, fetchMock } = setup({ getAccessToken: store.get, onUnauthorised });
    bearerAwareFetch(fetchMock);

    const results = Promise.all(Array.from({ length: 10 }, (_, i) => call(client, `/x${i}`)));
    await vi.waitFor(() => expect(onUnauthorised).toHaveBeenCalledTimes(1));
    release();
    await expect(results).resolves.toHaveLength(10);
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    const retryAuth = fetchMock.mock.calls.slice(10).map(([, i]) => i.headers.Authorization);
    expect(new Set(retryAuth)).toEqual(new Set(["Bearer new"]));
  });

  it("does not refresh again for a late 401 that used a stale token", async () => {
    const store = tokenStore();
    const onUnauthorised = vi.fn(async () => {
      store.set("new");
      return "refreshed" as const;
    });
    const { client, fetchMock } = setup({ getAccessToken: store.get, onUnauthorised });
    bearerAwareFetch(fetchMock);
    await call(client, "/a");
    store.set("new");
    fetchMock.mockImplementationOnce(async () => {
      return respond(401);
    });
    // Sends "new" then gets a 401 with an unchanged token: that is a genuine refresh case.
    await expect(call(client, "/b")).resolves.toEqual({ ok: true });
    expect(onUnauthorised).toHaveBeenCalledTimes(2);
  });

  it("retries with the current token without refreshing when it changed mid-flight", async () => {
    const store = tokenStore();
    const onUnauthorised = vi.fn(async () => "refreshed" as const);
    const { client, fetchMock } = setup({ getAccessToken: store.get, onUnauthorised });
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      if (auth === "Bearer old") {
        store.set("new");
        return respond(401);
      }
      return respond(200, "{}");
    });
    await expect(call(client, "/x")).resolves.toEqual({});
    expect(onUnauthorised).not.toHaveBeenCalled();
  });

  it("ends the session when the retry also returns 401", async () => {
    const store = tokenStore();
    const onUnauthorised = vi.fn(async () => {
      store.set("new");
      return "refreshed" as const;
    });
    const { client, fetchMock } = setup({ getAccessToken: store.get, onUnauthorised });
    fetchMock.mockResolvedValue(respond(401));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unauthorised" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
  });

  it("throws unauthorised without retrying when the session ended", async () => {
    const { client, fetchMock } = setup({ onUnauthorised: async () => "ended" });
    fetchMock.mockResolvedValue(respond(401));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unauthorised" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable, never unauthorised, when refresh is retryable or throws", async () => {
    for (const onUnauthorised of [
      async () => "retryable" as const,
      async (): Promise<"refreshed"> => {
        throw new Error("network");
      },
    ]) {
      const { client, fetchMock } = setup({ onUnauthorised });
      fetchMock.mockResolvedValue(respond(401));
      const err = (await call(client, "/x").catch((e) => e)) as BackendError;
      expect(err.kind).toBe("unavailable");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("throws unauthorised when refreshed but no token is available", async () => {
    let calls = 0;
    const { client, fetchMock } = setup({
      getAccessToken: () => (calls++ < 2 ? "old" : null),
      onUnauthorised: async () => "refreshed",
    });
    fetchMock.mockResolvedValue(respond(401));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unauthorised" });
  });

  it("maps a synchronously throwing onUnauthorised to unavailable and clears the refresh", async () => {
    const onUnauthorised = vi.fn((): Promise<"refreshed"> => {
      throw new Error("sync boom");
    });
    const { client, fetchMock } = setup({ onUnauthorised });
    fetchMock.mockResolvedValue(respond(401));
    for (let i = 0; i < 2; i++) {
      const err = (await call(client, "/x").catch((e) => e)) as BackendError;
      expect(err.kind).toBe("unavailable");
    }
    expect(onUnauthorised).toHaveBeenCalledTimes(2);
  });

  it("reports unavailable without a 401 status when refresh is retryable", async () => {
    const { client, fetchMock } = setup({ onUnauthorised: async () => "retryable" });
    fetchMock.mockResolvedValue(respond(401));
    const err = (await call(client, "/x").catch((e) => e)) as BackendError;
    expect(err.kind).toBe("unavailable");
    expect(err.status).toBeUndefined();
  });

  it("maps a throwing getAccessToken to unavailable before the request", async () => {
    const { client, fetchMock } = setup({
      getAccessToken: () => {
        throw new Error("keychain");
      },
    });
    const err = (await call(client, "/x").catch((e) => e)) as BackendError;
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a throwing getAccessToken in the post-401 re-read to unavailable", async () => {
    let calls = 0;
    const { client, fetchMock } = setup({
      getAccessToken: async () => {
        if (calls++ === 0) return "tok";
        throw new Error("keychain");
      },
    });
    fetchMock.mockResolvedValue(respond(401));
    const err = (await call(client, "/x").catch((e) => e)) as BackendError;
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe("unavailable");
  });

  it("maps a throwing getAccessToken after a refresh to unavailable", async () => {
    let calls = 0;
    const { client, fetchMock } = setup({
      getAccessToken: async () => {
        if (calls++ < 2) return "old";
        throw new Error("keychain");
      },
      onUnauthorised: async () => "refreshed",
    });
    fetchMock.mockResolvedValue(respond(401));
    const err = (await call(client, "/x").catch((e) => e)) as BackendError;
    expect(err.kind).toBe("unavailable");
  });

  it("bounds a hung refresh by timeoutMs and reports unavailable", async () => {
    vi.useFakeTimers();
    const { client, fetchMock } = setup({
      timeoutMs: 100,
      onUnauthorised: () => new Promise<never>(() => {}),
    });
    fetchMock.mockResolvedValue(respond(401));
    const pending = call(client, "/x").catch((e) => e);
    await vi.advanceTimersByTimeAsync(200);
    const err = (await pending) as BackendError;
    vi.useRealTimers();
    expect(err.kind).toBe("unavailable");
    expect(err.status).toBeUndefined();
  });

  it("rethrows the caller abort as is while waiting on a hung refresh", async () => {
    const controller = new AbortController();
    const { client, fetchMock } = setup({
      onUnauthorised: () => new Promise<never>(() => {}),
    });
    fetchMock.mockResolvedValue(respond(401));
    const pending = call(client, "/x", { signal: controller.signal }).catch((e) => e);
    await new Promise((r) => setTimeout(r, 10));
    const reason = new Error("caller-abort");
    controller.abort(reason);
    expect(await pending).toBe(reason);
  });

  it("rethrows an already aborted caller signal while waiting on refresh", async () => {
    const controller = new AbortController();
    const reason = new Error("early");
    const { client, fetchMock } = setup({
      onUnauthorised: async () => {
        controller.abort(reason);
        return "refreshed";
      },
    });
    fetchMock.mockResolvedValue(respond(401));
    expect(await call(client, "/x", { signal: controller.signal }).catch((e) => e)).toBe(reason);
  });

  it("is unauthorised without an onUnauthorised handler", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(respond(401));
    await expect(call(client, "/x")).rejects.toMatchObject({ kind: "unauthorised", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows a later refresh once the first has settled", async () => {
    const store = tokenStore();
    let n = 0;
    const onUnauthorised = vi.fn(async () => {
      store.set(`t${++n}`);
      return "refreshed" as const;
    });
    const { client, fetchMock } = setup({ getAccessToken: store.get, onUnauthorised });
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === `Bearer t${n}` && n > 0 ? respond(200, "{}") : respond(401);
    });
    await call(client, "/a");
    store.set("stale");
    await call(client, "/b");
    expect(onUnauthorised).toHaveBeenCalledTimes(2);
  });
});

describe("client header and policy", () => {
  const info = { version: "1.2.3", platform: "ios" };

  it("sends X-Flump-Client on every request including after a retry", async () => {
    let token = "old";
    const { client, fetchMock } = setup({
      client: info,
      getAccessToken: () => token,
      onUnauthorised: async () => {
        token = "new";
        return "refreshed";
      },
    });
    fetchMock
      .mockResolvedValueOnce(respond(401))
      .mockResolvedValueOnce(respond(200, "{}"))
      .mockResolvedValueOnce(respond(200, "{}"));
    await call(client, "/a");
    await call(client, "/b");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers["X-Flump-Client"]).toBe("mobile/1.2.3 (ios)");
    }
  });

  it("omits the header when no client info is configured", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await call(client, "/a");
    expect(fetchMock.mock.calls[0][1].headers["X-Flump-Client"]).toBeUndefined();
  });

  it("fetches the policy unauthenticated, even without a token", async () => {
    const { client, fetchMock } = setup({ client: info, getAccessToken: () => null });
    fetchMock.mockResolvedValue(
      respond(200, JSON.stringify({ minVersion: "1.0.0", recommendedVersion: "1.5.0" })),
    );
    await expect(client.getClientPolicy()).resolves.toEqual({
      ok: true,
      policy: { minVersion: "1.0.0", recommendedVersion: "1.5.0" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/app/client-policy");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers["X-Flump-Client"]).toBe("mobile/1.2.3 (ios)");
  });

  it("picks the platform entry from a per-platform response", async () => {
    const { client, fetchMock } = setup({ client: info });
    fetchMock.mockResolvedValue(
      respond(
        200,
        JSON.stringify({
          ios: { minVersion: "2.0.0", recommendedVersion: "2.1.0" },
          android: { minVersion: "1.0.0", recommendedVersion: "1.1.0" },
        }),
      ),
    );
    await expect(client.getClientPolicy()).resolves.toEqual({
      ok: true,
      policy: { minVersion: "2.0.0", recommendedVersion: "2.1.0" },
    });
  });

  it("surfaces failures as a distinct result so callers can fail open", async () => {
    const { client, fetchMock } = setup({ client: info });
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const down = await client.getClientPolicy();
    expect(down.ok).toBe(false);
    expect(!down.ok && down.error.kind).toBe("unavailable");

    fetchMock.mockResolvedValueOnce(respond(200, JSON.stringify({ ios: { minVersion: 1 } })));
    const bad = await client.getClientPolicy();
    expect(!bad.ok && bad.error.kind).toBe("bad-response");

    fetchMock.mockResolvedValueOnce(respond(200, "null"));
    const nul = await client.getClientPolicy();
    expect(!nul.ok && nul.error.kind).toBe("bad-response");
  });

  it("rethrows a caller abort from the policy check", async () => {
    const { client, fetchMock } = setup();
    const controller = new AbortController();
    const reason = new DOMException("Aborted", "AbortError");
    controller.abort(reason);
    fetchMock.mockImplementation(hang);
    await expect(client.getClientPolicy(controller.signal)).rejects.toBe(reason);
  });
});

describe("isBelowMin", () => {
  const min = (minVersion: string) => ({ minVersion });
  it.each([
    ["1.9.0", "1.10.0", true],
    ["1.10.0", "1.9.0", false],
    ["1.0.0", "1.0.0", false],
    ["1.0", "1.0.0", false],
    ["1", "1.0.1", true],
    ["2.0.0", "1.99.99", false],
    ["0.9.9", "1.0.0", true],
    ["v1.2.3", "1.2.4", true],
    ["1.2.3-beta.1", "1.2.3", false],
    ["1.2.x", "1.2.0", false],
    ["1.0.0", "", false],
  ])("%s vs min %s is %s", (version, minVersion, expected) => {
    expect(isBelowMin(version, min(minVersion))).toBe(expected);
  });
});
