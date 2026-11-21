// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatTrapRate } from "./taxTrapCopy";

describe("formatTrapRate precision", () => {
  it("shows at most two decimal places", () => {
    // 41.3333 rounds to 41.33 at two decimal places.
    expect(formatTrapRate(41.3333)).toBe("41.33%");
  });
});
