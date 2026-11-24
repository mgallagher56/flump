import { describe, expect, it, vi } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import { type SignableVector, signVector } from "./test-vectors/signoff.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./test-vectors/uk-self-assessment.vectors.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";

// Both paths are checked on fixture sign-offs made in memory here, so the tests do not depend on
// which years the real catalogue has signed (since 24 Nov 2026, all of them). The catalogue files
// are not changed. Fixtures: every vector is unsigned except core vectors for 2023/24 and 2024/25
// and Self Assessment vectors for 2024/25. So 2024/25 is fully signed, 2023/24 is signed except
// for Self Assessment, and 2022/23 is not signed at all.

function sign<T extends SignableVector>(v: T): T {
  return signVector(
    v,
    "fable-decider",
    "2026-12-01",
    v.status === "UNVERIFIED" ? "fixture-ruling" : undefined,
  );
}

// Hoisted so the vi.mock factories below can use it: a vector with its sign-off fields removed.
const { unsign } = vi.hoisted(() => ({
  unsign: <T extends object>(v: T): T => {
    const { signedOffAt, signedOffHash, rulingRef, ...rest } = v as T & {
      signedOffAt?: unknown;
      signedOffHash?: unknown;
      rulingRef?: unknown;
    };
    return { ...rest, signedOffBy: null } as T;
  },
}));

vi.mock("./test-vectors/uk-tax.vectors.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./test-vectors/uk-tax.vectors.js")>();
  const signoff = await import("./test-vectors/signoff.js");
  return {
    ...actual,
    UK_TAX_VECTORS: actual.UK_TAX_VECTORS.map((v) =>
      v.taxYear === "2023/24" || v.taxYear === "2024/25"
        ? signoff.signVector(
            v,
            "fable-decider",
            "2026-12-01",
            v.status === "UNVERIFIED" ? "fixture-ruling" : undefined,
          )
        : unsign(v),
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
        ? signoff.signVector(
            v,
            "fable-decider",
            "2026-12-01",
            v.status === "UNVERIFIED" ? "fixture-ruling" : undefined,
          )
        : unsign(v),
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
    // 2022/23 is unsigned in the fixture.
    const v = getTaxYearVerification("2022/23");
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
