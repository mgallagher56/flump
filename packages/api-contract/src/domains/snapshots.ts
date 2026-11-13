import { z } from "zod";
import { IsoDate, Money, Uuid } from "../primitives.js";

/** "YYYY-MM": the calendar month (Europe/London) a monthly snapshot belongs to. */
export const SnapshotMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const SnapshotMonthParams = z.object({ month: SnapshotMonth });

export const SnapshotValue = z.object({
  accountId: Uuid,
  /** Signed, like an account balance. Liabilities are stored positive and signed by account type. */
  value: Money,
  /** A date inside `month`. Omitted means the last day of the month (today for the current month). */
  asOfDate: IsoDate.optional(),
});

/**
 * PUT /snapshots/:month. A batch upsert of account values for one month. Partial is allowed
 * (accounts not listed are untouched), the latest write wins, and past months may be edited.
 * `complete: true` also records the check-in for the month.
 */
export const UpsertSnapshotRequest = z.object({
  values: z.array(SnapshotValue).max(200),
  complete: z.boolean().optional(),
});
