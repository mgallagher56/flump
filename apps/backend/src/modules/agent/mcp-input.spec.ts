import { McpInputResponse } from "@flump/api-contract";
import { type BuildContextPackInput, DEFAULT_FINANCIAL_BASELINE } from "@flump/finance-engine";
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
    expect(wire.budgetEntries[0]).toMatchObject({ id: "b1", name: "Housing #1", amount: 900 });
    expect(wire.budgetEntries[0]).not.toHaveProperty("notes");
    expect(wire.taxRecords[0]).toMatchObject({ id: "t1", name: "", notes: null, amount: 800 });
  });

  it("a full-read token keeps names and notes", () => {
    const wire = toMcpInputWire(raw, false);
    expect(wire.accounts[0]?.name).toBe("Monzo joint");
    expect(wire.budgetEntries[0]?.notes).toBe("private note");
    expect(wire.baseline.userId).toBe("user_real");
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
