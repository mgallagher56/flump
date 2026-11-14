import { describe, expect, it } from "vitest";
import {
  type AccountDetailInput,
  addCheckInMonths,
  answerValue,
  buildCheckInRows,
  buildCheckInSteps,
  buildCheckInSummary,
  buildSnapshotPayload,
  CHECK_IN_TYPE_ORDER,
  type CheckInAccountInput,
  checkInHistoryFor,
  checkInPayload,
  compareCheckInMonths,
  doneKind,
  hasSource,
  isCheckInMonth,
  restAnswer,
  resumeIndex,
  statementPromptFor,
  stepFigure,
  toSnapshotRows,
  withoutSource,
} from "./check-in.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";

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

describe("month keys", () => {
  it("recognises, moves and compares months across a year end", () => {
    expect(isCheckInMonth("2026-11")).toBe(true);
    expect(isCheckInMonth("2026-13")).toBe(false);
    expect(addCheckInMonths("2026-12", 1)).toBe("2027-01");
    expect(addCheckInMonths("2026-01", -1)).toBe("2025-12");
    expect(compareCheckInMonths("2025-12", "2026-01")).toBeLessThan(0);
    expect(compareCheckInMonths("2026-01", "2026-01")).toBe(0);
    expect(() => addCheckInMonths("nope", 1)).toThrow();
  });
});

describe("history rows", () => {
  it("lower-cases ids, drops rows without one and reads either id field", () => {
    expect(
      toSnapshotRows([
        { account_id: "ABC", year: 2026, month: 10, value: "12.5" },
        { accountId: "", year: 2026, month: 10, value: 1 },
      ]),
    ).toEqual([{ accountId: "abc", year: 2026, month: 10, value: "12.5" }]);
  });

  it("gives one account's valid months oldest first", () => {
    const rows = checkInHistoryFor("M", [
      row("M", 10, -1),
      row("M", 4, -2, "onboarding"),
      { accountId: "m", year: 2026, month: 13, value: 5 },
      row("C", 9, 3),
    ]);
    expect(rows).toEqual([
      { month: "2026-04", value: -2, source: "onboarding" },
      { month: "2026-10", value: -1, source: "manual" },
    ]);
  });
});

describe("buildCheckInSteps", () => {
  const steps = buildCheckInSteps(accounts, details, MONTH);
  const byId = (id: string) => steps.find((s) => s.accountId === id);

  it("orders day-to-day money first and slow-moving balances last", () => {
    expect(steps.map((s) => s.name)).toEqual([
      "Current account",
      "Easy access savings",
      "Car loan",
      "Workplace pension",
      "Residential mortgage",
      "Student loan",
    ]);
    expect(CHECK_IN_TYPE_ORDER[0]).toBe("Current");
  });

  it("skips connected accounts and puts unknown types last in saved order", () => {
    const s = buildCheckInSteps(
      [
        { id: "X", name: "Odd one", type: "Mystery" },
        { id: "B", name: "Bank", type: "Current", connectionId: "c1" },
        { id: "C", name: "Cash", type: "Current" },
      ],
      [],
      MONTH,
    );
    expect(s.map((x) => x.accountId)).toEqual(["c", "x"]);
  });

  it("shows the saved balance with debts as the positive amount owed, and the last recorded month", () => {
    expect(byId("m")).toMatchObject({ lastValue: 186000, lastMonth: "2026-10", isLiability: true });
  });

  it("calculates a mortgage from the latest recorded figure, not the saved balance", () => {
    // 186,550 + 4.5%/12 interest (699.56) - 1,250 = 185,999.56.
    expect(byId("m")?.calculated).toEqual({
      value: 185999.56,
      baseValue: 186550,
      baseMonth: "2026-10",
      interestRate: 4.5,
      monthlyPayment: 1250,
    });
  });

  it("does not guess: a loan with no payment, and a student loan, have no calculated figure", () => {
    expect(byId("l")?.calculated).toBeNull();
    expect(byId("s")?.calculated).toBeNull();
    expect(byId("s")).toMatchObject({ isLiability: true, lastValue: 38500 });
  });

  it("calculates across a missed month from the latest recorded figure", () => {
    const [m] = buildCheckInSteps([accounts[0]!], [row("M", 9, -187100)], MONTH);
    expect(m?.calculated?.baseMonth).toBe("2026-09");
    expect(m?.calculated?.value).toBe(186001.19);
  });
});

