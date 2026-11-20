import { describe, expect, it } from "vitest";
import { isExemptPath, RATE_LIMIT_POLICIES } from "./rate-limit.decorator";
import { RateLimitStore } from "./rate-limit.store";

const MIN = 60_000;

describe("isExemptPath", () => {
  it("exempts /mcp and everything under it, with or without a query", () => {
    expect(isExemptPath("/mcp")).toBe(true);
    expect(isExemptPath("/mcp/messages")).toBe(true);
    expect(isExemptPath("/mcp/messages?session=1")).toBe(true);
    expect(isExemptPath("/mcp?x=1")).toBe(true);
  });

  it("does not exempt other paths that merely start with /mcp", () => {
    expect(isExemptPath("/mcpx")).toBe(false);
    expect(isExemptPath("/api/mcp")).toBe(false);
    expect(isExemptPath(undefined)).toBe(false);
  });
});

describe("credential policy (E20 section 6: 3 per 15 minutes, 10 per day)", () => {
  it("refuses the eleventh attempt in a day even when spread across 15 minute windows", () => {
    const store = new RateLimitStore();
    const policy = RATE_LIMIT_POLICIES.credential;
    // Three attempts at 0, 15, 30 and 45 minutes would be 12; the day window stops at 10:
    // 3 + 3 + 3 + 1 = 10 allowed, and the eleventh (at 45 minutes) is refused by the day window.
    const allowed: boolean[] = [];
    for (const minute of [0, 15, 30, 45]) {
      for (let i = 0; i < 3; i++) allowed.push(store.hit("k", policy, minute * MIN + i).allowed);
    }
    expect(allowed.filter(Boolean)).toHaveLength(10);
    const refused = store.hit("k", policy, 46 * MIN);
    expect(refused.allowed).toBe(false);
    // The day window is 24 * 60 * 60 * 1000 = 86 400 000 ms.
    expect(refused.exceeded?.windowMs).toBe(86_400_000);
  });
});
