import { describe, expect, it } from "vitest";
import {
  describeJointShareOfWhole,
  describeJointWholeHistory,
  describeJointWholeValue,
} from "./joint-share.js";

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

describe("describeJointShareOfWhole", () => {
  it("says the share, then the whole, under a joint account's hero", () => {
    // Joint at 50% with a whole of £1,000 formatted by the page: the hero shows £500 beside it.
    expect(
      describeJointShareOfWhole(
        { type: "Saving", ownership: "joint", sharePercent: 50 },
        "balance",
        "£1,000",
      ),
    ).toBe("Your 50% share. The whole balance is £1,000.");
  });

  it("names a debt's whole as the amount owed, and keeps a share as typed", () => {
    expect(
      describeJointShareOfWhole(
        { type: "Mortgage", ownership: "joint", sharePercent: 40 },
        "amount owed",
        "£200,000",
      ),
    ).toBe("Your 40% share. The whole amount owed is £200,000.");
    // 33.33 stays 33.33, as the edit form's line shows it.
    expect(
      describeJointShareOfWhole(
        { type: "Saving", ownership: "joint", sharePercent: 33.33 },
        "balance",
        "£900",
      ),
    ).toBe("Your 33.33% share. The whole balance is £900.");
  });

  it("says nothing for a sole account", () => {
    expect(describeJointShareOfWhole({ type: "Saving", ownership: "sole" }, "balance", "£1")).toBe(
      null,
    );
  });
});

describe("describeJointWholeHistory", () => {
  it("says a joint account's history is the whole, with the share", () => {
    expect(
      describeJointWholeHistory(
        { type: "Saving", ownership: "joint", sharePercent: 50 },
        "balance",
      ),
    ).toBe("The whole balance each month, as recorded. Your share is 50% of it.");
    expect(describeJointWholeHistory({ type: "Loan", ownership: "joint" }, "amount owed")).toBe(
      "The whole amount owed each month, as recorded. Your share is 50% of it.",
    );
  });

  it("says nothing for a sole account", () => {
    expect(describeJointWholeHistory({ type: "Saving" }, "balance")).toBeNull();
  });
});