describe("No change repeats the saved balance", () => {
  it("keeps a seeded pension at its saved figure, not the latest recorded month", () => {
    const pension = { id: "P", name: "Pension", type: "Pension", balance: 9000 };
    const [step] = buildCheckInSteps([pension], [row("P", 10, 8740)], MONTH);
    expect(step).toMatchObject({ lastValue: 9000, lastMonth: "2026-10" });
    expect(answerValue(step!, { kind: "noChange" })).toEqual({
      accountId: "p",
      value: 9000,
      source: "confirmed",
    });
  });

  it("falls back to the latest recorded figure before the month with no saved balance", () => {
    const pension = { id: "P", name: "Pension", type: "Pension", balance: null };
    const [step] = buildCheckInSteps(
      [pension],
      [row("P", 9, 8600), row("P", 10, 8740), row("P", 12, 9999)],
      MONTH,
    );
    expect(step).toMatchObject({ lastValue: 8740, lastMonth: "2026-10" });
  });

  it("records nothing with neither a saved balance nor history", () => {
    const [step] = buildCheckInSteps([{ id: "P", name: "Pension", type: "Pension" }], [], MONTH);
    expect(step).toMatchObject({ lastValue: null, lastMonth: null });
    expect(answerValue(step!, { kind: "noChange" })).toBeNull();
  });
});

describe("resume", () => {
  it("starts at the first account with nothing recorded this month", () => {
    const resumed = buildCheckInSteps(
      accounts,
      [...details, row("C", 11, 3400), row("V", 11, 7600, "confirmed")],
      MONTH,
    );
    expect(resumeIndex(resumed)).toBe(2);
    expect(resumed[1]?.recorded).toEqual({ value: 7600, source: "confirmed" });
  });

  it("is past the end when every step is recorded", () => {
    const all = buildCheckInSteps([accounts[2]!], [row("C", 11, 1)], MONTH);
    expect(resumeIndex(all)).toBe(1);
  });
});

