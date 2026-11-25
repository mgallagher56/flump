// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));
const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", async (orig) => ({
  ...(await orig<typeof import("~/utils/auth.server")>()),
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
}));
const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));

import { BackendError } from "~/services/backend-error";
import { action, handle, loader } from "./terms-acceptance";

const page = (version: string, path: string) => ({
  version,
  updated: "25 November 2026",
  effectiveFrom: "2026-11-25",
  path,
  changed: false,
});
const required = {
  required: true,
  agreed: false,
  firstTime: true,
  terms: page("0.1", "/terms"),
  privacyNotice: page("0.2", "/privacy"),
};

const load = (url: string) =>
  loader({ request: new Request(url), params: {}, context: {} } as never) as unknown as Promise<{
    data: { status: unknown; next: string };
  }>;

const post = (fields: Record<string, string>) =>
  action({
    request: new Request("http://localhost/terms-acceptance", {
      method: "POST",
      body: new URLSearchParams(fields),
    }),
    params: {},
    context: {},
  } as never);

const refusal = (status: number) =>
  new BackendError("client", "/user-profile/terms-acceptance", status);

describe("terms-acceptance loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
  });

  it("reads the status for the signed-in person and keeps a safe next page", async () => {
    backendFetch.mockResolvedValue(required);
    const res = await load("http://localhost/terms-acceptance?next=%2Fapp%2Fbudget");
    expect(res.data).toMatchObject({ status: required, next: "/app/budget" });
    expect(backendFetch).toHaveBeenCalledWith(
      "/user-profile/terms-acceptance",
      expect.objectContaining({ accessToken: "tok" }),
    );
  });

  it("never sends the person off this site afterwards", async () => {
    backendFetch.mockResolvedValue(required);
    const res = await load("http://localhost/terms-acceptance?next=https%3A%2F%2Fevil.example");
    expect(res.data.next).toBe("/app");
  });

  it("goes straight on when the newest versions are already agreed", async () => {
    backendFetch.mockResolvedValue({
      ...required,
      required: false,
      agreed: true,
      firstTime: false,
    });
    const thrown = (await load("http://localhost/terms-acceptance?next=%2Fapp").catch(
      (e: unknown) => e,
    )) as Response;
    expect(thrown.status).toBe(302);
    expect(thrown.headers.get("Location")).toBe("/app");
  });

  it("sends a signed-out visitor to sign in", async () => {
    getAuthSession.mockResolvedValue({ accessToken: null, user: null });
    const thrown = (await load("http://localhost/terms-acceptance").catch(
      (e: unknown) => e,
    )) as Response;
    expect(thrown.headers.get("Location")).toBe("/login");
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("uses the focused shell", () => {
    expect(handle).toEqual({ focusedShell: true });
  });
});

describe("terms-acceptance action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
  });

  it("records the versions shown and goes to the next page", async () => {
    backendFetch.mockResolvedValue({
      termsVersion: "0.1",
      privacyNoticeVersion: "0.2",
      recorded: true,
    });
    const thrown = (await post({
      termsVersion: "0.1",
      privacyNoticeVersion: "0.2",
      next: "/app/onboarding",
    }).catch((e: unknown) => e)) as Response;
    expect(backendFetch).toHaveBeenCalledWith(
      "/user-profile/terms-acceptance",
      expect.objectContaining({
        method: "POST",
        body: { termsVersion: "0.1", privacyNoticeVersion: "0.2" },
      }),
    );
    expect(thrown.status).toBe(302);
    expect(thrown.headers.get("Location")).toBe("/app/onboarding");
  });

  it("says the pages changed when the versions are no longer the newest", async () => {
    backendFetch.mockRejectedValue(refusal(409));
    const res = (await post({
      termsVersion: "0.1",
      privacyNoticeVersion: "0.1",
      next: "/app",
    })) as {
      data: unknown;
      init: ResponseInit;
    };
    expect(res.data).toEqual({ error: "changed" });
    expect(res.init.status).toBe(409);
  });

  it("reports any other failure without leaving the page", async () => {
    backendFetch.mockRejectedValue(refusal(500));
    const res = (await post({
      termsVersion: "0.1",
      privacyNoticeVersion: "0.2",
      next: "/app",
    })) as {
      data: unknown;
    };
    expect(res.data).toEqual({ error: "failed" });
  });

  it("finishes an erased account's deletion instead", async () => {
    backendFetch.mockRejectedValue(new BackendError("client", "/x", 410));
    const thrown = (await post({ termsVersion: "0.1", privacyNoticeVersion: "0.2" }).catch(
      (e: unknown) => e,
    )) as Response;
    expect(thrown.headers.get("Location")).toBe("/account-deleted?state=pending");
  });
});
