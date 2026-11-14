import { describe, expect, it } from "vitest";
import { buildFlumpAiContextPack, formatAiContextPackMarkdown } from "./ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { DEFAULT_FINANCIAL_BASELINE } from "./profile.js";

describe("FlumpAiContextPack Builder & Markdown Formatter", () => {
  it("generates an anonymized context pack stripping PII and provider names", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: {
          ...DEFAULT_FINANCIAL_BASELINE,
          userId: "usr_secret_12345",
          annualGrossSalary: 110000,
        },
        accounts: [
          {
            id: "acc_1",
            name: "Monzo Current Account",
            type: "Current",
            balance: 3200,
          },
          {
            id: "acc_2",
            name: "Barclays High Interest Savings",
            type: "Saving",
            balance: 14500,
            interestRate: 4.8,
          },
          {
            id: "acc_3",
            name: "Amex Platinum Credit Card",
            type: "Credit Card",
            balance: 2100,
            interestRate: 24.9,
          },
        ],
        budgetEntries: [
          {
            id: "b_1",
            category: "housing",
            name: "Rent via Starling",
            amount: 1100,
            frequency: "monthly",
            isIncome: false,
            isEssential: true,
          },
        ],
      },
      { anonymizeInstitutions: true },
    );

    // Verify PII is scrubbed
    expect(pack.metadata.isAnonymized).toBe(true);
    expect(pack.baseline.userId).toBe("anonymous-user");

    // Verify bank names are anonymized
    const accountNames = pack.portfolio.accounts.map((a) => a.name);
    for (const name of accountNames) {
      expect(name).not.toContain("Monzo");
      expect(name).not.toContain("Barclays");
      expect(name).not.toContain("Amex");
    }

    // Check £100k tax trap calculation
    expect(pack.taxSummary.ukTaxCalculation.taxTrap.isInTaxTrap).toBe(true);

    // Verify markdown serialization
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain("# Flump context pack");
    expect(md).toContain("**Net worth:**");
    expect(md).not.toContain("usr_secret_12345");
  });

  it("handles empty accounts and defaults gracefully", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: DEFAULT_FINANCIAL_BASELINE,
    });

    expect(pack.portfolio.netWorth).toBe(0);
    expect(pack.budgetSummary.entries).toEqual([]);
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toBeDefined();
  });

  it("renders neutral observations, with no action headings or optimised fallback", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: DEFAULT_FINANCIAL_BASELINE,
    });
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain("**Observations:**");
    expect(md).not.toContain("Top Financial Actions");
    expect(md).not.toContain("Baseline fully optimized");
    expect(md).not.toMatch(/Recommendation:/i);
  });
});

describe("budget notes anonymisation (E17-N4)", () => {
  const entry = {
    id: "b_n",
    category: "housing",
    name: "Rent via Starling",
    amount: 1100,
    frequency: "monthly",
    isIncome: false,
    isEssential: true,
    notes: "Landlord is J Smith, 12 High St",
  };

  it("drops notes when anonymised", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: DEFAULT_FINANCIAL_BASELINE,
        budgetEntries: [entry],
      },
      { anonymizeInstitutions: true },
    );
    expect(JSON.stringify(pack)).not.toContain("Landlord");
    // M-PRIV4 (BE-06): the free-text name becomes category plus ordinal.
    expect(pack.budgetSummary.entries[0]?.name).toBe("housing #1");
    expect(JSON.stringify(pack)).not.toContain("Rent via");
  });

  it("keeps notes when not anonymised", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: DEFAULT_FINANCIAL_BASELINE,
        budgetEntries: [entry],
      },
      { anonymizeInstitutions: false },
    );
    expect(pack.budgetSummary.entries[0]?.notes).toBe(entry.notes);
  });

  it("replaces income names with a generic label when anonymised", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: DEFAULT_FINANCIAL_BASELINE,
        budgetEntries: [{ ...entry, id: "i1", name: "Salary - Acme Ltd", isIncome: true }],
      },
      { anonymizeInstitutions: true },
    );
    expect(JSON.stringify(pack)).not.toContain("Acme");
    expect(pack.budgetSummary.entries[0]?.name).toBe("Income #1");
  });

  it("omits the notes key entirely when notes are absent", () => {
    const { notes: _notes, ...noNotes } = entry;
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: DEFAULT_FINANCIAL_BASELINE,
        budgetEntries: [noNotes],
      },
      { anonymizeInstitutions: false },
    );
    expect("notes" in (pack.budgetSummary.entries[0] ?? {})).toBe(false);
  });
});

describe("overdrawn accounts in the markdown (E23 C-15)", () => {
  it("formats a negative cash balance as -£120 and labels it overdrawn", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u", annualGrossSalary: 40000 },
        accounts: [{ id: "c1", name: "Everyday", type: "Current", balance: -120 }],
        budgetEntries: [],
      },
      { anonymizeInstitutions: true },
    );
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain("-£120 (overdrawn)");
    expect(md).not.toContain("£-120");
  });
});

