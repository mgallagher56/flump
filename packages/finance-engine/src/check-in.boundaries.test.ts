import { describe, expect, it } from "vitest";
import {
  type AccountDetailInput,
  addCheckInMonths,
  answerValue,
  buildCheckInRows,
  buildCheckInSteps,
  buildCheckInSummary,
  buildSnapshotPayload,
  type CalculatedBalanceInput,
  type CheckInAccountInput,
  type CheckInHistoryRow,
  type CheckInStep,
  calculateCheckInBalance,
  checkInHistoryFor,
  checkInPayload,
  doneKind,
  hasSource,
  isCheckInMonth,
  monthsBetween,
  selectSavedNetWorthSeries,
  statementPromptFor,
  stepFigure,
  toSnapshotRows,
} from "./check-in.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";

const basis = DEFAULT_NET_WORTH_BASIS;

const step = (overrides: Partial<CheckInStep> = {}): CheckInStep => ({
  accountId: "a",
  name: "Account A",
  type: "Current",
  isLiability: false,
  lastValue: 1000,
  lastMonth: "2026-10",
  calculated: null,
  statementPrompt: null,
  recorded: null,
  ...overrides,
});

const calculated = {
  value: 800,
  baseValue: 1000,
  baseMonth: "2026-09",
  interestRate: 0,
  monthlyPayment: 100,
};

describe("month keys", () => {
  it("accepts only a plain YYYY-MM string", () => {
    expect(isCheckInMonth("2026-11")).toBe(true);
    expect(isCheckInMonth("x2026-11")).toBe(false);
    expect(isCheckInMonth("2026-11x")).toBe(false);
    // A value that is not a string is never a month key, even one that prints as one.
    expect(isCheckInMonth(["2026-11"])).toBe(false);
  });

  it("gives NaN months between when either key is bad", () => {
    expect(monthsBetween("2026-13", "2026-11")).toBeNaN();
    expect(monthsBetween("2026-09", "2026-13")).toBeNaN();
  });

  it("throws naming a bad key when moving a month", () => {
    expect(() => addCheckInMonths("2026-13", 1)).toThrow("Not a month key: 2026-13");
  });
});

describe("calculateCheckInBalance: when a figure is worked out", () => {
  // A £1,000 loan recorded in September, £100 a month at 0%: two payments by November.
  const loan: CalculatedBalanceInput = {
    type: "Loan",
    interestRate: 0,
    monthlyPayment: 100,
    base: { value: -1000, month: "2026-09" },
    month: "2026-11",
  };

  it("works out a 0% loan with no saved balance given", () => {
    // 1000 - 100 - 100 = 800, no interest at 0%.
    expect(calculateCheckInBalance(loan)).toEqual({
      value: 800,
      baseValue: 1000,
      baseMonth: "2026-09",
      interestRate: 0,
      monthlyPayment: 100,
    });
  });

  it("does not guess with a missing, empty or negative rate", () => {
    for (const interestRate of [null, "", -1]) {
      expect(calculateCheckInBalance({ ...loan, interestRate })).toBeNull();
    }
  });

  it("does not guess with a missing, empty, zero or negative payment", () => {
    for (const monthlyPayment of [null, "", 0, -50]) {
      expect(calculateCheckInBalance({ ...loan, monthlyPayment })).toBeNull();
    }
  });

  it("does not guess without a base figure or for a type that cannot be calculated", () => {
    expect(calculateCheckInBalance({ ...loan, base: null })).toBeNull();
    expect(calculateCheckInBalance({ ...loan, type: "Current" })).toBeNull();
  });

  it("does not guess when the base month is not before the month, or is not a month", () => {
    for (const month of ["2026-11", "2026-12", "2026-13"]) {
      expect(calculateCheckInBalance({ ...loan, base: { value: -1000, month } })).toBeNull();
    }
  });
});

