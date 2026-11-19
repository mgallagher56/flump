import type { BuildContextPackInput } from "@flump/finance-engine";
import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Row = {
  period: string;
  paymentsGbp: number;
  interestGbp: number;
  principalGbp: number;
  remainingDebtGbp: number;
};
type Strategy = {
  strategy: string;
  payoffAchievable: boolean;
  monthsToPayoff: number | null;
  debtFreeDate: string | null;
  totalInterestPaidGbp: number;
  interestSavedVsMinimumGbp: number;
};
type Env = {
  result: {
    simulated: boolean;
    debtsIncluded: number;
    debtsExcludedUnknownApr: string[];
    startingDebtGbp: number;
    strategies: Strategy[];
    schedule?: Row[];
    scheduleTruncated?: boolean;
    notes: string[];
  };
  provenance: Record<string, string>;
  assumptions: Array<{ field: string; value?: unknown; source: string; reason: string }>;
  missing: Array<{ field: string; why: string; askUser: string }>;
};
type ErrorEnv = {
  error: { code: string; message: string; hint?: string; field?: string };
};

const uuid = (n: number) => `22222222-bbbb-4bbb-8bbb-${String(n).padStart(12, "0")}`;

type DebtSpec = {
  type?: string;
  balance: number;
  interestRate?: number;
  monthlyContribution?: number;
};

function userWith(
  debts: DebtSpec[],
  other: NonNullable<BuildContextPackInput["accounts"]> = [],
): BuildContextPackInput {
  return {
    ...emptyUser,
    accounts: [
      ...other,
      ...debts.map((d, i) => ({
        id: uuid(i + 1),
        name: `Test Debt ${i + 1}`,
        type: d.type ?? "Loan",
        balance: d.balance,
        ...(d.interestRate === undefined ? {} : { interestRate: d.interestRate }),
        ...(d.monthlyContribution === undefined
          ? {}
          : { monthlyContribution: d.monthlyContribution }),
      })),
    ],
  };
}

const zeroRateLoan = (balance: number, minimum: number): DebtSpec => ({
  balance,
  interestRate: 0,
  monthlyContribution: minimum,
});

