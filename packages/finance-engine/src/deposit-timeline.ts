export interface DepositTimelineInput {
  /** The deposit the user is modelling, in pounds. */
  target: number;
  /** What is saved already, in pounds. */
  starting: number;
  /** Saved each month, in pounds. */
  monthly: number;
}

export type DepositTimelineResult =
  | { status: "reached" }
  | { status: "not-reachable" }
  | { status: "months"; months: number };

/**
 * Whole months of saving until a target is met (E32). Plain arithmetic: no interest, no bonus,
 * no inflation. An illustration only; Flump never suggests a target.
 */
export function monthsToTarget({
  target,
  starting,
  monthly,
}: DepositTimelineInput): DepositTimelineResult {
  if (!Number.isFinite(target) || !Number.isFinite(starting)) return { status: "not-reachable" };
  if (starting >= target) return { status: "reached" };
  if (!Number.isFinite(monthly) || monthly <= 0) return { status: "not-reachable" };
  return { status: "months", months: Math.ceil((target - starting) / monthly) };
}
