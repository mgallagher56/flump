import { describe, expect, it } from "vitest";
import { formatCsvCell, formatCsvRow, sanitizeCsvFormula } from "./csv-export";

describe("csv-export (E19 portability)", () => {
  describe("sanitizeCsvFormula", () => {
    it.each([
      ["=SUM(A1:A2)", "'=SUM(A1:A2)"],
      ["+1+1", "'+1+1"],
      ["-cmd|' /C calc'!A0", "'-cmd|' /C calc'!A0"],
      ["@SUM(1,1)", "'@SUM(1,1)"],
      ["\t=1", "'\t=1"],
      ["\r=1", "'\r=1"],
    ])("prefixes dangerous leading character in %j", (input, expected) => {
      expect(sanitizeCsvFormula(input)).toBe(expected);
    });

    it("leaves safe strings unchanged", () => {
      expect(sanitizeCsvFormula("Current account")).toBe("Current account");
      expect(sanitizeCsvFormula("2026-11-16")).toBe("2026-11-16");
      expect(sanitizeCsvFormula("")).toBe("");
    });
  });

  describe("formatCsvCell", () => {
    it("handles null, undefined, numbers, booleans, dates, and objects", () => {
      expect(formatCsvCell(null)).toBe("");
      expect(formatCsvCell(undefined)).toBe("");
      expect(formatCsvCell(1250.5)).toBe("1250.5");
      expect(formatCsvCell(-42)).toBe("-42");
      expect(formatCsvCell(Number.NaN)).toBe("");
      expect(formatCsvCell(true)).toBe("true");
      expect(formatCsvCell(false)).toBe("false");
      expect(formatCsvCell(new Date("2026-11-16T09:00:00.000Z"))).toBe("2026-11-16T09:00:00.000Z");
      expect(formatCsvCell({ a: 1, b: "x" })).toBe('"{""a"":1,""b"":""x""}"');
    });

    it("applies RFC 4180 quoting for commas, double quotes, CR, and LF", () => {
      expect(formatCsvCell("Food, Drink")).toBe('"Food, Drink"');
      expect(formatCsvCell('Say "hello"')).toBe('"Say ""hello"""');
      expect(formatCsvCell("line1\nline2")).toBe('"line1\nline2"');
      expect(formatCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
    });

    it("combines formula-injection protection with RFC 4180 quoting", () => {
      expect(formatCsvCell('=HYPERLINK("http://evil.example","click")')).toBe(
        '"\'=HYPERLINK(""http://evil.example"",""click"")"',
      );
      expect(formatCsvCell("\r=1+1")).toBe('"\'\r=1+1"');
      expect(formatCsvCell("\t+1")).toBe("'\t+1");
    });
  });

  describe("formatCsvRow", () => {
    it("joins cells with commas and terminates with CRLF", () => {
      expect(formatCsvRow(["acc-1", "Current, GBP", 1000, "=1+1"])).toBe(
        'acc-1,"Current, GBP",1000,\'=1+1\r\n',
      );
    });
  });
});
