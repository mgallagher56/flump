import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api-client";
import { BackendError } from "./backend-error";

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
    await expect(apiFetch("/accounts")).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/accounts");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers["X-Flump-Request"]).toBe("1");
    expect(init.method).toBe("GET");
  });

  it("ignores a legacy accessToken and never sends it", async () => {
    fetchMock.mockImplementation(async () => respond(200, "{}"));
    await apiFetch("/x", { accessToken: "tok" });
    await apiFetch("/x", { accessToken: null });
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.stringify(init)).not.toContain("tok");
      expect(init.headers.Authorization).toBeUndefined();
    }
  });

  it("sends a JSON body with the method", async () => {
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await apiFetch("/x", { method: "PATCH", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["X-Flump-Request"]).toBe("1");
  });

  it("does not need window.ENV", async () => {
    vi.stubGlobal("ENV", undefined);
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await expect(apiFetch("/x")).resolves.toEqual({});
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
      await expect(apiFetch("/x")).rejects.toMatchObject({ kind, status });
    }
  });

  it("exposes a server message as detail without leaking it into message", async () => {
    fetchMock.mockResolvedValue(respond(400, JSON.stringify({ message: "Weak password" })));
    const err = (await apiFetch("/x").catch((e) => e)) as BackendError;
    expect(err.detail).toBe("Weak password");
    expect(err.message).not.toContain("Weak password");
  });

  it("maps network failure to unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  it("returns undefined for 204 and empty bodies only when allowEmpty is set", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiFetch("/x", { allowEmpty: true })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(respond(200, ""));
    await expect(apiFetch("/x", { allowEmpty: true })).resolves.toBeUndefined();
  });

  it("treats an empty or 204 body as bad-response by default", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      kind: "bad-response",
    });
    fetchMock.mockResolvedValueOnce(respond(200, "  "));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      kind: "bad-response",
    });
  });

  it("keeps detail for 4xx other than 401 and 403", async () => {
    for (const status of [400, 404, 422]) {
      fetchMock.mockResolvedValueOnce(respond(status, JSON.stringify({ message: "Nope" })));
      const err = (await apiFetch("/x").catch((e) => e)) as BackendError;
      expect(err.detail).toBe("Nope");
    }
  });

  it("drops detail for 401, 403 and 5xx", async () => {
    for (const status of [401, 403, 500, 503]) {
      fetchMock.mockResolvedValueOnce(respond(status, JSON.stringify({ message: "Secret" })));
      const err = (await apiFetch("/x").catch((e) => e)) as BackendError;
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
      const result = apiFetch("/x").catch((e) => e);
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
      const result = apiFetch("/x", { timeoutMs: 100 }).catch((e) => e);
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
      const result = apiFetch("/x", { signal: controller.signal }).catch((e) => e);
      controller.abort(reason);
      const err = await result;
      expect(err).toBe(reason);
      expect(err).not.toBeInstanceOf(BackendError);
    });
  });

  it("maps invalid JSON to bad-response", async () => {
    fetchMock.mockResolvedValue(respond(200, "<html>"));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      kind: "bad-response",
    });
  });
});
