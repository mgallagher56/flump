import type { BudgetEntryItem, ResolvedAccount } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import type { VerifiedToken } from "../../auth/token-verifier.js";
import { TEST_TOKEN } from "../../testing/client.js";
import { createFakeProvider } from "../../testing/fake-provider.js";
import { emptyUser, mixedAccountsWithHistory } from "../../testing/personas.js";
import type { McpServerContext } from "../../types.js";
import {
  ASK_NO_ACCOUNTS,
  budgetCategoryLabeller,
  capMissing,
  indexAccounts,
  loadReadModel,
  MISSING_INCOME,
  type Missing,
  missingLinkedLines,
  netWorthBasisNotes,
  sanitiseText,
} from "./common.js";

const FULL_TOKEN: VerifiedToken = {
  userId: "user_full",
  tokenId: "t",
  scopes: ["mcp:read:full"],
  anonymizeInstitutions: false,
  type: "pat",
};

const ctxFor = (
  token: VerifiedToken,
  data: Parameters<typeof createFakeProvider>[0] = emptyUser,
): McpServerContext & { dataProvider: ReturnType<typeof createFakeProvider> } => ({
  token,
  dataProvider: createFakeProvider(data),
});

/** Only the fields `indexAccounts` reads. */
const account = (id: string, category: ResolvedAccount["category"], name = "Named account") =>
  ({ id, name, category }) as ResolvedAccount;

const expectAskable = (m: Missing) => {
  expect(m.why.length).toBeGreaterThan(0);
  expect(m.askUser.length).toBeGreaterThan(0);
};

describe("sanitiseText", () => {
  it("replaces C0 control characters, including the last one (U+001F), with a space", () => {
    expect(sanitiseText("a\u0001b")).toBe("a b");
    expect(sanitiseText("a\u001fb")).toBe("a b");
  });

  it("replaces DEL and the C1 range U+007F to U+009F, and keeps U+00A1 just above it", () => {
    expect(sanitiseText("a\u007fb")).toBe("a b");
    expect(sanitiseText("a\u0080b")).toBe("a b");
    expect(sanitiseText("a\u009fb")).toBe("a b");
    expect(sanitiseText("a¡b")).toBe("a¡b");
  });

  it("replaces zero-width and bidirectional controls at both ends of each range", () => {
    for (const code of [0x200b, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069]) {
      expect(sanitiseText(`a${String.fromCharCode(code)}b`), code.toString(16)).toBe("a b");
    }
  });

  it("keeps ordinary characters above the unsafe ranges", () => {
    // U+2010 (hyphen) sits just above U+200F; the euro sign U+20AC is above every range but U+FEFF.
    expect(sanitiseText("a‐b")).toBe("a‐b");
    expect(sanitiseText("£5 or €5")).toBe("£5 or €5");
  });

  it("trims leading and trailing space left by removed characters", () => {
    expect(sanitiseText("\u0001  Joint saver \n")).toBe("Joint saver");
  });

  it("keeps a string of exactly the limit and cuts a longer one to the limit with an ellipsis", () => {
    const sixty = "x".repeat(60);
    expect(sanitiseText(sixty)).toBe(sixty);
    // 61 characters: the first 59 are kept and "…" makes 60.
    const cut = sanitiseText(`${sixty}y`);
    expect(cut).toBe(`${"x".repeat(59)}…`);
    expect(cut).toHaveLength(60);
  });
});

describe("indexAccounts", () => {
  const all = [
    account("c1", "cash"),
    account("s1", "savings"),
    account("i1", "investments"),
    account("p1", "pensions"),
    account("d1", "debt"),
    account("m1", "mortgages"),
    account("h1", "property"),
    account("l1", "studentLoans"),
    account("o1", "other"),
    account("s2", "savings"),
  ];

  it("gives every category a fixed-vocabulary reference numbered per category in stored order", () => {
    const index = indexAccounts(ctxFor(TEST_TOKEN), all);
    expect(all.map((a) => index.refOf(a))).toEqual([
      "Current account #1",
      "Saving account #1",
      "Investment account #1",
      "Pension account #1",
      "Debt account #1",
      "Mortgage account #1",
      "Property account #1",
      "Student Loan account #1",
      "Other account #1",
      "Saving account #2",
    ]);
  });

  it("labels accounts generically when anonymised, with the same per-category numbering", () => {
    const index = indexAccounts(ctxFor(TEST_TOKEN), all);
    expect(index.anonymise).toBe(true);
    expect(all.map((a) => index.labelOf(a))).toEqual([
      "Current Account #1",
      "Saving Account #1",
      "Investment Account #1",
      "Pension Account #1",
      "Debt Account #1",
      "Mortgage Account #1",
      "Property Account #1",
      "Student Loan Account #1",
      "Other Account #1",
      "Saving Account #2",
    ]);
  });

  it("uses the sanitised name with full read, and the generic label when the name is empty", () => {
    const index = indexAccounts(ctxFor(FULL_TOKEN), [
      account("a", "savings", "Joint\nsaver"),
      account("b", "savings", "\u0001"),
    ]);
    expect(index.anonymise).toBe(false);
    expect(index.labelOf(account("a", "savings"))).toBe("Joint saver");
    expect(index.labelOf(account("b", "savings"))).toBe("Saving Account #2");
    // The reference never carries the name, even with full read.
    expect(index.refOf(account("a", "savings"))).toBe("Saving account #1");
  });

  it("falls back to a plain word for an account it was not built from", () => {
    const index = indexAccounts(ctxFor(TEST_TOKEN), all);
    const stranger = account("zz", "debt", "Someone else's card");
    expect(index.labelOf(stranger)).toBe("Account");
    expect(index.refOf(stranger)).toBe("Account");
  });
});

