import { describe, expect, it } from "vitest";
import { BackendError, kindFromStatus } from "./backend-error";

describe("BackendError", () => {
  it("carries kind, status and endpoint and is an Error", () => {
    const err = new BackendError("not-found", "/accounts/1", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.name).toBe("BackendError");
    expect(err.kind).toBe("not-found");
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe("/accounts/1");
  });

  it("allows a missing status", () => {
    expect(new BackendError("unavailable", "/x").status).toBeUndefined();
  });

  it("maps statuses to kinds", () => {
    expect(kindFromStatus(401)).toBe("unauthorised");
    expect(kindFromStatus(403)).toBe("forbidden");
    expect(kindFromStatus(404)).toBe("not-found");
    expect(kindFromStatus(422)).toBe("client");
    expect(kindFromStatus(500)).toBe("server");
    expect(kindFromStatus(503)).toBe("server");
  });
});
