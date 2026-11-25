// @vitest-environment node
import { checkMtdQualifyingIncome, type TaxRecordFields } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { mtdNoticeCopy, mtdNoticePosition } from "./mtdNotice";

const record = (fields: Partial<TaxRecordFields>): TaxRecordFields => ({
  id: "r1",
  type: "income",
  source: "self-employed",
  category: "self_employed_income",
  name: "Income",
  amount: 0,
  frequency: "annual",
  date: "2024-06-01",
  endDate: null,
  notes: null,
  accountId: null,
  ...fields,
});

const copyFor = (amount: number, date: string, taxYear: string) => {
  const check = checkMtdQualifyingIncome([record({ amount, date })], taxYear, "2026-11-25");
  if (!check) throw new Error("fixture: measured year");
  return mtdNoticeCopy({ kind: "over", check });
};

describe("mtdNoticeCopy", () => {
  it("is null when the notice does not apply", () => {
    expect(mtdNoticeCopy({ kind: "none" })).toBeNull();
  });

  it("states the 2024 to 2025 figure and date for the April 2026 group", () => {
    const copy = copyFor(52_000, "2024-06-01", "2024/25");
    expect(copy?.lead).toEqual([
      "The self-employed and property income you recorded for the 2024 to 2025 tax year, before expenses, is over £50,000.",
      "Making Tax Digital for Income Tax may apply to you from 6 April 2026.",
    ]);
    expect(copy?.details[1]).toBe(
      "From 6 April 2026, HMRC expects people over its threshold to keep digital records and send quarterly updates using compatible software.",
    );
    expect(copy?.details[2]).toBe(
      "HMRC works this out from your Self Assessment tax return, not from Flump. Some people are exempt.",
    );
    expect(copy?.links.map((l) => l.label)).toEqual([
      "Check if you need to use it on GOV.UK",
      "Sign up on GOV.UK",
    ]);
  });

  it("states £20,000 and 6 April 2028 for the 2026 to 2027 tax year", () => {
    const copy = copyFor(21_000, "2026-06-01", "2026/27");
    expect(copy?.lead[0]).toContain(
      "for the 2026 to 2027 tax year, before expenses, is over £20,000.",
    );
    expect(copy?.lead[1]).toContain("from 6 April 2028.");
  });

  it("gives the general line with only the check link when the position is unknown", () => {
    const copy = mtdNoticeCopy({ kind: "unknown" });
    expect(copy?.kind).toBe("general");
    expect(copy?.details).toEqual([]);
    expect(copy?.links.map((l) => l.label)).toEqual(["Check if you need to use it on GOV.UK"]);
  });

  it("keeps every sentence to 25 words or fewer", () => {
    for (const copy of [
      copyFor(52_000, "2024-06-01", "2024/25"),
      mtdNoticeCopy({ kind: "unknown" }),
    ]) {
      for (const sentence of [...(copy?.lead ?? []), ...(copy?.details ?? [])]) {
        expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(25);
      }
    }
  });
});

describe("mtdNoticePosition", () => {
  it("counts only the user's share of a jointly owned rental", () => {
    // £56,000 rent in 2025/26 on a property owned 50%: £28,000 counts, not over £30,000.
    // Counted in full it would be £56,000, which is over.
    const accounts = [
      {
        id: "flat",
        type: "Property",
        accountSubtype: "rental",
        ownership: "joint",
        sharePercent: 50,
      },
    ];
    const records = [
      record({
        source: "rental",
        category: "rental_income",
        amount: 56_000,
        date: "2025-06-01",
        accountId: "flat",
      }),
    ];
    const position = mtdNoticePosition({ records, accounts, today: "2026-11-25" });
    expect(position.kind).toBe("unknown");
    const whole = mtdNoticePosition({ records, accounts: [], today: "2026-11-25" });
    expect(whole.kind).toBe("over");
  });
});
