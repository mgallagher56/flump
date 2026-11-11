// @vitest-environment node
// happy-dom drops Set-Cookie on Response, so use the native Node fetch classes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@workos-inc/authkit-react-router", () => ({ signOut: mocks.signOut }));

import { action, loader } from "./logout._index";

const makeArgs = (url: string, method = "GET") =>
  ({ request: new Request(url, { method }), params: {}, context: {} }) as any;

const CLEAR_COOKIE = "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0";

beforeEach(() => {
  mocks.signOut.mockReset();
  mocks.signOut.mockResolvedValue(new Response(null, { status: 302 }));
  vi.stubEnv("VITE_MARKETING_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("logout loader", () => {
  it("uses VITE_MARKETING_URL as returnTo when set", async () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://marketing.example.test");
    await loader(makeArgs("http://localhost:3000/logout"));
    expect(mocks.signOut).toHaveBeenCalledWith(expect.any(Request), {
      returnTo: "https://marketing.example.test",
    });
  });

  it.each(["http://localhost:3000/logout", "http://127.0.0.1:3000/logout"])(
    "falls back to http://localhost:3001 on %s",
    async (url) => {
      await loader(makeArgs(url));
      expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "http://localhost:3001" });
    },
  );

  it("falls back to https://flump.co.uk elsewhere", async () => {
    await loader(makeArgs("https://app.flump.co.uk/logout"));
    expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "https://flump.co.uk" });
  });

  it("clears the presence cookie without a Domain on localhost", async () => {
    const res = (await loader(makeArgs("http://localhost:3000/logout"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });

  it("clears the presence cookie with Domain=.flump.co.uk on flump.co.uk hosts", async () => {
    const res = (await loader(makeArgs("https://app.flump.co.uk/logout"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Domain=.flump.co.uk`]);
  });

  it("keeps WorkOS Set-Cookie headers and status", async () => {
    const upstream = new Response(null, { status: 302, statusText: "Found" });
    upstream.headers.append("Set-Cookie", "wos-session=; Max-Age=0; Path=/");
    upstream.headers.set("Location", "https://flump.co.uk");
    mocks.signOut.mockResolvedValue(upstream);

    const res = (await loader(makeArgs("http://localhost:3000/logout"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://flump.co.uk");
    expect(res.headers.getSetCookie()).toEqual(["wos-session=; Max-Age=0; Path=/", CLEAR_COOKIE]);
  });

  it("returns a non-Response signOut result unchanged", async () => {
    const data = { ok: true };
    mocks.signOut.mockResolvedValue(data);
    expect(await loader(makeArgs("http://localhost:3000/logout"))).toBe(data);
  });

  it("PINS current behaviour: both loader (GET) and action sign out", async () => {
    // GET /logout signs the user out (logout-CSRF concern). Follow-up for E1; intentionally unchanged.
    await loader(makeArgs("http://localhost:3000/logout", "GET"));
    await action(makeArgs("http://localhost:3000/logout", "POST"));
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });

  it("rejects when signOut rejects, so no clear-cookie response is fabricated", async () => {
    const boom = new Error("signOut failed");
    mocks.signOut.mockRejectedValue(boom);
    await expect(loader(makeArgs("http://localhost:3000/logout"))).rejects.toBe(boom);
    await expect(action(makeArgs("http://localhost:3000/logout", "POST"))).rejects.toBe(boom);
  });
});
