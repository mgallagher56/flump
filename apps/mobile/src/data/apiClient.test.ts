import { randomUUID } from "node:crypto";
import { createAppApiClient } from "./apiClient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ANY = { safeParse: (v: unknown) => ({ success: true as const, data: v }) } as never;

function app() {
  const base = jest.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
  );
  const api = createAppApiClient({
    apiBaseUrl: "https://api.test.invalid",
    session: { getAccessToken: () => "access_1", refresh: async () => "refreshed" as const },
    client: { version: "1.0.0", platform: "android" },
    fetch: base as unknown as typeof fetch,
    // What authDeps passes on the phone is expo-crypto's; Node's stands in here.
    newIdempotencyKey: () => randomUUID(),
  });
  const keyOf = (call: number) =>
    new Headers(base.mock.calls[call]?.[1]?.headers).get("Idempotency-Key");
  return { api, base, keyOf };
}

describe("the app's API client and the Idempotency-Key", () => {
  it("runs where Hermes does: no global crypto.randomUUID (src/testing/jestSetup.ts)", () => {
    expect(globalThis.crypto?.randomUUID).toBeUndefined();
  });

  it("gives a POST that names no key a real UUID of its own, a new one each time", async () => {
    // The device check's add: the shared client's default key needs the global, so it threw.
    const { api, base, keyOf } = app();
    await api.request("/budget-entries", { method: "POST", body: { a: 1 }, schema: ANY });
    await api.request("/budget-entries", { method: "POST", body: { a: 1 }, schema: ANY });
    expect(base).toHaveBeenCalledTimes(2);
    expect(keyOf(0)).toMatch(UUID);
    expect(keyOf(1)).toMatch(UUID);
    expect(keyOf(1)).not.toBe(keyOf(0));
  });

  it("keeps a caller's own key (a retried add) and sends none for false (sign-out)", async () => {
    const { api, keyOf } = app();
    await api.request("/accounts", { method: "POST", body: {}, schema: ANY, idempotencyKey: "k1" });
    await api.request("/auth/logout", { method: "POST", schema: ANY, idempotencyKey: false });
    expect(keyOf(0)).toBe("k1");
    expect(keyOf(1)).toBeNull();
  });

  it("adds no key to other methods", async () => {
    const { api, keyOf } = app();
    await api.request("/budget-entries/x", { method: "PATCH", body: {}, schema: ANY });
    await api.request("/accounts", { schema: ANY });
    expect(keyOf(0)).toBeNull();
    expect(keyOf(1)).toBeNull();
  });
});
