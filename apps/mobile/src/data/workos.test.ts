import { randomUUID } from "node:crypto";
import { createWorkosClient } from "./workos";

const config = { authBaseUrl: "https://auth.test.invalid", clientId: "client_TESTONLY" };
// Built at runtime, never real.
const access = () => `a.${randomUUID()}.c`;
const refresh = () => `r_${randomUUID()}`;

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe("createWorkosClient", () => {
  it("exchanges a code with the verifier and no secret", async () => {
    const tokens = { access_token: access(), refresh_token: refresh() };
    const { fn, calls } = fakeFetch(200, { user: { id: "u" }, ...tokens });
    const result = await createWorkosClient({ ...config, fetch: fn }).exchangeCode(
      "code1",
      "v".repeat(43),
    );
    expect(result).toEqual({
      ok: true,
      tokens: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token },
    });
    expect(calls[0]?.url).toBe("https://auth.test.invalid/user_management/authenticate");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      client_id: "client_TESTONLY",
      grant_type: "authorization_code",
      code: "code1",
      code_verifier: "v".repeat(43),
    });
  });

  it("refreshes with the refresh token and no secret", async () => {
    const old = refresh();
    const next = { access_token: access(), refresh_token: refresh() };
    const { fn, calls } = fakeFetch(200, next);
    const result = await createWorkosClient({ ...config, fetch: fn }).refresh(old);
    expect(result).toEqual({
      ok: true,
      tokens: { accessToken: next.access_token, refreshToken: next.refresh_token },
    });
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body).toEqual({
      client_id: "client_TESTONLY",
      grant_type: "refresh_token",
      refresh_token: old,
    });
    expect(Object.keys(body)).not.toContain("client_secret");
  });

  it.each([400, 401])("an invalid_grant answer (%i) is rejected", async (status) => {
    const { fn } = fakeFetch(status, { error: "invalid_grant", error_description: "x" });
    expect(await createWorkosClient({ ...config, fetch: fn }).refresh(refresh())).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it.each([
    ["a server error", 503, { error: "service_unavailable" }],
    ["rate limiting", 429, { error: "rate_limited" }],
    ["another 400", 400, { error: "invalid_client" }],
    ["a body that is not JSON", 200, "<html>"],
    ["a 200 without a refresh token", 200, { access_token: "a.b.c" }],
    ["a 200 with an empty access token", 200, { access_token: "", refresh_token: "r" }],
  ])("%s is unavailable, never rejected", async (_name, status, body) => {
    const { fn } = fakeFetch(status, body);
    expect(await createWorkosClient({ ...config, fetch: fn }).refresh(refresh())).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("a network failure is unavailable", async () => {
    const fn = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    expect(await createWorkosClient({ ...config, fetch: fn }).exchangeCode("c", "v")).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("gives up after the timeout and reports unavailable", async () => {
    jest.useFakeTimers();
    try {
      const fn = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ) as unknown as typeof fetch;
      const pending = createWorkosClient({ ...config, fetch: fn, timeoutMs: 1000 }).refresh("r");
      jest.advanceTimersByTime(1000);
      expect(await pending).toEqual({ ok: false, reason: "unavailable" });
    } finally {
      jest.useRealTimers();
    }
  });
});