describe("checkInHistoryFor: which rows are months", () => {
  it("keeps months 1 and 12 and drops month 0, 13, fractional parts and empty values", () => {
    const d = (year: number, month: number, value: number | string): AccountDetailInput => ({
      accountId: "A",
      year,
      month,
      value,
    });
    const rows = checkInHistoryFor("a", [
      d(2026, 0, 1),
      d(2026, 1, 2),
      d(2026, 12, 3),
      d(2026, 13, 4),
      d(2026.5, 3, 5),
      d(2026, 2.5, 6),
      d(2026, 4, ""),
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-12"]);
  });
});

describe("buildCheckInRows", () => {
  const MONTH = "2026-05";
  const CURRENT = "2026-11";

  it("leaves out an account with no id", () => {
    const rows = buildCheckInRows(
      [
        { name: "No id", type: "Current", balance: 5 },
        { id: "A", type: "Current" },
      ],
      [],
      MONTH,
      CURRENT,
      basis,
    );
    expect(rows.map((r) => r.accountId)).toEqual(["a"]);
  });

  it("names an unnamed account Account, keeps a given name and reads a missing type as other", () => {
    const rows = buildCheckInRows(
      [{ id: "A" }, { id: "B", name: "Holiday pot", type: "Saving" }],
      [],
      MONTH,
      CURRENT,
      basis,
    );
    expect(rows.map((r) => [r.name, r.type])).toEqual([
      ["Account", "other"],
      ["Holiday pot", "Saving"],
    ]);
  });

  it("ignores rows with a bad month or an empty value", () => {
    const rows = buildCheckInRows(
      [{ id: "A", type: "Current" }],
      [
        { accountId: "A", year: 2026, month: 13, value: 10 },
        { accountId: "A", year: 2026, month: 3, value: "" },
      ],
      MONTH,
      CURRENT,
      basis,
    );
    expect(rows[0]).toMatchObject({ status: "noHistory", lastRecordedMonth: null, prefill: null });
  });

  it("prefills from the latest earlier month whatever order the rows come in", () => {
    const march = { accountId: "A", year: 2026, month: 3, value: 300 };
    const january = { accountId: "A", year: 2026, month: 1, value: 100 };
    for (const details of [
      [march, january],
      [january, march],
    ]) {
      const [r] = buildCheckInRows([{ id: "A", type: "Current" }], details, MONTH, CURRENT, basis);
      // March is the latest month before May.
      expect(r).toMatchObject({ status: "notUpdated", lastRecordedMonth: "2026-03", prefill: 300 });
    }
  });

  it("gives the month itself as the last recorded month when only that month is recorded", () => {
    const [r] = buildCheckInRows(
      [{ id: "A", type: "Current" }],
      [{ accountId: "A", year: 2026, month: 5, value: 50 }],
      MONTH,
      CURRENT,
      basis,
    );
    expect(r).toMatchObject({ status: "recorded", lastRecordedMonth: "2026-05", prefill: 50 });
  });

  it("leaves a debt's field empty in a past month with no history", () => {
    const [r] = buildCheckInRows(
      [{ id: "L", type: "Loan", balance: -2000 }],
      [],
      MONTH,
      CURRENT,
      basis,
    );
    expect(r?.prefill).toBeNull();
  });
});

describe("buildSnapshotPayload", () => {
  const rows = buildCheckInRows([{ id: "A", type: "Current" }], [], "2026-11", "2026-11", basis);

  it("skips a value that is not a finite number", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = buildSnapshotPayload(rows, { a: v }, { isCurrentMonth: true });
      expect(result).toEqual({ payload: { values: [] }, saved: 0, skipped: 1 });
    }
  });

  it("does not mark the month complete when every account is connected", () => {
    const connected = buildCheckInRows(
      [{ id: "C", type: "Current", connectionId: "conn" }],
      [],
      "2026-11",
      "2026-11",
      basis,
    );
    const result = buildSnapshotPayload(connected, {}, { isCurrentMonth: true });
    expect(result.payload).toEqual({ values: [] });
  });
});