describe("buildFlumpAiContextPack budget summary comes from the financial picture (E23)", () => {
  const baseline = { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 60000, userId: "u" };

  it("is null, never a 0.72 or £900/£1,100 guess, with no budget rows", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline,
      budgetEntries: [],
    });
    expect(pack.budgetSummary.monthlyIncome).toBeNull();
    expect(pack.budgetSummary.essentialBillsMonthly).toBeNull();
    expect(pack.budgetSummary.safeToSpend).toBeNull();
    expect(pack.budgetSummary.emergencyRunwayMonths).toBeNull();
    expect(formatAiContextPackMarkdown(pack)).toContain("**Months of cover:** Not set");
    expect(pack.observations).toEqual([]);
  });

  it("uses saved profile facts for safe to spend, and budget rows for totals", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline,
      profileFacts: {
        annualSalary: 38000,
        employmentType: "employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 5,
        isSalarySacrifice: false,
      },
      accounts: [{ id: "s", name: "Saver", type: "Saving", balance: 3000 }],
      budgetEntries: [
        {
          id: "i",
          category: "income",
          name: "Pay",
          amount: 2400,
          frequency: "monthly",
          isIncome: true,
          isEssential: false,
        },
        {
          id: "r",
          category: "housing",
          name: "Rent",
          amount: 1000,
          frequency: "monthly",
          isIncome: false,
          isEssential: true,
        },
      ],
    });
    expect(pack.budgetSummary.monthlyIncome).toBe(2400);
    expect(pack.budgetSummary.essentialBillsMonthly).toBe(1000);
    expect(pack.budgetSummary.emergencyRunwayMonths).toBe(3);
    expect(pack.budgetSummary.safeToSpend?.weeklyAllowance).toBeGreaterThan(0);
    expect(pack.observations).toEqual([
      "Cash covers 3.0 months of essential spending.",
      "£1,400 a month is left over after the spending and saving in the budget.",
    ]);
  });
});

describe("the pack carries figures only (copy audit ruling 2, 2026-11-14)", () => {
  const debtPack = () =>
    buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u", annualGrossSalary: 110000 },
      accounts: [
        { id: "c", name: "Card", type: "Credit Card", balance: 6000, interestRate: 24.9 },
        { id: "s", name: "Saver", type: "Saving", balance: 400 },
      ],
      budgetEntries: [
        {
          id: "i",
          category: "income",
          name: "Pay",
          amount: 1500,
          frequency: "monthly",
          isIncome: true,
          isEssential: false,
        },
        {
          id: "r",
          category: "housing",
          name: "Rent",
          amount: 1800,
          frequency: "monthly",
          isIncome: false,
          isEssential: true,
        },
      ],
    });

  const allKeys = (value: unknown, out: string[] = []): string[] => {
    if (Array.isArray(value)) for (const v of value) allKeys(v, out);
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        out.push(k);
        allKeys(v, out);
      }
    }
    return out;
  };

  it.each([
    [
      "an empty pack",
      () =>
        buildFlumpAiContextPack({
          netWorthBasis: DEFAULT_NET_WORTH_BASIS,
          baseline: DEFAULT_FINANCIAL_BASELINE,
        }),
    ],
    ["a pack with debt, a short budget and income in the £100,000 band", debtPack],
  ])("has no score, grade or stage key or word in the JSON or Markdown: %s", (_label, build) => {
    const pack = build();
    const md = formatAiContextPackMarkdown(pack);
    for (const key of allKeys(pack)) {
      expect(key).not.toMatch(/score|grade|stage|priorit|heroMetric/i);
    }
    for (const text of [md, JSON.stringify(pack)]) {
      expect(text).not.toMatch(/\bscore\b|\bgrade\b|\bstage\b|stage_\d/i);
      expect(text).not.toMatch(/CRITICAL|NEEDS_ATTENTION|EXCELLENT|Stage 1|priority/i);
    }
  });

  it("states figures as neutral observations in a fixed order", () => {
    const pack = debtPack();
    expect(pack.observations[0]).toBe(
      "Debts total £6,000, not counting mortgages and student loans.",
    );
    expect(pack.observations).toContain(
      "Spending and saving in the budget are £300 a month more than income.",
    );
  });
});

describe("net worth choices in the pack", () => {
  const accounts = [
    { id: "home", name: "Home", type: "Property", balance: 300000 },
    { id: "mort", name: "Mortgage", type: "Mortgage", balance: 186000 },
    { id: "sl", name: "Student loan", type: "Student Loan", balance: 25000 },
    { id: "sav", name: "Savings", type: "Saving", balance: 20000 },
  ];

  it.each([
    [true, false, 134000, ["studentLoan"], "student loan"],
    [true, true, 109000, [], null],
    [
      false,
      false,
      20000,
      ["property", "mortgage", "studentLoan"],
      "property, mortgage or student loan",
    ],
    [false, true, -5000, ["property", "mortgage"], "property or mortgage"],
  ] as const)(
    "property %s, student loan %s",
    (countProperty, countStudentLoan, nw, leftOut, line) => {
      const pack = buildFlumpAiContextPack({
        netWorthBasis: { countProperty, countStudentLoan },
        baseline: DEFAULT_FINANCIAL_BASELINE,
        accounts,
      });
      expect(pack.portfolio.netWorth).toBe(nw);
      expect(pack.portfolio.netWorthLeavesOut).toEqual(leftOut);
      expect(pack.portfolio.netWorthBasis).toEqual({ countProperty, countStudentLoan });
      const md = formatAiContextPackMarkdown(pack);
      if (line === null) expect(md).not.toContain("Not counted in net worth");
      else expect(md).toContain(`Not counted in net worth (the user's settings):** ${line}`);
    },
  );

  it("says when a mortgage counts with no home value saved", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: DEFAULT_FINANCIAL_BASELINE,
      accounts: [{ id: "mort", name: "Mortgage", type: "Mortgage", balance: 100000 }],
    });
    expect(pack.portfolio.netWorthLeavesOut).toEqual(["homeValueMissing"]);
    expect(formatAiContextPackMarkdown(pack)).toContain(
      "not saved, so the mortgage counts without it",
    );
  });
});