describe("simulate_debt_payoff behaviour", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const call = async (args: Record<string, unknown> = {}) =>
    (await h?.callJson("simulate_debt_payoff", args)) as Env;

  describe("schedule tables", () => {
    it("adds up each year of a schedule that runs past twelve months", async () => {
      // £1,300 at a recorded 0% APR with a £100 minimum: no interest, £100 a month.
      // Months 1 to 12 pay 12 x £100 = £1,200, leaving £100; month 13 pays the last £100.
      h = await connectTestClient(userWith([zeroRateLoan(1300, 100)]));
      const e = await call({ strategy: "avalanche", includeSchedule: "yearly" });
      expect(e.result.schedule).toEqual([
        {
          period: "Year 1",
          paymentsGbp: 1200,
          interestGbp: 0,
          principalGbp: 1200,
          remainingDebtGbp: 100,
        },
        {
          period: "Year 2",
          paymentsGbp: 100,
          interestGbp: 0,
          principalGbp: 100,
          remainingDebtGbp: 0,
        },
      ]);
      expect(e.result.scheduleTruncated).toBe(false);
    });

    it("sums interest, payments and principal into the yearly row", async () => {
      // One loan of £300 at 12% APR (1% a month), minimum £100, as in simulate.test.ts:
      // interest 3.00 + 2.03 + 1.05 + 0.06 = 6.14 over four months;
      // payments 100 + 100 + 100 + 6.14 = 306.14; principal 306.14 - 6.14 = 300; nothing left.
      h = await connectTestClient(
        userWith([{ balance: 300, interestRate: 12, monthlyContribution: 100 }]),
      );
      const e = await call({ strategy: "avalanche", includeSchedule: "yearly" });
      expect(e.result.schedule).toEqual([
        {
          period: "Year 1",
          paymentsGbp: 306.14,
          interestGbp: 6.14,
          principalGbp: 300,
          remainingDebtGbp: 0,
        },
      ]);
    });

    it("does not flag a short monthly schedule as truncated", async () => {
      // £300 at 12% with a £100 minimum clears in four months (worked above): 4 rows, under 24.
      h = await connectTestClient(
        userWith([{ balance: 300, interestRate: 12, monthlyContribution: 100 }]),
      );
      const e = await call({ strategy: "avalanche", includeSchedule: "monthly" });
      expect(e.result.schedule).toHaveLength(4);
      expect(e.result.scheduleTruncated).toBe(false);
    });

    it("shows all of a schedule that is exactly 24 months long without flagging it", async () => {
      // £2,400 at 0% with a £100 minimum: 2,400 / 100 = 24 months, exactly the monthly cap.
      h = await connectTestClient(userWith([zeroRateLoan(2400, 100)]));
      const e = await call({ strategy: "avalanche", includeSchedule: "monthly" });
      expect(e.result.schedule).toHaveLength(24);
      expect(e.result.schedule?.at(-1)?.remainingDebtGbp).toBe(0);
      expect(e.result.scheduleTruncated).toBe(false);
    });

    it("shows all thirty years of a schedule that never clears, without flagging it", async () => {
      // £1,000 at 12% APR: interest is 1,000 x 1% = £10 a month and the minimum is £10, so the
      // balance stays at £1,000. The engine stops at 360 months = 30 yearly rows of
      // 12 x £10 = £120 paid, all of it interest, no principal, £1,000 left.
      h = await connectTestClient(
        userWith([{ balance: 1000, interestRate: 12, monthlyContribution: 10 }]),
      );
      const e = await call({ strategy: "avalanche", includeSchedule: "yearly" });
      expect(e.result.schedule).toHaveLength(30);
      expect(e.result.schedule?.[29]).toEqual({
        period: "Year 30",
        paymentsGbp: 120,
        interestGbp: 120,
        principalGbp: 0,
        remainingDebtGbp: 1000,
      });
      expect(e.result.scheduleTruncated).toBe(false);
    });
  });

  describe("payoff within 30 years", () => {
    it("says when no ordering clears the debts", async () => {
      // £10-a-month interest against a £10 minimum (worked above): no ordering reduces the balance.
      h = await connectTestClient(
        userWith([{ balance: 1000, interestRate: 12, monthlyContribution: 10 }]),
      );
      const e = await call({});
      expect(e.result.strategies.every((s) => !s.payoffAchievable)).toBe(true);
      expect(e.result.strategies.every((s) => s.monthsToPayoff === null)).toBe(true);
      expect(e.result.notes.some((n) => n.includes("30 years"))).toBe(true);
    });

    it("says so when only paying the minimums never clears the debts", async () => {
      // With £100 extra the orderings pay £110 a month against £10 interest and clear the debt;
      // minimums only still pays just the £10 interest each month.
      h = await connectTestClient(
        userWith([{ balance: 1000, interestRate: 12, monthlyContribution: 10 }]),
      );
      const e = await call({ extraMonthlyGbp: 100 });
      const byName = Object.fromEntries(e.result.strategies.map((s) => [s.strategy, s]));
      expect(byName.avalanche?.payoffAchievable).toBe(true);
      expect(byName.minimum_only?.payoffAchievable).toBe(false);
      expect(e.result.notes.some((n) => n.includes("30 years"))).toBe(true);
    });

    it("adds no 30-year note when every ordering clears the debts", async () => {
      // £1,300 at 0% with a £100 minimum clears in 13 months under every ordering.
      h = await connectTestClient(userWith([zeroRateLoan(1300, 100)]));
      const e = await call({});
      expect(e.result.strategies.every((s) => s.payoffAchievable)).toBe(true);
      expect(e.result.notes.some((n) => n.includes("30 years"))).toBe(false);
    });
  });

  describe("orderings", () => {
    // D1: £1,200 at 12% APR (1% a month), minimum £100. D2: £100 at 0%, minimum £50. Extra £100.
    // Month 1 either way: D1 interest 1,200 x 1% = 12.00; minimums take D1 to 1,112 and D2 to 50.
    //   Avalanche puts the £100 extra on D1 (higher rate): D1 1,012, D2 50; left 1,062.
    //   Snowball puts it on D2 (smaller balance): D2 clears with 50, the other 50 goes to D1: 1,062.
    // Month 2, avalanche: D1 interest 1,012 x 1% = 10.12; D1 pays 100 + 100 extra and D2 its
    //   last 50: paid 250, left 1,022.12 - 200 = 822.12.
    // Month 2, snowball: D1 interest 1,062 x 1% = 10.62.
    const twoDebts = () =>
      userWith([
        { balance: 1200, interestRate: 12, monthlyContribution: 100 },
        zeroRateLoan(100, 50),
      ]);

    it("puts the extra on the highest rate first under avalanche", async () => {
      h = await connectTestClient(twoDebts());
      const e = await call({
        strategy: "avalanche",
        extraMonthlyGbp: 100,
        includeSchedule: "monthly",
      });
      expect(e.result.schedule?.[0]).toMatchObject({
        paymentsGbp: 250,
        interestGbp: 12,
        remainingDebtGbp: 1062,
      });
      expect(e.result.schedule?.[1]).toMatchObject({
        paymentsGbp: 250,
        interestGbp: 10.12,
        remainingDebtGbp: 822.12,
      });
    });

    it("schedules avalanche, not snowball, when comparing", async () => {
      h = await connectTestClient(twoDebts());
      const e = await call({
        strategy: "compare",
        extraMonthlyGbp: 100,
        includeSchedule: "monthly",
      });
      expect(e.result.schedule?.[1]?.interestGbp).toBe(10.12);
    });

    it("puts the extra on the smallest balance first under snowball", async () => {
      h = await connectTestClient(twoDebts());
      const e = await call({
        strategy: "snowball",
        extraMonthlyGbp: 100,
        includeSchedule: "monthly",
      });
      expect(e.result.schedule?.[1]?.interestGbp).toBe(10.62);
    });

    it("models minimums only the same as avalanche when there is no extra", async () => {
      // Minimums only rolls a cleared debt's minimum onward in avalanche order, so with no extra
      // avalanche is the same plan. Three debts make the order matter: D3 clears in month 1, and
      // from month 2 its freed £60 goes to D1 (12%) under avalanche but to D2 (0%, £150 left)
      // under snowball, so a snowball order charges D1 more interest.
      h = await connectTestClient(
        userWith([
          { balance: 1200, interestRate: 12, monthlyContribution: 100 },
          zeroRateLoan(200, 50),
          zeroRateLoan(60, 60),
        ]),
      );
      const e = await call({ strategy: "avalanche" });
      const [avalanche, minimum] = e.result.strategies;
      expect(minimum?.strategy).toBe("minimum_only");
      expect({ ...minimum, strategy: "avalanche" }).toEqual(avalanche);
      const snowball = (await call({ strategy: "snowball" })).result.strategies[0];
      expect(snowball?.totalInterestPaidGbp).toBeGreaterThan(avalanche?.totalInterestPaidGbp ?? 0);
    });
  });

  describe("values the agent supplies", () => {
    it("uses a supplied APR and minimum for a debt with no recorded APR", async () => {
      // A £1,000 card with no rate, given 12% APR and a £100 minimum.
      // Month 1: interest 1,000 x 12% / 12 = 10.00; pays 100; left 910.
      h = await connectTestClient(userWith([{ type: "Credit Card", balance: 1000 }]));
      const id = (await call({})).result.debtsExcludedUnknownApr[0] as string;
      const e = await call({
        strategy: "avalanche",
        includeSchedule: "monthly",
        debts: [{ accountId: id, aprPct: 12, minimumPaymentGbp: 100 }],
      });
      expect(e.result.debtsIncluded).toBe(1);
      expect(e.result.schedule?.[0]).toMatchObject({
        paymentsGbp: 100,
        interestGbp: 10,
        remainingDebtGbp: 910,
      });
      expect(e.assumptions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: `debts.${id}.aprPct`,
            value: 12,
            source: "agent_supplied",
          }),
          expect.objectContaining({
            field: `debts.${id}.minimumPaymentGbp`,
            value: 100,
            source: "agent_supplied",
          }),
        ]),
      );
    });

    it("uses a supplied minimum over the estimated one", async () => {
      // A £1,000 card with no rate or payment recorded, given 0% APR.
      // Estimated minimum: the greater of £25 and 2.5% x 1,000 = £25, so 1,000 / 25 = 40 months.
      // With a supplied £250 minimum: 1,000 / 250 = 4 months.
      h = await connectTestClient(userWith([{ type: "Credit Card", balance: 1000 }]));
      const id = (await call({})).result.debtsExcludedUnknownApr[0] as string;
      const estimated = await call({
        strategy: "avalanche",
        debts: [{ accountId: id, aprPct: 0 }],
      });
      expect(estimated.result.strategies[0]?.monthsToPayoff).toBe(40);
      expect(estimated.assumptions.map((a) => a.field)).not.toContain(
        `debts.${id}.minimumPaymentGbp`,
      );
      const supplied = await call({
        strategy: "avalanche",
        debts: [{ accountId: id, aprPct: 0, minimumPaymentGbp: 250 }],
      });
      expect(supplied.result.strategies[0]?.monthsToPayoff).toBe(4);
    });

    it("echoes only the defaulted extra when no values are given", async () => {
      h = await connectTestClient(userWith([zeroRateLoan(1000, 100)]));
      const e = await call({});
      expect(e.assumptions).toEqual([
        expect.objectContaining({ field: "extraMonthlyGbp", value: 0, source: "default" }),
      ]);
    });

    it("echoes the extra payment as agent supplied when given", async () => {
      h = await connectTestClient(userWith([zeroRateLoan(1000, 100)]));
      const e = await call({ extraMonthlyGbp: 50 });
      expect(e.assumptions).toEqual([
        expect.objectContaining({ field: "extraMonthlyGbp", value: 50, source: "agent_supplied" }),
      ]);
    });

    it("rejects an unknown debt id with the field and where to find ids", async () => {
      h = await connectTestClient(userWith([zeroRateLoan(1000, 100)]));
      const text = await h.callText("simulate_debt_payoff", {
        debts: [{ accountId: "acc_000000000000", aprPct: 20 }],
      });
      const { error } = JSON.parse(text) as ErrorEnv;
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).not.toBe("");
      expect(error.field).toBe("debts.accountId");
      expect(error.hint).toContain("get_debt_overview");
    });
  });

  describe("estimated minimums and unknown APRs", () => {
    it("states the estimate rule when a minimum is not recorded", async () => {
      h = await connectTestClient(
        userWith([{ type: "Credit Card", balance: 1000, interestRate: 12 }]),
      );
      const e = await call({});
      const a = e.assumptions.find((x) => x.field === "minimumPaymentGbp");
      expect(a?.source).toBe("derived");
      expect(a?.reason).toContain("2.5%");
      expect(a?.reason).toContain("£25");
    });

    it("states no estimate when every minimum is recorded", async () => {
      h = await connectTestClient(
        userWith([{ balance: 1000, interestRate: 12, monthlyContribution: 100 }]),
      );
      const e = await call({});
      expect(e.assumptions.map((a) => a.field)).not.toContain("minimumPaymentGbp");
    });

    it("names the debt by its short id and reference when its APR is missing", async () => {
      h = await connectTestClient(userWith([{ type: "Credit Card", balance: 1000 }]));
      const e = await call({});
      const id = e.result.debtsExcludedUnknownApr[0] as string;
      expect(id).toMatch(/^acc_/);
      expect(e.missing).toHaveLength(1);
      const m = e.missing[0];
      expect(m?.field).toBe(`debts.${id}.aprPct`);
      expect(m?.why).toContain(id);
      // The anonymised reference numbers the account ("#1"), not a generic fallback.
      expect(m?.why).toContain("#1");
      expect(m?.askUser).toContain("#1");
    });

    it("folds a long list of missing APRs into one closing entry", async () => {
      // Six unknown APRs against a limit of five entries: four listed, then one summary entry.
      h = await connectTestClient(
        userWith(Array.from({ length: 6 }, () => ({ type: "Credit Card", balance: 500 }))),
      );
      const e = await call({});
      expect(e.missing).toHaveLength(5);
      const last = e.missing[4];
      expect(last?.field).toBe("debts.aprPct");
      expect(last?.why).toContain("APR");
      expect(last?.askUser).toContain("APR");
    });
  });

  describe("result envelope", () => {
    it("explains the interest rule and where balances come from", async () => {
      h = await connectTestClient(
        userWith([{ balance: 1000, interestRate: 12, monthlyContribution: 100 }]),
      );
      const e = await call({});
      expect(e.result.notes[0]).toContain("APR divided by 12");
      expect(e.provenance.strategies).toBe("account_balances");
    });

    it("models up to 20 recorded debts and refuses more", async () => {
      h = await connectTestClient(
        userWith(Array.from({ length: 20 }, () => zeroRateLoan(100, 50))),
      );
      expect((await call({})).result.debtsIncluded).toBe(20);
      await h.close();
      h = await connectTestClient(
        userWith(Array.from({ length: 21 }, () => zeroRateLoan(100, 50))),
      );
      const { error } = JSON.parse(await h.callText("simulate_debt_payoff", {})) as ErrorEnv;
      expect(error.code).toBe("INVALID_ARGUMENT");
      expect(error.message).toContain("20");
      expect(error.hint).toContain("20");
    });

    it("does not simulate a debt with a zero balance", async () => {
      h = await connectTestClient(
        userWith([{ balance: 0, interestRate: 12, monthlyContribution: 100 }]),
      );
      const e = await call({});
      expect(e.result.simulated).toBe(false);
      expect(e.result.strategies).toEqual([]);
    });

    it("says there is nothing to model when only non-debt accounts are recorded", async () => {
      h = await connectTestClient(
        userWith([], [{ id: uuid(99), name: "Test Current", type: "Current", balance: 500 }]),
      );
      const e = await call({});
      expect(e.result.simulated).toBe(false);
      expect(e.result.notes).toHaveLength(2);
      expect(e.result.notes[1]).toContain("mortgages and student loans");
    });

    it("adds no nothing-to-model note when there are no accounts at all", async () => {
      h = await connectTestClient(emptyUser);
      const e = await call({});
      expect(e.result.notes).toHaveLength(1);
    });

    it("adds no nothing-to-model note when debts were left out for a missing APR", async () => {
      h = await connectTestClient(userWith([{ type: "Credit Card", balance: 1000 }]));
      const e = await call({});
      expect(e.result.simulated).toBe(false);
      expect(e.result.notes).toHaveLength(1);
    });
  });
});