describe("buildCheckInSteps", () => {
  it("orders every known type by how often it changes", () => {
    const types = [
      "Student Loan",
      "Mortgage",
      "Property",
      "Pension",
      "Loan",
      "Owed",
      "Investment",
      "Overdraft",
      "Credit Card",
      "Saving",
      "Current",
    ];
    const accounts: CheckInAccountInput[] = types.map((type, i) => ({ id: `x${i}`, type }));
    expect(buildCheckInSteps(accounts, [], "2026-11").map((s) => s.type)).toEqual([
      "Current",
      "Saving",
      "Credit Card",
      "Overdraft",
      "Investment",
      "Owed",
      "Loan",
      "Pension",
      "Property",
      "Mortgage",
      "Student Loan",
    ]);
  });

  it("puts a student loan before an account of an unknown type", () => {
    // Student Loan is the last known type; unknown types come after every known one.
    const accounts: CheckInAccountInput[] = [
      { id: "u", type: "Crypto wallet" },
      { id: "s", type: "Student Loan" },
    ];
    expect(buildCheckInSteps(accounts, [], "2026-11").map((s) => s.accountId)).toEqual(["s", "u"]);
  });

  it("keeps accounts of the same type in saved order", () => {
    const accounts: CheckInAccountInput[] = ["x", "y", "z"].map((id) => ({ id, type: "Current" }));
    expect(buildCheckInSteps(accounts, [], "2026-11").map((s) => s.accountId)).toEqual([
      "x",
      "y",
      "z",
    ]);
  });

  it("names an unnamed account Account and reads a missing type as other", () => {
    const [s] = buildCheckInSteps([{ id: "A" }], [], "2026-11");
    expect(s).toMatchObject({ name: "Account", type: "other" });
  });

  it("takes the last figure from before the month, not the month itself", () => {
    const [s] = buildCheckInSteps(
      [{ id: "A", type: "Current" }],
      [
        { accountId: "A", year: 2026, month: 10, value: 1000, source: "manual" },
        { accountId: "A", year: 2026, month: 11, value: 1200, source: "manual" },
      ],
      "2026-11",
    );
    expect(s).toMatchObject({ lastValue: 1000, lastMonth: "2026-10" });
  });
});

describe("statementPromptFor", () => {
  const typed = (month: string, source = "manual"): CheckInHistoryRow => ({
    month,
    value: -1000,
    source,
  });

  it("counts an onboarding figure as typed", () => {
    // Typed in June, checking in November: 5 months, under a year, no fixed-rate end.
    expect(statementPromptFor({}, [typed("2026-06", "onboarding")], "2026-11")).toBeNull();
  });

  it("does not prompt for a fixed-rate end in the check-in month itself", () => {
    // The end (November) has not passed by November; the last typed figure is 1 month old.
    expect(
      statementPromptFor({ fixedRateEndDate: "2026-11-15" }, [typed("2026-10")], "2026-11"),
    ).toBeNull();
  });

  it("prompts for a passed fixed-rate end when nothing has been typed", () => {
    expect(statementPromptFor({ fixedRateEndDate: "2026-03-31" }, [], "2026-11")).toEqual({
      kind: "fixedRateEnded",
      endedMonth: "2026-03",
    });
  });

  it("prompts for a fixed-rate end in the same month as the last typed figure", () => {
    // Typed in March, the fix ended in March: no typed figure is from after the end. Without
    // this the prompt would be skipped, as March to November is 8 months, under a year.
    expect(
      statementPromptFor({ fixedRateEndDate: "2026-03-31" }, [typed("2026-03")], "2026-11"),
    ).toEqual({ kind: "fixedRateEnded", endedMonth: "2026-03" });
  });

  it("prompts at exactly 12 months since the last typed figure, not at 11", () => {
    // 2025-11 to 2026-11 is 12 months; 2025-12 to 2026-11 is 11.
    expect(statementPromptFor({}, [typed("2025-11")], "2026-11")).toEqual({
      kind: "yearSinceTyped",
    });
    expect(statementPromptFor({}, [typed("2025-12")], "2026-11")).toBeNull();
  });

  it("reads a fixed-rate end only from a date at the start of the text", () => {
    // "ends 2026-03-31" is not read as a March end. Typed in February, checking in November:
    // 9 months, under a year, so no prompt. Read as a March end it would prompt, as February
    // is before March.
    expect(
      statementPromptFor({ fixedRateEndDate: "ends 2026-03-31" }, [typed("2026-02")], "2026-11"),
    ).toBeNull();
  });
});

describe("toSnapshotRows", () => {
  it("drops a row with neither id field", () => {
    expect(toSnapshotRows([{ year: 2026, month: 1, value: 5 }])).toEqual([]);
  });
});

