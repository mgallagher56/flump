import { describe, expect, it } from "vitest";
import { ERROR_CODES, ErrorResponse, errorCodeForStatus } from "./errors.js";
import { allRoutes } from "./manifest.js";
import { issuesFromZodError, parseAgainst, unknownKeys } from "./validate.js";

describe("ErrorResponse", () => {
  const ok = { code: "not_found", message: "Not found", requestId: "abc" };

  it("accepts the envelope, with or without issues", () => {
    expect(ErrorResponse.safeParse(ok).success).toBe(true);
    const withIssues = {
      ...ok,
      code: "validation_failed",
      issues: [{ path: "body.name", code: "too_small", message: "Too small" }],
    };
    expect(ErrorResponse.safeParse(withIssues).success).toBe(true);
  });

  it("is strict and needs a request id and a snake_case code", () => {
    expect(ErrorResponse.safeParse({ ...ok, statusCode: 404 }).success).toBe(false);
    expect(ErrorResponse.safeParse({ code: "not_found", message: "x" }).success).toBe(false);
    expect(ErrorResponse.safeParse({ ...ok, code: "Not Found" }).success).toBe(false);
  });

  it("names every code in lowercase snake case", () => {
    for (const code of ERROR_CODES) expect(code).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("maps statuses to stable default codes", () => {
    expect(errorCodeForStatus(400)).toBe("validation_failed");
    expect(errorCodeForStatus(401)).toBe("unauthorized");
    expect(errorCodeForStatus(403)).toBe("forbidden");
    expect(errorCodeForStatus(404)).toBe("not_found");
    expect(errorCodeForStatus(409)).toBe("conflict");
    expect(errorCodeForStatus(412)).toBe("precondition_failed");
    expect(errorCodeForStatus(413)).toBe("payload_too_large");
    expect(errorCodeForStatus(429)).toBe("rate_limited");
    expect(errorCodeForStatus(500)).toBe("internal_error");
    expect(errorCodeForStatus(502)).toBe("internal_error");
    expect(errorCodeForStatus(418)).toBe("bad_request");
    for (const status of [400, 401, 403, 404, 409, 412, 413, 429, 500, 503, 418]) {
      expect(ERROR_CODES).toContain(errorCodeForStatus(status));
    }
  });
});

describe("strict request schemas (BE-09)", () => {
  const schemas = allRoutes.flatMap((route) =>
    (["params", "query", "body"] as const).flatMap((part) =>
      route[part] ? [{ label: `${route.id} ${part}`, schema: route[part] }] : [],
    ),
  );

  it.each(schemas)("$label rejects an unknown top-level key", ({ schema }) => {
    // The probe key must be reported even when other fields are missing or wrong.
    const result = parseAgainst(schema, { __probe__: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: "__probe__",
        code: "unrecognized_keys",
        message: "Unknown field",
      });
    }
  });

  it("rejects unknown keys in nested request objects too", () => {
    const stage = allRoutes.find((r) => r.id === "imports.stage")?.body;
    if (!stage) throw new Error("missing schema");
    const result = parseAgainst(stage, {
      idempotencyKey: "key-12345",
      accounts: [{ ref: "a1", name: "Cash", type: "Current", details: { colour: "red" } }],
      balances: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((i) => i.path)).toEqual(["accounts.0.details.colour"]);
    }
  });
});

describe("parseAgainst", () => {
  it("returns the parsed output (trimmed, coerced) on success", () => {
    const create = allRoutes.find((r) => r.id === "accounts.create")?.body;
    const activity = allRoutes.find((r) => r.id === "mcpTokens.activity")?.query;
    if (!create || !activity) throw new Error("missing schema");
    expect(parseAgainst(create, { name: "  Cash ", type: "Current", balance: 1 })).toEqual({
      ok: true,
      data: { name: "Cash", type: "Current", balance: 1 },
    });
    expect(parseAgainst(activity, { limit: "10" })).toEqual({ ok: true, data: { limit: 10 } });
  });

  it("splits an unrecognized_keys issue into one issue per key, without values", () => {
    const create = allRoutes.find((r) => r.id === "accounts.create")?.body;
    if (!create) throw new Error("missing schema");
    const result = create.safeParse({ name: "x", type: "Current", balance: 1, a: "s3cret", b: 2 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = issuesFromZodError(result.error);
      expect(issues.map((i) => i.path)).toEqual(["a", "b"]);
      expect(JSON.stringify(issues)).not.toContain("s3cret");
    }
    expect(unknownKeys(create, [])).toEqual([]);
  });
});

describe("errorCodeForStatus", () => {
  it.each([
    [400, "validation_failed"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [405, "method_not_allowed"],
    [409, "conflict"],
    [410, "gone"],
    [412, "precondition_failed"],
    [413, "payload_too_large"],
    [415, "unsupported_media_type"],
    [422, "validation_failed"],
    [429, "rate_limited"],
    [503, "service_unavailable"],
    [500, "internal_error"],
    [502, "internal_error"],
    [418, "bad_request"],
  ])("maps %i to %s, a listed code", (status, code) => {
    expect(errorCodeForStatus(status)).toBe(code);
    expect(ERROR_CODES).toContain(code);
  });
});

describe("parseAgainst with a non-strict schema", () => {
  it("still reports undeclared keys as unrecognized_keys", async () => {
    const { z } = await import("zod");
    const result = parseAgainst(z.object({ name: z.string() }), { name: "a", extra: 1 });
    expect(result).toEqual({
      ok: false,
      issues: [{ path: "extra", code: "unrecognized_keys", message: "Unknown field" }],
    });
  });
});
