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
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the base URL from window.ENV and sends the bearer token", async () => {
    fetchMock.mockResolvedValue(respond(200, JSON.stringify({ ok: 1 })));
    await expect(apiFetch("/accounts", { accessToken: "tok" })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/accounts");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.method).toBe("GET");
  });

  it("sends a JSON body with the method", async () => {
    fetchMock.mockResolvedValue(respond(200, "{}"));
    await apiFetch("/x", { accessToken: "t", method: "PATCH", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("rejects unauthorised without fetching when the token is missing", async () => {
    await expect(apiFetch("/x", { accessToken: null })).rejects.toMatchObject({
      kind: "unauthorised",
    });
    await expect(apiFetch("/x", { accessToken: undefined })).rejects.toBeInstanceOf(BackendError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws unavailable when window.ENV is missing", async () => {
    vi.stubGlobal("ENV", undefined);
    await expect(apiFetch("/x", { accessToken: "t" })).rejects.toMatchObject({
      kind: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
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
      await expect(apiFetch("/x", { accessToken: "t" })).rejects.toMatchObject({ kind, status });
    }
  });

  it("exposes a server message as detail without leaking it into message", async () => {
    fetchMock.mockResolvedValue(respond(400, JSON.stringify({ message: "Weak password" })));
    const err = (await apiFetch("/x", { accessToken: "t" }).catch((e) => e)) as BackendError;
    expect(err.detail).toBe("Weak password");
    expect(err.message).not.toContain("Weak password");
  });

  it("maps network failure to unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/x", { accessToken: "t" })).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  it("returns undefined for 204 and empty bodies", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiFetch("/x", { accessToken: "t" })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(respond(200, ""));
    await expect(apiFetch("/x", { accessToken: "t" })).resolves.toBeUndefined();
  });

  it("maps invalid JSON to bad-response", async () => {
    fetchMock.mockResolvedValue(respond(200, "<html>"));
    await expect(apiFetch("/x", { accessToken: "t" })).rejects.toMatchObject({
      kind: "bad-response",
    });
  });
});
