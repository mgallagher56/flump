import { describe, expect, it } from "vitest";
import {
  isSourcePageSource,
  selfAssessmentPath,
  sourcePagePath,
  taxYearFromParam,
  taxYearToParam,
} from "./source-pages";

describe("source pages", () => {
  it("knows the four sources with a page and nothing else", () => {
    expect(["self-employed", "rental", "savings", "paye"].every(isSourcePageSource)).toBe(true);
    expect(isSourcePageSource("pension")).toBe(false);
    expect(isSourcePageSource(undefined)).toBe(false);
  });

  it("carries the tax year in the link as 2026-27", () => {
    expect(taxYearToParam("2026/27")).toBe("2026-27");
    expect(sourcePagePath("rental", "2025/26")).toBe("/app/self-assessment/rental?year=2025-26");
    expect(sourcePagePath("paye")).toBe("/app/self-assessment/paye");
    expect(selfAssessmentPath("2024/25")).toBe("/app/self-assessment?year=2024-25");
    expect(selfAssessmentPath()).toBe("/app/self-assessment");
  });

  it("reads a supported year back and ignores anything else", () => {
    expect(taxYearFromParam("2026-27")).toBe("2026/27");
    expect(taxYearFromParam("2026/27")).toBeNull();
    expect(taxYearFromParam("1990-91")).toBeNull();
    expect(taxYearFromParam(null)).toBeNull();
  });
});
