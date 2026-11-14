import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { describe, expect, test } from "vitest";
import {
  answerValue,
  buildCheckInSteps,
  buildCheckInSummary,
  CHECK_IN_SENDS_SOURCE,
  type CheckInAccountInput,
  calculatedExplain,
  checkInPayload,
  doneKind,
  hasSource,
  restAnswer,
  resumeIndex,
  statementPromptText,
  stepFigure,
  withoutSource,
} from "./checkInModel";
import type { AccountDetailInput } from "./snapshotModel";

const MONTH = "2026-11";

const accounts: CheckInAccountInput[] = [
  {
    id: "M",
    name: "Residential mortgage",
    type: "Mortgage",
    balance: -186000,
    interestRate: 4.5,
    monthlyContribution: 1250,
  },
  { id: "P", name: "Workplace pension", type: "Pension", balance: 96000 },
  { id: "C", name: "Current account", type: "Current", balance: 3400 },
  { id: "S", name: "Student loan", type: "Student Loan", balance: -38500 },
  { id: "L", name: "Car loan", type: "Loan", balance: -8400, interestRate: 7.9 },
  { id: "V", name: "Easy access savings", type: "Saving", balance: 7600 },
];

const row = (
  accountId: string,
  month: number,
  value: number,
  source = "manual",
): AccountDetailInput => ({
  accountId: accountId.toLowerCase(),
  year: 2026,
  month,
  value,
  source,
});

const details: AccountDetailInput[] = [
  row("M", 10, -186550),
  row("P", 10, 95100),
  row("C", 10, 3360),
  row("S", 10, -38400),
  row("L", 10, -8610),
  row("V", 10, 7380),
];

describe("buildCheckInSteps", () => {
  const steps = buildCheckInSteps(accounts, details, MONTH);

  test("orders day-to-day money first and slow-moving balances last", () => {
    expect(steps.map((s) => s.name)).toEqual([
      "Current account",
      "Easy access savings",
      "Car loan",
      "Workplace pension",
      "Residential mortgage",
      "Student loan",
    ]);
  });

  test("shows last month's figure, with debts as the positive amount owed", () => {
    const mortgage = steps.find((s) => s.accountId === "m");
    expect(mortgage?.lastValue).toBe(186550);
    expect(mortgage?.lastMonth).toBe("2026-10");
    expect(mortgage?.isLiability).toBe(true);
  });

  test("calculates a mortgage with a rate and a payment from the engine's amortisation", () => {
    const mortgage = steps.find((s) => s.accountId === "m");
    // 186,550 + 4.5%/12 interest (699.56) - 1,250 = 185,999.56.
    expect(mortgage?.calculated?.value).toBe(185999.56);
    expect(calculatedExplain(mortgage!.calculated!)).toBe(
      "From your rate of 4.5% and monthly payment of £1,250 since October 2026.",
    );
  });

  test("does not guess: a loan with no payment, and a student loan, use the normal choice", () => {
    expect(steps.find((s) => s.accountId === "l")?.calculated).toBeNull();
    expect(steps.find((s) => s.accountId === "s")?.calculated).toBeNull();
  });

  test("calculates across a missed month from the latest recorded figure", () => {
    const [m] = buildCheckInSteps([accounts[0]!], [row("M", 9, -187100)], MONTH);
    expect(m?.calculated?.baseMonth).toBe("2026-09");
    // Two months of interest and payments on 187,100.
    expect(m?.calculated?.value).toBe(186001.19);
  });
});

describe("resume", () => {
  test("starts at the first account with nothing recorded this month", () => {
    const resumed = buildCheckInSteps(
      accounts,
      [...details, row("C", 11, 3400), row("V", 11, 7600, "confirmed")],
      MONTH,
    );
    expect(resumeIndex(resumed)).toBe(2);
    expect(resumed[1]?.recorded).toEqual({ value: 7600, source: "confirmed" });
  });
});

describe("answers and payloads", () => {
  const steps = buildCheckInSteps(accounts, details, MONTH);
  const current = steps[0]!;
  const mortgage = steps.find((s) => s.accountId === "m")!;

  test("a typed figure is manual, No change repeats last month as confirmed", () => {
    expect(answerValue(current, { kind: "update", value: 3412.5 })).toEqual({
      accountId: "c",
      value: 3412.5,
      source: "manual",
    });
    expect(answerValue(current, { kind: "noChange" })).toEqual({
      accountId: "c",
      value: 3360,
      source: "confirmed",
    });
  });

  test("keeping a calculated figure records it as calculated; typing over it is manual", () => {
    expect(answerValue(mortgage, { kind: "keepCalculated" })?.source).toBe("calculated");
    expect(answerValue(mortgage, { kind: "update", value: 185900 })).toEqual({
      accountId: "m",
      value: 185900,
      source: "manual",
    });
  });

  test("No change to the rest keeps calculated figures and repeats the others", () => {
    expect(restAnswer(mortgage)).toEqual({ kind: "keepCalculated" });
    expect(restAnswer(current)).toEqual({ kind: "noChange" });
  });

  test("the payload marks the month complete only once every account has a value", () => {
    const one = [answerValue(current, { kind: "noChange" })!];
    expect(checkInPayload(steps, one, new Set(), { withSource: true })).toEqual({
      values: [{ accountId: "c", value: 3360, source: "confirmed" }],
    });
    const all = steps.map((s) => answerValue(s, restAnswer(s))!);
    const payload = checkInPayload(steps, all, new Set(), { withSource: false });
    expect(payload.complete).toBe(true);
    expect(payload.values[0]).toEqual({ accountId: "c", value: 3360 });
  });
});

