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

/** The switch as an anonymous `GET /household` sees it: 401 when on, 404 when off. */
const ANON_ON: Reply = { status: 401, body: { statusCode: 401, message: "Unauthorized" } };

/**
 * Answers each backend path (after /v1/) with its reply; anything else fails the test. A call
 * without an Authorization header is keyed `anon:<path>`, and the anonymous switch probe answers
 * 401 (on) unless the replies say otherwise.
 */
const backend = (replies: Record<string, Reply>) => {
  const all: Record<string, Reply> = { "anon:household": ANON_ON, ...replies };
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const reply = all[keyFor(input, init)];
    if (!reply) throw new Error(`unexpected ${keyFor(input, init)}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
};
const keyFor = (input: RequestInfo | URL, init?: RequestInit) => {
  const path = String(input).replace(/^.*\/v1\//, "");
  const headers = new Headers(init?.headers);
  return headers.has("Authorization") ? path : `anon:${path}`;
};
const calledPaths = () =>
  vi.mocked(globalThis.fetch).mock.calls.map(([input, init]) => keyFor(input, init));
const bodyOf = (call: number) => {
  const [, init] = vi.mocked(globalThis.fetch).mock.calls[call] as [string, RequestInit];
  return { method: init.method, body: JSON.parse(String(init.body)) as unknown };
};

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

const SIGN_IN = "https://auth.example.test/sign-in";
const signedIn = () =>
  vi.mocked(getAuthSession).mockResolvedValue({
    user: { id: "user_b" },
    accessToken: "tok",
    headers: undefined,
  } as never);
/** Signed out: the real `ensureSignedIn` throws a redirect to sign in. */
const signedOut = () =>
  vi
    .mocked(getAuthSession)
    .mockRejectedValue(new Response(null, { status: 302, headers: { Location: SIGN_IN } }));
const SESSIONS = [
  ["signed in", signedIn],
  ["signed out", signedOut],
] as const;

const tokenArgs = (token: string) =>
  ({
    request: new Request(`https://app.example/household/join/${token}`),
    params: { token },
    context: {},
  }) as never;

/** The ordinary unknown-page answer, exactly as the catch-all route (`$.tsx`) throws it. */
async function expectOrdinary404(thrown: Response | null) {
  expect(thrown).toBeInstanceOf(Response);
  expect(thrown?.status).toBe(404);
  expect(thrown?.statusText).toBe("Not Found");
  expect(thrown?.headers.get("Set-Cookie")).toBeNull();
  expect(thrown?.headers.get("Location")).toBeNull();
  expect(await thrown?.text()).toBe("Not Found");
}

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.clearAllMocks();
});

describe("/household/join/<token>", () => {
  it.each(SESSIONS)(
    "with the switch off (%s), is the ordinary 404 and sets no cookie",
    async (_label, session) => {
      session();
      backend({ "anon:household": GATE_OFF });
      await expectOrdinary404(await caught(tokenLoader(tokenArgs(TOKEN))));
      expect(calledPaths()).toEqual(["anon:household"]);
      expect(getAuthSession).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a server error", { status: 500, body: { statusCode: 500 } }],
    ["a 403", { status: 403, body: { statusCode: 403 } }],
  ] as const)("treats %s from the switch probe as off (fail closed)", async (_label, reply) => {
    backend({ "anon:household": reply });
    await expectOrdinary404(await caught(tokenLoader(tokenArgs(TOKEN))));
  });

  it("treats an unreachable backend as off", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expectOrdinary404(await caught(tokenLoader(tokenArgs(TOKEN))));
  });

  it.each(SESSIONS)(
    "with the switch on (%s), moves a well-formed token into its own short-lived HttpOnly cookie and drops it from the URL",
    async (_label, session) => {
      session();
      backend({});
      const response = (await tokenLoader(tokenArgs(TOKEN))) as Response;
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
      expect(calledPaths()).toEqual(["anon:household"]);
    },
  );

  it("with the switch on, a 200 from the probe also counts as on", async () => {
    backend({ "anon:household": NOT_IN_ONE });
    const response = (await tokenLoader(tokenArgs(TOKEN))) as Response;
    expect(response.headers.get("Location")).toBe("/household/join");
  });

  it("clears the cookie for a malformed token", async () => {
    backend({});
    const response = (await tokenLoader(tokenArgs("short"))) as Response;
    expect(response.headers.get("Location")).toBe("/household/join");
    expect(response.headers.get("Set-Cookie")).toContain("flump_household_invite=; ");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});

describe("/household/join", () => {
  beforeEach(() => {
    signedIn();
  });

  it.each(SESSIONS)(
    "with the switch off (%s), the page is the ordinary 404, before sign-in or anything else is asked",
    async (_label, session) => {
      session();
      backend({ "anon:household": GATE_OFF });
      await expectOrdinary404(await caught(joinLoader(args("GET", COOKIE))));
      expect(calledPaths()).toEqual(["anon:household"]);
      expect(getAuthSession).not.toHaveBeenCalled();
    },
  );

  it.each(SESSIONS)(
    "with the switch off (%s), accepting is the ordinary 404 too and the link is not sent",
    async (_label, session) => {
      session();
      backend({ "anon:household": GATE_OFF });
      await expectOrdinary404(await caught(joinAction(args("POST", COOKIE))));
      expect(calledPaths()).toEqual(["anon:household"]);
      expect(getAuthSession).not.toHaveBeenCalled();
    },
  );

  it("with the switch on and signed out, asks the visitor to sign in", async () => {
    signedOut();
    backend({});
    const thrown = await caught(joinLoader(args("GET", COOKIE)));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Location")).toBe(SIGN_IN);
    expect(calledPaths()).toEqual(["anon:household"]);
  });

  it("with the switch on and signed out, accepting asks the visitor to sign in", async () => {
    signedOut();
    backend({});
    const thrown = await caught(joinAction(args("POST", COOKIE)));
    expect(thrown?.headers.get("Location")).toBe(SIGN_IN);
    expect(calledPaths()).toEqual(["anon:household"]);
  });

  it("if the signed-in probe answers 404 after all, the page is still the ordinary 404", async () => {
    backend({ household: GATE_OFF });
    await expectOrdinary404(await caught(joinLoader(args("GET", COOKIE))));
    expect(calledPaths()).toEqual(["anon:household", "household"]);
  });

  it("previews a usable link without accepting it, and keeps the cookie for accepting", async () => {
    backend({
      household: NOT_IN_ONE,
      "household/invitations/preview": { status: 200, body: { shares: [] } },
    });
    const result = (await joinLoader(args("GET", COOKIE))) as DataResult;
    expect(result.data.outcome).toBe("ready");
    expect(result.init.headers["Set-Cookie"]).toBeUndefined();
    expect(calledPaths()).toEqual(["anon:household", "household", "household/invitations/preview"]);
    expect(bodyOf(2)).toEqual({ method: "POST", body: { token: TOKEN } });
  });

  it("with no cookie, says the link cannot be used without asking about it", async () => {
    backend({ household: NOT_IN_ONE });
    const result = (await joinLoader(args("GET"))) as DataResult;
    expect(result.data.outcome).toBe("unusable");
    expect(calledPaths()).toEqual(["anon:household", "household"]);
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
    expect(calledPaths()).toEqual(["anon:household", "household"]);
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
    expect(bodyOf(2)).toEqual({ method: "POST", body: { token: TOKEN } });
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
