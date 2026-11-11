import { describe, expect, it } from "vitest";
import {
  runUkTaxVectors,
  selectUkTaxVectors,
  UK_TAX_VECTOR_YEARS,
  UK_TAX_VECTORS,
  type UkTaxVectorKind,
} from "./uk-tax.vectors.js";

const GOV_URL = /^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//;

describe("UK tax vector catalogue", () => {
  it("every vector cites a gov.uk or gov.scot source", () => {
    for (const v of UK_TAX_VECTORS) {
      expect(v.source, v.id).toMatch(GOV_URL);
      for (const extra of v.additionalSources ?? []) {
        expect(extra, v.id).toMatch(/^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//);
      }
      if (v.archiveUrl) {
        expect(v.archiveUrl, v.id).toMatch(/^https:\/\/webarchive\.nationalarchives\.gov\.uk\//);
      }
    }
  });

  it("every vector has a derivation, confidence and null sign-off", () => {
    for (const v of UK_TAX_VECTORS) {
      expect(v.derivation.trim().length, v.id).toBeGreaterThan(20);
      expect(["high", "medium"], v.id).toContain(v.confidence);
      expect(v.signedOffBy, v.id).toBeNull();
      expect(Number.isFinite(v.expected), v.id).toBe(true);
    }
  });

  it("vector ids are unique", () => {
    const ids = UK_TAX_VECTORS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("UNVERIFIED vectors carry a reason and are medium confidence; VERIFIED ones carry none", () => {
    for (const v of UK_TAX_VECTORS) {
      if (v.status === "UNVERIFIED") {
        expect(v.unverifiedReason, v.id).toMatch(/^UNVERIFIED: .{10,}/);
        expect(v.confidence, v.id).toBe("medium");
      } else {
        expect(v.status, v.id).toBe("VERIFIED");
        expect(v.unverifiedReason, v.id).toBeUndefined();
      }
    }
  });

  it("only supported tax years appear and every year is covered per kind", () => {
    for (const v of UK_TAX_VECTORS) {
      expect(UK_TAX_VECTOR_YEARS, v.id).toContain(v.taxYear);
    }
    const kinds: UkTaxVectorKind[] = [
      "incomeTax",
      "giftAid",
      "employeeNi",
      "class4",
      "employerNiSaving",
      "studentLoan",
      "dividends",
    ];
    for (const taxYear of UK_TAX_VECTOR_YEARS) {
      for (const kind of kinds) {
        expect(selectUkTaxVectors({ taxYear, kind }).length, `${taxYear} ${kind}`).toBeGreaterThan(
          0,
        );
      }
      expect(
        selectUkTaxVectors({ taxYear, kind: "incomeTax", region: "SCOTLAND" }).length,
        `${taxYear} scotland`,
      ).toBeGreaterThan(0);
    }
  });

  it("contains the key EWNI figures at the correct additional-rate threshold", () => {
    const get = (id: string) => UK_TAX_VECTORS.find((v) => v.id === id)?.expected;
    for (const y of ["2025-26", "2026-27"]) {
      expect(get(`ewni.incomeTax.${y}.100000`)).toBe(27432);
      expect(get(`ewni.incomeTax.${y}.110000`)).toBe(33432);
      expect(get(`ewni.incomeTax.${y}.125140`)).toBe(42516);
      expect(get(`ewni.incomeTax.${y}.150000`)).toBe(53703);
      expect(get(`ewni.incomeTax.${y}.60000`)).toBe(11432);
      expect(get(`ewni.giftAid.${y}.60000.net1000`)).toBe(11182);
      expect(get(`employeeNi.${y}.60000`)).toBe(3210.6);
      expect(get(`employerNiSaving.${y}.60000.3000`)).toBe(450);
    }
    expect(get("studentLoan.2025-26.plan2.35000")).toBe(587.7);
    expect(get("studentLoan.2026-27.plan2.35000")).toBe(505.35);
    expect(get("scotland.incomeTax.2026-27.50000")).toBe(8982.05);
    // 2020/21-2022/23 additional rate starts at 150,000, not 125,140.
    expect(get("ewni.incomeTax.2021-22.150000")).toBe(52460);
    expect(get("ewni.incomeTax.2020-21.150000")).toBe(52500);
  });

  it("flags taper-dependent pre-2023 vectors and Plan 5 pre-2026 as UNVERIFIED", () => {
    const status = (id: string) => UK_TAX_VECTORS.find((v) => v.id === id)?.status;
    expect(status("ewni.incomeTax.2021-22.110000")).toBe("UNVERIFIED");
    expect(status("ewni.incomeTax.2025-26.110000")).toBe("VERIFIED");
    expect(status("studentLoan.2024-25.plan5.35000")).toBe("UNVERIFIED");
    expect(status("studentLoan.2026-27.plan5.35000")).toBe("VERIFIED");
    expect(status("employeeNi.2023-24.60000")).toBe("UNVERIFIED");
  });
});

describe("runUkTaxVectors", () => {
  it("passes when the evaluator returns the expected values", () => {
    const result = runUkTaxVectors(UK_TAX_VECTORS, (v) => v.expected);
    expect(result.checked).toBe(UK_TAX_VECTORS.length);
    expect(result.failures).toEqual([]);
  });

  it("reports mismatches beyond half a penny", () => {
    const [first, second] = UK_TAX_VECTORS;
    const result = runUkTaxVectors([first, second], (v) =>
      v.id === first.id ? v.expected + 0.01 : v.expected + 0.004,
    );
    expect(result.failures).toEqual([
      { id: first.id, expected: first.expected, actual: first.expected + 0.01 },
    ]);
  });

  it("treats NaN as a failure", () => {
    const result = runUkTaxVectors(UK_TAX_VECTORS.slice(0, 1), () => Number.NaN);
    expect(result.failures).toHaveLength(1);
  });
});
