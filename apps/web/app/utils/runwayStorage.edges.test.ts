import { describe, expect, it } from "vitest";
import { isCashAccountType } from "./runwayStorage";

describe("isCashAccountType spacing", () => {
  it("ignores spaces around the saved type", () => {
    expect(isCashAccountType("  Savings ")).toBe(true);
  });
});