describe("answers and payloads", () => {
  it("No change repeats the last figure even when a calculated one is offered", () => {
    expect(answerValue(step({ calculated }), { kind: "noChange" })).toEqual({
      accountId: "a",
      value: 1000,
      source: "confirmed",
    });
  });

  it("keeping a calculated figure that is not there repeats the last figure", () => {
    expect(answerValue(step(), { kind: "keepCalculated" })).toEqual({
      accountId: "a",
      value: 1000,
      source: "confirmed",
    });
  });

  it("marks the month complete when the other steps were already recorded", () => {
    const steps = [
      step({ accountId: "a", recorded: { value: 5, source: "manual" } }),
      step({ accountId: "b" }),
    ];
    const payload = checkInPayload(
      steps,
      [{ accountId: "b", value: 7, source: "manual" }],
      new Set(["b"]),
      { withSource: false },
    );
    expect(payload.complete).toBe(true);
  });

  it("does not mark the month complete while a step has no value", () => {
    const steps = [step({ accountId: "a" }), step({ accountId: "b" })];
    const payload = checkInPayload(
      steps,
      [{ accountId: "a", value: 7, source: "manual" }],
      new Set(["a"]),
      { withSource: false },
    );
    expect(payload.complete).toBeUndefined();
  });

  it("does not mark the month complete with no values to save", () => {
    const steps = [step({ recorded: { value: 5, source: "manual" } })];
    expect(checkInPayload(steps, [], new Set(), { withSource: true }).complete).toBeUndefined();
  });

  it("says a payload has a source when any one value carries it", () => {
    expect(
      hasSource({
        values: [
          { accountId: "a", value: 1, source: "manual" },
          { accountId: "b", value: 2 },
        ],
      }),
    ).toBe(true);
  });
});

describe("stepFigure and doneKind", () => {
  it("keeps a recorded confirmed or manual source", () => {
    expect(stepFigure(step({ recorded: { value: 5, source: "confirmed" } }), null)?.source).toBe(
      "confirmed",
    );
    expect(stepFigure(step({ recorded: { value: 5, source: "manual" } }), null)?.source).toBe(
      "manual",
    );
  });

  it("keeps a recorded calculated source and drops a source it does not know", () => {
    expect(stepFigure(step({ recorded: { value: 5, source: "calculated" } }), null)?.source).toBe(
      "calculated",
    );
    expect(
      stepFigure(step({ recorded: { value: 5, source: "backfill" } }), null)?.source,
    ).toBeNull();
    expect(stepFigure(step({ recorded: { value: 5, source: null } }), null)?.source).toBeNull();
  });

  it("reads a confirmed answer from this check-in as No change", () => {
    expect(doneKind(step(), { value: 1000, source: "confirmed", fromSession: true })).toBe(
      "noChange",
    );
  });

  it("reads a recorded 0 with no source as Updated when there is no last figure", () => {
    expect(
      doneKind(step({ lastValue: null }), { value: 0, source: null, fromSession: false }),
    ).toBe("updated");
  });
});

describe("buildCheckInSummary: the changed list", () => {
  const summary = (s: CheckInStep, value: number, source: "manual" | "confirmed") =>
    buildCheckInSummary([s], { a: { accountId: "a", value, source } }, [], [], "2026-11", basis)
      .changed;

  it("never lists a confirmed answer, even one that differs from the last figure", () => {
    expect(summary(step({ lastValue: 1000 }), 900, "confirmed")).toEqual([]);
  });

  it("lists a difference of exactly £1 and not one of 50p", () => {
    // 101 - 100 = 1, which is £1 or more; 100.5 - 100 = 0.5 is under £1.
    expect(summary(step({ lastValue: 100 }), 101, "manual")).toHaveLength(1);
    expect(summary(step({ lastValue: 100 }), 100.5, "manual")).toEqual([]);
  });

  it("lists any typed figure when there was no last figure", () => {
    expect(summary(step({ lastValue: null }), 0.5, "manual")).toEqual([
      { accountId: "a", name: "Account A", value: 0.5, previous: null, calculated: false },
    ]);
  });
});

