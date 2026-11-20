// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));
vi.mock("@workos-inc/authkit-react-router", () => ({
  configure: vi.fn(),
  getSignUpUrl: vi.fn(async (returnTo: string) => ({
    url: `https://authkit.example/sign-up?return=${returnTo}`,
    headers: {},
  })),
}));

import { getSignUpUrl } from "@workos-inc/authkit-react-router";
import { getAuthSession } from "~/utils/auth.server";
import { loader as inviteLoader } from "./invite._index";
import { loader as tokenLoader } from "./invite.$token";

// Built at runtime so no token-shaped literal sits in the source.
const TOKEN = `${"a".repeat(20)}${"B".repeat(20)}-_9`;
const realFetch = globalThis.fetch;

const callToken = (token: string) =>
  tokenLoader({
    request: new Request(`https://app.example/invite/${token}`),
    params: { token },
    context: {},
  } as never) as Promise<Response>;

const callInvite = (cookie?: string) =>
  inviteLoader({
    request: new Request("https://app.example/invite", {
      headers: cookie ? { Cookie: cookie } : {},
    }),
    params: {},
    context: {},
  } as never);

const backendAnswers = (status: number, body: unknown) => {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as typeof fetch;
};

describe("/invite/<token>", () => {
  it("moves a well-formed token into an HttpOnly cookie scoped to /invite and drops it from the URL", async () => {
    const response = await callToken(TOKEN);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/invite");
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain(`flump_invite=${TOKEN}`);
    expect(cookie).toMatch(/Path=\/invite;/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Max-Age=3600");
  });

  it("clears the cookie for a malformed token, so the next page says the link cannot be used", async () => {
    const response = await callToken("not-a-token");
    expect(response.headers.get("Location")).toBe("/invite");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});

describe("/invite", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user_new" },
      accessToken: "tok",
      headers: undefined,
    } as never);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.clearAllMocks();
  });

  it("with no cookie, says the link cannot be used and calls nothing", async () => {
    backendAnswers(200, { status: "joined" });
    const result = (await callInvite()) as { data: { outcome: string } };
    expect(result.data.outcome).toBe("unusable");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("signed out, starts sign-up and comes back here, keeping the cookie", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: null, accessToken: null } as never);
    const response = (await callInvite(`flump_invite=${TOKEN}`)) as Response;
    expect(response.status).toBe(302);
    expect(vi.mocked(getSignUpUrl)).toHaveBeenCalledWith("/invite", expect.any(Request));
    expect(response.headers.get("Location")).not.toContain(TOKEN);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("signed in, redeems as that person, clears the cookie and opens the app", async () => {
    backendAnswers(200, { status: "joined" });
    const response = (await callInvite(`flump_invite=${TOKEN}`)) as Response;
    expect(response.headers.get("Location")).toBe("/app");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/v1\/beta\/invites\/redeem$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ token: TOKEN });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("a used, cancelled or expired link gets one plain page and the cookie is cleared", async () => {
    backendAnswers(410, { statusCode: 410, error: "invite_unusable" });
    const result = (await callInvite(`flump_invite=${TOKEN}`)) as {
      data: { outcome: string };
      init: { headers: Record<string, string> };
    };
    expect(result.data.outcome).toBe("unusable");
    expect(result.init.headers["Set-Cookie"]).toContain("Max-Age=0");
  });

  it("too many tries asks the person to wait", async () => {
    backendAnswers(429, { statusCode: 429 });
    const result = (await callInvite(`flump_invite=${TOKEN}`)) as { data: { outcome: string } };
    expect(result.data.outcome).toBe("busy");
  });
});
