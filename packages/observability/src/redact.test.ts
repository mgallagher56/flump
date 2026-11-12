import { describe, expect, it } from "vitest";
import { redactDeep, redactString } from "./redact.js";

const jwt = `${"eyJ"}${"a".repeat(10)}.${"b".repeat(10)}.${"c".repeat(10)}`;

describe("redactString", () => {
  it.each([
    ["email", "mail sentinel@example.com now", "sentinel@example.com"],
    ["bearer", "Authorization: Bearer abc123tok", "abc123tok"],
    ["jwt", `tok ${jwt}`, jwt],
    ["stripe-like key", `k ${"sk_"}${"live_"}${"y".repeat(20)}`, "y".repeat(20)],
    ["long token", `v ${"A1b2".repeat(10)}`, "A1b2".repeat(10)],
    ["pounds", "paid £1,234.56 today", "1,234.56"],
    ["pounds spaced", "paid £ 99 today", "99"],
    ["decimal", "total 12.34 due", "12.34"],
    ["sort code", "sc 12-34-56 ok", "12-34-56"],
    ["digit run", "acct 12345678 ok", "12345678"],
    ["query string", "GET /p?code=zzz&x=1#h done", "code=zzz"],
  ])("redacts %s", (_label, input, secret) => {
    const out = redactString(input);
    expect(out).not.toContain(secret);
    expect(out).toContain("[redacted]");
  });

  it("leaves harmless text alone", () => {
    expect(redactString("TypeError at line 42")).toBe("TypeError at line 42");
  });
});

describe("redactDeep", () => {
  it("redacts sensitive keys, recurses and keeps safe values", () => {
    const out = redactDeep({
      Authorization: "x",
      nested: {
        password: "p",
        ok: "fine",
        list: [{ email: "e" }, "me@example.com", 3, null, true],
      },
      count: 3,
    });
    expect(out).toEqual({
      Authorization: "[redacted]",
      nested: {
        password: "[redacted]",
        ok: "fine",
        list: [{ email: "[redacted]" }, "[redacted]", 3, null, true],
      },
      count: 3,
    });
  });

  it("does not redact exception.type-like safe keys", () => {
    expect(redactDeep({ type: "TypeError" })).toEqual({ type: "TypeError" });
  });

  it("stops at the depth limit", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < 20; i++) deep = { a: deep };
    expect(JSON.stringify(redactDeep(deep))).toContain("[redacted]");
    expect(JSON.stringify(redactDeep(deep))).not.toContain("leaf");
  });
});