describe("statement prompt", () => {
  test("asks for a statement check once a fixed rate has ended since the last typed figure", () => {
    const [m] = buildCheckInSteps(
      [{ ...accounts[0]!, fixedRateEndDate: "2026-06-30" }],
      [row("M", 5, -188000), row("M", 10, -186550, "calculated")],
      MONTH,
    );
    expect(m?.statementPrompt).toEqual({ kind: "fixedRateEnded", endedMonth: "2026-06" });
    expect(statementPromptText(m!.statementPrompt!)).toBe(
      "Your fixed rate ended in June 2026, so the rate may have changed. Worth checking it against a statement.",
    );
  });

  test("asks once a year with no typed figure, and not before", () => {
    const recent = buildCheckInSteps([accounts[0]!], details, MONTH)[0];
    expect(recent?.statementPrompt).toBeNull();
    const old = buildCheckInSteps(
      [accounts[0]!],
      [{ ...row("M", 10, -190000), year: 2025 }, row("M", 10, -186550, "calculated")],
      MONTH,
    )[0];
    expect(old?.statementPrompt).toEqual({ kind: "yearSinceTyped" });
  });
});

describe("sources", () => {
  test("values are sent with their source", () => {
    expect(CHECK_IN_SENDS_SOURCE).toBe(true);
  });

  test("withoutSource strips every source for an older backend", () => {
    const payload = {
      values: [{ accountId: "c", value: 1, source: "manual" as const }],
      complete: true,
    };
    expect(hasSource(payload)).toBe(true);
    expect(withoutSource(payload)).toEqual({
      values: [{ accountId: "c", value: 1 }],
      complete: true,
    });
    expect(hasSource(withoutSource(payload))).toBe(false);
  });
});

describe("student loans", () => {
  test("show and send the positive amount owed, like any other debt", () => {
    const loan = buildCheckInSteps(accounts, details, MONTH).find((s) => s.accountId === "s");
    expect(loan?.isLiability).toBe(true);
    expect(loan?.lastValue).toBe(38400);
    expect(loan?.calculated).toBeNull();
  });
});

describe("done steps", () => {
  const steps = buildCheckInSteps(
    accounts,
    [...details, row("C", 11, 3360), row("V", 11, 7500), row("M", 11, -185999.56, "calculated")],
    MONTH,
  );
  const byId = (id: string) => steps.find((s) => s.accountId === id) as (typeof steps)[number];

  test("an answer from this check-in reads by its source", () => {
    const c = byId("c");
    const f = stepFigure(c, { accountId: "c", value: 3360, source: "manual" });
    expect(f).toEqual({ value: 3360, source: "manual", fromSession: true });
    expect(doneKind(c, f as NonNullable<typeof f>)).toBe("updated");
  });

  test("a figure recorded before reads as No change when it repeats last month", () => {
    const c = stepFigure(byId("c"), null);
    expect(doneKind(byId("c"), c as NonNullable<typeof c>)).toBe("noChange");
    const v = stepFigure(byId("v"), null);
    expect(doneKind(byId("v"), v as NonNullable<typeof v>)).toBe("updated");
    const m = stepFigure(byId("m"), null);
    expect(doneKind(byId("m"), m as NonNullable<typeof m>)).toBe("calculated");
  });

  test("an open step has no figure", () => {
    expect(stepFigure(byId("p"), null)).toBeNull();
  });
});

describe("summary", () => {
  const steps = buildCheckInSteps(accounts, details, MONTH);
  const answer = (id: string, value: number, source: "manual" | "confirmed" | "calculated") => ({
    accountId: id,
    value,
    source,
  });

  test("lists what changed and net worth against last month under the basis", () => {
    const answers = {
      c: answer("c", 3500, "manual"),
      v: answer("v", 7380, "confirmed"),
      m: answer("m", 185999.56, "calculated"),
    };
    const summary = buildCheckInSummary(
      steps,
      answers,
      accounts,
      details,
      MONTH,
      DEFAULT_NET_WORTH_BASIS,
    );
    expect(summary.changed.map((c) => [c.name, c.value, c.calculated])).toEqual([
      ["Current account", 3500, false],
      ["Residential mortgage", 185999.56, true],
    ]);
    expect(summary.previousMonth).toBe("2026-10");
    // Current account +140 and mortgage 550.44 less owed; accounts not yet checked in count at
    // their saved balance this month (pension +900, car loan 210 less owed): +1,800.44.
    expect(summary.change).toBeCloseTo(1800.44, 2);
    expect(summary.netWorth).not.toBeNull();
  });

  test("with nothing changed the change is zero", () => {
    const answers = Object.fromEntries(
      steps.map((s) => [s.accountId, answerValue(s, { kind: "noChange" }) as never]),
    );
    const summary = buildCheckInSummary(
      steps,
      answers,
      accounts,
      details,
      MONTH,
      DEFAULT_NET_WORTH_BASIS,
    );
    expect(summary.changed).toEqual([]);
    expect(summary.change).toBe(0);
  });
});
