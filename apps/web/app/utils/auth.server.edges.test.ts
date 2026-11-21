// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEV_ACCESS_TOKEN, DEV_SESSION_USER, getAuthSession } from "./auth.server";

const mockAuthkitLoader = vi.fn();

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: (...args: any[]) => mockAuthkitLoader(...args),
}));

// authkit's own data carries the user but no access token: the token reaches the page only
// through what our loader callback returns, merged under authkit's fields.
const authkitMerging =
  (user: { id: string } | null, token: string | null) => async (_args: any, cb: any) => {
    const ours = await cb({ getAccessToken: () => token });
    return { data: { ...ours, user }, init: { headers: new Headers() } };
  };

beforeEach(() => {
  mockAuthkitLoader.mockReset();
});

describe("getAuthSession reads the token from its own loader callback", () => {
  test("returns the access token the callback hands to authkit", async () => {
    const token = `tok-${Math.random().toString(36).slice(2)}`;
    mockAuthkitLoader.mockImplementationOnce(authkitMerging({ id: "u1" }, token));
    const session = await getAuthSession({ context: {} } as any);
    expect(session.accessToken).toBe(token);
  });

  test("asks authkit not to redirect on the first load, so a refresh can finish", async () => {
    mockAuthkitLoader.mockImplementationOnce(authkitMerging({ id: "u1" }, "tok"));
    await getAuthSession({ context: {} } as any);
    expect(mockAuthkitLoader.mock.calls[0][2]).toEqual({ ensureSignedIn: false });
  });
});

describe("getAuthSession with an empty authkit result", () => {
  test.each([null, undefined])("treats %s as signed out", async (empty) => {
    mockAuthkitLoader.mockResolvedValueOnce(empty);
    const session = await getAuthSession({ context: {} } as any, { ensureSignedIn: false });
    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
  });
});

describe("getAuthSession when a session appears on the signed-in check", () => {
  test("returns the user and token from the second authkit call", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({ data: { user: null, accessToken: null } });
    mockAuthkitLoader.mockResolvedValueOnce({ data: { user: { id: "u9" }, accessToken: "tok-9" } });
    const session = await getAuthSession({ context: {} } as any);
    expect(session.user).toEqual({ id: "u9" });
    expect(session.accessToken).toBe("tok-9");
    expect(session.headers).toBeUndefined();
  });

  test("is signed out when the second call gives nothing back", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({ data: { user: null, accessToken: null } });
    mockAuthkitLoader.mockResolvedValueOnce(undefined);
    const session = await getAuthSession({ context: {} } as any);
    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
  });
});

describe("getAuthSession with the dev bypass on", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("still passes an authkit redirect through rather than using the dev session", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    const redirect = { status: 302 };
    mockAuthkitLoader.mockRejectedValueOnce(redirect);
    await expect(getAuthSession({ context: {} } as any)).rejects.toBe(redirect);
  });

  test("uses a dev session that names a user", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockAuthkitLoader.mockRejectedValueOnce(new Error("Missing WorkOS config"));
    const session = await getAuthSession({ context: {} } as any);
    expect(session.user).toBe(DEV_SESSION_USER);
    expect(DEV_SESSION_USER.id).toEqual(expect.any(String));
    expect(DEV_SESSION_USER.email).toContain("@");
    expect(session.accessToken).toBe(DEV_ACCESS_TOKEN);
  });
});
