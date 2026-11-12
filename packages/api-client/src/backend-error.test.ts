import { describe, expect, it } from "vitest";
import { BACKEND_ERROR_KINDS, BackendError, kindFromStatus } from "./backend-error.js";
import { ACTION_MESSAGE_BY_KIND } from "./messages.js";

// Fixture copied from apps/web/app/services/route-error.server.ts.
const WEB_MESSAGES = {
  unavailable: "We couldn't reach the server. Please try again.",
  server: "Something went wrong on our side. Please try again.",
  "bad-response": "Something went wrong on our side. Please try again.",
  "not-found": "We couldn't find that. It may have been removed.",
  forbidden: "You don't have permission to do that.",
  "not-invited": "This account has not been invited to the Flump beta yet.",
  client: "We couldn't save that. Check the details and try again.",
  unauthorised: "Your session has ended. Please sign in again.",
};

describe("kindFromStatus", () => {
  it.each([
    [401, "unauthorised"],
    [403, "forbidden"],
    [404, "not-found"],
    [400, "client"],
    [409, "client"],
    [422, "client"],
    [499, "client"],
    [500, "server"],
    [503, "server"],
  ] as const)("maps %i to %s", (status, kind) => {
    expect(kindFromStatus(status)).toBe(kind);
  });
});

describe("BackendError", () => {
  it("carries kind, endpoint and status without leaking detail into message", () => {
    const err = new BackendError("client", "/x", 400);
    err.detail = "Weak password";
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("BackendError");
    expect(err.kind).toBe("client");
    expect(err.status).toBe(400);
    expect(err.endpoint).toBe("/x");
    expect(err.message).toBe("Backend request to /x failed: client (400)");
    expect(err.message).not.toContain("Weak password");
  });

  it("omits the status suffix and keeps the cause", () => {
    const cause = new TypeError("boom");
    const err = new BackendError("unavailable", "/y", undefined, { cause });
    expect(err.message).toBe("Backend request to /y failed: unavailable");
    expect(err.cause).toBe(cause);
  });
});

describe("messages", () => {
  it("has exactly the eight kinds", () => {
    expect([...BACKEND_ERROR_KINDS].sort()).toEqual(Object.keys(WEB_MESSAGES).sort());
    expect(BACKEND_ERROR_KINDS).toHaveLength(8);
  });

  it("equals web's strings for every kind", () => {
    expect(ACTION_MESSAGE_BY_KIND).toEqual(WEB_MESSAGES);
  });

  it("lists exactly these eight kinds, each with an action message", () => {
    const kinds = [
      "unauthorised",
      "forbidden",
      "not-invited",
      "not-found",
      "client",
      "server",
      "unavailable",
      "bad-response",
    ];
    expect([...BACKEND_ERROR_KINDS].sort()).toEqual([...kinds].sort());
    for (const kind of BACKEND_ERROR_KINDS) {
      expect(ACTION_MESSAGE_BY_KIND[kind]).toEqual(expect.any(String));
      expect(ACTION_MESSAGE_BY_KIND[kind].length).toBeGreaterThan(0);
    }
    expect(Object.keys(ACTION_MESSAGE_BY_KIND).sort()).toEqual([...kinds].sort());
  });
});
