import { describe, expect, it } from "vitest";
import { BackendError, type BackendErrorKind, type RouteErrorPayload } from "./backend-error";
import { actionErrorResponse, throwRouteError } from "./route-error.server";

function caught(err: unknown): { data: RouteErrorPayload; init: { status: number } } {
  try {
    throwRouteError(err);
  } catch (thrown) {
    return thrown as never;
  }
  throw new Error("throwRouteError did not throw");
}

describe("throwRouteError", () => {
  const cases: [BackendErrorKind, number][] = [
    ["unavailable", 503],
    ["server", 502],
    ["bad-response", 502],
    ["not-found", 404],
    ["forbidden", 403],
    ["client", 400],
    ["unauthorised", 401],
  ];

  it.each(cases)("maps %s to status %i with a serialisable payload", (kind, status) => {
    const result = caught(new BackendError(kind, "/accounts", status));
    expect(result.init.status).toBe(status);
    expect(result.data).toEqual({ kind, endpoint: "/accounts" });
  });

  it("never redirects on unauthorised", () => {
    const result = caught(new BackendError("unauthorised", "/accounts", 401));
    expect(result).not.toBeInstanceOf(Response);
    expect(result.data.kind).toBe("unauthorised");
  });

  it("rethrows a non-BackendError by identity", () => {
    const redirect = new Response(null, { status: 302, headers: { Location: "/login" } });
    expect(() => throwRouteError(redirect)).toThrow(redirect);
    let thrown: unknown;
    try {
      throwRouteError(redirect);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBe(redirect);
    const plain = new Error("boom");
    try {
      throwRouteError(plain);
    } catch (e) {
      expect(e).toBe(plain);
    }
  });

  it("does not leak the base URL, token or cause", () => {
    const err = new BackendError("unavailable", "/accounts", undefined, {
      cause: new Error("connect ECONNREFUSED http://localhost:4000 Bearer secret_token"),
    });
    const serialised = JSON.stringify(caught(err));
    expect(serialised).not.toContain("localhost");
    expect(serialised).not.toContain("secret_token");
  });
});

describe("actionErrorResponse", () => {
  it("keeps the backend status and returns a generic message", () => {
    const res: any = actionErrorResponse(
      new BackendError("server", "/accounts?token=secret", 503, { cause: "secret body" }),
    );
    expect(res.init.status).toBe(503);
    expect(res.data.success).toBe(false);
    expect(res.data.error).toMatch(/try again/);
    expect(JSON.stringify(res.data)).not.toMatch(/secret|accounts/);
  });

  it("uses the exact 401 copy", () => {
    const res: any = actionErrorResponse(new BackendError("unauthorised", "/x", 401));
    expect(res.data.error).toBe("Your session has ended. Please sign in again.");
  });

  it("falls back to the kind's status when the backend never answered", () => {
    const res: any = actionErrorResponse(new BackendError("unavailable", "/accounts"));
    expect(res.init.status).toBe(503);
  });

  it("rethrows non-BackendErrors by identity", () => {
    const redirect = new Response(null, { status: 302 });
    expect(() => actionErrorResponse(redirect)).toThrow(redirect);
  });
});
