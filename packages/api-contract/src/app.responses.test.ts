import { describe, expect, it } from "vitest";
import { HealthResponse, ReadinessResponse } from "./domains/app.js";
import { checkAgainst } from "./validate.js";

describe("app response schemas", () => {
  it("HealthResponse accepts liveness and rejects extras", () => {
    expect(checkAgainst(HealthResponse, { status: "ok" })).toEqual({ ok: true });
    expect(checkAgainst(HealthResponse, { status: "ok", db: "up" }).ok).toBe(false);
  });

  it("ReadinessResponse accepts the 200 and 503 bodies", () => {
    expect(
      checkAgainst(ReadinessResponse, { status: "ok", version: "0.0.1", commit: "abcdef1" }),
    ).toEqual({ ok: true });
    expect(
      checkAgainst(ReadinessResponse, { status: "ok", version: "0.0.1", commit: "unknown" }),
    ).toEqual({ ok: true });
    expect(checkAgainst(ReadinessResponse, { status: "unavailable" })).toEqual({ ok: true });
  });

  it("ReadinessResponse rejects leaked detail on the 503 body", () => {
    expect(
      checkAgainst(ReadinessResponse, { status: "unavailable", error: "ECONNREFUSED" }).ok,
    ).toBe(false);
  });
});
