import { describe, expect, it } from "vitest";
import {
  applyAccountShare,
  describeJointLiabilityNotice,
  describeJointWholeValue,
  isIsaAccount,
  isPensionAccount,
  JOINT_LIABILITY_NOTICE,
  resolveAccountOwnership,
  resolveAccountSharePercent,
} from "./joint-share.js";

describe("describeJointLiabilityNotice recognises debts by their type words", () => {
  it("states that each borrower is liable for the whole debt", () => {
    expect(JOINT_LIABILITY_NOTICE).toContain("legally liable for the whole debt");
    expect(describeJointLiabilityNotice({ type: "Mortgage", ownership: "joint" })).toBe(
      JOINT_LIABILITY_NOTICE,
    );
  });

  it("shows the notice for a joint credit card whose type is not an exact category word", () => {
    // "Joint credit card" is not one of the exact category spellings, so the type words decide.
    expect(describeJointLiabilityNotice({ type: "Joint credit card", ownership: "joint" })).toBe(
      JOINT_LIABILITY_NOTICE,
    );
  });

  it("shows the notice for a single overdraft and a single debt", () => {
    expect(describeJointLiabilityNotice({ type: "Arranged overdraft", ownership: "joint" })).toBe(
      JOINT_LIABILITY_NOTICE,
    );
    expect(describeJointLiabilityNotice({ type: "Personal debt", ownership: "joint" })).toBe(
      JOINT_LIABILITY_NOTICE,
    );
  });

  it("reads a run of underscores or hyphens as one space", () => {
    // "car__finance" reads as "car finance", a debt; "STUDENT_-LOAN" reads as "STUDENT LOAN",
    // which is never a joint debt notice.
    expect(describeJointLiabilityNotice({ type: "car__finance", ownership: "joint" })).toBe(
      JOINT_LIABILITY_NOTICE,
    );
    expect(describeJointLiabilityNotice({ type: "STUDENT_-LOAN", ownership: "joint" })).toBeNull();
  });

  it("follows an explicit liability flag over the type", () => {
    expect(
      describeJointLiabilityNotice({ type: "Saving", isLiability: true, ownership: "joint" }),
    ).toBe(JOINT_LIABILITY_NOTICE);
    expect(
      describeJointLiabilityNotice({ type: "Mortgage", isLiability: false, ownership: "joint" }),
    ).toBeNull();
  });

  it("shows no notice for a joint account with no type", () => {
    expect(describeJointLiabilityNotice({ ownership: "joint" })).toBeNull();
  });
});

describe("account type fields are read trimmed, with rawType as the fallback", () => {
  it("reads rawType when there is no type", () => {
    expect(isPensionAccount({ rawType: "Pension" })).toBe(true);
  });

  it("reads rawType when the type is only spaces", () => {
    expect(isPensionAccount({ type: "   ", rawType: "SIPP" })).toBe(true);
  });

  it("trims the chosen subtype, and a blank one does not decide", () => {
    expect(isIsaAccount({ type: "Saving", accountSubtype: " cash_isa " })).toBe(true);
    expect(isIsaAccount({ type: "Saving", accountSubtype: "  ", name: "Cash ISA" })).toBe(true);
  });

  it("reads ownership trimmed and in any case", () => {
    expect(resolveAccountOwnership({ type: "Current", ownership: " Joint " })).toBe("joint");
  });
});

describe("resolveAccountSharePercent treats a blank or null share as not given", () => {
  it("uses the 50/50 default for a joint account with a blank share", () => {
    expect(
      resolveAccountSharePercent({ type: "Current", ownership: "joint", sharePercent: "" }),
    ).toBe(50);
  });

  it("uses the 50/50 default when every share field is null", () => {
    expect(
      resolveAccountSharePercent({
        type: "Current",
        ownership: "joint",
        sharePercent: null,
        sharePct: null,
        share_pct: null,
      }),
    ).toBe(50);
  });
});

describe("applyAccountShare rounds symmetrically and never gives negative zero", () => {
  const joint = { type: "Current", ownership: "joint" as const };

  it("rounds a negative half penny away from zero", () => {
    // -£0.25 at 50% is -£0.125. Symmetric rounding takes 0.125 to 0.13, so -0.125 is -0.13.
    expect(applyAccountShare(-0.25, joint)).toBe(-0.13);
  });

  it("gives 0, not -0, when a tiny negative share rounds to nothing", () => {
    // -£0.002 at 50% is -£0.001, which rounds to no pence at all.
    expect(Object.is(applyAccountShare(-0.002, joint), 0)).toBe(true);
  });

  it("gives 0, not -0, for a negative zero amount on a sole account", () => {
    expect(Object.is(applyAccountShare(-0), 0)).toBe(true);
  });
});

describe("describeJointWholeValue", () => {
  it("shows the share to at most two decimal places", () => {
    // 33.333% to at most two decimal places is 33.33%.
    expect(
      describeJointWholeValue(
        { type: "Current", ownership: "joint", sharePercent: 33.333 },
        "balance",
      ),
    ).toBe("This is the whole balance. Your share is 33.33% of it.");
  });
});
