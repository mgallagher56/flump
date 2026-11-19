import { describe, expect, it, vi } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import { SIGNOFF_OWNER, type SignableVector, vectorSignoffHash } from "./test-vectors/signoff.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./test-vectors/uk-self-assessment.vectors.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";

// No real vector is signed yet, so the "verified" path is checked with fixture sign-offs made in
// memory here. The catalogue files are not changed.
// Fixtures: core vectors signed for 2023/24 and 2024/25; Self Assessment vectors signed for
// 2024/25 only. So 2024/25 is fully signed and 2023/24 is signed except for Self Assessment.

function sign<T extends SignableVector>(v: T): T {
  return {
    ...v,
    signedOffBy: SIGNOFF_OWNER,
    signedOffAt: "2026-12-01",
    signedOffHash: vectorSignoffHash(v),
    ...(v.status === "UNVERIFIED" ? { rulingRef: "fixture-ruling" } : {}),
  };
}

vi.mock("./test-vectors/uk-tax.vectors.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./test-vectors/uk-tax.vectors.js")>();
  const signoff = await import("./test-vectors/signoff.js");
  return {
    ...actual,
    UK_TAX_VECTORS: actual.UK_TAX_VECTORS.map((v) =>
      v.taxYear === "2023/24" || v.taxYear === "2024/25"
        ? {
            ...v,
            signedOffBy: signoff.SIGNOFF_OWNER,
            signedOffAt: "2026-12-01",
            signedOffHash: signoff.vectorSignoffHash(v),
            ...(v.status === "UNVERIFIED" ? { rulingRef: "fixture-ruling" } : {}),
          }
        : v,
    ),
  };
});

vi.mock("./test-vectors/uk-self-assessment.vectors.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./test-vectors/uk-self-assessment.vectors.js")>();
  const signoff = await import("./test-vectors/signoff.js");
  return {
    ...actual,
    UK_SELF_ASSESSMENT_VECTORS: actual.UK_SELF_ASSESSMENT_VECTORS.map((v) =>
      v.taxYear === "2024/25"
        ? {
            ...v,
            signedOffBy: signoff.SIGNOFF_OWNER,
            signedOffAt: "2026-12-01",
            signedOffHash: signoff.vectorSignoffHash(v),
            ...(v.status === "UNVERIFIED" ? { rulingRef: "fixture-ruling" } : {}),
          }
        : v,
    ),
  };
});

describe("getTaxYearVerification with fixture sign-offs", () => {
  it("the fixtures are in place: both catalogues have vectors for 2024/25", () => {
    expect(UK_TAX_VECTORS.some((v) => v.taxYear === "2024/25")).toBe(true);
    expect(UK_SELF_ASSESSMENT_VECTORS.some((v) => v.taxYear === "2024/25")).toBe(true);
  });

  it("is verified when every core and Self Assessment vector for the year is signed", () => {
    const v = getTaxYearVerification("2024/25");
    expect(v.status).toBe("verified");
    expect(v.detail).toContain("2024/25");
    expect(v.detail).not.toMatch(/estimate/);
  });

  it("stays unverified when only the Self Assessment vectors are unsigned", () => {
    const v = getTaxYearVerification("2023/24");
    expect(v.status).toBe("unverified");
    expect(v.detail).toContain("2023/24");
  });

  it("tells the reader an unsigned year's figures are an estimate", () => {
    const v = getTaxYearVerification("2025/26");
    expect(v.status).toBe("unverified");
    expect(v.detail).toMatch(/estimate/);
  });
});

describe("getTaxFeatureVerification for core", () => {
  it("reads the core catalogue, so signing core verifies core", () => {
    const year = "2025/26";
    const core = UK_TAX_VECTORS.filter((v) => v.taxYear === year).map(sign);
    expect(getTaxFeatureVerification(year, "core", { core, whatIf: [] })).toBe("verified");
  });
});
