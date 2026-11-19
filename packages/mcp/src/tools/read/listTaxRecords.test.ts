import type { BuildContextPackInput, TaxRecord } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient, TEST_TOKEN } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Row = {
  id: string;
  source: string;
  type: string;
  category: string;
  frequency: string;
  date: string;
  endDate: string | null;
  inYearGbp: number;
  name?: string;
};
type Env = {
  result: {
    totals: {
      incomeGbp: number;
      expensesGbp: number;
      bySource: Array<{ source: string; incomeGbp: number; expensesGbp: number }>;
    };
    groups: Array<{ key: string; source?: string; incomeGbp: number; expensesGbp: number }>;
    rows: Row[];
    rowCount: number;
    rowsTruncated: boolean;
    notes: string[];
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};
type ErrorEnv = { error: { code: string; message: string; hint: string; field?: string } };

const rec = (r: Partial<TaxRecord> & Pick<TaxRecord, "id">): TaxRecord =>
  ({
    userId: "u",
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Flat rent",
    amount: 1000,
    frequency: "one-off",
    date: "2025-05-10",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    ...r,
  }) as TaxRecord;

/** All in 2025/26 (April 2025 to March 2026). */
const RECORDS = [
  rec({ id: "r1" }),
  rec({
    id: "r2",
    type: "expense",
    category: "rent_rates_insurance",
    amount: 200,
    date: "2025-04-15",
  }),
  rec({
    id: "r3",
    type: "expense",
    category: "finance_costs_brought_forward",
    amount: 300,
    date: "2025-06-01",
  }),
  rec({
    id: "r4",
    source: "savings",
    category: "savings_interest",
    amount: 50,
    date: "2025-04-15",
  }),
  rec({ id: "r5", amount: 0, date: "2025-07-01" }),
  rec({ id: "r6", amount: 100, frequency: "monthly", date: "2025-10-01", endDate: "2025-12-31" }),
];

async function list(
  records: TaxRecord[],
  args: Record<string, unknown> = {},
  token = TEST_TOKEN,
): Promise<unknown> {
  const data: BuildContextPackInput = { ...emptyUser, taxRecords: records as never };
  const h = await connectTestClient(data, { token });
  try {
    return await h.callJson("list_tax_records", { taxYear: "2025/26", ...args });
  } finally {
    await h.close();
  }
}

describe("list_tax_records totals", () => {
  it("adds income and costs by source, leaving out finance costs brought forward", async () => {
    const e = (await list(RECORDS)) as Env;
    // Income: 1,000 (r1) + 50 (r4) + 3 months x 100 (r6, October to December) = 1,350.
    // Costs: 200 (r2). The 300 brought forward (r3) is listed but is not a cost of the year,
    // and r5 adds nothing in the year.
    expect(e.result.totals.incomeGbp).toBe(1350);
    expect(e.result.totals.expensesGbp).toBe(200);
    expect(e.result.totals.bySource).toEqual(
      expect.arrayContaining([
        { source: "rental", incomeGbp: 1300, expensesGbp: 200 },
        { source: "savings", incomeGbp: 50, expensesGbp: 0 },
      ]),
    );
    expect(e.result.totals.bySource).toHaveLength(2);
    expect(e.provenance.totals).toBe("tax_records");
    expect(e.missing).toEqual([]);
  });

  it("groups by category id, with the source beside it", async () => {
    const e = (await list(RECORDS, { groupBy: "category" })) as Env;
    expect(e.result.groups).toEqual(
      expect.arrayContaining([
        { key: "rental_income", source: "rental", incomeGbp: 1300, expensesGbp: 0 },
        { key: "rent_rates_insurance", source: "rental", incomeGbp: 0, expensesGbp: 200 },
        { key: "finance_costs_brought_forward", source: "rental", incomeGbp: 0, expensesGbp: 0 },
        { key: "savings_interest", source: "savings", incomeGbp: 50, expensesGbp: 0 },
      ]),
    );
    expect(e.result.groups).toHaveLength(4);
  });

  it("groups by month, counting each record in the months it falls in", async () => {
    const e = (await list(RECORDS, { groupBy: "month" })) as Env;
    const byKey = new Map(e.result.groups.map((g) => [g.key, g]));
    expect(e.result.groups).toHaveLength(12);
    // April: savings 50 in, insurance 200 out. May: rent 1,000. June: only the brought-forward
    // record, which is not a cost. October to December: 100 a month.
    expect(byKey.get("2025-04")).toEqual({ key: "2025-04", incomeGbp: 50, expensesGbp: 200 });
    expect(byKey.get("2025-05")).toEqual({ key: "2025-05", incomeGbp: 1000, expensesGbp: 0 });
    expect(byKey.get("2025-06")).toEqual({ key: "2025-06", incomeGbp: 0, expensesGbp: 0 });
    expect(byKey.get("2025-11")).toEqual({ key: "2025-11", incomeGbp: 100, expensesGbp: 0 });
    expect(byKey.get("2026-01")).toEqual({ key: "2026-01", incomeGbp: 0, expensesGbp: 0 });
  });
});

describe("list_tax_records rows", () => {
  it("lists records with something in the year, oldest first, keeping the end date", async () => {
    const e = (await list(RECORDS)) as Env;
    const rows = e.result.rows;
    // r5 adds nothing in the year, so 5 rows. Dates: r2 and r4 on 15 April, r1 on 10 May,
    // r3 on 1 June, r6 on 1 October.
    expect(e.result.rowCount).toBe(5);
    expect(rows.map((r) => r.date)).toEqual([
      "2025-04-15",
      "2025-04-15",
      "2025-05-10",
      "2025-06-01",
      "2025-10-01",
    ]);
    // Two rows on the same day are ordered by id.
    expect((rows[0]?.id ?? "") < (rows[1]?.id ?? "")).toBe(true);
    expect(rows[4]).toMatchObject({ frequency: "monthly", endDate: "2025-12-31", inYearGbp: 300 });
    expect(rows[2]?.endDate).toBeNull();
  });

  it("caps rows at 25 in concise format and 100 in detailed, keeping the totals and count", async () => {
    const many = Array.from({ length: 26 }, (_, i) =>
      rec({ id: `m${i}`, amount: 10, date: "2025-05-10" }),
    );
    const concise = (await list(many)) as Env;
    expect(concise.result.rows).toHaveLength(25);
    expect(concise.result.rowCount).toBe(26);
    expect(concise.result.rowsTruncated).toBe(true);
    // 26 records of 10: 260.
    expect(concise.result.totals.incomeGbp).toBe(260);
    const detailed = (await list(many, { responseFormat: "detailed" })) as Env;
    expect(detailed.result.rows).toHaveLength(26);
    expect(detailed.result.rowsTruncated).toBe(false);
  });

  it("does not flag truncation when the records exactly fill the 25-row page", async () => {
    const exact = Array.from({ length: 25 }, (_, i) =>
      rec({ id: `e${i}`, amount: 10, date: "2025-05-10" }),
    );
    const e = (await list(exact)) as Env;
    expect(e.result.rows).toHaveLength(25);
    expect(e.result.rowCount).toBe(25);
    expect(e.result.rowsTruncated).toBe(false);
  });

  it("with full read access shows an empty name for a record with no name", async () => {
    const full = {
      ...TEST_TOKEN,
      scopes: ["mcp:read:full"] as never,
      anonymizeInstitutions: false,
    };
    const e = (await list([rec({ id: "n1", name: null as never })], {}, full)) as Env;
    expect(e.result.rows[0]?.name).toBe("");
  });
});

describe("list_tax_records notes and missing", () => {
  it("has the two fixed notes and none about unrecognised categories when all are recognised", async () => {
    const e = (await list(RECORDS)) as Env;
    expect(e.result.notes).toHaveLength(2);
    for (const n of e.result.notes) expect(n.length).toBeGreaterThan(0);
    expect(e.result.notes.join(" ")).not.toMatch(/"other"/);
  });

  it("counts records with an unrecognised category in a note", async () => {
    const e = (await list([
      rec({ id: "k1" }),
      rec({ id: "k2", category: "rental_income" }),
      rec({ id: "u1", category: "made_up_category" }),
    ])) as Env;
    expect(e.result.rows.filter((r) => r.category === "other")).toHaveLength(1);
    expect(e.result.notes).toHaveLength(3);
    // One of the three records is unrecognised.
    expect(e.result.notes[0]).toMatch(/"other"\): 1\./);
  });

  it("asks for records, naming the tax year, when none fall in it", async () => {
    const e = (await list([])) as Env;
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.field).toBe("taxRecords");
    expect(e.missing[0]?.why).toContain("2025/26");
    expect(e.missing[0]?.askUser).toContain("2025/26");
  });

  it("refuses an unknown category with a message and a hint", async () => {
    const e = (await list(RECORDS, { category: "not_a_category" })) as ErrorEnv;
    expect(e.error.code).toBe("INVALID_ARGUMENT");
    expect(e.error.field).toBe("category");
    expect(e.error.message.length).toBeGreaterThan(0);
    expect(e.error.hint.length).toBeGreaterThan(0);
  });
});
