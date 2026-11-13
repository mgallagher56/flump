import { describe, expect, it } from "vitest";
import { evaluateSignoff, yearVerification } from "./signoff.js";
import { UK_TAX_VECTOR_YEARS, UK_TAX_VECTORS } from "./uk-tax.vectors.js";
import {
  selectUkWhatIfVectors,
  UK_WHATIF_VECTOR_KINDS,
  UK_WHATIF_VECTORS,
} from "./uk-whatif.vectors.js";

/**
 * Vector ids the owner has signed off. Empty until the owner signs (DECISIONS E4): an unreviewed
 * edit that signs a vector fails here. The owner adds ids in the same commit as the sign-off.
 */
const OWNER_SIGNED_IDS: readonly string[] = [];

const GOV_URL = /^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//;
const get = (id: string) => UK_WHATIF_VECTORS.find((v) => v.id === id);

describe("E25 what-if vector catalogue", () => {
  it("is non-trivial and every kind is present", () => {
    expect(UK_WHATIF_VECTORS.length).toBeGreaterThanOrEqual(60);
    for (const kind of UK_WHATIF_VECTOR_KINDS) {
      expect(selectUkWhatIfVectors({ kind }).length, kind).toBeGreaterThan(0);
    }
  });

  it("every vector cites a gov.uk, gov.scot or legislation.gov.uk source", () => {
    for (const v of UK_WHATIF_VECTORS) {
      expect(v.source, v.id).toMatch(GOV_URL);
      for (const extra of v.additionalSources ?? []) expect(extra, v.id).toMatch(GOV_URL);
    }
  });

  it("every vector has a derivation, a finite expected value and an unsigned state", () => {
    for (const v of UK_WHATIF_VECTORS) {
      expect(v.derivation.trim().length, v.id).toBeGreaterThan(20);
      expect(Number.isFinite(v.expected), v.id).toBe(true);
      expect(evaluateSignoff(v), v.id).not.toMatchObject({ state: "invalid" });
      expect(v.signedOffBy !== null, v.id).toBe(OWNER_SIGNED_IDS.includes(v.id));
      expect(UK_TAX_VECTOR_YEARS, v.id).toContain(v.taxYear);
    }
  });

  it("ids are unique, also across the core catalogue", () => {
    const ids = [...UK_WHATIF_VECTORS, ...UK_TAX_VECTORS].map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("UNVERIFIED vectors carry a reason and are medium confidence; VERIFIED ones carry none", () => {
    for (const v of UK_WHATIF_VECTORS) {
      if (v.status === "UNVERIFIED") {
        expect(v.unverifiedReason, v.id).toMatch(/^UNVERIFIED: .{10,}/);
        expect(v.confidence, v.id).toBe("medium");
      } else {
        expect(v.status, v.id).toBe("VERIFIED");
        expect(v.unverifiedReason, v.id).toBeUndefined();
        expect(v.confidence, v.id).toBe("high");
      }
    }
  });

  it("hicbc, studentLoanMulti and reliefAtSource cover every supported year", () => {
    for (const taxYear of UK_TAX_VECTOR_YEARS) {
      for (const kind of ["hicbc", "studentLoanMulti", "reliefAtSource"] as const) {
        expect(
          selectUkWhatIfVectors({ taxYear, kind }).length,
          `${taxYear} ${kind}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("whatIfDelta covers the planned salaries, scottishMarginal covers every Scottish band", () => {
    const salaries = selectUkWhatIfVectors({ kind: "whatIfDelta" }).map((v) => v.input.salary);
    for (const s of [99500, 100000, 125000, 50270, 60000, 80000]) expect(salaries).toContain(s);
    const scot = selectUkWhatIfVectors({ kind: "scottishMarginal" });
    for (const s of [35000, 45000, 55000, 85000]) {
      expect(scot.map((v) => v.input.salary)).toContain(s);
    }
    for (const v of scot) expect(v.region).toBe("SCOTLAND");
  });

  it("Plan 2 plus Postgrad is covered every year, Plan 5 plus Postgrad for 2026/27", () => {
    const plans = (year: string) =>
      selectUkWhatIfVectors({ kind: "studentLoanMulti" })
        .filter((v) => v.taxYear === year)
        .map((v) => v.input.plans);
    for (const y of UK_TAX_VECTOR_YEARS) expect(plans(y)).toContain("plan2+postgrad");
    expect(plans("2026/27")).toContain("plan5+postgrad");
  });

  it("the 2029 salary sacrifice cap is a scheduled illustration and always UNVERIFIED", () => {
    const cap = selectUkWhatIfVectors({ kind: "salarySacrificeCap2029" });
    expect(cap.length).toBeGreaterThan(0);
    for (const v of cap) {
      expect(v.feature, v.id).toBe("scheduled");
      expect(v.status, v.id).toBe("UNVERIFIED");
      expect(v.input.cap, v.id).toBe(2000);
    }
  });

  it("features follow the DECISIONS round 4 addendum (D1)", () => {
    for (const v of UK_WHATIF_VECTORS) {
      expect(v.feature, v.id).toBe(
        v.kind === "hicbc" ? "hicbc" : v.kind === "salarySacrificeCap2029" ? "scheduled" : "whatIf",
      );
    }
  });

  it("every HICBC vector is UNVERIFIED until the 52 or 53 week ruling", () => {
    for (const v of selectUkWhatIfVectors({ kind: "hicbc" })) {
      expect(v.status, v.id).toBe("UNVERIFIED");
      expect(v.unverifiedReason, v.id).toContain("53 Mondays");
    }
  });

  it("adding these vectors leaves a year with no signed vectors unverified", () => {
    for (const y of UK_TAX_VECTOR_YEARS) {
      expect(yearVerification(y, UK_WHATIF_VECTORS)).toBe("unverified");
    }
  });

  it("holds the hand-derived anchor values", () => {
    // 125,000 to 126,000: tax 42,432 -> 42,903 (+471), NI +20: 1,000 - 471 - 20 = 509.
    expect(get("whatIfDelta.2026-27.ewni.125000.plus1000")?.expected).toBe(509);
    // PA trap: 60% income tax + 2% NI from 100,000 (1,000 - 600 - 20).
    expect(get("whatIfDelta.2026-27.ewni.100000.plus1000")?.expected).toBe(380);
    // Higher rate, above the NI upper earnings limit: 1,000 - 400 - 20.
    expect(get("whatIfDelta.2026-27.ewni.60000.plus1000")?.expected).toBe(580);
    // Scottish intermediate (21% + 8%), higher below UEL (42% + 8%), advanced (45% + 2%).
    expect(get("scottishMarginal.2026-27.35000.plus1000")?.expected).toBe(710);
    expect(get("scottishMarginal.2026-27.45000.plus1000")?.expected).toBe(500);
    expect(get("scottishMarginal.2026-27.85000.plus1000")?.expected).toBe(530);
    // HICBC 2026/27, one child 27.05 x 52 = 1,406.60: 100% at 80,000; 2,337.40 for two children, 50% at 70,000.
    expect(get("hicbc.2026-27.ani80000.children3")?.expected).toBe(
      Math.round((27.05 + 2 * 17.9) * 52 * 100) / 100,
    );
    // Plan 2 (45,000 - 29,385) x 9% + postgrad (45,000 - 21,000) x 6% = 1,405.35 + 1,440.
    expect(get("studentLoanMulti.2026-27.plan2+postgrad.45000")?.expected).toBe(2845.35);
    // Plan 5 (30,000 - 25,000) x 9% + postgrad (30,000 - 21,000) x 6% = 450 + 540.
    expect(get("studentLoanMulti.2026-27.plan5+postgrad.30000")?.expected).toBe(990);
  });
});
