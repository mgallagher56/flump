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
function runGate(path: string, method = "GET") {
  const loaderRan = vi.fn();
  const next = vi.fn(async () => {
    loaderRan();
    return new Response(JSON.stringify(OTHER_ROUTE_DATA));
  });
  const context = {};
  const result = (
    inviteGateMiddleware as unknown as (args: unknown, next: unknown) => Promise<Response>
  )({ request: new Request(`http://localhost${path}`, { method }), params: {}, context }, next);
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
    for (const path of ["/app", "/app/accounts", "/app/budget", "/tools", "/"]) {
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
});