describe("answers and payloads", () => {
  const steps = buildCheckInSteps(accounts, details, MONTH);
  const current = steps[0]!;
  const mortgage = steps.find((s) => s.accountId === "m")!;

  it("a typed figure is manual, rounded to pence; No change repeats the saved balance", () => {
    expect(answerValue(current, { kind: "update", value: 3412.505 })).toEqual({
      accountId: "c",
      value: 3412.51,
      source: "manual",
    });
    expect(answerValue(current, { kind: "noChange" })).toEqual({
      accountId: "c",
      value: 3400,
      source: "confirmed",
    });
  });

  it("keeping a calculated figure records it as calculated; typing over it is manual and positive", () => {
    expect(answerValue(mortgage, { kind: "keepCalculated" })).toEqual({
      accountId: "m",
      value: 185999.56,
      source: "calculated",
    });
    expect(answerValue(mortgage, { kind: "update", value: -185900 })).toEqual({
      accountId: "m",
      value: 185900,
      source: "manual",
    });
  });

  it("No change to the rest keeps calculated figures and repeats the others", () => {
    expect(restAnswer(mortgage)).toEqual({ kind: "keepCalculated" });
    expect(restAnswer(current)).toEqual({ kind: "noChange" });
  });

  it("marks the month complete only once every account has a value", () => {
    const one = [answerValue(current, { kind: "noChange" })!];
    expect(checkInPayload(steps, one, new Set(), { withSource: true })).toEqual({
      values: [{ accountId: "c", value: 3400, source: "confirmed" }],
    });
    const all = steps.map((s) => answerValue(s, restAnswer(s))!);
    const payload = checkInPayload(steps, all, new Set(), { withSource: false });
    expect(payload.complete).toBe(true);
    expect(payload.values[0]).toEqual({ accountId: "c", value: 3400 });
  });

  it("withoutSource strips every source for an older backend", () => {
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

describe("statement prompt", () => {
  it("asks once a fixed rate has ended since the last typed figure", () => {
    const [m] = buildCheckInSteps(
      [{ ...accounts[0]!, fixedRateEndDate: "2026-06-30" }],
      [row("M", 5, -188000), row("M", 10, -186550, "calculated")],
      MONTH,
    );
    expect(m?.statementPrompt).toEqual({ kind: "fixedRateEnded", endedMonth: "2026-06" });
  });

  it("asks once a year with no typed figure, and not before", () => {
    expect(buildCheckInSteps([accounts[0]!], details, MONTH)[0]?.statementPrompt).toBeNull();
    const old = buildCheckInSteps(
      [accounts[0]!],
      [{ ...row("M", 10, -190000), year: 2025 }, row("M", 10, -186550, "calculated")],
      MONTH,
    )[0];
    expect(old?.statementPrompt).toEqual({ kind: "yearSinceTyped" });
  });

  it("counts an onboarding figure as typed, and a typed figure after the fixed-rate end clears it", () => {
    const rows = [
      { month: "2026-05", value: -1, source: "onboarding" },
      { month: "2026-08", value: -1, source: "manual" },
    ];
    expect(statementPromptFor({ fixedRateEndDate: "2026-06-30" }, rows, MONTH)).toBeNull();
    expect(statementPromptFor({}, [], MONTH)).toEqual({ kind: "yearSinceTyped" });
  });
});

describe("done steps", () => {
  const steps = buildCheckInSteps(
    accounts,
    [...details, row("C", 11, 3400), row("V", 11, 7500), row("M", 11, -185999.56, "calculated")],
    MONTH,
  );
  const byId = (id: string) => steps.find((s) => s.accountId === id)!;

  it("an answer from this check-in reads by its source", () => {
    const f = stepFigure(byId("c"), { accountId: "c", value: 3400, source: "manual" })!;
    expect(f).toEqual({ value: 3400, source: "manual", fromSession: true });
    expect(doneKind(byId("c"), f)).toBe("updated");
  });

  it("a figure recorded before reads as No change when it repeats the saved balance", () => {
    expect(doneKind(byId("c"), stepFigure(byId("c"), null)!)).toBe("noChange");
    expect(doneKind(byId("v"), stepFigure(byId("v"), null)!)).toBe("updated");
    expect(doneKind(byId("m"), stepFigure(byId("m"), null)!)).toBe("calculated");
  });

  it("an open step has no figure", () => {
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

  it("lists what changed and net worth against last month under the basis", () => {
    const answers = {
      c: answer("c", 3500, "manual"),
      v: answer("v", 7600, "confirmed"),
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
    // Against October: current +140, savings +220, mortgage 550.44 less owed; accounts not yet
    // checked in count at their saved balance (pension +900, car loan 210 less owed): +2,020.44.
    // The student loan is outside the default basis.
    expect(summary.change).toBeCloseTo(2020.44, 2);
    expect(summary.netWorth).toBeCloseTo(3500 + 7600 + 96000 - 185999.56 - 8400, 2);
  });

  it("with every answer No change nothing is listed, and net worth is the saved balances", () => {
    const answers = Object.fromEntries(
      steps.map((s) => [s.accountId, answerValue(s, { kind: "noChange" })!]),
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
    expect(summary.netWorth).toBe(3400 + 7600 + 96000 - 186000 - 8400);
    // The saved balances against October: +40, +220, +550, +900, +210.
    expect(summary.change).toBe(1920);
  });

  it("has no change to show without a month before", () => {
    const summary = buildCheckInSummary(steps, {}, accounts, [], MONTH, DEFAULT_NET_WORTH_BASIS);
    expect(summary.change).toBeNull();
  });
});

describe("the list form (any month)", () => {
  const CURRENT = "a0000000-0000-4000-8000-000000000001";
  const ISA = "a0000000-0000-4000-8000-000000000002";
  const MORTGAGE = "a0000000-0000-4000-8000-000000000003";
  const BANK = "a0000000-0000-4000-8000-000000000004";
  const LOAN = "a0000000-0000-4000-8000-000000000005";
  const list = [
    { id: CURRENT, name: "Current account", type: "Current", balance: 1500 },
    { id: ISA, name: "Stocks ISA", type: "ISA", balance: 20000 },
    { id: MORTGAGE, name: "Mortgage", type: "Mortgage", balance: -180000 },
    { id: BANK, name: "Joint account", type: "Current", balance: 900, connectionId: "c1" },
  ];
  const r = (accountId: string, year: number, month: number, value: number) => ({
    accountId,
    year,
    month,
    value,
  });
  const rowsDetails = [
    r(CURRENT, 2026, 10, 1200),
    r(ISA, 2026, 9, 19000),
    r(MORTGAGE, 2026, 10, -181000),
    r(BANK, 2026, 11, 950),
  ];
  const rowsFor = (d: AccountDetailInput[], month: string, current = "2026-11") =>
    buildCheckInRows(list, d, month, current, DEFAULT_NET_WORTH_BASIS);

  it("prefills last month's value and marks each account's state", () => {
    const by = Object.fromEntries(rowsFor(rowsDetails, "2026-11").map((x) => [x.accountId, x]));
    expect(by[CURRENT]).toMatchObject({
      status: "notUpdated",
      lastRecordedMonth: "2026-10",
      prefill: 1200,
    });
    expect(by[ISA]).toMatchObject({ status: "notUpdated", lastRecordedMonth: "2026-09" });
    expect(by[BANK]).toMatchObject({ status: "connected", isConnected: true, prefill: 950 });
    expect(by[MORTGAGE]).toMatchObject({ isLiability: true, prefill: 181000 });
  });

  it("uses the month's own value when it is already recorded", () => {
    const rows = rowsFor([...rowsDetails, r(CURRENT, 2026, 11, 1600)], "2026-11");
    expect(rows.find((x) => x.accountId === CURRENT)).toMatchObject({
      status: "recorded",
      prefill: 1600,
    });
  });

  it("falls back to the current balance only for the current month", () => {
    expect(rowsFor([], "2026-11").find((x) => x.accountId === ISA)).toMatchObject({
      status: "noHistory",
      prefill: 20000,
    });
    // Back-filling a month before any record never copies today's balance into the past.
    expect(rowsFor(rowsDetails, "2024-03").find((x) => x.accountId === ISA)?.prefill).toBeNull();
  });

  it("matches account ids whatever their case", () => {
    const rows = rowsFor(
      [{ account_id: CURRENT.toUpperCase(), year: 2026, month: 10, value: "1200.50" }],
      "2026-11",
    );
    expect(rows.find((x) => x.accountId === CURRENT)?.prefill).toBe(1200.5);
  });

  it("marks rows outside net worth exactly when the basis leaves their kind out", () => {
    const withLoan = [
      ...list,
      { id: LOAN, name: "Student loan", type: "Student Loan", balance: -25000 },
    ];
    const outside = (basis: { countProperty: boolean; countStudentLoan: boolean }) =>
      buildCheckInRows(withLoan, [], "2026-11", "2026-11", basis)
        .filter((x) => x.outsideNetWorth)
        .map((x) => x.accountId);
    expect(outside(DEFAULT_NET_WORTH_BASIS)).toEqual([LOAN]);
    expect(outside({ countProperty: true, countStudentLoan: true })).toEqual([]);
    expect(outside({ countProperty: false, countStudentLoan: false })).toEqual([MORTGAGE, LOAN]);
  });

  describe("buildSnapshotPayload", () => {
    const rows = rowsFor([], "2026-11");

    it("sends every manual account, leaves connected ones to the sync, and completes the month", () => {
      const { payload, saved, skipped } = buildSnapshotPayload(
        rows,
        { [CURRENT]: 1500, [ISA]: 20100, [MORTGAGE]: 179500, [BANK]: 1 },
        { isCurrentMonth: true },
      );
      expect(saved).toBe(3);
      expect(skipped).toBe(0);
      expect(payload.complete).toBe(true);
      expect(payload.values.map((v) => v.accountId)).not.toContain(BANK);
      // The amount owed goes up positive; the backend signs it by account type (E30 D18).
      expect(payload.values.find((v) => v.accountId === MORTGAGE)?.value).toBe(179500);
    });

    it("allows a partial save: empty fields are skipped and the month is not complete", () => {
      const { payload, saved, skipped } = buildSnapshotPayload(
        rows,
        { [CURRENT]: 1500, [ISA]: null, [MORTGAGE]: undefined },
        { isCurrentMonth: true },
      );
      expect(saved).toBe(1);
      expect(skipped).toBe(2);
      expect(payload).toEqual({ values: [{ accountId: CURRENT, value: 1500 }] });
    });

    it("never marks a back-filled month complete, and rounds to pence", () => {
      const { payload } = buildSnapshotPayload(
        rows,
        { [CURRENT]: 10.005, [ISA]: 1, [MORTGAGE]: -2 },
        { isCurrentMonth: false },
      );
      expect(payload.complete).toBeUndefined();
      expect(payload.values.find((v) => v.accountId === CURRENT)?.value).toBe(10.01);
      expect(payload.values.find((v) => v.accountId === MORTGAGE)?.value).toBe(2);
    });
  });
});
