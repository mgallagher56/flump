// @vitest-environment node
// happy-dom drops Set-Cookie on Headers and Response, so use the native Node classes.
import { describe, expect, test, vi } from "vitest";
import { applyRefreshedCookies } from "~/security/session-cookies.server";
import { getAuthSession } from "./auth.server";

const mockAuthkitLoader = vi.fn();

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: (...args: any[]) => mockAuthkitLoader(...args),
}));

describe("refreshed session cookie hand-off (E20-N2)", () => {
  const refreshed = (cookie: string) => async (_args: any, cb: any) => {
    await cb({ getAccessToken: () => "tok" });
    return {
      data: { user: { id: "u1" }, accessToken: "tok" },
      init: { headers: new Headers({ "Set-Cookie": cookie }) },
    };
  };

  test("records the refresh Set-Cookie against the request context", async () => {
    const context = {};
    mockAuthkitLoader.mockImplementationOnce(refreshed("wos-session=new; Path=/"));
    await getAuthSession({ context } as any);
    const res = applyRefreshedCookies(context, new Response("ok"));
    expect(res.headers.getSetCookie()).toEqual(["wos-session=new; Path=/"]);
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
});
