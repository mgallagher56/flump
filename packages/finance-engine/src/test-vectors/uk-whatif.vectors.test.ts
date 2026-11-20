import { describe, expect, it } from "vitest";
import { evaluateSignoff, yearVerification } from "./signoff.js";
import { UK_TAX_VECTOR_YEARS, UK_TAX_VECTORS } from "./uk-tax.vectors.js";
import {
  selectUkWhatIfVectors,
  UK_WHATIF_VECTOR_KINDS,
  UK_WHATIF_VECTORS,
} from "./uk-whatif.vectors.js";

/**
 * Signed vectors are read from `signedOffBy`; no second list of ids is kept. The hash check in
 * `evaluateSignoff` catches an edit made after signing, and fails below. The hash is unkeyed, so a
 * signature computed by hand is caught in review, by the vector diff and its baseline diff (see
 * uk-tax.vectors.test.ts). Signatures come from `bun run tax:signoff apply --signer <name>`.
 */
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
      expect(evaluateSignoff(v).state, v.id).toBe(v.signedOffBy === null ? "unsigned" : "signed");
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

  it("every HICBC vector is UNVERIFIED and names the s.681H(3) week ruling", () => {
    for (const v of selectUkWhatIfVectors({ kind: "hicbc" })) {
      expect(v.status, v.id).toBe("UNVERIFIED");
      expect(v.unverifiedReason, v.id).toContain("s.681H(3)");
    }
  });

  it("HICBC vectors for 2020/21 to 2024/25 cite a source for that year's weekly rates", () => {
    // The live GOV.UK rates table starts at 2025/26, so each earlier year cites an archived copy
    // of that table (webarchive.nationalarchives.gov.uk) and, where one exists, the uprating SI.
    const ARCHIVE =
      /^https:\/\/webarchive\.nationalarchives\.gov\.uk\/ukgwa\/\d{14}\/https:\/\/www\.gov\.uk\//;
    for (const y of ["2020/21", "2021/22", "2022/23", "2023/24", "2024/25"] as const) {
      for (const v of selectUkWhatIfVectors({ kind: "hicbc", taxYear: y })) {
        expect(v.archiveUrl, v.id).toMatch(ARCHIVE);
        expect(v.derivation, v.id).toContain(v.archiveUrl as string);
      }
    }
  });

  it("a year is verified on these vectors only when every one of them is signed", () => {
    // 20 Nov 2026: every 2027/28 what-if vector is signed (4 by the owner, 7 by the Fable
    // decider); every other year still has unsigned what-if vectors.
    for (const y of UK_TAX_VECTOR_YEARS) {
      expect(yearVerification(y, UK_WHATIF_VECTORS), y).toBe(
        y === "2027/28" ? "verified" : "unverified",
      );
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
    // HICBC 2026/27 has 53 weeks (6 April 2026 and 5 April 2027 are Mondays, ITEPA s.681H(3)).
    // Three children (27.05 + 2 x 17.90) x 53 = 3,331.05, rounded down to 3,331 (s.681C(3));
    // 100% at 80,000 = 3,331.
    expect(get("hicbc.2026-27.ani80000.children3")?.expected).toBe(3331);
    // One child 27.05 x 53 = 1,433.65 -> 1,433; 99% at 79,800 = 1,418.67, rounded down to 1,418.
    expect(get("hicbc.2026-27.ani79800.children1")?.expected).toBe(1418);
    // 2025/26 has 52 weeks: one child 26.05 x 52 = 1,354.60 -> 1,354; 99% = 1,340.46 -> 1,340.
    expect(get("hicbc.2025-26.ani79800.children1")?.expected).toBe(1340);
    // Plan 2 (45,000 - 29,385) x 9% + postgrad (45,000 - 21,000) x 6% = 1,405.35 + 1,440.
    expect(get("studentLoanMulti.2026-27.plan2+postgrad.45000")?.expected).toBe(2845.35);
    // Plan 5 (30,000 - 25,000) x 9% + postgrad (30,000 - 21,000) x 6% = 450 + 540.
    expect(get("studentLoanMulti.2026-27.plan5+postgrad.30000")?.expected).toBe(990);
  });
});
