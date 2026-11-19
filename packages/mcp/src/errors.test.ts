import { describe, expect, it } from "vitest";
import { errorResult, FlumpToolError, internalErrorBody } from "./errors.js";

describe("FlumpToolError", () => {
  it("is an Error named FlumpToolError, so logs and stack traces say what it is", () => {
    const err = new FlumpToolError("NOT_FOUND", "No such account.");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("FlumpToolError");
    expect(err.message).toBe("No such account.");
  });

  it("gives an empty hint and a non-retryable body when no init is passed", () => {
    // The contract: hint is always a string, and only RATE_LIMITED is retryable by default.
    expect(new FlumpToolError("NOT_FOUND", "m").toBody()).toEqual({
      code: "NOT_FOUND",
      message: "m",
      hint: "",
      retryable: false,
    });
  });

  it("defaults RATE_LIMITED to retryable but lets init say otherwise", () => {
    expect(new FlumpToolError("RATE_LIMITED", "m").toBody().retryable).toBe(true);
    expect(new FlumpToolError("RATE_LIMITED", "m", { retryable: false }).toBody().retryable).toBe(
      false,
    );
  });

  it("leaves out optional fields that were passed as undefined", () => {
    const body = new FlumpToolError("INVALID_ARGUMENT", "m", {
      field: undefined,
      askUser: undefined,
      supportedYears: undefined,
      retryAfterSeconds: undefined,
    }).toBody();
    expect(Object.keys(body).sort()).toEqual(["code", "hint", "message", "retryable"]);
  });

  it("carries the optional fields that were set, beside hint and retryable", () => {
    const body = new FlumpToolError("MISSING_DATA", "m", {
      hint: "Ask.",
      field: "apr",
      askUser: ["What is the APR?"],
    }).toBody();
    expect(Object.keys(body).sort()).toEqual([
      "askUser",
      "code",
      "field",
      "hint",
      "message",
      "retryable",
    ]);
    expect(body).toMatchObject({ hint: "Ask.", field: "apr", askUser: ["What is the APR?"] });
  });
});

describe("internalErrorBody", () => {
  it("is a retryable INTERNAL error that carries only the correlation id it was given", () => {
    const body = internalErrorBody("corr-1");
    expect(body.code).toBe("INTERNAL");
    expect(body.retryable).toBe(true);
    expect(body.correlationId).toBe("corr-1");
    // A message and a hint are required fields of the error contract, never blank.
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.hint.length).toBeGreaterThan(0);
  });

  it("makes up a UUID correlation id when none is given", () => {
    expect(internalErrorBody().correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("errorResult", () => {
  it("wraps the body as an isError result whose one text block is the JSON error", () => {
    const body = internalErrorBody("corr-2");
    const res = errorResult(body);
    expect(res.isError).toBe(true);
    expect(res.content).toHaveLength(1);
    expect(res.content[0]?.type).toBe("text");
    expect(JSON.parse(res.content[0]?.text ?? "")).toEqual({ error: body });
  });
});
