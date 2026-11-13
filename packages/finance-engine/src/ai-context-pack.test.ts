import { describe, expect, it } from "vitest";
import { buildFlumpAiContextPack, formatAiContextPackMarkdown } from "./ai-context-pack.js";
import { DEFAULT_FINANCIAL_BASELINE } from "./profile.js";

describe("FlumpAiContextPack Builder & Markdown Formatter", () => {
  it("generates an anonymized context pack stripping PII and provider names", () => {
    const pack = buildFlumpAiContextPack(
      {
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
    expect(md).toContain("# FLUMP UK FINANCIAL CONTEXT PACK");
    expect(md).toContain("Total Net Worth");
    expect(md).not.toContain("usr_secret_12345");
  });

  it("handles empty accounts and defaults gracefully", () => {
    const pack = buildFlumpAiContextPack({
      baseline: DEFAULT_FINANCIAL_BASELINE,
    });

    expect(pack.portfolio.netWorth).toBe(0);
    expect(pack.budgetSummary.entries).toEqual([]);
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toBeDefined();
  });

  it("renders neutral observations, with no action headings or optimised fallback", () => {
    const pack = buildFlumpAiContextPack({ baseline: DEFAULT_FINANCIAL_BASELINE });
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
      { baseline: DEFAULT_FINANCIAL_BASELINE, budgetEntries: [entry] },
      { anonymizeInstitutions: true },
    );
    expect(JSON.stringify(pack)).not.toContain("Landlord");
    expect(pack.budgetSummary.entries[0]?.name).toBe("Rent via Bank");
  });

  it("keeps notes when not anonymised", () => {
    const pack = buildFlumpAiContextPack(
      { baseline: DEFAULT_FINANCIAL_BASELINE, budgetEntries: [entry] },
      { anonymizeInstitutions: false },
    );
    expect(pack.budgetSummary.entries[0]?.notes).toBe(entry.notes);
  });
});
