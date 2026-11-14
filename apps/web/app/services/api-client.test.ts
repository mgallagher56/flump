import type { ContractSchema } from "@flump/api-client";
import { BudgetEntryResponse } from "@flump/api-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiFetchAll } from "./api-client";
import { BackendError } from "./backend-error";

/** Accepts any JSON body: these tests are about the transport, not a contract shape. */
const anyJson: ContractSchema<unknown> = {
  safeParse: (u: unknown) => ({ success: true, data: u }),
};

function respond(status: number, body?: string) {
  return new Response(body ?? null, { status });
}

describe("apiFetch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("calls the same-origin /api proxy with no Authorization header", async () => {
    fetchMock.mockResolvedValue(respond(200, JSON.stringify({ ok: 1 })));
    await expect(apiFetch("/accounts", { schema: anyJson })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/accounts");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers["X-Flump-Request"]).toBe("1");
    expect(init.method).toBe("GET");
  });

  it("has no token option and relies on the same-origin session cookie", async () => {
    fetchMock.mockImplementation(async () => respond(200, "{}"));
    // @ts-expect-error E20-N9: the deprecated accessToken option is gone
    await apiFetch("/x", { schema: anyJson, accessToken: "tok" });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.stringify(init)).not.toContain("tok");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.credentials).toBe("same-origin");
  });

  it("sends a JSON body with the method", async () => {
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await apiFetch("/x", { schema: anyJson, method: "PATCH", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["X-Flump-Request"]).toBe("1");
  });

  it("does not need window.ENV", async () => {
    vi.stubGlobal("ENV", undefined);
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await expect(apiFetch("/x", { schema: anyJson })).resolves.toEqual({});
  });

  it("maps statuses to kinds", async () => {
    for (const [status, kind] of [
      [401, "unauthorised"],
      [403, "forbidden"],
      [404, "not-found"],
      [400, "client"],
      [503, "server"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(respond(status));
      await expect(apiFetch("/x", { schema: anyJson })).rejects.toMatchObject({ kind, status });
    }
  });

  it("exposes a server message as detail without leaking it into message", async () => {
    fetchMock.mockResolvedValue(respond(400, JSON.stringify({ message: "Weak password" })));
    const err = (await apiFetch("/x", { schema: anyJson }).catch((e) => e)) as BackendError;
    expect(err.detail).toBe("Weak password");
    expect(err.message).not.toContain("Weak password");
  });

  it("maps network failure to unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/x", { schema: anyJson })).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  it("returns undefined for 204 and empty bodies only when allowEmpty is set", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiFetch("/x", { schema: anyJson, allowEmpty: true })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(respond(200, ""));
    await expect(apiFetch("/x", { schema: anyJson, allowEmpty: true })).resolves.toBeUndefined();
  });

  it("treats an empty or 204 body as bad-response by default", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiFetch("/x", { schema: anyJson })).rejects.toMatchObject({
      kind: "bad-response",
    });
    fetchMock.mockResolvedValueOnce(respond(200, "  "));
    await expect(apiFetch("/x", { schema: anyJson })).rejects.toMatchObject({
      kind: "bad-response",
    });
  });

  it("keeps detail for 4xx other than 401 and 403", async () => {
    for (const status of [400, 404, 422]) {
      fetchMock.mockResolvedValueOnce(respond(status, JSON.stringify({ message: "Nope" })));
      const err = (await apiFetch("/x", { schema: anyJson }).catch((e) => e)) as BackendError;
      expect(err.detail).toBe("Nope");
    }
  });

  it("drops detail for 401, 403 and 5xx", async () => {
    for (const status of [401, 403, 500, 503]) {
      fetchMock.mockResolvedValueOnce(respond(status, JSON.stringify({ message: "Secret" })));
      const err = (await apiFetch("/x", { schema: anyJson }).catch((e) => e)) as BackendError;
      expect(err.detail).toBeUndefined();
    }
  });

  describe("timeout and abort", () => {
    afterEach(() => vi.useRealTimers());

    it("aborts after the default 15000 ms and reports unavailable", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );
      const result = apiFetch("/x", { schema: anyJson }).catch((e) => e);
      await vi.advanceTimersByTimeAsync(14999);
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      const err = (await result) as BackendError;
      expect(err).toBeInstanceOf(BackendError);
      expect(err.kind).toBe("unavailable");
    });

    it("honours a custom timeoutMs", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );
      const result = apiFetch("/x", { schema: anyJson, timeoutMs: 100 }).catch((e) => e);
      await vi.advanceTimersByTimeAsync(101);
      expect(((await result) as BackendError).kind).toBe("unavailable");
    });

    it("rethrows a caller abort as is, not as a backend failure", async () => {
      const controller = new AbortController();
      const reason = new DOMException("Aborted", "AbortError");
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );
      const result = apiFetch("/x", { schema: anyJson, signal: controller.signal }).catch((e) => e);
      controller.abort(reason);
      const err = await result;
      expect(err).toBe(reason);
      expect(err).not.toBeInstanceOf(BackendError);
    });
  });

  it("maps invalid JSON to bad-response", async () => {
    fetchMock.mockResolvedValue(respond(200, "<html>"));
    await expect(apiFetch("/x", { schema: anyJson })).rejects.toMatchObject({
      kind: "bad-response",
    });
  });

  it("sends paths unversioned: the /api proxy adds /v1 when it forwards", async () => {
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await apiFetch("/budget-entries", { schema: anyJson });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/budget-entries");
  });

  it("sends Idempotency-Key on POST and If-Match when given", async () => {
    fetchMock.mockImplementation(async () => respond(200, "{}"));
    await apiFetch("/x", { schema: anyJson, method: "POST", body: {} });
    await apiFetch("/x", { schema: anyJson, method: "PATCH", body: {}, ifMatch: '"e"' });
    const [post, patch] = fetchMock.mock.calls.map(([, init]) => init.headers);
    expect(post["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(patch["Idempotency-Key"]).toBeUndefined();
    expect(patch["If-Match"]).toBe('"e"');
  });

  it("maps a body that breaks the contract schema to bad-response with the request id", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "x", secret: "leak" }), {
        status: 200,
        headers: { "x-request-id": "req-abc" },
      }),
    );
    const err = (await apiFetch("/budget-entries/x", { schema: BudgetEntryResponse }).catch(
      (e) => e,
    )) as BackendError;
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe("bad-response");
    expect(err.requestId).toBe("req-abc");
    expect(JSON.stringify(err)).not.toContain("leak");
  });

  it("follows X-Next-Cursor in apiFetchAll", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("[1]", { status: 200, headers: { "X-Next-Cursor": "c2" } }),
      )
      .mockResolvedValueOnce(respond(200, "[2]"));
    const numbers: ContractSchema<number[]> = {
      safeParse: (u: unknown) =>
        Array.isArray(u) && u.every((n) => typeof n === "number")
          ? { success: true, data: u }
          : { success: false, error: { issues: [{ path: [] }] } },
    };
    await expect(apiFetchAll("/mcp-tokens", { schema: numbers })).resolves.toEqual([1, 2]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/mcp-tokens",
      "/api/mcp-tokens?cursor=c2",
    ]);
  });
});
