// @vitest-environment node
// happy-dom drops Set-Cookie on Response, so use the native Node fetch classes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@workos-inc/authkit-react-router", () => ({ signOut: mocks.signOut }));

import { action, loader } from "./logout._index";

// The global test setup stubs react-router; the loader needs the real `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const makeArgs = (url: string, method = "GET", headers?: Record<string, string>) =>
  ({ request: new Request(url, { method, headers }), params: {}, context: {} }) as any;

const CLEAR_COOKIE = "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0";

beforeEach(() => {
  mocks.signOut.mockReset();
  mocks.signOut.mockResolvedValue(new Response(null, { status: 302 }));
  vi.stubEnv("VITE_MARKETING_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("logout action", () => {
  it("uses VITE_MARKETING_URL as returnTo when set", async () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://marketing.example.test");
    await action(makeArgs("http://localhost:3000/logout", "POST"));
    expect(mocks.signOut).toHaveBeenCalledWith(expect.any(Request), {
      returnTo: "https://marketing.example.test",
    });
  });

  it.each(["http://localhost:3000/logout", "http://127.0.0.1:3000/logout"])(
    "falls back to http://localhost:3001 on %s",
    async (url) => {
      await action(makeArgs(url, "POST"));
      expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "http://localhost:3001" });
    },
  );

  it("falls back to the deployed marketing site elsewhere, not the request origin", async () => {
    await action(makeArgs("https://web.example.test/logout", "POST"));
    expect(mocks.signOut.mock.calls[0][1]).toEqual({
      returnTo: "https://marketing-production-d21f.up.railway.app",
    });
  });

  it("clears the presence cookie host-only (no Domain) on localhost", async () => {
    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });

  it("appends the legacy wos-session clear without clobbering authkit cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
    mocks.signOut.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { "Set-Cookie": "__Host-wos-session=; Max-Age=0; Path=/" },
      }),
    );
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([
      "__Host-wos-session=; Max-Age=0; Path=/",
      `${CLEAR_COOKIE}; Secure`,
      "wos-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
    ]);
  });

  it("does not add the legacy clear when the configured name is wos-session or outside production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_COOKIE_NAME", "wos-session");
    let res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
    res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("clears the presence cookie host-only with Secure on https hosts", async () => {
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("keeps WorkOS Set-Cookie headers and status", async () => {
    const upstream = new Response(null, { status: 302, statusText: "Found" });
    upstream.headers.append("Set-Cookie", "wos-session=; Max-Age=0; Path=/");
    upstream.headers.set("Location", "https://marketing.example.test");
    mocks.signOut.mockResolvedValue(upstream);

    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://marketing.example.test");
    expect(res.headers.getSetCookie()).toEqual(["wos-session=; Max-Age=0; Path=/", CLEAR_COOKIE]);
  });

  it("returns a non-Response signOut result unchanged", async () => {
    const data = { ok: true };
    mocks.signOut.mockResolvedValue(data);
    expect(await action(makeArgs("http://localhost:3000/logout", "POST"))).toBe(data);
  });

  it("adds Secure when x-forwarded-proto is https on a plain-http request", async () => {
    const res = (await action(
      makeArgs("http://web.up.railway.app/logout", "POST", { "x-forwarded-proto": "https" }),
    )) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("does not add Secure when x-forwarded-proto is http", async () => {
    const res = (await action(
      makeArgs("http://localhost:3000/logout", "POST", { "x-forwarded-proto": "http" }),
    )) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });
});

describe("logout loader (GET)", () => {
  it("never signs out and sets no cookies", async () => {
    const res = (await loader()) as Response;
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("logout failure", () => {
  it("rejects when signOut rejects, so no clear-cookie response is fabricated", async () => {
    const boom = new Error("signOut failed");
    mocks.signOut.mockRejectedValue(boom);
    await expect(action(makeArgs("http://localhost:3000/logout", "POST"))).rejects.toBe(boom);
  });
});
