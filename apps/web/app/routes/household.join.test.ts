// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { getAuthSession } from "~/utils/auth.server";
import { action as joinAction, loader as joinLoader } from "./household.join._index";
import { loader as tokenLoader } from "./household.join.$token";

// Built at runtime so no token-shaped literal sits in the source: 43 base64url characters.
const TOKEN = `${"h".repeat(20)}${"Q".repeat(20)}-_7`;
const COOKIE = `flump_household_invite=${TOKEN}`;
const realFetch = globalThis.fetch;

type Reply = { status: number; body: unknown };
const NOT_IN_ONE: Reply = { status: 200, body: { household: null, invitation: null } };
const GATE_OFF: Reply = { status: 404, body: { statusCode: 404, message: "Not found" } };

/** Answers each backend path (after /v1/) with its reply; anything else fails the test. */
const backend = (replies: Record<string, Reply>) => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace(/^.*\/v1\//, "");
    const reply = replies[path];
    if (!reply) throw new Error(`unexpected ${path}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
};
const calledPaths = () =>
  vi.mocked(globalThis.fetch).mock.calls.map(([input]) => String(input).replace(/^.*\/v1\//, ""));

const args = (method: "GET" | "POST", cookie?: string) =>
  ({
    request: new Request("https://app.example/household/join", {
      method,
      headers: cookie ? { Cookie: cookie } : {},
    }),
    params: {},
    context: {},
  }) as never;

type DataResult = { data: { outcome: string }; init: { headers: Record<string, string> } };
const caught = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e as Response,
  );

describe("/household/join/<token>", () => {
  it("moves a well-formed token into its own short-lived HttpOnly cookie and drops it from the URL", async () => {
    const response = (await tokenLoader({
      request: new Request(`https://app.example/household/join/${TOKEN}`),
      params: { token: TOKEN },
      context: {},
    } as never)) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/household/join");
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain(`flump_household_invite=${TOKEN};`);
    expect(cookie).not.toContain("flump_invite=");
    expect(cookie).toContain("Path=/household;");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Max-Age=3600");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("clears the cookie for a malformed token", async () => {
    const response = (await tokenLoader({
      request: new Request("https://app.example/household/join/short"),
      params: { token: "short" },
      context: {},
    } as never)) as Response;
    expect(response.headers.get("Location")).toBe("/household/join");
    expect(response.headers.get("Set-Cookie")).toContain("flump_household_invite=; ");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});

describe("/household/join", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user_b" },
      accessToken: "tok",
      headers: undefined,
    } as never);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.clearAllMocks();
  });

  it("with the switch off, the page is the ordinary 404 and nothing else is asked", async () => {
    backend({ household: GATE_OFF });
    const thrown = await caught(joinLoader(args("GET", COOKIE)));
    expect(thrown).toBeInstanceOf(Response);
    expect(thrown?.status).toBe(404);
    expect(thrown?.statusText).toBe("Not Found");
    expect(await thrown?.text()).toBe("Not Found");
    expect(calledPaths()).toEqual(["household"]);
  });

  it("with the switch off, accepting is the ordinary 404 too and the link is not sent", async () => {
    backend({ household: GATE_OFF });
    const thrown = await caught(joinAction(args("POST", COOKIE)));
    expect(thrown?.status).toBe(404);
    expect(calledPaths()).toEqual(["household"]);
  });

  it("previews a usable link without accepting it, and keeps the cookie for accepting", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/preview": { status: 200, body: { shares: [] } },
    });
    const result = (await joinLoader(args("GET", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("ready");
    expect(result.init.headers["Set-Cookie"]).toBeUndefined();
    expect(calledPaths()).toEqual(["household", "household/invitations/preview"]);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ token: TOKEN });
  });

  it("with no cookie, says the link cannot be used without asking about it", async () => {
    backend({ household: NOT_IN_ONE });
    const result = (await joinLoader(args("GET"))) as DataResult;
    expect(result.data.outcome).toBe("unusable");
    expect(calledPaths()).toEqual(["household"]);
  });

  it("410 invite_unusable gets the one neutral outcome and clears the cookie", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/preview": {
        status: 410,
        body: { code: "invite_unusable", message: "This invitation link cannot be used." },
      },
    });
    const result = (await joinLoader(args("GET", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("unusable");
    expect(result.init.headers["Set-Cookie"]).toContain("Max-Age=0");
  });

  it("someone already in a household is told so before the link is checked", async () => {
    backend({
      household: {
        status: 200,
        body: {
          household: {
            sharesJointSummary: false,
            joinedAt: "2026-11-20T09:00:00.000Z",
            withName: null,
          },
          invitation: null,
        },
      },
    });
    const result = (await joinLoader(args("GET", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("already");
    expect(calledPaths()).toEqual(["household"]);
  });

  it("accepting joins, clears the cookie and opens the Household tab", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/accept": { status: 200, body: { status: "joined" } },
    });
    const response = (await joinAction(args("POST", COOKIE))) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/app/profile?tab=household");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ token: TOKEN });
  });

  it("accepting with 409 already_in_household gets its own outcome", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/accept": {
        status: 409,
        body: { code: "already_in_household", message: "Already in a household." },
      },
    });
    const result = (await joinAction(args("POST", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("already");
  });

  it("accepting a link that has become unusable (410) gets the neutral outcome, not the erased-account page", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/accept": {
        status: 410,
        body: { code: "invite_unusable", message: "This invitation link cannot be used." },
      },
    });
    const result = (await joinAction(args("POST", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("unusable");
    expect(result.init.headers["Set-Cookie"]).toContain("Max-Age=0");
  });

  it("too many tries asks the person to wait and keeps the cookie", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/accept": { status: 429, body: { statusCode: 429 } },
    });
    const result = (await joinAction(args("POST", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("busy");
    expect(result.init.headers["Set-Cookie"]).toBeUndefined();
  });
});
