// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { backendFetchBytes } from "./backend-client.server";
import { BackendError } from "./backend-error";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

const respond = (status: number, headers: Record<string, string> = {}, body = "abc") =>
  vi.fn().mockResolvedValue(new Response(body, { status, headers }));

describe("backendFetchBytes", () => {
  it("returns the bytes, content type and decoded filename, sending the bearer token", async () => {
    const fetchMock = respond(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename*=UTF-8''my%20r%C3%A9c%27u.pdf",
    });
    globalThis.fetch = fetchMock;
    const res = await backendFetchBytes("/tax-records/x/receipt", { accessToken: "tok" });
    expect(res.contentType).toBe("application/pdf");
    expect(res.filename).toBe("my réc'u.pdf");
    expect(new TextDecoder().decode(res.body)).toBe("abc");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("defaults the type and tolerates a missing or malformed filename", async () => {
    globalThis.fetch = respond(200, {
      "Content-Disposition": "attachment; filename*=UTF-8''%E0%A4%A",
    });
    const res = await backendFetchBytes("/x", { accessToken: "t" });
    expect(res.contentType).toBe("text/plain;charset=UTF-8");
    expect(res.filename).toBeNull();
  });

  it.each([
    [401, "unauthorised"],
    [403, "forbidden"],
    [404, "not-found"],
    [500, "server"],
  ])("maps a %i response to a %s BackendError without retrying", async (status, kind) => {
    const fetchMock = respond(status, {}, "secret backend text");
    globalThis.fetch = fetchMock;
    const err = await backendFetchBytes("/x", { accessToken: "tok" }).catch((e) => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe(kind);
    expect(err.message).not.toMatch(/secret|tok/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a network failure as unavailable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("boom"));
    const err = await backendFetchBytes("/x", { accessToken: "t" }).catch((e) => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe("unavailable");
  });

  it("aborts on timeout and reports unavailable", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    ) as unknown as typeof fetch;
    const pending = backendFetchBytes("/x", { accessToken: "t", timeoutMs: 50 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(60);
    const err = await pending;
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe("unavailable");
  });

  it("rethrows the caller's abort unchanged", async () => {
    const controller = new AbortController();
    const reason = new Error("navigated away");
    globalThis.fetch = vi.fn(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    ) as unknown as typeof fetch;
    const pending = backendFetchBytes("/x", { accessToken: "t", signal: controller.signal }).catch(
      (e) => e,
    );
    controller.abort(reason);
    expect(await pending).toBe(reason);
  });
});
