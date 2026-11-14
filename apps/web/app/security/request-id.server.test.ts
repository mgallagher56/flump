// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  getRequestId,
  REQUEST_ID_PATTERN,
  resolveRequestId,
  runWithRequestId,
  withRequestIdHeader,
} from "./request-id.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("resolveRequestId", () => {
  it("keeps any inbound id that matches the pattern", () => {
    for (const id of [
      "123e4567-e89b-12d3-a456-426614174000",
      "edge.req_0123-AB",
      "a".repeat(128),
    ]) {
      expect(resolveRequestId({ "x-request-id": id })).toBe(id);
    }
  });

  it("falls back to x-railway-request-id, then a fresh UUID", () => {
    expect(resolveRequestId({ "x-railway-request-id": "AbCd1234-_xyz" })).toBe("AbCd1234-_xyz");
    expect(resolveRequestId({})).toMatch(UUID);
  });

  it("discards anything outside the pattern", () => {
    for (const bad of [
      "short",
      "a".repeat(129),
      "has space ok",
      "x\r\nSet-Cookie: a=b",
      "a/b/c/d/e",
    ]) {
      expect(REQUEST_ID_PATTERN.test(bad)).toBe(false);
      expect(resolveRequestId({ "x-request-id": bad })).toMatch(UUID);
    }
    // A repeated header arrives as an array: never trusted.
    expect(resolveRequestId({ "x-request-id": ["abcdefgh1", "abcdefgh2"] })).toMatch(UUID);
  });
});

describe("request id context", () => {
  it("is undefined outside a request and set inside, across awaits", async () => {
    expect(getRequestId()).toBeUndefined();
    await runWithRequestId("req-12345678", async () => {
      await new Promise((r) => setTimeout(r, 1));
      expect(getRequestId()).toBe("req-12345678");
    });
    expect(getRequestId()).toBeUndefined();
  });

  it("adds x-request-id to outgoing headers only inside a request", () => {
    expect(withRequestIdHeader({ a: "1" })).toEqual({ a: "1" });
    runWithRequestId("req-12345678", () => {
      expect(withRequestIdHeader({ a: "1" })).toEqual({ a: "1", "x-request-id": "req-12345678" });
      // A caller's own id is left alone.
      expect(withRequestIdHeader({ "X-Request-Id": "mine-1234" })).toEqual({
        "X-Request-Id": "mine-1234",
      });
    });
  });
});
