import { buildCheckInSteps, type CheckInAccountInput } from "@flump/finance-engine";
import { describe, expect, test } from "vitest";
import { CHECK_IN_SENDS_SOURCE, calculatedExplain, statementPromptText } from "./checkInModel";

// The check-in's rules are tested in packages/finance-engine/src/check-in.test.ts. These tests
// cover the web's words only.

const MONTH = "2026-11";

const mortgage: CheckInAccountInput = {
  id: "M",
  name: "Residential mortgage",
  type: "Mortgage",
  balance: -186000,
  interestRate: 4.5,
  monthlyContribution: 1250,
};

const row = (month: number, value: number, source = "manual") => ({
  accountId: "m",
  year: 2026,
  month,
  value,
  source,
});

describe("check-in wording", () => {
  test("explains a calculated figure from the rate, the payment and the base month", () => {
    const [m] = buildCheckInSteps([mortgage], [row(10, -186550)], MONTH);
    expect(calculatedExplain(m!.calculated!)).toBe(
      "From your interest rate of 4.5% and monthly payment of £1,250 since October 2026.",
    );
  });

  test("words the fixed-rate statement prompt", () => {
    expect(statementPromptText({ kind: "fixedRateEnded", endedMonth: "2026-06" })).toBe(
      "Your fixed rate ended in June 2026, so the rate may have changed. Worth checking it against a statement.",
    );
  });

  test("words the yearly statement prompt", () => {
    expect(statementPromptText({ kind: "yearSinceTyped" })).toBe(
      "It has been a year since you entered this balance yourself. Worth checking it against a statement.",
    );
  });

  test("values are sent with their source", () => {
    expect(CHECK_IN_SENDS_SOURCE).toBe(true);
  });
});
