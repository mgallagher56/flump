import type { BuildContextPackInput } from "@flump/finance-engine";
import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Env = {
  result: {
    mortgageAccountId: string | null;
    comparison: Record<string, unknown> | null;
    notes: string[];
  };
  provenance: Record<string, string>;
  assumptions: Array<{ field: string; value?: unknown; source: string }>;
  missing: Array<{ field: string; why: string; askUser: string }>;
};
type ErrorEnv = { error: { code: string; message: string; hint?: string; field?: string } };

const TOOL = "compare_mortgage_overpay_vs_invest";
const ARGS = { monthlyAmountGbp: 300, expectedReturnPct: 5 };
const SHORT_ID = /^acc_[0-9a-f]{12}$/;

const mortgage = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Test Mortgage ${id}`,
  type: "Mortgage",
  balance: 100000,
  interestRate: 4,
  termMonths: 240,
  ...over,
});
const user = (accounts: NonNullable<BuildContextPackInput["accounts"]>): BuildContextPackInput => ({
  ...emptyUser,
  accounts,
});

describe("compare_mortgage_overpay_vs_invest behaviour", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const call = async (args: Record<string, unknown> = ARGS) =>
    (await h?.callJson(TOOL, args)) as Env;

  it("names the mortgage by short id and states its inputs and caveats", async () => {
    h = await connectTestClient(user([mortgage("m1")]));
    const e = await call();
    expect(e.result.comparison).not.toBeNull();
    expect(e.result.mortgageAccountId).toMatch(SHORT_ID);
    expect(e.provenance.comparison).toBe("mortgage_account");
    expect(e.assumptions.map((a) => [a.field, a.source])).toEqual([
      ["monthlyAmountGbp", "agent_supplied"],
      ["expectedReturnPct", "agent_supplied"],
      ["mortgageTerms", "derived"],
    ]);
    expect(e.result.notes).toHaveLength(4);
    expect(e.result.notes.every((n) => n.length > 0)).toBe(true);
  });

  it("keeps the provenance when the comparison is left empty", async () => {
    h = await connectTestClient(user([mortgage("m1", { termMonths: 0 })]));
    const e = await call();
    expect(e.result.comparison).toBeNull();
    expect(e.provenance.comparison).toBe("mortgage_account");
  });

  it("asks for a mortgage when accounts exist but none is a mortgage", async () => {
    h = await connectTestClient(
      user([{ id: "c1", name: "Test Current", type: "Current", balance: 500 }]),
    );
    const e = await call();
    expect(e.result.comparison).toBeNull();
    expect(e.result.mortgageAccountId).toBeNull();
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.field).toBe("mortgage");
    expect(e.missing[0]?.why).not.toBe("");
    expect(e.missing[0]?.askUser).not.toBe("");
  });

  it("lists every mortgage by short id when there are two to choose from", async () => {
    h = await connectTestClient(user([mortgage("m1"), mortgage("m2")]));
    const e = await call();
    expect(e.missing[0]?.why).toContain("2 mortgage accounts");
    expect(e.missing[0]?.askUser.match(/\(acc_[0-9a-f]{12}\)/g)).toHaveLength(2);
    expect(e.missing[0]?.askUser).toContain("), ");
  });

  it("rejects an unknown mortgage id with the field and where to find ids", async () => {
    h = await connectTestClient(user([mortgage("m1")]));
    const { error } = JSON.parse(
      await h.callText(TOOL, { ...ARGS, mortgageAccountId: "acc_000000000000" }),
    ) as ErrorEnv;
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).not.toBe("");
    expect(error.field).toBe("mortgageAccountId");
    expect(error.hint).toContain("list_accounts");
  });

  it("asks for the balance when the mortgage balance is zero", async () => {
    h = await connectTestClient(user([mortgage("m1", { balance: 0 })]));
    const e = await call();
    expect(e.result.comparison).toBeNull();
    const id = e.result.mortgageAccountId as string;
    expect(e.missing).toEqual([expect.objectContaining({ field: `accounts.${id}.balance` })]);
    expect(e.missing[0]?.why).toContain(id);
    expect(e.missing[0]?.askUser).not.toBe("");
  });

  it("asks for the rate with the mortgage's id when it is not recorded", async () => {
    h = await connectTestClient(user([mortgage("m1", { interestRate: undefined })]));
    const e = await call();
    const id = e.result.mortgageAccountId as string;
    expect(e.missing.map((m) => m.field)).toEqual([`accounts.${id}.interestRate`]);
    expect(e.missing[0]?.why).toContain(id);
    expect(e.missing[0]?.askUser).not.toBe("");
  });

  it("accepts a 600-month term and refuses a zero or negative one", async () => {
    // The intake accepts 1 to 600 months; 600 is inside the range, 0 and -12 are not.
    h = await connectTestClient(user([mortgage("m1", { termMonths: 600 })]));
    expect((await call()).result.comparison).not.toBeNull();
    for (const termMonths of [0, -12]) {
      await h.close();
      h = await connectTestClient(user([mortgage("m1", { termMonths })]));
      const e = await call();
      const id = e.result.mortgageAccountId as string;
      expect(e.result.comparison, String(termMonths)).toBeNull();
      expect(e.missing.map((m) => m.field)).toEqual([`accounts.${id}.termMonths`]);
      expect(e.missing[0]?.why).toContain("600");
      expect(e.missing[0]?.askUser).toContain("600");
    }
  });
});
