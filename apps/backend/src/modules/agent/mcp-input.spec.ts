import { McpInputResponse } from "@flump/api-contract";
import { type BuildContextPackInput, DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
import type { McpScope } from "@flump/mcp";
import { describe, expect, it } from "vitest";
import { toMcpInputToken, toMcpInputWire } from "./mcp-input";

const TOKEN_ID = "00000000-0000-4000-8000-000000000001";

/** Rows as the services return them: whole entities, decimals as strings, extra columns. */
const raw: BuildContextPackInput = {
  baseline: {
    ...DEFAULT_FINANCIAL_BASELINE,
    userId: "user_real",
    monthlyTakeHomeOverride: undefined,
  },
  netWorthBasis: { countProperty: true, countStudentLoan: false },
  accounts: [
    {
      id: "acc-1",
      userId: "user_real",
      name: "Monzo joint",
      type: "Current",
      balance: "1200.50",
      interestRate: "1.25",
      monthlyContribution: null,
      termMonths: null,
      fixedRateEndDate: null,
      currency: "GBP",
      isCurrent: true,
      bankConnectionId: "conn-secret",
      externalAccountId: "ext-secret",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ],
  accountDetails: [
    {
      id: 1,
      accountId: "acc-1",
      userId: "user_real",
      year: 2026,
      month: 5,
      value: "1100.00",
      source: "connected",
      importBatchId: "batch-secret",
    },
    // Mislabelled: this user's id on a row of an account that is not in the input.
    {
      id: 2,
      accountId: "acc-other",
      userId: "user_real",
      year: 2026,
      month: 5,
      value: 999,
      source: "manual",
    },
  ],
  budgetEntries: [
    {
      id: "b1",
      category: "Housing",
      name: "Rent to J Smith",
      amount: 900,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      notes: "private note",
    },
  ],
  taxRecords: [
    {
      id: "t1",
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "Flat 2",
      amount: "800.00",
      frequency: "monthly",
      date: "2026-04-06",
      endDate: null,
      notes: "tenant name",
    },
  ],
};

describe("toMcpInputWire", () => {
  it("matches the contract for an anonymised and a full-read token", () => {
    for (const anonymise of [true, false]) {
      const body = {
        token: { id: TOKEN_ID, scopes: ["mcp:read:anonymized"], anonymizeInstitutions: anonymise },
        input: JSON.parse(JSON.stringify(toMcpInputWire(raw, anonymise))),
      };
      const parsed = McpInputResponse.safeParse(body);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("sends only the named fields: no user id, connection id, batch id or foreign row", () => {
    const text = JSON.stringify(toMcpInputWire(raw, false));
    for (const hidden of ["conn-secret", "ext-secret", "batch-secret", "acc-other", "999"]) {
      expect(text, hidden).not.toContain(hidden);
    }
    const wire = toMcpInputWire(raw, false);
    expect(Object.keys(wire.accounts[0] ?? {}).sort()).toEqual([
      "balance",
      "currency",
      "fixedRateEndDate",
      "id",
      "interestRate",
      "isCurrent",
      "monthlyContribution",
      "name",
      "termMonths",
      "type",
    ]);
    expect(wire.accountDetails).toEqual([
      { accountId: "acc-1", year: 2026, month: 5, value: 1100, source: "connected" },
    ]);
  });

  it("turns decimals into numbers and keeps unknown rates null", () => {
    const wire = toMcpInputWire(raw, false);
    expect(wire.accounts[0]).toMatchObject({
      balance: 1200.5,
      interestRate: 1.25,
      monthlyContribution: null,
    });
    expect(wire.taxRecords[0]?.amount).toBe(800);
  });

  it("anonymised: no name, note or user id; the figures and ids stay", () => {
    const wire = toMcpInputWire(raw, true);
    const text = JSON.stringify(wire);
    for (const hidden of [
      "Monzo",
      "J Smith",
      "private note",
      "Flat 2",
      "tenant name",
      "user_real",
    ]) {
      expect(text, hidden).not.toContain(hidden);
    }
    expect(wire.baseline.userId).toBe("anonymous-user");
    expect(wire.accounts[0]).toMatchObject({
      id: "acc-1",
      name: "Current Account #1",
      balance: 1200.5,
    });
    expect(wire.budgetEntries[0]).toMatchObject({ id: "b1", name: "Housing 1", amount: 900 });
    expect(wire.budgetEntries[0]).not.toHaveProperty("notes");
    expect(wire.taxRecords[0]).toMatchObject({
      id: "t1",
      name: "Rental 1",
      notes: null,
      amount: 800,
    });
  });

  describe("ruling 7: no typed budget or tax name reaches an anonymised token", () => {
    const SENTINELS = [
      "Barclays Joint 4471",
      "Mum's loan",
      "Marc Gallagher ISA",
      "Jane's nursery fund",
      "Housing 7",
      "Custom category 9",
      "Flat 2 Example Road",
      "tenant Q Zebedee",
    ];
    const entry = (id: string, category: string, name: string, amount: number, notes?: string) => ({
      id,
      category,
      name,
      amount,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      notes: notes ?? null,
    });
    const record = (id: string, category: string, name: string, amount: number, notes: string) => ({
      id,
      type: "income" as const,
      source: "rental" as const,
      category,
      name,
      amount,
      frequency: "one-off" as const,
      date: "2026-05-01",
      endDate: null,
      notes,
    });
    const sentinelRaw: BuildContextPackInput = {
      ...raw,
      accounts: [{ ...raw.accounts?.[0], name: "Barclays Joint 4471" }],
      budgetEntries: [
        entry("b1", "bills", "Barclays Joint 4471", 120, "Mum's loan"),
        entry("b2", "bills", "Housing 7", 80),
        entry("b3", "bills", "Barclays Joint 4471", 30),
        entry("b4", "Marc Gallagher ISA", "Mum's loan", 200, "Jane's nursery fund"),
        entry("b5", "Custom category 9", "Jane's nursery fund", 150),
      ],
      taxRecords: [
        record("t1", "rental_income", "Flat 2 Example Road", 900, "tenant Q Zebedee"),
        record("t2", "Custom category 9", "Mum's loan", 120, "Marc Gallagher ISA"),
      ],
    };

    it("replaces every typed name with a neutral label and keeps every amount", () => {
      const wire = toMcpInputWire(sentinelRaw, true);
      const text = JSON.stringify(wire);
      for (const sentinel of SENTINELS) expect(text, sentinel).not.toContain(sentinel);
      expect(wire.budgetEntries.map((e) => [e.name, e.category, e.amount])).toEqual([
        ["Bills 1", "bills", 120],
        ["Bills 2", "bills", 80],
        ["Bills 1", "bills", 30],
        ["Entry 1", "Custom category 1", 200],
        ["Entry 2", "Custom category 2", 150],
      ]);
      expect(wire.taxRecords.map((t) => [t.name, t.category, t.amount, t.notes])).toEqual([
        ["Rental 1", "rental_income", 900, null],
        ["Rental 2", "Custom category 1", 120, null],
      ]);
      const parsed = McpInputResponse.safeParse({
        token: { id: TOKEN_ID, scopes: ["mcp:read:anonymized"], anonymizeInstitutions: true },
        input: JSON.parse(text),
      });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    });

    it("a full-read token still gets the real names", () => {
      const text = JSON.stringify(toMcpInputWire(sentinelRaw, false));
      for (const sentinel of SENTINELS) expect(text, sentinel).toContain(sentinel);
    });
  });

  it("anonymised: a legacy free-text account type becomes a fixed word, never the stored text", () => {
    const legacy: BuildContextPackInput = {
      ...raw,
      accounts: [
        { ...raw.accounts?.[0], id: "acc-1", type: "Jane's ISA 4471" },
        { ...raw.accounts?.[0], id: "acc-2", type: " credit card " },
      ],
    };
    const wire = toMcpInputWire(legacy, true);
    const text = JSON.stringify(wire);
    for (const hidden of ["Jane", "4471"]) expect(text, hidden).not.toContain(hidden);
    expect(wire.accounts.map((a) => [a.name, a.type])).toEqual([
      ["Other Account #1", "Other"],
      ["Credit Card Account #1", "Credit Card"],
    ]);
    // A full-read token gets the stored type as it is.
    expect(toMcpInputWire(legacy, false).accounts[0]?.type).toBe("Jane's ISA 4471");
  });

  it("a full-read token keeps names and notes", () => {
    const wire = toMcpInputWire(raw, false);
    expect(wire.accounts[0]?.name).toBe("Monzo joint");
    expect(wire.budgetEntries[0]?.notes).toBe("private note");
    expect(wire.baseline.userId).toBe("user_real");
  });
});

describe("toMcpInputWire: joint shares and the saved retirement plan", () => {
  const ENTRY_ID = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c12";
  const JOINT_ID = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c13";
  const plan = {
    retirementAge: 60,
    planToAge: 85,
    target: {
      kind: "budget" as const,
      lineSettings: [{ budgetEntryId: ENTRY_ID, status: "continues" as const }],
    },
    housingOverride: { kind: "rent-for-life" as const, monthlyRentGbp: 900 },
    statePensionAge: 67,
    statePensionAnnualForecastGbp: 11_973,
    statePensionQualifyingYears: 30,
    growthRates: { lower: 0.02, middle: 0.04, higher: 0.06 },
    inflationRate: 0.02,
    cashSavingsNominalRate: null,
    realRentGrowthRate: 0,
    excludedAccountIds: [JOINT_ID],
  };
  const saved: BuildContextPackInput = {
    ...raw,
    accounts: [
      ...(raw.accounts ?? []),
      {
        id: JOINT_ID,
        name: "Joint ISA",
        type: "ISA",
        balance: "10000.00",
        ownership: "joint",
        sharePercent: "50.00",
        currency: "GBP",
        isCurrent: true,
      },
    ],
    retirementPlan: plan,
    birthYear: 1980,
  };
  const parse = (input: unknown) =>
    McpInputResponse.safeParse({
      token: { id: TOKEN_ID, scopes: ["mcp:read:anonymized"], anonymizeInstitutions: true },
      input: JSON.parse(JSON.stringify(input)),
    });

  it("sends a joint account's ownership and share, and the saved plan and birth year", () => {
    for (const anonymise of [true, false]) {
      const wire = toMcpInputWire(saved, anonymise);
      expect(wire.accounts[1]).toMatchObject({
        id: JOINT_ID,
        balance: 10_000,
        ownership: "joint",
        sharePercent: 50,
      });
      expect(wire.retirementPlan).toEqual(plan);
      expect(wire.birthYear).toBe(1980);
      const parsed = parse(wire);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("leaves them out, or sends a null plan, when nothing is saved", () => {
    const wire = toMcpInputWire({ ...raw, retirementPlan: null, birthYear: null }, false);
    expect(wire.accounts[0]).not.toHaveProperty("ownership");
    expect(wire.accounts[0]).not.toHaveProperty("sharePercent");
    expect(wire.retirementPlan).toBeNull();
    expect(wire).not.toHaveProperty("birthYear");
    const bare = toMcpInputWire(raw, false);
    expect(bare).not.toHaveProperty("retirementPlan");
    expect(bare).not.toHaveProperty("birthYear");
    for (const input of [wire, bare]) {
      const parsed = parse(input);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("a sole account with no share sends ownership and a null share", () => {
    const wire = toMcpInputWire(
      { ...raw, accounts: [{ ...raw.accounts?.[0], ownership: "sole", sharePercent: null }] },
      true,
    );
    expect(wire.accounts[0]).toMatchObject({ ownership: "sole", sharePercent: null });
  });
});

describe("toMcpInputToken", () => {
  it("describes the token and never names its owner", () => {
    const token = toMcpInputToken({
      userId: "user_real",
      tokenId: TOKEN_ID,
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "pat",
    });
    expect(token).toEqual({
      id: TOKEN_ID,
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
    });
    expect(JSON.stringify(token)).not.toContain("user_real");
  });

  it("reports a legacy row (flag off, no full-read scope) as anonymised", () => {
    const token = (scopes: McpScope[]) =>
      toMcpInputToken({
        userId: "user_real",
        tokenId: TOKEN_ID,
        scopes,
        anonymizeInstitutions: false,
        type: "pat",
      });
    expect(token(["mcp:read:anonymized"]).anonymizeInstitutions).toBe(true);
    expect(token(["mcp:read:full"]).anonymizeInstitutions).toBe(false);
  });
});

describe("toMcpInputWire with stored values outside today's lists", () => {
  it("still matches the contract: a bad figure is left out and an old tax row is read as the tools read it", () => {
    const odd = {
      ...raw,
      baseline: {
        ...raw.baseline,
        age: Number.NaN,
        monthlyHousingCost: Number.NaN,
        annualGrossSalary: Number.NaN,
      },
      taxRecords: [
        { ...raw.taxRecords?.[0], type: "refund", frequency: "weekly" },
      ] as unknown as BuildContextPackInput["taxRecords"],
    };
    const wire = JSON.parse(JSON.stringify(toMcpInputWire(odd, true)));
    const parsed = McpInputResponse.shape.input.safeParse(wire);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(wire.baseline).not.toHaveProperty("age");
    expect(wire.baseline).not.toHaveProperty("monthlyHousingCost");
    expect(wire.baseline.annualGrossSalary).toBe(0);
    expect(wire.taxRecords[0]).toMatchObject({ type: "expense", frequency: "one-off" });
  });
});
