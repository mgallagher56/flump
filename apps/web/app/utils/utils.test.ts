import { vi } from "vitest";

import { getAuthSession, noop, safeRedirect, useMatchesData, validateEmail } from "./utils";

const mockAuthkitLoader = vi.fn();

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: (...args: any[]) => mockAuthkitLoader(...args),
}));

// vi mock useMatches
vi.mock("react-router", () => {
  return {
    useMatches: (): { id: string; data: { foo: string } }[] => [
      {
        id: "home",
        data: { foo: "bar" },
      },
    ],
  };
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useMemo: vi.fn((fn) => fn()),
  };
});

describe("validateEmail", () => {
  test("validateEmail returns false for non-emails", () => {
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("n@")).toBe(false);
  });

  test("validateEmail returns true for emails", () => {
    expect(validateEmail("kody@example.com")).toBe(true);
  });
});

describe("safeRedirect", () => {
  test("safeRedirect returns the default redirect if to is not a string", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect(null)).toBe("/");
    expect(safeRedirect("")).toBe("/");
    expect(safeRedirect("not-a-path")).toBe("/");
  });

  test("safeRedirect returns the default redirect if to is not a relative path", () => {
    expect(safeRedirect("//example.com")).toBe("/");
    expect(safeRedirect("https://example.com")).toBe("/");
    expect(safeRedirect("mailto")).toBe("/");
  });

  test("safeRedirect returns to if it is a relative path", () => {
    expect(safeRedirect("/")).toBe("/");
    expect(safeRedirect("/about")).toBe("/about");
    expect(safeRedirect("/about?foo=bar")).toBe("/about?foo=bar");
  });

  test("safeREdirect returns the given default redirect if to is not a relative path", () => {
    expect(safeRedirect("//example.com", "/about")).toBe("/about");
    expect(safeRedirect("https://example.com", "/about")).toBe("/about");
    expect(safeRedirect("mailto", "/about")).toBe("/about");
  });
});

describe("useMatchesData", () => {
  test("useMatchesData returns undefined if no matching routes", () => {
    expect(useMatchesData("not-a-route")).toBe(undefined);
  });

  test("useMatchesData returns the matching route data", () => {
    const data = { foo: "bar" };
    expect(useMatchesData("home")).toEqual(data);
  });
});

describe("noop()", () => {
  test("noop returns undefined", () => expect(noop()).toBe(undefined));
});

describe("getAuthSession", () => {
  test("handles object with data field", async () => {
    mockAuthkitLoader.mockImplementationOnce(async (_args: any, cb: any) => {
      await cb({ getAccessToken: () => "tok-1" });
      return {
        data: { user: { id: "u1", email: "u1@test.com" }, accessToken: "tok-1" },
        init: { headers: { "Set-Cookie": "a=b" } },
      };
    });

    const session = await getAuthSession({} as any);
    expect(session.user?.id).toBe("u1");
    expect(session.accessToken).toBe("tok-1");
  });

  test("handles Response-like object with json() method", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({
      json: async () => ({ user: { id: "u2" }, accessToken: "tok-2" }),
      headers: { "X-Custom": "1" },
    });

    const session = await getAuthSession({} as any, { ensureSignedIn: false });
    expect(session.user?.id).toBe("u2");
    expect(session.accessToken).toBe("tok-2");
  });

  test("handles plain object response", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({
      user: { id: "u3" },
      accessToken: "tok-3",
    });

    const session = await getAuthSession({} as any);
    expect(session.user?.id).toBe("u3");
  });

  test("rethrows Response and status/headers errors", async () => {
    mockAuthkitLoader.mockRejectedValueOnce(new Response("Redirect", { status: 302 }));
    await expect(getAuthSession({} as any)).rejects.toBeInstanceOf(Response);

    mockAuthkitLoader.mockRejectedValueOnce({ status: 302, headers: {} });
    await expect(getAuthSession({} as any)).rejects.toEqual({ status: 302, headers: {} });
  });

  test("falls back to mock dev session on generic error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockAuthkitLoader.mockRejectedValueOnce(new Error("Missing WorkOS config"));

    const session = await getAuthSession({} as any);
    expect(session.user?.id).toBe("dev_user_123");
    expect(session.accessToken).toBe("mock-session-token");
    warnSpy.mockRestore();
  });
});
