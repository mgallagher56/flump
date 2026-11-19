import type { BuildContextPackInput } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "../../testing/client.js";
import { emptyUser, mixedAccountsWithHistory } from "../../testing/personas.js";

type Debt = { id: string; label: string; type: string; aprPct: number | null };
type Env = {
  result: {
    debts: Debt[];
    overdrawnGbp: number;
    debtFreeDateOnMinimums: string | null;
    notes: string[];
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};

async function overview(data: BuildContextPackInput) {
  const h = await connectTestClient(data);
  try {
    const e = (await h.callJson("get_debt_overview")) as Env;
    const accounts = (await h.callJson("list_accounts")) as {
      result: { accounts: Array<{ id: string; label: string }> };
    };
    return { e, accounts: accounts.result.accounts };
  } finally {
    await h.close();
  }
}

const card = (n: number) => ({
  id: `card_${n}`,
  name: `Card ${n}`,
  type: "Credit Card",
  balance: 1000,
});

describe("get_debt_overview", () => {
  it("names each debt with the same id and label as list_accounts", async () => {
    const { e, accounts } = await overview(mixedAccountsWithHistory);
    expect(e.result.debts).toHaveLength(2);
    for (const d of e.result.debts) {
      const acct = accounts.find((a) => a.id === d.id);
      expect(acct, d.id).toBeDefined();
      expect(d.label).toBe(acct?.label);
    }
  });

  it("asks for an unrecorded APR under a field naming that debt", async () => {
    const { e } = await overview(mixedAccountsWithHistory);
    const cardDebt = e.result.debts.find((d) => d.type === "credit_card");
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.field).toBe(`debts.${cardDebt?.id}.aprPct`);
    expect(e.missing[0]?.why).toContain(cardDebt?.id);
    expect(e.missing[0]?.askUser.length).toBeGreaterThan(0);
    expect(e.provenance.debts).toBe("account_balances");
  });

  it("explains the student loan rule, the partial average, the estimated minimum and the null date", async () => {
    // The card has no APR and no stored minimum; the loan has both.
    const { e } = await overview(mixedAccountsWithHistory);
    const notes = e.result.notes;
    expect(notes).toHaveLength(4);
    expect(notes.some((n) => /Student loans/.test(n))).toBe(true);
    expect(notes.some((n) => /weightedAprPct/.test(n))).toBe(true);
    expect(notes.some((n) => /estimates/.test(n))).toBe(true);
    expect(e.result.debtFreeDateOnMinimums).toBeNull();
    expect(notes.some((n) => /debtFreeDateOnMinimums is null/.test(n))).toBe(true);
  });

  it("has only the student loan note when every APR and minimum is recorded and the date is known", async () => {
    const { e } = await overview({
      ...emptyUser,
      accounts: [
        {
          id: "loan",
          name: "Loan",
          type: "Loan",
          balance: 2400,
          interestRate: 6,
          monthlyContribution: 200,
        },
      ],
    });
    expect(e.result.debtFreeDateOnMinimums).not.toBeNull();
    expect(e.result.notes).toHaveLength(1);
    expect(e.result.notes[0]).toMatch(/Student loans/);
    expect(e.missing).toEqual([]);
  });

  it("with no accounts asks for them and adds no debt notes", async () => {
    const { e } = await overview(emptyUser);
    expect(e.result.debts).toEqual([]);
    expect(e.missing.map((m) => m.field)).toEqual(["accounts"]);
    expect(e.result.notes).toHaveLength(1);
  });

  it("folds more than five unrecorded APRs into one question about all of them", async () => {
    const { e } = await overview({ ...emptyUser, accounts: [1, 2, 3, 4, 5, 6].map(card) });
    // At most five entries: four named debts, then one aggregate for the other two.
    expect(e.missing).toHaveLength(5);
    const last = e.missing[4];
    expect(last?.field).toBe("debts.aprPct");
    expect(last?.why).toMatch(/2 more not listed/);
    // The aggregate still says why, before the count.
    expect(last?.why.replace(/\s*\(2 more not listed\.\)$/, "").length).toBeGreaterThan(0);
    expect(last?.askUser.length).toBeGreaterThan(0);
  });

  it("adds up overdrawn current accounts", async () => {
    const { e } = await overview({
      ...emptyUser,
      accounts: [
        { id: "c1", name: "Current 1", type: "Current", balance: -300 },
        { id: "c2", name: "Current 2", type: "Current", balance: -150.5 },
        { id: "c3", name: "Current 3", type: "Current", balance: 900 },
      ],
    });
    // Overdrawn by 300 and 150.50; the account in credit adds nothing: 450.50.
    expect(e.result.overdrawnGbp).toBe(450.5);
  });
});