describe("buildCheckInSummary: net worth", () => {
  it("compares with the month before, keeping a recorded row nobody re-answered", () => {
    // October 1000, November already recorded as 1200, nothing answered now.
    const accounts: CheckInAccountInput[] = [{ id: "A", type: "Current" }];
    const details: AccountDetailInput[] = [
      { accountId: "A", year: 2026, month: 10, value: 1000, source: "manual" },
      { accountId: "A", year: 2026, month: 11, value: 1200, source: "manual" },
    ];
    const steps = buildCheckInSteps(accounts, details, "2026-11");
    const result = buildCheckInSummary(steps, {}, accounts, details, "2026-11", basis);
    // November 1200 against October 1000: a change of 200.
    expect(result).toMatchObject({ netWorth: 1200, change: 200, previousMonth: "2026-10" });
  });

  it("uses only this month's rows, so saved balances still fill the month", () => {
    // A: October 1000, answered 1500 now; it also has rows in December 2026 and November 2027,
    // which are not part of this check-in. B: October 500, saved balance 800, no November row.
    const accounts: CheckInAccountInput[] = [
      { id: "A", type: "Current" },
      { id: "B", type: "Saving", balance: 800 },
    ];
    const details: AccountDetailInput[] = [
      { accountId: "A", year: 2026, month: 10, value: 1000 },
      { accountId: "A", year: 2026, month: 12, value: 3000 },
      { accountId: "A", year: 2027, month: 11, value: 3500 },
      { accountId: "B", year: 2026, month: 10, value: 500 },
    ];
    const steps = buildCheckInSteps(accounts, details, "2026-11");
    const result = buildCheckInSummary(
      steps,
      { a: { accountId: "a", value: 1500, source: "manual" } },
      accounts,
      details,
      "2026-11",
      basis,
    );
    // November: A 1500 + B's saved balance 800 = 2300. October: 1000 + 500 = 1500. Change 800.
    expect(result).toMatchObject({ netWorth: 2300, change: 800 });
  });

  it("leaves out another account's rows from other months and years", () => {
    // A: October 1000, December 3000, answered 1500 now. B: October 500, saved balance 800.
    // C (not answered): October 200, December 2026 250, November 2027 260. Only rows for
    // November 2026 belong to this check-in, so B shows its saved balance and C carries 200.
    const accounts: CheckInAccountInput[] = [
      { id: "A", type: "Current" },
      { id: "B", type: "Saving", balance: 800 },
      { id: "C", type: "Current" },
    ];
    const details: AccountDetailInput[] = [
      { accountId: "A", year: 2026, month: 10, value: 1000 },
      { accountId: "A", year: 2026, month: 12, value: 3000 },
      { accountId: "B", year: 2026, month: 10, value: 500 },
      { accountId: "C", year: 2026, month: 10, value: 200 },
      { accountId: "C", year: 2026, month: 12, value: 250 },
      { accountId: "C", year: 2027, month: 11, value: 260 },
    ];
    const steps = buildCheckInSteps(accounts, details, "2026-11");
    const result = buildCheckInSummary(
      steps,
      { a: { accountId: "a", value: 1500, source: "manual" } },
      accounts,
      details,
      "2026-11",
      basis,
    );
    // November: 1500 + 800 + 200 = 2500. October: 1000 + 500 + 200 = 1700. Change 800.
    expect(result).toMatchObject({ netWorth: 2500, change: 800 });
  });

  it("gives no change when nothing was recorded before the month", () => {
    const accounts: CheckInAccountInput[] = [{ id: "A", type: "Current", balance: 500 }];
    const steps = buildCheckInSteps(accounts, [], "2026-11");
    const result = buildCheckInSummary(
      steps,
      { a: { accountId: "a", value: 600, source: "manual" } },
      accounts,
      [],
      "2026-11",
      basis,
    );
    expect(result).toMatchObject({ netWorth: 600, change: null });
  });
});

describe("selectSavedNetWorthSeries", () => {
  it("counts an ISA marked joint in full, as an ISA is held by one person", () => {
    // UK ISAs are individual only, so the joint 50% share does not apply: 10000 counts in full.
    const series = selectSavedNetWorthSeries(
      [
        {
          id: "I",
          name: "Cash ISA",
          type: "Saving",
          ownership: "joint",
          sharePercent: 50,
          balance: 10000,
        },
      ],
      [{ accountId: "I", year: 2026, month: 10, value: 10000 }],
      "2026-11",
      basis,
    );
    expect(series.map((p) => p.netWorth)).toEqual([10000, 10000]);
  });
});
