import { describe, expect, it } from "vitest";
import {
  DEFAULT_NET_WORTH_BASIS,
  joinNetWorthLeftOut,
  NET_WORTH_LEFT_OUT_ORDER,
  resolveNetWorthScope,
} from "./net-worth-basis.js";

describe("NET_WORTH_LEFT_OUT_ORDER", () => {
  it("lists the four leave-out kinds in the fixed order surfaces show them", () => {
    expect(NET_WORTH_LEFT_OUT_ORDER).toEqual([
      "property",
      "mortgage",
      "studentLoan",
      "homeValueMissing",
    ]);
  });
});

describe("resolveNetWorthScope missing home value", () => {
  it("does not ask for a home value when only cash and savings accounts are held", () => {
    // No mortgage at all, so nothing can be missing a home value.
    const scope = resolveNetWorthScope(
      [
        { id: "c", type: "Current", balance: 500 },
        { id: "s", type: "Savings", balance: 2000 },
      ],
      DEFAULT_NET_WORTH_BASIS,
    );
    expect(scope.leftOut).toEqual([]);
  });
});

describe("joinNetWorthLeftOut", () => {
  it("leaves the missing home value out of the words", () => {
    // homeValueMissing is asked for separately, never named in the leave-out line.
    expect(joinNetWorthLeftOut(["property", "homeValueMissing"])).toBe("property");
    expect(joinNetWorthLeftOut(["homeValueMissing"])).toBe("");
  });
});
