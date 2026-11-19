import { describe, expect, it } from "vitest";
import { describeJointWholeValue } from "./joint-share.js";

describe("describeJointWholeValue", () => {
  it("names the whole figure and the share of a joint account", () => {
    // Joint saver with a 40% share: the line states 40, the stored share, as typed.
    expect(
      describeJointWholeValue({ type: "Saving", ownership: "joint", sharePercent: 40 }, "balance"),
    ).toBe("This is the whole balance. Your share is 40% of it.");
  });

  it("uses the 50% default when a joint account has no share saved", () => {
    expect(describeJointWholeValue({ type: "Loan", ownership: "joint" }, "monthly payment")).toBe(
      "This is the whole monthly payment. Your share is 50% of it.",
    );
  });

  it("says nothing for a sole account or an ISA marked joint", () => {
    expect(describeJointWholeValue({ type: "Saving", ownership: "sole" }, "balance")).toBeNull();
    // An ISA cannot be joint, so it resolves to sole.
    expect(
      describeJointWholeValue(
        { type: "Saving", accountSubtype: "cash_isa", ownership: "joint", sharePercent: 40 },
        "balance",
      ),
    ).toBeNull();
  });
});
