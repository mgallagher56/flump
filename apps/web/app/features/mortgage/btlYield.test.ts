import type { TaxRecord } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { btlPropertyYields, rentForPropertyInYear } from "./btlYield";

const rent = (over: Partial<TaxRecord>): TaxRecord => ({
  id: "r1",
  userId: "u",
  type: "income",
  source: "rental",
  category: "rental_income",
  name: "Flat rent",
  amount: 1150,
  frequency: "monthly",
  date: "2026-04-06",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  accountId: "p1",
  createdAt: "2026-04-06T00:00:00.000Z",
  updatedAt: "2026-04-06T00:00:00.000Z",
  ...over,
});

describe("rentForPropertyInYear", () => {
  it("sums the rent linked to the property for the tax year", () => {
    // 1,150 a month from 6 April 2026, open-ended: 12 payments in 2026/27 = 13,800.
    expect(rentForPropertyInYear([rent({})], "p1", "2026/27")).toBe(13800);
  });

  it("leaves out rent linked elsewhere or not linked, and costs", () => {
    const records = [
      rent({ id: "a", accountId: "p2" }),
      rent({ id: "b", accountId: null }),
      rent({ id: "c", type: "expense", category: "repairs_maintenance" }),
    ];
    expect(rentForPropertyInYear(records, "p1", "2026/27")).toBe(0);
  });
});

describe("btlPropertyYields", () => {
  it("gives a property's gross yield from its linked rent and its value", () => {
    // 13,800 / 230,000 = 0.06, so 6.0%.
    const [row] = btlPropertyYields(
      [{ id: "p1", name: "Flat 2", balance: 230000 }],
      [rent({})],
      "2026/27",
    );
    expect(row).toEqual({ id: "p1", name: "Flat 2", yieldPct: 6 });
  });

  it("gives no yield without linked rent or a value", () => {
    expect(
      btlPropertyYields(
        [
          { id: "p1", name: "Flat 2", balance: 230000 },
          { id: "p2", name: "Harbour Street", balance: null },
        ],
        [rent({ accountId: "p2" })],
        "2026/27",
      ).map((r) => r.yieldPct),
    ).toEqual([null, null]);
  });
});
