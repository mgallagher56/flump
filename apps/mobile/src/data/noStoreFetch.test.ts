import { createAppApiClient } from "./apiClient";
import { noStoreFetch } from "./noStoreFetch";

const okJson = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("noStoreFetch", () => {
  it("adds Cache-Control: no-store and keeps every other header and option", async () => {
    const base = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => okJson());
    await noStoreFetch(() => base as unknown as typeof fetch)("https://api.test.invalid/v1/x", {
      method: "GET",
      headers: { Authorization: "Bearer t", "X-Flump-Client": "mobile/1 (ios)" },
    });
    const init = base.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("Authorization")).toBe("Bearer t");
    expect(headers.get("X-Flump-Client")).toBe("mobile/1 (ios)");
    expect(init?.method).toBe("GET");
    // Not fetch's cache option, which React Native turns into a `_=` query parameter.
    expect(init?.cache).toBeUndefined();
    expect(base.mock.calls[0]?.[0]).toBe("https://api.test.invalid/v1/x");
  });

  it("every request of the app's API client carries it", async () => {
    const base = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => okJson());
    const api = createAppApiClient({
      apiBaseUrl: "https://api.test.invalid",
      session: { getAccessToken: () => "access_1", refresh: async () => "refreshed" as const },
      client: { version: "1.0.0", platform: "android" },
      fetch: base as unknown as typeof fetch,
      newIdempotencyKey: () => "key_1",
    });
    await api.request("/accounts", {
      schema: { safeParse: (v: unknown) => ({ success: true as const, data: v }) } as never,
    });
    expect(base).toHaveBeenCalledTimes(1);
    expect(new Headers(base.mock.calls[0]?.[1]?.headers).get("Cache-Control")).toBe("no-store");
    expect(new Headers(base.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe(
      "Bearer access_1",
    );
  });
});
