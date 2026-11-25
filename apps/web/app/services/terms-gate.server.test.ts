// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { getAuthSession } from "~/utils/auth.server";
import { BackendError } from "./backend-error";
import { loadRootProfile } from "./root-profile.server";
import {
  isTermsExemptPath,
  isTermsNotAccepted,
  termsAcceptanceRedirect,
  termsGateMiddleware,
} from "./terms-gate.server";

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

const NOT_ACCEPTED = {
  code: "terms_not_accepted",
  message: "Agree to the terms of use in Flump to carry on.",
  requestId: "req-1",
};

function runGate(path: string, method = "GET") {
  const loaderRan = vi.fn();
  const next = vi.fn(async () => {
    loaderRan();
    return new Response("{}");
  });
  const context = {};
  const result = (
    termsGateMiddleware as unknown as (args: unknown, next: unknown) => Promise<Response>
  )({ request: new Request(`https://localhost${path}`, { method }), params: {}, context }, next);
  return { result, loaderRan, context };
}

describe("termsGateMiddleware", () => {
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

  it("sends a page load by someone who has not agreed to the acceptance page, coming back after", async () => {
    backendAnswers(403, NOT_ACCEPTED);
    for (const [path, back] of [
      ["/app", "/app"],
      ["/app/onboarding", "/app/onboarding"],
      ["/app/budget?month=2026-11", "/app/budget?month=2026-11"],
      ["/", "/"],
    ] as const) {
      const { result, loaderRan } = runGate(path);
      const thrown = (await result.catch((e: unknown) => e)) as Response;
      expect(thrown.status, path).toBe(302);
      expect(thrown.headers.get("Location"), path).toBe(
        `/terms-acceptance?next=${encodeURIComponent(back)}`,
      );
      expect(loaderRan, path).not.toHaveBeenCalled();
    }
  });

  it("lets someone who has agreed through, sharing the profile read with the root loader", async () => {
    backendAnswers(200, { id: "p" });
    const { result, loaderRan, context } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
    void loadRootProfile(context, "tok").catch(() => undefined);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("never checks the acceptance page, sign-out, the export download or invite links", async () => {
    backendAnswers(403, NOT_ACCEPTED);
    for (const path of [
      "/terms-acceptance",
      "/terms-acceptance?next=%2Fapp",
      "/logout",
      "/login",
      "/account/export",
      "/account-deleted",
      "/invite/abc",
      "/api/user-profile",
    ]) {
      const { result, loaderRan } = runGate(path);
      await result;
      expect(loaderRan, path).toHaveBeenCalledOnce();
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("leaves form posts and client navigations alone (the root loader handles those)", async () => {
    backendAnswers(403, NOT_ACCEPTED);
    await runGate("/app/profile", "POST").result;
    await runGate("/app.data").result;
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does nothing for a signed-out visitor", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: null, accessToken: null } as never);
    backendAnswers(403, NOT_ACCEPTED);
    const { result, loaderRan } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
  });

  it("leaves any other profile failure to the root loader", async () => {
    backendAnswers(403, { code: "not_invited", message: "x", requestId: "r" });
    const { result, loaderRan } = runGate("/app");
    await result;
    expect(loaderRan).toHaveBeenCalledOnce();
  });
});

describe("terms gate helpers", () => {
  it("recognises only the terms refusal", () => {
    const refusal = new BackendError("forbidden", "/user-profile", 403);
    refusal.code = "terms_not_accepted";
    expect(isTermsNotAccepted(refusal)).toBe(true);
    const other = new BackendError("forbidden", "/user-profile", 403);
    other.code = "recent_login_required";
    expect(isTermsNotAccepted(other)).toBe(false);
    expect(isTermsNotAccepted(new Error("terms_not_accepted"))).toBe(false);
  });

  it("exempts the acceptance page and nothing in the app", () => {
    expect(isTermsExemptPath("/terms-acceptance")).toBe(true);
    expect(isTermsExemptPath("/app")).toBe(false);
    expect(isTermsExemptPath("/app/profile")).toBe(false);
    expect(isTermsExemptPath("/terms-acceptance-other")).toBe(false);
  });

  it("keeps the way back on this site, without the client navigation suffix", () => {
    const res = termsAcceptanceRedirect(
      new Request("https://localhost//evil.example/app.data?x=1"),
    );
    expect(res.headers.get("Location")).toBe(
      `/terms-acceptance?next=${encodeURIComponent("/evil.example/app?x=1")}`,
    );
  });
});
