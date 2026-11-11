import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; loaders need the real `data` and `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  authHeader: ({ accessToken }: { accessToken?: string }) => ({
    Authorization: `Bearer ${accessToken}`,
  }),
}));
vi.mock("~/i18n.server", () => ({ default: { getLocale: vi.fn().mockResolvedValue("en") } }));

import { redirect } from "react-router";
import { apiConfig } from "~/config.server";
import { loader as appIndexLoader } from "./app._index";
import { loader as accountLoader } from "./app.accounts.$account";
import { loader as onboardingLoader } from "./app.onboarding";
import { loader as profileLoader } from "./app.profile";

const signedIn = { user: { id: "u1" }, accessToken: "tok" };
const args = (url = "http://localhost/app", params: Record<string, string> = {}) =>
  ({ request: new Request(url), params, context: {} }) as any;

const respond = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

async function caught(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as any;
  }
  throw new Error("expected rejection");
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuthSession.mockResolvedValue(signedIn);
});

describe("app.profile loader", () => {
  it("maps a backend 500 to 502 and never returns default data", async () => {
    globalThis.fetch = respond(500);
    const err = await caught(profileLoader(args()));
    expect(err.init.status).toBe(502);
    expect(err.data).toEqual({ kind: "server", endpoint: "/user-profile" });
  });

  it("returns the profile on success", async () => {
    globalThis.fetch = respond(200, { annualSalary: 1 });
    const res: any = await profileLoader(args());
    expect(res.data.userProfile.annualSalary).toBe(1);
  });
});

describe("app.onboarding loader", () => {
  it("rejects 503 when fetch fails instead of returning defaults", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const err = await caught(onboardingLoader(args()));
    expect(err.init.status).toBe(503);
  });

  it("returns profile and access token on success", async () => {
    globalThis.fetch = respond(200, { enabledPages: [] });
    const res: any = await onboardingLoader(args());
    expect(res.data.accessToken).toBe("tok");
  });
});

describe("app index loader", () => {
  it("rejects 502 on profile 500 rather than redirecting", async () => {
    globalThis.fetch = respond(500);
    const err = await caught(appIndexLoader(args()));
    expect(err.init.status).toBe(502);
  });

  it("redirects to onboarding when not completed", async () => {
    globalThis.fetch = respond(200, { onboardingCompleted: false });
    const res: Response = (await appIndexLoader(args())) as any;
    expect(res.headers.get("Location")).toBe("/app/onboarding");
  });

  it("redirects home when completed", async () => {
    globalThis.fetch = respond(200, { onboardingCompleted: true });
    const res: Response = (await appIndexLoader(args())) as any;
    expect(res.headers.get("Location")).toBe("/");
  });

  it("redirects to /login without reading the token when there is no user", async () => {
    getAuthSession.mockResolvedValue({ user: null, accessToken: undefined });
    globalThis.fetch = vi.fn();
    const res: Response = (await appIndexLoader(args())) as any;
    expect(res.headers.get("Location")).toBe("/login");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("lets an auth redirect pass through", async () => {
    const r = redirect("/somewhere");
    getAuthSession.mockRejectedValue(r);
    expect(await caught(appIndexLoader(args()))).toBe(r);
  });
});

describe("account detail loader", () => {
  it("rejects 404 with kind not-found", async () => {
    globalThis.fetch = respond(404);
    const err = await caught(accountLoader(args("http://localhost/x", { account: "a1" })));
    expect(err.init.status).toBe(404);
    expect(err.data.kind).toBe("not-found");
  });

  it("rejects 502 on a 500", async () => {
    globalThis.fetch = respond(500);
    const err = await caught(accountLoader(args("http://localhost/x", { account: "a1" })));
    expect(err.init.status).toBe(502);
  });

  it("calls the configured base URL and returns nested details", async () => {
    globalThis.fetch = respond(200, { id: "a1", details: [{ year: 2026 }] });
    const res: any = await accountLoader(args("http://localhost/x", { account: "a1" }));
    expect(res.data.accountDetails).toEqual([{ year: 2026 }]);
    expect((globalThis.fetch as any).mock.calls[0][0]).toBe(`${apiConfig.apiBaseUrl}/accounts/a1`);
  });
});
