import type { BuildContextPackInput, ProfileFacts, TaxRecord } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

// Tool plumbing only: field names, missing-data entries, notes and provenance. No assertion here
// is a UK tax figure (E41 decision 8 keeps those behind the owner's tax vector sign-off).

type Env = {
  result: {
    estimate: unknown;
    incomeTaxBands: { bands: Array<{ name: string; ratePct: number }> };
    notes: string[];
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  assumptions: Array<{ field: string; source: string; reason?: string }>;
  provenance: Record<string, string>;
};

const facts = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  annualSalary: null,
  employmentType: null,
  taxRegion: null,
  studentLoanPlans: null,
  pensionPercent: null,
  isSalarySacrifice: null,
  ...over,
});

const rent = (r: Partial<TaxRecord> = {}): TaxRecord =>
  ({
    id: "rent1",
    userId: "u",
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Flat rent",
    amount: 500,
    frequency: "monthly",
    date: "2025-04-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    ...r,
  }) as TaxRecord;

async function position(profileFacts: ProfileFacts, taxRecords: TaxRecord[] = []) {
  const data: BuildContextPackInput = {
    ...emptyUser,
    profileFacts,
    taxRecords: taxRecords as never,
  };
  const h = await connectTestClient(data);
  try {
    return (await h.callJson("get_tax_year_position", { taxYear: "2025/26" })) as Env;
  } finally {
    await h.close();
  }
}

const expectAsked = (e: Env) => {
  for (const m of e.missing) {
    expect(m.why.length, m.field).toBeGreaterThan(0);
    expect(m.askUser.length, m.field).toBeGreaterThan(0);
  }
};

describe("get_tax_year_position missing data", () => {
  it("with no salary and no records asks for the salary, then about Child Benefit", async () => {
    const e = await position(facts());
    expect(e.missing.map((m) => m.field)).toEqual(["annualSalary", "childBenefit"]);
    expect(e.result.estimate).toBeNull();
    expectAsked(e);
  });

  it("with records but no saved salary asks for the salary and gives no estimate", async () => {
    const e = await position(facts({ employmentType: "employed" }), [rent()]);
    expect(e.missing.map((m) => m.field)).toEqual(["annualSalary", "childBenefit"]);
    expect(e.result.estimate).toBeNull();
    expectAsked(e);
  });

  it("asks a self-employed person for trading records when none are kept", async () => {
    const e = await position(facts({ employmentType: "self-employed", annualSalary: 30000 }), [
      rent(),
    ]);
    expect(e.missing.map((m) => m.field)).toEqual(["selfEmploymentRecords", "childBenefit"]);
    expect(e.result.estimate).toBeNull();
    expectAsked(e);
  });

  it("asks about income outside PAYE when only a salary is saved", async () => {
    const e = await position(facts({ employmentType: "employed", annualSalary: 40000 }));
    expect(e.missing.map((m) => m.field)).toEqual(["untaxedIncomeRecords", "childBenefit"]);
    expect(e.result.estimate).toBeNull();
    expectAsked(e);
  });

  it("asks for a salary beside an estimate when the salary does not decide it", async () => {
    // Retired: the salary is not needed for the estimate, so it is worked out from the rent.
    const e = await position(facts({ employmentType: "retired" }), [rent()]);
    expect(e.result.estimate).not.toBeNull();
    expect(e.missing.map((m) => m.field)).toEqual(["annualSalary", "childBenefit"]);
    expectAsked(e);
  });

  it("asks only about Child Benefit when every fact the estimate needs is saved", async () => {
    const e = await position(facts({ employmentType: "employed", annualSalary: 40000 }), [rent()]);
    expect(e.result.estimate).not.toBeNull();
    expect(e.missing.map((m) => m.field)).toEqual(["childBenefit"]);
    expectAsked(e);
  });
});

describe("get_tax_year_position notes, provenance and bands", () => {
  it("explains an assumed region and names where the figures come from", async () => {
    const e = await position(facts({ employmentType: "employed", annualSalary: 40000 }), [rent()]);
    const region = e.assumptions.find((a) => a.field === "region");
    expect(region?.source).toBe("default");
    expect(region?.reason?.length).toBeGreaterThan(0);
    expect(e.provenance).toMatchObject({
      income: "profile_and_tax_records",
      estimate: "tax_page_calculation",
    });
  });

  it("outside Scotland has the two general notes and nothing about Scottish rates", async () => {
    const e = await position(facts({ employmentType: "employed", annualSalary: 40000 }), [rent()]);
    expect(e.result.notes).toHaveLength(2);
    for (const n of e.result.notes) expect(n.length).toBeGreaterThan(0);
    expect(e.result.notes.join(" ")).not.toMatch(/Scottish/);
  });

  it("lists the bands from the lowest rate up", async () => {
    const e = await position(facts({ employmentType: "employed", annualSalary: 40000 }), [rent()]);
    const rates = e.result.incomeTaxBands.bands.map((b) => b.ratePct);
    expect(rates.length).toBeGreaterThan(1);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
  });
});

describe("get_tax_year_position verification for a provisional year (ruling B)", () => {
  it("gives 2027/28 as unverified: rates announced but not yet law, checked against them", async () => {
    const h = await connectTestClient({ ...emptyUser, profileFacts: facts() });
    try {
      const e = (await h.callJson("get_tax_year_position", { taxYear: "2027/28" })) as {
        verification: { status: string; detail: string };
      };
      expect(e.verification).toEqual({
        status: "unverified",
        detail:
          "2027/28 figures use rates that are announced but not yet law. They have been checked against the announced rates. Treat them as an estimate.",
      });
    } finally {
      await h.close();
    }
  });
});
