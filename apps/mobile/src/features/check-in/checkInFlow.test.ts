import { checkInRow } from "./checkInFlow";
import { household, MONTH } from "./checkInTestData";
import type { CheckInInputs } from "./useCheckInData";

const inputs = (over: Partial<CheckInInputs> = {}): CheckInInputs => {
  const h = household();
  return {
    month: MONTH,
    today: "2026-11-20",
    accounts: h.accounts,
    details: h.details,
    basis: { countProperty: true, countStudentLoan: false },
    checkInDay: null,
    latestCompletedMonth: "2026-10",
    latestStartedMonth: "2026-10",
    ...over,
  };
};

describe("checkInRow", () => {
  it("says Start when the month is due and nothing was saved in it", () => {
    expect(checkInRow({ status: "ready", inputs: inputs() }, MONTH)).toEqual({
      action: "Start monthly check-in",
      line: "Last check-in: October 2026",
    });
  });

  it("says Continue when the engine says the month is part done", () => {
    const base = inputs();
    const current = base.accounts.find((a) => a.name === "Current account");
    const details = [
      ...base.details,
      {
        id: 999,
        accountId: String(current?.id),
        userId: "user_x",
        year: 2026,
        month: 11,
        value: 1300,
        asOfDate: "2026-11-20",
        source: "manual" as const,
        importBatchId: null,
        updatedAt: "2026-11-20T12:00:00.000Z",
      },
    ];
    const row = checkInRow(
      { status: "ready", inputs: { ...base, details, latestStartedMonth: MONTH } },
      MONTH,
    );
    expect(row?.action).toBe("Continue check-in");
  });

  it("a figure saved this month without a started check-in still says Start (CH-3)", () => {
    const base = inputs();
    const id = String(base.accounts[0]?.id);
    const details = [
      ...base.details,
      {
        id: 999,
        accountId: id,
        userId: "user_x",
        year: 2026,
        month: 11,
        value: 1,
        asOfDate: "2026-11-20",
        source: "manual" as const,
        importBatchId: null,
        updatedAt: "2026-11-20T12:00:00.000Z",
      },
    ];
    expect(checkInRow({ status: "ready", inputs: { ...base, details } }, MONTH)?.action).toBe(
      "Start monthly check-in",
    );
  });

  it("shows nothing once this month's check-in is finished", () => {
    expect(
      checkInRow({ status: "ready", inputs: inputs({ latestCompletedMonth: MONTH }) }, MONTH),
    ).toBeNull();
  });

  it("before the check-in day, with last month done, shows nothing", () => {
    // Day 25 is after today (the 20th) and October is done, so November is not due yet.
    expect(checkInRow({ status: "ready", inputs: inputs({ checkInDay: 25 }) }, MONTH)).toBeNull();
  });

  it("with no check-in ever, says so", () => {
    expect(
      checkInRow(
        {
          status: "ready",
          inputs: inputs({ latestCompletedMonth: null, latestStartedMonth: null }),
        },
        MONTH,
      )?.line,
    ).toBe("No monthly check-in yet");
  });

  it("when the reads failed it still shows Start (unknown shows it, as on web)", () => {
    expect(checkInRow({ status: "error", problem: "unavailable", retry: () => {} }, MONTH)).toEqual(
      {
        action: "Start monthly check-in",
        line: "Record your November balances",
      },
    );
  });

  it("while loading, nothing yet", () => {
    expect(checkInRow({ status: "loading" }, MONTH)).toBeNull();
  });
});
