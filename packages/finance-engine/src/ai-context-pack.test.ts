import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_USER_ID,
  anonymiseContextPackInput,
  buildFlumpAiContextPack,
  formatAiContextPackMarkdown,
} from "./ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { DEFAULT_FINANCIAL_BASELINE, userProfileToSavedBaseline } from "./profile.js";

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
    // M-PRIV4 (BE-06) and ruling 7: the free-text name becomes a neutral label by group.
    expect(pack.budgetSummary.entries[0]?.name).toBe("Housing 1");
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
    expect(pack.budgetSummary.entries[0]?.name).toBe("Income 1");
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
    expect(formatAiContextPackMarkdown(pack)).toContain("**Breathing room:** Not set");
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
      else expect(md).toContain(`Not counted in net worth (the user's choice):** ${line}`);
    },
  );

  it.each([
    [true, false, true, false],
    [true, true, true, true],
    [false, false, false, false],
    [false, true, false, true],
  ] as const)(
    "the breakdown agrees with the totals: property %s, student loan %s",
    (countProperty, countStudentLoan, showsProperty, showsStudentLoan) => {
      const pack = buildFlumpAiContextPack(
        {
          netWorthBasis: { countProperty, countStudentLoan },
          baseline: DEFAULT_FINANCIAL_BASELINE,
          accounts: [
            { id: "home", name: "Home (your estimate)", type: "Property", balance: 300000 },
            ...accounts.filter((a) => a.id !== "home"),
          ],
        },
        // Named accounts, so the home estimate is found by its label.
        { anonymizeInstitutions: false },
      );
      const md = formatAiContextPackMarkdown(pack);
      const own = md.split("\n").find((l) => l.startsWith("- **What you own:**")) ?? "";
      const owe = md.split("\n").find((l) => l.startsWith("- **What you owe:**")) ?? "";
      expect(own.includes("Home (your estimate): £300,000")).toBe(showsProperty);
      expect(owe.includes("mortgages: £186,000")).toBe(showsProperty);
      expect(owe.includes("student loans: £25,000")).toBe(showsStudentLoan);
      // The parts shown add up to the total owed.
      const total = (countProperty ? 186000 : 0) + (countStudentLoan ? 25000 : 0);
      expect(owe).toContain(`What you owe:** £${total.toLocaleString("en-GB")} `);
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

describe("anonymiseContextPackInput (the raw input an anonymised token may read)", () => {
  const input = {
    baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "user_real_id" },
    netWorthBasis: { ...DEFAULT_NET_WORTH_BASIS },
    accounts: [
      { id: "a1", name: "Monzo joint 12-34-56", type: "Current", balance: 1200 },
      { id: "a2", name: "Barclays ISA", type: "Saving", balance: 5000 },
      { id: "a3", name: "Second current", type: "Current", balance: 10 },
    ],
    accountDetails: [{ accountId: "a1", year: 2026, month: 5, value: 1100 }],
    budgetEntries: [
      {
        id: "b1",
        category: "Housing",
        name: "Rent to J Smith",
        amount: 900,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
        notes: "pays into 12345678",
      },
      {
        id: "b2",
        category: "Salary",
        name: "Acme Ltd",
        amount: 3000,
        frequency: "monthly",
        isIncome: true,
        isEssential: false,
      },
    ],
    taxRecords: [
      {
        id: "t1",
        type: "income" as const,
        source: "rental" as const,
        category: "rent",
        name: "Flat 2, Example Road",
        amount: 800,
        frequency: "monthly" as const,
        date: "2026-04-06",
        endDate: null,
        notes: "tenant J Smith",
      },
    ],
  };

  it("removes names, notes and the user id, and keeps every figure, id and date", () => {
    const out = anonymiseContextPackInput(input);
    expect(out.baseline.userId).toBe(ANONYMOUS_USER_ID);
    expect(out.accounts?.map((a) => a.name)).toEqual([
      "Current Account #1",
      "Saving Account #1",
      "Current Account #2",
    ]);
    expect(out.accounts?.map((a) => [a.id, a.type, a.balance])).toEqual(
      input.accounts.map((a) => [a.id, a.type, a.balance]),
    );
    expect(out.accountDetails).toEqual(input.accountDetails);
    expect(out.budgetEntries?.map((b) => b.name)).toEqual(["Housing 1", "Income 1"]);
    // "Housing" is built in, so it stays; "Salary" was typed by the user.
    expect(out.budgetEntries?.map((b) => b.category)).toEqual(["Housing", "Custom category 1"]);
    expect(out.budgetEntries?.every((b) => !("notes" in b))).toBe(true);
    expect(out.budgetEntries?.map((b) => b.amount)).toEqual([900, 3000]);
    expect(out.taxRecords).toEqual([
      { ...input.taxRecords[0], category: "Custom category 1", name: "Rental 1", notes: null },
    ]);
    const text = JSON.stringify(out);
    for (const secret of ["Monzo", "Barclays", "J Smith", "Acme", "Example Road", "12345678"]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(text).not.toContain("user_real_id");
  });

  it("changes nothing more when applied twice, and leaves its argument alone", () => {
    const before = JSON.stringify(input);
    const once = anonymiseContextPackInput(input);
    expect(anonymiseContextPackInput(once)).toEqual(once);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("gives the same anonymised pack as the raw input does", () => {
    const fromRaw = buildFlumpAiContextPack(input, { anonymizeInstitutions: true });
    const fromScrubbed = buildFlumpAiContextPack(anonymiseContextPackInput(input), {
      anonymizeInstitutions: true,
    });
    expect({ ...fromScrubbed, metadata: null }).toEqual({ ...fromRaw, metadata: null });
  });
});

describe("a legacy free-text account type never survives anonymisation", () => {
  const input = {
    baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "user_real_id" },
    netWorthBasis: { ...DEFAULT_NET_WORTH_BASIS },
    accounts: [
      { id: "a1", name: "Joint", type: "Jane's ISA 4471", balance: 700 },
      { id: "a2", name: "Card", type: " credit card ", balance: 300 },
      { id: "a3", name: "Pot", type: "Saving", balance: 1000 },
    ],
  };

  it("the pack carries only fixed type words in names, type and rawType", () => {
    const pack = buildFlumpAiContextPack(input, { anonymizeInstitutions: true });
    const text = JSON.stringify(pack) + formatAiContextPackMarkdown(pack);
    for (const secret of ["Jane", "4471"]) expect(text, secret).not.toContain(secret);
    expect(pack.portfolio.accounts.map((a) => [a.name, a.rawType])).toEqual([
      ["Other Account #1", "Other"],
      ["Credit Card Account #1", "Credit Card"],
      ["Saving Account #1", "Saving"],
    ]);
  });

  it("the anonymised raw input maps the type too, and every total is unchanged", () => {
    const out = anonymiseContextPackInput(input);
    expect(out.accounts?.map((a) => [a.name, a.type])).toEqual([
      ["Other Account #1", "Other"],
      ["Credit Card Account #1", "Credit Card"],
      ["Saving Account #1", "Saving"],
    ]);
    expect(JSON.stringify(out)).not.toContain("Jane");
    const full = buildFlumpAiContextPack(input, { anonymizeInstitutions: false });
    const anon = buildFlumpAiContextPack(out, { anonymizeInstitutions: true });
    const { accounts: _a, ...anonTotals } = anon.portfolio;
    const { accounts: _f, ...fullTotals } = full.portfolio;
    expect(anonTotals).toEqual(fullTotals);
    expect(anon.debtSummary.totalStartingDebtGbp).toBe(full.debtSummary.totalStartingDebtGbp);
    expect(anon.debtSummary.consumerDebts.map((d) => d.type)).toEqual(
      full.debtSummary.consumerDebts.map((d) => d.type),
    );
  });

  it("a full read keeps the stored type", () => {
    const pack = buildFlumpAiContextPack(input, { anonymizeInstitutions: false });
    expect(pack.portfolio.accounts[0]?.rawType).toBe("Jane's ISA 4471");
  });
});

describe("ruling 7: no user-typed budget or tax name survives anonymisation", () => {
  // Sentinels: names that look like account names, and names that collide with fixed labels.
  const SENTINELS = [
    "Barclays Joint 4471",
    "Mum's loan",
    "Marc Gallagher ISA",
    "Jane's nursery fund",
    "Housing 7",
    "Custom category 9",
    "Flat 2 Example Road",
    "tenant Q Zebedee",
    "Receipt from Zebedee Ltd",
    "Self-employed 4",
  ];
  const input = {
    baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "user_real_id", annualGrossSalary: 40000 },
    netWorthBasis: { ...DEFAULT_NET_WORTH_BASIS },
    accounts: [{ id: "a1", name: "Current", type: "Current", balance: 2500 }],
    budgetEntries: [
      ["bills", "Barclays Joint 4471", 120, false, true, "Mum's loan"],
      ["bills", "Housing 7", 80, false, true, null],
      ["bills", "Barclays Joint 4471", 30, false, true, null],
      ["Marc Gallagher ISA", "Mum's loan", 200, false, false, "Jane's nursery fund"],
      ["Custom category 9", "Jane's nursery fund", 150, false, true, null],
      ["savings", "Marc Gallagher ISA", 300, false, false, null],
      ["debt", "Mum's loan", 100, false, true, null],
      ["income", "Marc Gallagher ISA", 3200, true, false, null],
    ].map(([category, name, amount, isIncome, isEssential, notes], i) => ({
      id: `b${i}`,
      category: category as string,
      name: name as string,
      amount: amount as number,
      frequency: "monthly",
      isIncome: isIncome as boolean,
      isEssential: isEssential as boolean,
      notes: notes as string | null,
    })),
    taxRecords: [
      ["rental", "rental_income", "Flat 2 Example Road", 900, "tenant Q Zebedee"],
      ["rental", "Custom category 9", "Barclays Joint 4471", 120, "Receipt from Zebedee Ltd"],
      ["self-employed", "self_employed_income", "Self-employed 4", 5000, null],
      ["rental", "repairs_maintenance", "Flat 2 Example Road", 300, null],
    ].map(([source, category, name, amount, notes], i) => ({
      id: `t${i}`,
      type: (category === "repairs_maintenance" ? "expense" : "income") as "income" | "expense",
      source: source as "rental" | "self-employed",
      category: category as string,
      name: name as string,
      amount: amount as number,
      frequency: "one-off" as const,
      date: "2026-05-01",
      endDate: null,
      notes: notes as string | null,
    })),
  };

  it("labels every entry by its fixed group and keeps every amount", () => {
    const out = anonymiseContextPackInput(input);
    expect(out.budgetEntries?.map((b) => b.name)).toEqual([
      "Bills 1",
      "Bills 2",
      "Bills 1",
      "Entry 1",
      "Entry 2",
      "Savings 1",
      "Debt 1",
      "Income 1",
    ]);
    expect(out.budgetEntries?.map((b) => b.category)).toEqual([
      "bills",
      "bills",
      "bills",
      "Custom category 1",
      "Custom category 2",
      "savings",
      "debt",
      "income",
    ]);
    expect(out.budgetEntries?.map((b) => b.amount)).toEqual(
      input.budgetEntries.map((b) => b.amount),
    );
    expect(out.taxRecords?.map((t) => [t.name, t.category, t.amount])).toEqual([
      ["Rental 1", "rental_income", 900],
      ["Rental 2", "Custom category 1", 120],
      ["Self-employed 1", "self_employed_income", 5000],
      ["Rental 1", "repairs_maintenance", 300],
    ]);
  });

  it("leaves none of the sentinels in the pack, its Markdown or the anonymised input", () => {
    const pack = buildFlumpAiContextPack(input, { anonymizeInstitutions: true });
    const outputs = {
      pack: JSON.stringify(pack),
      markdown: formatAiContextPackMarkdown(pack),
      input: JSON.stringify(anonymiseContextPackInput(input)),
    };
    for (const [where, text] of Object.entries(outputs)) {
      for (const sentinel of SENTINELS)
        expect(text, `${where}: ${sentinel}`).not.toContain(sentinel);
      expect(text).not.toContain("user_real_id");
    }
  });

  it("keeps every budget and tax total the same as the named pack", () => {
    const named = buildFlumpAiContextPack(input, { anonymizeInstitutions: false });
    const anonymous = buildFlumpAiContextPack(input, { anonymizeInstitutions: true });
    expect(anonymous.budgetSummary).toEqual({
      ...named.budgetSummary,
      entries: anonymous.budgetSummary.entries,
    });
    expect(anonymous.budgetSummary.entries.map((e) => e.amount)).toEqual(
      named.budgetSummary.entries.map((e) => e.amount),
    );
    expect(anonymous.taxSummary).toEqual(named.taxSummary);
  });

  it("shows the real names to a token that is not anonymised", () => {
    const text = JSON.stringify(buildFlumpAiContextPack(input, { anonymizeInstitutions: false }));
    for (const sentinel of ["Barclays Joint 4471", "Mum's loan", "Marc Gallagher ISA"]) {
      expect(text).toContain(sentinel);
    }
  });
});

describe("audit slice 2: the pack states saved facts and today's tax year", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the tax year that applies today, even from an old baseline (AI-3, SA-8)", () => {
    // 19 November 2026 is in the tax year 6 April 2026 to 5 April 2027: 2026/27.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, taxYear: "2025/26", annualGrossSalary: 40000 },
    });
    expect(pack.taxSummary.currentTaxYear).toBe("2026/27");
    expect(formatAiContextPackMarkdown(pack)).toContain("## 5. Tax, 2026/27");
  });

  it("uses no extra payment for the debt-free date, as the Debt page (AI-5)", () => {
    // One 0% loan of 1,200 with a 100 minimum: 1,200 / 100 = 12 months and no interest.
    // With the old hidden 50 extra it was 1,200 / 150 = 8 months.
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({ annualSalary: 30000 }),
      accounts: [
        {
          id: "l1",
          name: "Loan",
          type: "Loan",
          balance: 1200,
          interestRate: 0,
          monthlyContribution: 100,
        },
      ],
    });
    expect(pack.debtSummary.avalancheVsSnowballComparison.avalanche.months).toBe(12);
    expect(pack.debtSummary.avalancheVsSnowballComparison.snowball.months).toBe(12);
    expect(pack.debtSummary.avalancheVsSnowballComparison.avalanche.totalInterest).toBe(0);
  });

  it("prints no salary or salary-based tax figures when no salary is saved (AI-1)", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({ studentLoanPlans: ["PLAN_2"] }),
    });
    expect(pack.baseline.annualGrossSalary).toBeUndefined();
    expect(pack.baseline.age).toBeUndefined();
    expect(pack.baseline.totalCashSavings).toBeUndefined();
    expect(pack.debtSummary.studentLoanEvaluation).toBeUndefined();
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain("- **Salary before tax:** Not set");
    expect(md).not.toContain("45,000");
    expect(md).not.toContain("Adjusted net income");
    expect(md).not.toContain("Personal Savings Allowance");
  });

  it("leaves unsaved salary and pension rates out of the JSON, never 0 (AI-1)", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({
        annualSalary: null,
        pensionPercent: null,
        pensionEmployerPercent: null,
      }),
    });
    expect(pack.baseline).not.toHaveProperty("annualGrossSalary");
    expect(pack.baseline).not.toHaveProperty("pensionContributionPct");
    expect(pack.baseline).not.toHaveProperty("employerPensionMatchPct");
    expect(pack.baseline).not.toHaveProperty("notSet");
    // No tax worked out from a salary nobody saved: only the list of what is missing.
    expect(pack.taxSummary.ukTaxCalculation).toEqual({ notSet: ["annualSalary"] });
    const json = JSON.stringify(pack);
    expect(json).not.toContain("adjustedNetIncomeGbp");
    expect(json).not.toContain("isaAllowanceRemainingGbp");
  });

  it("keeps a saved 0% pension rate: saved zero is a fact (AI-1)", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({
        annualSalary: 30000,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
      }),
    });
    expect(pack.baseline.annualGrossSalary).toBe(30000);
    expect(pack.baseline.pensionContributionPct).toBe(0);
    expect(pack.baseline.employerPensionMatchPct).toBe(0);
    expect(pack.taxSummary.ukTaxCalculation).toHaveProperty("adjustedNetIncomeGbp");
  });

  it("leaves the student loan check out without a saved balance, never a guessed 15,000", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({ annualSalary: 40000, studentLoanPlans: ["PLAN_2"] }),
    });
    expect(pack.debtSummary.studentLoanEvaluation).toBeUndefined();
    expect(JSON.stringify(pack)).not.toContain("15,000");
  });

  it("checks the student loan against the saved balance", () => {
    // One saved student loan account of 20,000: the check states that balance, not 15,000.
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({ annualSalary: 40000, studentLoanPlans: ["PLAN_2"] }),
      accounts: [{ id: "sl1", name: "Student loan", type: "Student Loan", balance: 20000 }],
    });
    expect(pack.debtSummary.studentLoanEvaluation?.reasoning).toContain("£20,000 balance");
    expect(pack.debtSummary.studentLoanEvaluation?.reasoning).not.toContain("15,000");
  });

  it("does not pass a self-employed person's salary as PAYE pay in the ledger (SA-1)", () => {
    // 2026/27: trading income 40,000 less the 1,000 trading allowance = 39,000 profit.
    // (39,000 - 12,570) x 20% = 5,286, plus Class 4 26,430 x 6% = 1,585.80: 6,871.80.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: userProfileToSavedBaseline({
        employmentType: "self-employed",
        annualSalary: 40000,
      }),
      taxRecords: [
        {
          id: "se1",
          type: "income",
          source: "self-employed",
          category: "self_employed_income",
          name: "Trading income",
          amount: 40000,
          frequency: "annual",
          date: "2026-05-01",
        },
      ],
    });
    const ledger = pack.taxSummary.selfAssessmentLedgerSummary;
    expect(ledger?.effectivePayeSalary).toBe(0);
    expect(Math.round(ledger?.netAdditionalTaxToPay ?? 0)).toBe(6872);
  });
});
