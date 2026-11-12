import { describe, expect, it } from "vitest";
import { PRICE_PLACEHOLDER, PRICE_PLACEHOLDER_ANNUAL } from "./placeholders";

describe("placeholders", () => {
  it("keeps pricing obviously unset", () => {
    expect(PRICE_PLACEHOLDER).toBe("£X");
    expect(PRICE_PLACEHOLDER_ANNUAL).toBe("£Y");
  });
});