describe("loadReadModel", () => {
  it("asks the provider for anonymised data unless the token has full read", async () => {
    const anon = ctxFor(TEST_TOKEN);
    await loadReadModel(anon);
    expect(anon.dataProvider.calls).toEqual([
      { userId: TEST_TOKEN.userId, anonymizeInstitutions: true },
    ]);
    const full = ctxFor(FULL_TOKEN);
    await loadReadModel(full);
    expect(full.dataProvider.calls).toEqual([
      { userId: FULL_TOKEN.userId, anonymizeInstitutions: false },
    ]);
  });

  it("builds the snapshot with the recorded monthly history", async () => {
    const m = await loadReadModel(ctxFor(TEST_TOKEN, mixedAccountsWithHistory));
    // The saver's rows are 2026-08, 2026-09 and 2026-10: its latest recorded month is October 2026.
    const saver = m.snapshot.getAccount("11111111-aaaa-4aaa-8aaa-000000000002");
    expect(saver?.history).toHaveLength(3);
    expect(saver).toMatchObject({ latestYear: 2026, latestMonth: 10 });
  });

  it("uses the default basis (property counted, student loans not) when the provider sends none", async () => {
    const m = await loadReadModel(ctxFor(TEST_TOKEN, emptyUser));
    expect(m.basis).toEqual({ countProperty: true, countStudentLoan: false });
  });

  it("lists no budget entries when the provider sends none", async () => {
    const m = await loadReadModel(ctxFor(TEST_TOKEN, emptyUser));
    expect(m.budgetEntries).toEqual([]);
  });
});

describe("netWorthBasisNotes", () => {
  it("says whether student loans count, and adds nothing else when nothing is left out", () => {
    const counted = netWorthBasisNotes({ countProperty: true, countStudentLoan: true }, []);
    expect(counted).toHaveLength(1);
    expect(counted[0]).toMatch(/^Student loans count as a debt/);
    const notCounted = netWorthBasisNotes({ countProperty: true, countStudentLoan: false }, []);
    expect(notCounted).toHaveLength(1);
    expect(notCounted[0]).toMatch(/^Student loans are not counted/);
  });

  it("adds a property note when property is not counted and property or a mortgage is left out", () => {
    const basis = { countProperty: false, countStudentLoan: false };
    for (const leftOut of [["property"], ["mortgage"]] as const) {
      const notes = netWorthBasisNotes(basis, leftOut);
      expect(notes, leftOut[0]).toHaveLength(2);
      expect(notes[1]).toMatch(/^Property values and mortgage balances are not counted/);
    }
    // Not counting property, but the user has none: no property note.
    expect(netWorthBasisNotes(basis, [])).toHaveLength(1);
  });

  it("adds a note when a mortgage counts with no home value beside it", () => {
    const notes = netWorthBasisNotes({ countProperty: true, countStudentLoan: false }, [
      "homeValueMissing",
    ]);
    expect(notes).toHaveLength(2);
    expect(notes[1]).toMatch(/no home value saved/);
  });
});

describe("capMissing", () => {
  const entry = (i: number): Missing => ({ field: `f${i}`, why: `why ${i}`, askUser: `ask ${i}` });
  const aggregate = { field: "all", why: "Several are missing.", askUser: "What are they?" };

  it("keeps a list of exactly five as it is", () => {
    const five = [1, 2, 3, 4, 5].map(entry);
    expect(capMissing(five, aggregate)).toEqual(five);
  });

  it("keeps the first four of a longer list and folds the rest into one entry with the count", () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map(entry);
    const capped = capMissing(seven, aggregate);
    expect(capped).toHaveLength(5);
    expect(capped.slice(0, 4)).toEqual(seven.slice(0, 4));
    // Seven entries, four kept: 7 - 4 = 3 folded into the aggregate.
    expect(capped[4]).toEqual({
      field: "all",
      why: "Several are missing. (3 more not listed.)",
      askUser: "What are they?",
    });
  });
});

describe("missing entries", () => {
  const row = (over: Partial<BudgetEntryItem>) => ({ ...over }) as BudgetEntryItem;

  it("names the saved fact each kind of linked line needs, once per kind", () => {
    const fields = missingLinkedLines([
      row({ notSet: true, linked: "take_home" }),
      row({ notSet: true, linked: "housing" }),
      row({ notSet: true, linked: "savings" }),
      row({ notSet: true, linked: "debt" }),
      row({ notSet: true, linked: "savings" }),
    ]).map((m) => m.field);
    expect(fields).toEqual(["salary", "monthlyHousingCost", "monthlySaving", "monthlyDebtPayment"]);
  });

  it("ignores linked lines that are set and lines that are not linked", () => {
    expect(
      missingLinkedLines([row({ notSet: false, linked: "housing" }), row({ notSet: true })]),
    ).toEqual([]);
  });

  it("gives every entry a reason and a question for the user", () => {
    const all = missingLinkedLines(
      (["take_home", "housing", "savings", "debt"] as const).map((linked) =>
        row({ notSet: true, linked }),
      ),
    );
    for (const m of [...all, ASK_NO_ACCOUNTS, MISSING_INCOME]) expectAskable(m);
  });
});

describe("budgetCategoryLabeller", () => {
  it("anonymised: a built-in category stored as its key with stray spaces stays as the key", () => {
    // " bills " trimmed is "bills", the built-in key itself, so it stays "bills".
    expect(budgetCategoryLabeller(true)(" bills ")).toBe("bills");
  });

  it("anonymised: a typed category becomes a numbered custom label", () => {
    const label = budgetCategoryLabeller(true);
    expect(label(" Jane's nursery ")).toBe("Custom category 1");
    expect(label("Kids clubs")).toBe("Custom category 2");
  });
});
