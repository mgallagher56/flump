// @vitest-environment node
import type { ContractSchema } from "@flump/api-client";
import { DeleteBudgetEntryResponse } from "@flump/api-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiConfig } from "~/config.server";
import { runWithRequestId } from "~/security/request-id.server";
import { backendFetch, backendFetchAll } from "./backend-client.server";
import { BackendError } from "./backend-error";

/** Accepts any JSON body: these tests are about the transport, not a contract shape. */
const anyJson: ContractSchema<unknown> = {
  safeParse: (u: unknown) => ({ success: true, data: u }),
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("backendFetch", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const rejection = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as BackendError;
    }
    throw new Error("expected rejection");
  };

  it("sends the bearer token to the configured base URL", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const result = await backendFetch("/accounts", { schema: anyJson, accessToken: "tok" });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiConfig.apiBaseUrl}/v1/accounts`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
  });

  it.each([
    [401, "unauthorised"],
    [403, "forbidden"],
    [404, "not-found"],
    [422, "client"],
    [500, "server"],
  ])("maps %i to %s", async (status, kind) => {
    fetchMock.mockResolvedValue(new Response("secret body", { status }));
    const err = await rejection(
      backendFetch("/x", { schema: anyJson, accessToken: "tok", method: "POST" }),
    );
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe(kind);
    expect(err.status).toBe(status);
    expect(err.endpoint).toBe("/x");
    expect(err.message).not.toContain("secret body");
    expect(err.message).not.toContain("tok");
  });

  it("maps a closed-beta refusal (403 not_invited) to not-invited", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 403, error: "not_invited" }), { status: 403 }),
    );
    const err = await rejection(backendFetch("/accounts", { schema: anyJson, accessToken: "tok" }));
    expect(err.kind).toBe("not-invited");
    expect(err.status).toBe(403);
  });

  it("reads not_invited from the BE-09 error envelope's code", async () => {
    const envelope = { code: "not_invited", message: "Not invited", requestId: "r-1" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(envelope), { status: 403 }));
    const err = await rejection(backendFetch("/accounts", { schema: anyJson, accessToken: "tok" }));
    expect(err.kind).toBe("not-invited");
  });

  it("maps a network failure to unavailable with no status", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const err = await rejection(
      backendFetch("/x", { schema: anyJson, accessToken: "t", retries: 0 }),
    );
    expect(err.kind).toBe("unavailable");
    expect(err.status).toBeUndefined();
  });

  it("times out a request that never resolves", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener("abort", () => rej(init.signal?.reason));
        }),
    );
    const p = rejection(
      backendFetch("/x", { schema: anyJson, accessToken: "t", timeoutMs: 20, retries: 0 }),
    );
    await vi.advanceTimersByTimeAsync(25);
    expect((await p).kind).toBe("unavailable");
  });

  it("retries a GET once on 503 then succeeds", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    fetchMock.mockResolvedValueOnce(json([1, 2]));
    await expect(backendFetch("/x", { schema: anyJson, accessToken: "t" })).resolves.toEqual([
      1, 2,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([401, 404])("does not retry a GET on %i", async (status) => {
    fetchMock.mockResolvedValue(new Response("", { status }));
    await rejection(backendFetch("/x", { schema: anyJson, accessToken: "t" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["POST", "PATCH", "DELETE"] as const)("never retries %s on 503", async (method) => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    await rejection(
      backendFetch("/x", { schema: anyJson, accessToken: "t", method, body: { a: 1 } }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serialises a body with a JSON content type", async () => {
    fetchMock.mockResolvedValue(json({}));
    await backendFetch("/x", { schema: anyJson, accessToken: "t", method: "POST", body: { a: 1 } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("reports invalid JSON on 200 as bad-response", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    const err = await rejection(backendFetch("/x", { schema: anyJson, accessToken: "t" }));
    expect(err.kind).toBe("bad-response");
  });

  it("resolves undefined for 204 and empty bodies only when allowEmpty is set", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      backendFetch("/x", { schema: null, allowEmpty: true, accessToken: "t" }),
    ).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(
      backendFetch("/x", { schema: anyJson, allowEmpty: true, accessToken: "t" }),
    ).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(backendFetch("/x", { schema: anyJson, accessToken: "t" })).rejects.toMatchObject({
      kind: "bad-response",
    });
  });

  it("validates the body with the contract schema: a mismatch is bad-response with the request id", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: "secret" }), {
        status: 200,
        headers: { "x-request-id": "req-be10" },
      }),
    );
    const err = await rejection(
      backendFetch("/budget-entries/x", {
        schema: DeleteBudgetEntryResponse,
        accessToken: "t",
        method: "DELETE",
      }),
    );
    expect(err.kind).toBe("bad-response");
    expect(err.requestId).toBe("req-be10");
    expect(err.issuePaths).toEqual(["success"]);
    expect(JSON.stringify(err)).not.toContain("secret");
  });

  it("sends one Idempotency-Key per POST and If-Match when given", async () => {
    fetchMock.mockImplementation(async () => json({}));
    await backendFetch("/x", { schema: anyJson, accessToken: "t", method: "POST", body: {} });
    await backendFetch("/x", {
      schema: anyJson,
      accessToken: "t",
      method: "PATCH",
      body: {},
      ifMatch: '"2026-01-01T00:00:00.000Z"',
    });
    const [post, patch] = fetchMock.mock.calls.map(([, init]) => new Headers(init.headers));
    expect(post.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(patch.get("Idempotency-Key")).toBeNull();
    expect(patch.get("If-Match")).toBe('"2026-01-01T00:00:00.000Z"');
  });

  it("propagates caller abort to fetch and rejects without retrying", async () => {
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          received = init.signal as AbortSignal;
          init.signal?.addEventListener("abort", () => rej(init.signal?.reason));
        }),
    );
    const p = backendFetch("/x", { schema: anyJson, accessToken: "t", signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toBeDefined();
    expect(received?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not swallow an already aborted caller signal", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      init.signal?.aborted ? Promise.reject(init.signal.reason) : Promise.resolve(json({})),
    );
    await expect(
      backendFetch("/x", { schema: anyJson, accessToken: "t", signal: controller.signal }),
    ).rejects.toBeDefined();
  });
});

describe("backendFetch retries and shared reads", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const urls = () => fetchMock.mock.calls.map(([url]) => String(url));
  const calledFor = (path: string) => urls().filter((u) => u.endsWith(`/v1${path}`)).length;

  /** Each fetch waits until the test releases it, then answers with a fresh copy of `body`. */
  const heldAnswers = (body: unknown) => {
    const release: (() => void)[] = [];
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => release.push(() => resolve(json(body)))),
    );
    return release;
  };
  const inRequest = <T>(requestId: string, fn: () => Promise<T>) => runWithRequestId(requestId, fn);
  const profileRead = (accessToken = "t", schema: ContractSchema<unknown> = anyJson) =>
    backendFetch("/user-profile", { accessToken, schema });

  it("waits 250 ms before retrying a GET", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    const result = backendFetch("/x", { schema: anyJson, accessToken: "t" });
    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["a network failure", () => Promise.reject(new TypeError("fetch failed"))],
    ["a 502", () => Promise.resolve(new Response("", { status: 502 }))],
    ["a 504", () => Promise.resolve(new Response("", { status: 504 }))],
  ])("retries a GET once after %s", async (_label, first) => {
    fetchMock.mockImplementationOnce(first);
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await expect(backendFetch("/x", { schema: anyJson, accessToken: "t" })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries a write, even when asked to", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    await expect(
      backendFetch("/x", { schema: anyJson, accessToken: "t", method: "POST", retries: 2 }),
    ).rejects.toMatchObject({ kind: "server" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops the retry wait at once when the caller cancels, and makes no second call", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error("navigated away");
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      init.signal?.aborted
        ? Promise.reject(init.signal.reason)
        : Promise.resolve(new Response("", { status: 503 })),
    );
    let outcome: unknown = "pending";
    backendFetch("/x", { schema: anyJson, accessToken: "t", signal: controller.signal }).catch(
      (e) => {
        outcome = e;
      },
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends no Idempotency-Key on a POST that opts out", async () => {
    fetchMock.mockResolvedValue(json({}));
    await backendFetch("/x", {
      schema: anyJson,
      accessToken: "t",
      method: "POST",
      body: {},
      idempotencyKey: false,
    });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Idempotency-Key")).toBeNull();
  });

  it("gives every caller sharing a profile read the same answer", async () => {
    const release = heldAnswers({ firstName: "Sam" });
    const both = inRequest("req-share-1", () => Promise.all([profileRead(), profileRead()]));
    for (const go of release) go();
    expect(await both).toEqual([{ firstName: "Sam" }, { firstName: "Sam" }]);
    expect(calledFor("/user-profile")).toBe(1);
  });

  it("answers undefined to every caller sharing an empty read", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    // A schema that, like a real contract schema, refuses an absent body.
    const objectOnly: ContractSchema<unknown> = {
      safeParse: (u: unknown) =>
        typeof u === "object" && u !== null
          ? { success: true, data: u }
          : { success: false, error: { issues: [{ path: [] }] } },
    } as ContractSchema<unknown>;
    const maybe = () =>
      backendFetch("/user-profile", { accessToken: "t", schema: objectOnly, allowEmpty: true });
    const empty = () =>
      backendFetch("/user-profile", { accessToken: "t", schema: null, allowEmpty: true });
    expect(await inRequest("req-empty-1", () => Promise.all([maybe(), maybe()]))).toEqual([
      undefined,
      undefined,
    ]);
    expect(await inRequest("req-empty-2", () => Promise.all([empty(), empty()]))).toEqual([
      undefined,
      undefined,
    ]);
    expect(calledFor("/user-profile")).toBe(2);
  });

  it("reads again after a write in the same request, even while the first read is open", async () => {
    const release = heldAnswers({ firstName: "Sam" });
    await inRequest("req-write-1", async () => {
      const first = profileRead();
      const write = backendFetch("/user-profile", {
        accessToken: "t",
        schema: anyJson,
        method: "PATCH",
        body: { firstName: "Alex" },
      });
      const after = profileRead();
      for (const go of release) go();
      await Promise.all([first, write, after]);
    });
    // The first read, the write and a fresh read: the read after the write did not share the first.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears only the writing request's shared reads", async () => {
    const release = heldAnswers({ firstName: "Sam" });
    // Every call reaches fetch synchronously, so all are queued before anything is released.
    const otherFirst = inRequest("req-other", () => profileRead());
    const write = inRequest("req-writer", () =>
      backendFetch("/accounts", { accessToken: "t", schema: anyJson, method: "POST", body: {} }),
    );
    const otherSecond = inRequest("req-other", () => profileRead());
    for (const go of release) go();
    await Promise.all([otherFirst, write, otherSecond]);
    // The other request's two reads shared one call; the write did not clear it.
    expect(calledFor("/user-profile")).toBe(1);
  });

  it("does not share reads outside a request, of other routes, or with a query", async () => {
    fetchMock.mockImplementation(async () => json([]));
    await Promise.all([profileRead(), profileRead()]);
    expect(calledFor("/user-profile")).toBe(2);
    await inRequest("req-routes", () =>
      Promise.all([
        backendFetch("/accounts", { accessToken: "t", schema: anyJson }),
        backendFetch("/accounts", { accessToken: "t", schema: anyJson }),
      ]),
    );
    expect(calledFor("/accounts")).toBe(2);
    const withQuery = () =>
      backendFetch("/user-profile", { accessToken: "t", schema: anyJson, query: { fields: "x" } });
    await inRequest("req-query", () => Promise.all([withQuery(), withQuery()]));
    expect(urls().filter((u) => u.includes("/v1/user-profile?fields=x"))).toHaveLength(2);
  });

  it("does not share a read between callers with a different token or schema", async () => {
    fetchMock.mockImplementation(async () => json({ firstName: "Sam" }));
    const otherSchema: ContractSchema<unknown> = {
      safeParse: (u: unknown) => ({ success: true, data: u }),
    };
    await inRequest("req-tokens", () => Promise.all([profileRead("a"), profileRead("b")]));
    await inRequest("req-schemas", () =>
      Promise.all([profileRead("a"), profileRead("a", otherSchema)]),
    );
    expect(calledFor("/user-profile")).toBe(4);
  });

  it("does not reuse a read once it has settled, even in the same request", async () => {
    fetchMock.mockImplementation(async () => json({ firstName: "Sam" }));
    await inRequest("req-later", async () => {
      await profileRead();
      await profileRead();
    });
    expect(calledFor("/user-profile")).toBe(2);
  });

  it("keeps a newer caller's shared read when an older one it replaced settles", async () => {
    const release = heldAnswers({ firstName: "Sam" });
    await inRequest("req-replace", async () => {
      const a = profileRead("token-a");
      const b = profileRead("token-b");
      expect(release).toHaveLength(2);
      release[0]();
      await a;
      const c = profileRead("token-b");
      for (const go of release.slice(1)) go();
      await Promise.all([b, c]);
    });
    // a and b each fetched; c shared b's call.
    expect(calledFor("/user-profile")).toBe(2);
  });
});

describe("backendFetchAll", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  const anyList = anyJson as ContractSchema<unknown[]>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const page = (rows: unknown[], next?: string) =>
    new Response(JSON.stringify(rows), {
      status: 200,
      headers: next ? { "X-Next-Cursor": next } : {},
    });

  it("sends the caller's query on every page and joins the rows in order", async () => {
    fetchMock.mockResolvedValueOnce(page([1, 2], "p2"));
    fetchMock.mockResolvedValueOnce(page([3]));
    const rows = await backendFetchAll("/accounts", {
      accessToken: "t",
      schema: anyList,
      query: { limit: 50 },
    });
    expect(rows).toEqual([1, 2, 3]);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${apiConfig.apiBaseUrl}/v1/accounts?limit=50`,
      `${apiConfig.apiBaseUrl}/v1/accounts?limit=50&cursor=p2`,
    ]);
  });

  it("gives up as a bad response after 100 pages of a cursor that never ends", async () => {
    fetchMock.mockImplementation(async () => page([], "again"));
    await expect(
      backendFetchAll("/accounts", { accessToken: "t", schema: anyList }),
    ).rejects.toMatchObject({ kind: "bad-response", endpoint: "/accounts" });
    expect(fetchMock).toHaveBeenCalledTimes(100);
  });

  it.each([
    ["a network failure", () => Promise.reject(new TypeError("fetch failed"))],
    ["a 502", () => Promise.resolve(new Response("", { status: 502 }))],
    ["a 503", () => Promise.resolve(new Response("", { status: 503 }))],
    ["a 504", () => Promise.resolve(new Response("", { status: 504 }))],
  ])("retries a page once after %s", async (_label, first) => {
    fetchMock.mockImplementationOnce(first);
    fetchMock.mockResolvedValueOnce(page([1]));
    await expect(
      backendFetchAll("/accounts", { accessToken: "t", schema: anyList }),
    ).resolves.toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a page on a 404, or when retries is 0", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    await expect(
      backendFetchAll("/accounts", { accessToken: "t", schema: anyList }),
    ).rejects.toMatchObject({ kind: "not-found" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    await expect(
      backendFetchAll("/accounts", { accessToken: "t", schema: anyList, retries: 0 }),
    ).rejects.toMatchObject({ kind: "server" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a failing page only once by default", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    let outcome: unknown = "pending";
    backendFetchAll("/accounts", { accessToken: "t", schema: anyList }).catch((e) => {
      outcome = e;
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ kind: "server" });
  });

  it("stops after the caller cancels during the retry wait", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error("navigated away");
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      init.signal?.aborted
        ? Promise.reject(init.signal.reason)
        : Promise.resolve(new Response("", { status: 503 })),
    );
    let outcome: unknown = "pending";
    backendFetchAll("/accounts", {
      accessToken: "t",
      schema: anyList,
      signal: controller.signal,
    }).catch((e) => {
      outcome = e;
    });
    await vi.advanceTimersByTimeAsync(10);
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
