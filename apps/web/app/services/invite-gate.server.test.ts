// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));
vi.mock("./beta-mode.server", () => ({ isInviteOnly: vi.fn() }));

import { getAuthSession } from "~/utils/auth.server";
import { isInviteOnly } from "./beta-mode.server";
import { inviteGateMiddleware } from "./invite-gate.server";
import { loadRootProfile } from "./root-profile.server";

const realFetch = globalThis.fetch;
const backendAnswers = (status: number, body: unknown) => {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as typeof fetch;
};

/** Stands in for every loader below the root: it records that it ran and returns its data. */
const OTHER_ROUTE_DATA = { accounts: [{ name: "Joint savings", balance: 1200 }] };
function runGate(path: string, method = "GET", cookie?: string) {
  const loaderRan = vi.fn();
  const next = vi.fn(async () => {
    loaderRan();
    return new Response(JSON.stringify(OTHER_ROUTE_DATA));
  });
  const context = {};
  const result = (
    inviteGateMiddleware as unknown as (args: unknown, next: unknown) => Promise<Response>
  )(
    {
      request: new Request(`https://localhost${path}`, {
        method,
        headers: cookie ? { Cookie: cookie } : {},
      }),
      params: {},
      context,
    },
    next,
  );
  return { result, next, loaderRan, context };
}

describe("inviteGateMiddleware", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user_uninvited" },
      accessToken: "tok",
      headers: undefined,
    } as never);
    vi.mocked(isInviteOnly).mockResolvedValue(true);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.clearAllMocks();
  });

  it("stops an uninvited page load before any other route's loader runs", async () => {
    backendAnswers(403, { statusCode: 403, error: "not_invited" });
    for (const path of ["/app", "/app/accounts", "/app/budget", "/app/retirement", "/tools", "/"]) {
      const { result, loaderRan } = runGate(path);
      const thrown = await result.catch((e: unknown) => e);
      // `data(...)` thrown from middleware: React Router renders it in the root error boundary.
      expect(thrown).toMatchObject({ init: { status: 403 }, data: { kind: "not-invited" } });
      expect(loaderRan).not.toHaveBeenCalled();
    }
  });

  it("lets an invited page load through and shares the profile read with the root loader", async () => {
    backendAnswers(200, { id: "p" });
    const { result, loaderRan, context } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
    // The root loader's read in the same request is the gate's own promise: no second call.
    void loadRootProfile(context, "tok").catch(() => undefined);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("does nothing while the beta is open: no session or profile read", async () => {
    vi.mocked(isInviteOnly).mockResolvedValue(false);
    backendAnswers(403, { error: "not_invited" });
    const { result, loaderRan } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
    expect(getAuthSession).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("lets a signed-out visitor through without a profile read", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: null, accessToken: null } as never);
    backendAnswers(403, { error: "not_invited" });
    const { result, loaderRan } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["/logout", "POST"],
    ["/login", "GET"],
    ["/callback", "GET"],
    ["/invite", "GET"],
    ["/invite/abc", "GET"],
    ["/api/user-profile", "GET"],
    ["/app.data", "GET"],
    ["/app/accounts", "POST"],
  ])("never checks %s (%s)", async (path, method) => {
    backendAnswers(403, { error: "not_invited" });
    const { result, loaderRan } = runGate(path, method);
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
    expect(isInviteOnly).not.toHaveBeenCalled();
  });

  it("leaves any other backend failure to the root loader", async () => {
    backendAnswers(500, {});
    const { result, loaderRan } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
  });

  describe("a pending invite from a sign-up that did not come back to /invite", () => {
    const token = `${"p".repeat(40)}_-1`;
    const cookie = `flump_invite=${token}`;
    /** First call (the profile) answers not invited, the second (the redeem) as given. */
    const answers = (redeemStatus: number, redeemBody: unknown) => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "not_invited" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(redeemBody), {
            status: redeemStatus,
            headers: { "Content-Type": "application/json" },
          }),
        ) as unknown as typeof fetch;
    };

    it("redeems it wherever the person lands, clears it and opens the app", async () => {
      answers(200, { status: "joined" });
      const { result, loaderRan } = runGate("/app/budget", "GET", cookie);
      const thrown = (await result.catch((e: unknown) => e)) as Response;
      expect(thrown.status).toBe(302);
      expect(thrown.headers.get("Location")).toBe("/app");
      expect(thrown.headers.get("Set-Cookie")).toMatch(/flump_invite=;.*Max-Age=0/);
      expect(loaderRan).not.toHaveBeenCalled();
      const [url, init] = vi.mocked(globalThis.fetch).mock.calls[1] as [string, RequestInit];
      expect(String(url)).toMatch(/\/v1\/beta\/invites\/redeem$/);
      expect(JSON.parse(String(init.body))).toEqual({ token });
    });

    it("drops an unusable one and loads the page again, which then shows not invited", async () => {
      answers(410, { code: "invite_unusable", message: "This invite link cannot be used." });
      const { result } = runGate("/app?x=1", "GET", cookie);
      const thrown = (await result.catch((e: unknown) => e)) as Response;
      expect(thrown.headers.get("Location")).toBe("/app?x=1");
      expect(thrown.headers.get("Set-Cookie")).toContain("Max-Age=0");
    });

    it("drops it when rate limited, so it is not spent again on every page", async () => {
      answers(429, {});
      const { result } = runGate("/app", "GET", cookie);
      const thrown = (await result.catch((e: unknown) => e)) as Response;
      expect(thrown.headers.get("Location")).toBe("/app");
      expect(thrown.headers.get("Set-Cookie")).toContain("Max-Age=0");
    });

    it("never redirects off the site from a path with leading slashes", async () => {
      answers(410, { code: "invite_unusable", message: "This invite link cannot be used." });
      const { result } = runGate("//evil.example/x", "GET", cookie);
      const thrown = (await result.catch((e: unknown) => e)) as Response;
      expect(thrown.headers.get("Location")).toBe("/evil.example/x");
    });
  });
});
