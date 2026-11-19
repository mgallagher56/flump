import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

let seq = 0;
const key = () => `stage-test-key-${++seq}`;

const account = (over: Record<string, unknown> = {}) => ({
  ref: "acc1",
  name: "Test current account",
  type: "Current",
  ...over,
});
const balance = (value: number) => ({ accountRef: "acc1", month: "2026-01", value });

describe("stage_import input checks and payload", () => {
  let h: TestHarness;
  afterEach(async () => {
    await h?.close();
  });

  /** Calls stage_import and returns whether it was refused, with the text it returned. */
  const stage = async (args: Record<string, unknown>) => {
    const res = await h.client.callTool({
      name: "stage_import",
      arguments: { idempotencyKey: key(), accounts: [account()], balances: [], ...args },
    });
    const text = (res.content as Array<{ text?: string }>)[0]?.text ?? "";
    return { refused: res.isError === true, text };
  };

  it("accepts whole pounds and pence, and refuses a third decimal place", async () => {
    h = await connectTestClient(emptyUser);
    expect((await stage({ balances: [balance(1350.25)] })).refused).toBe(false);
    const third = await stage({ balances: [balance(1.234)] });
    expect(third.refused).toBe(true);
    expect(third.text).toContain("at most 2 decimal places");
  });

  it("refuses a balance of 10 billion or more", async () => {
    // The limit is "below 10 billion": 9,999,999,999.99 is accepted and 10,000,000,000 is not.
    h = await connectTestClient(emptyUser);
    expect((await stage({ balances: [balance(9_999_999_999.99)] })).refused).toBe(false);
    const ten = await stage({ balances: [balance(10_000_000_000)] });
    expect(ten.refused).toBe(true);
    expect(ten.text).toContain("10 billion");
  });

  it("refuses a malformed idempotency key and says what a key may contain", async () => {
    h = await connectTestClient(emptyUser);
    const short = await stage({ idempotencyKey: "short" });
    expect(short.refused).toBe(true);
    expect(short.text).toContain("8-128");
  });

  it("refuses a negative monthly contribution and accepts zero", async () => {
    h = await connectTestClient(emptyUser);
    const zero = await stage({ accounts: [account({ details: { monthlyContribution: 0 } })] });
    expect(zero.refused).toBe(false);
    const positive = await stage({ accounts: [account({ details: { monthlyContribution: 50 } })] });
    expect(positive.refused).toBe(false);
    const negative = await stage({ accounts: [account({ details: { monthlyContribution: -1 } })] });
    expect(negative.refused).toBe(true);
    expect(negative.text).toContain("must not be negative");
  });

  it("refuses a fixed-rate end date not written as a date", async () => {
    h = await connectTestClient(emptyUser);
    const bad = await stage({ accounts: [account({ details: { fixedRateEndDate: "next May" } })] });
    expect(bad.refused).toBe(true);
    expect(bad.text).toContain("YYYY-MM-DD");
  });

  it("trims the account name and refuses one that is only spaces", async () => {
    h = await connectTestClient(emptyUser);
    expect((await stage({ accounts: [account({ name: "  Test saver  " })] })).refused).toBe(false);
    expect(h.imports.staged.at(-1)?.input.accounts[0]?.name).toBe("Test saver");
    expect((await stage({ accounts: [account({ name: "   " })] })).refused).toBe(true);
  });

  it("passes an account's details to the server", async () => {
    h = await connectTestClient(emptyUser);
    const details = {
      interestRate: 4.5,
      monthlyContribution: 250,
      termMonths: 300,
      fixedRateEndDate: "2028-03-31",
    };
    await stage({ accounts: [account({ type: "Mortgage", details })] });
    expect(h.imports.staged.at(-1)?.input.accounts[0]).toEqual({
      ref: "acc1",
      name: "Test current account",
      type: "Mortgage",
      details,
    });
  });

  it("says where the result comes from", async () => {
    h = await connectTestClient(emptyUser);
    const { text } = await stage({ balances: [balance(100)] });
    expect(JSON.parse(text).provenance.batch).toBe("import_batches");
  });
});
