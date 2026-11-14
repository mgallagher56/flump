import {
  type CalculatedFigure,
  type CheckInAccountInput,
  calculateCheckInBalance,
  type StatementPrompt,
} from "@flump/finance-engine";
import { formatMonth, type MonthKey } from "./snapshotModel";

/**
 * The account-by-account monthly check-in (R2-5, owner-approved design). The pure rules (the
 * steps, their order, the calculated figure, the answers, the payloads and the summary) live in
 * `@flump/finance-engine` so the mobile app shares them; this module re-exports them and adds the
 * web's words. Every write goes through the existing `PUT /snapshots/:month` upsert.
 */

export {
  answerValue,
  buildCheckInSteps,
  buildCheckInSummary,
  type CalculatedFigure,
  CHECK_IN_TYPE_ORDER,
  type CheckInAccountInput,
  type CheckInAnswer,
  type CheckInChange,
  type CheckInHistoryRow,
  type CheckInSource,
  type CheckInStep,
  type CheckInSummary,
  type CheckInValue,
  checkInPayload,
  type DoneKind,
  doneKind,
  hasSource,
  restAnswer,
  resumeIndex,
  type StatementPrompt,
  type StepFigure,
  statementPromptFor,
  stepFigure,
  withoutSource,
} from "@flump/finance-engine";

/**
 * Send each value's `source` with the save (`PUT /snapshots/:month` accepts it, and checks a
 * `calculated` value against the engine to the penny). An older backend that rejects `source`
 * gets the same save again without it (see `withoutSource`).
 */
export const CHECK_IN_SENDS_SOURCE = true;

/**
 * The calculated balance for a loan or mortgage: the latest recorded figure before `month`, with
 * one month of interest and one regular payment for each month since (the engine's amortisation).
 * Null when the rate, the payment or a base figure is missing: the check-in never guesses.
 */
export function calculateBalance(
  account: CheckInAccountInput,
  base: { value: number; month: MonthKey } | null,
  month: MonthKey,
): CalculatedFigure | null {
  return calculateCheckInBalance({
    type: account.type,
    interestRate: account.interestRate,
    monthlyPayment: account.monthlyContribution,
    base,
    month,
  });
}

/** "From your interest rate of 4.5% and monthly payment of £1,250 since October 2026." */
export function calculatedExplain(c: CalculatedFigure): string {
  const pct = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(c.interestRate);
  const pay = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(c.monthlyPayment);
  return `From your interest rate of ${pct}% and monthly payment of ${pay} since ${formatMonth(c.baseMonth)}.`;
}

/** The statement prompt's words. Plain, no alarm. */
export function statementPromptText(p: StatementPrompt): string {
  return p.kind === "fixedRateEnded"
    ? `Your fixed rate ended in ${formatMonth(p.endedMonth)}, so the rate may have changed. Worth checking it against a statement.`
    : "It has been a year since you entered this balance yourself. Worth checking it against a statement.";
}
