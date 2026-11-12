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
const CLEAR_COOKIE_SECURE_DOMAIN = `${CLEAR_COOKIE}; Domain=.flump.co.uk; Secure`;

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

  it("falls back to https://flump.co.uk elsewhere", async () => {
    await action(makeArgs("https://app.flump.co.uk/logout", "POST"));
    expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "https://flump.co.uk" });
  });

  it("clears the presence cookie without a Domain on localhost", async () => {
    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });

  it("clears the presence cookie with Domain=.flump.co.uk and Secure on flump.co.uk hosts", async () => {
    const res = (await action(makeArgs("https://app.flump.co.uk/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE_SECURE_DOMAIN]);
  });

  it("keeps WorkOS Set-Cookie headers and status", async () => {
    const upstream = new Response(null, { status: 302, statusText: "Found" });
    upstream.headers.append("Set-Cookie", "wos-session=; Max-Age=0; Path=/");
    upstream.headers.set("Location", "https://flump.co.uk");
    mocks.signOut.mockResolvedValue(upstream);

    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://flump.co.uk");
    expect(res.headers.getSetCookie()).toEqual(["wos-session=; Max-Age=0; Path=/", CLEAR_COOKIE]);
  });

  it("returns a non-Response signOut result unchanged", async () => {
    const data = { ok: true };
    mocks.signOut.mockResolvedValue(data);
    expect(await action(makeArgs("http://localhost:3000/logout", "POST"))).toBe(data);
  });

  it("does not give lookalike hosts a Domain, and adds Secure on https", async () => {
    const res = (await action(makeArgs("https://evilflump.co.uk/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
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
