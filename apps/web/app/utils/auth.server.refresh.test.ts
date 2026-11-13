// @vitest-environment node
// happy-dom drops Set-Cookie on Headers and Response, so use the native Node classes.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { applyRefreshedCookies } from "~/security/session-cookies.server";
import { getAuthSession, requireAccessToken } from "./auth.server";

const mockAuthkitLoader = vi.fn();

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: (...args: any[]) => mockAuthkitLoader(...args),
}));
// The global test setup stubs react-router; this file needs the real RouterContextProvider.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const { RouterContextProvider } = await import("react-router");

const COOKIE = "__Host-wos-session=sealed; Max-Age=1209600; Path=/; Secure; HttpOnly; SameSite=Lax";

const refreshed = (cookie: string) => async (_args: any, cb: any) => {
  await cb({ getAccessToken: () => "tok" });
  return {
    data: { user: { id: "u1" }, accessToken: "tok" },
    init: { headers: new Headers({ "Set-Cookie": cookie }) },
  };
};

beforeEach(() => {
  mockAuthkitLoader.mockReset();
});

describe("refreshed session cookie hand-off (E20-N2)", () => {
  test("records the refresh Set-Cookie against the request context", async () => {
    const context = {};
    mockAuthkitLoader.mockImplementationOnce(refreshed("wos-session=new; Path=/"));
    await getAuthSession({ context } as any);
    const res = applyRefreshedCookies(context, new Response("ok"));
    expect(res.headers.getSetCookie()).toEqual(["wos-session=new; Path=/"]);
  });

  test("works with a real RouterContextProvider as the key", async () => {
    const context = new RouterContextProvider();
    mockAuthkitLoader.mockImplementationOnce(refreshed(COOKIE));
    await getAuthSession({ context } as any);
    const res = applyRefreshedCookies(context, new Response("ok"));
    expect(res.headers.getSetCookie()).toEqual([COOKIE]);
  });

  test("passes __Host-, Secure, HttpOnly and SameSite attributes through verbatim", async () => {
    const context = new RouterContextProvider();
    mockAuthkitLoader.mockImplementationOnce(refreshed(COOKIE));
    await getAuthSession({ context } as any);
    const [cookie] = applyRefreshedCookies(context, new Response("ok")).headers.getSetCookie();
    expect(cookie).toBe(COOKIE);
    expect(cookie).toContain("__Host-");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Domain");
  });

  test("records nothing when the session was not refreshed", async () => {
    const context = {};
    mockAuthkitLoader.mockResolvedValueOnce({
      data: { user: { id: "u1" }, accessToken: "tok" },
      init: { headers: new Headers() },
    });
    await getAuthSession({ context } as any);
    const original = new Response("ok");
    expect(applyRefreshedCookies(context, original)).toBe(original);
  });

  test("still appends the cookie when the loader throws a redirect after a refresh", async () => {
    const context = new RouterContextProvider();
    mockAuthkitLoader.mockImplementationOnce(refreshed(COOKIE));
    const session = await getAuthSession({ context } as any);
    let thrown: unknown;
    try {
      requireAccessToken({ accessToken: null });
      expect.unreachable();
    } catch (e) {
      thrown = e;
    }
    expect(session.user?.id).toBe("u1");
    const res = applyRefreshedCookies(context, thrown as Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
    expect(res.headers.getSetCookie()).toEqual([COOKIE]);
  });
});

describe("single-flight refresh per request", () => {
  test("two concurrent calls with the same context call authkit once and record one cookie", async () => {
    const context = new RouterContextProvider();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    mockAuthkitLoader.mockImplementation(async (args: any, cb: any) => {
      await gate;
      return refreshed(COOKIE)(args, cb);
    });
    const a = getAuthSession({ context } as any);
    const b = getAuthSession({ context } as any, { ensureSignedIn: false });
    release();
    const [first, second] = await Promise.all([a, b]);
    expect(mockAuthkitLoader).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe("tok");
    expect(second.accessToken).toBe("tok");
    const res = applyRefreshedCookies(context, new Response("ok"));
    expect(res.headers.getSetCookie()).toEqual([COOKIE]);
  });

  test("different contexts do not share a session", async () => {
    mockAuthkitLoader.mockImplementation(refreshed(COOKIE));
    await getAuthSession({ context: new RouterContextProvider() } as any);
    await getAuthSession({ context: new RouterContextProvider() } as any);
    expect(mockAuthkitLoader).toHaveBeenCalledTimes(2);
  });

  test("a rejected attempt is dropped so a later call can retry", async () => {
    const context = new RouterContextProvider();
    mockAuthkitLoader.mockRejectedValueOnce(new Response(null, { status: 302 }));
    await expect(getAuthSession({ context } as any)).rejects.toBeInstanceOf(Response);
    mockAuthkitLoader.mockImplementationOnce(refreshed(COOKIE));
    const session = await getAuthSession({ context } as any);
    expect(session.user?.id).toBe("u1");
    expect(mockAuthkitLoader).toHaveBeenCalledTimes(2);
  });

  test("a signed-out ensureSignedIn caller falls through to the real redirect", async () => {
    const context = new RouterContextProvider();
    const redirect = new Response(null, { status: 302, headers: { Location: "https://auth" } });
    mockAuthkitLoader.mockResolvedValueOnce({ data: { user: null, accessToken: null } });
    mockAuthkitLoader.mockRejectedValueOnce(redirect);
    await expect(getAuthSession({ context } as any)).rejects.toBe(redirect);
    expect(mockAuthkitLoader.mock.calls[1][2]).toEqual({ ensureSignedIn: true });
  });
});
