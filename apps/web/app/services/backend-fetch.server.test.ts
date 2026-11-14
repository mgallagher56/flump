import type { ContractSchema } from "@flump/api-client";
import { DeleteBudgetEntryResponse } from "@flump/api-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiConfig } from "~/config.server";
import { backendFetch } from "./backend-client.server";
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
