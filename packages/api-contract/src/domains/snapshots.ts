import { z } from "zod";
import { IsoDate, Money, ResponseMoney, Uuid } from "../primitives.js";

/** "YYYY-MM": the calendar month (Europe/London) a monthly snapshot belongs to. */
export const SnapshotMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const SnapshotMonthParams = z.strictObject({ month: SnapshotMonth });

export const SnapshotValue = z.strictObject({
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
export const UpsertSnapshotRequest = z.strictObject({
  values: z.array(SnapshotValue).max(200),
  complete: z.boolean().optional(),
});

/** PUT /snapshots/:month: the stored values (signed by account type) and the check-in flag. */
export const UpsertSnapshotResponse = z.strictObject({
  month: SnapshotMonth,
  values: z.array(
    z.strictObject({
      accountId: Uuid,
      /** As stored: liabilities negative whatever sign was sent. */
      value: ResponseMoney,
      asOfDate: IsoDate,
      source: z.literal("manual"),
    }),
  ),
  completed: z.boolean(),
});
export type UpsertSnapshotResponse = z.infer<typeof UpsertSnapshotResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type UpsertSnapshotRequest = z.infer<typeof UpsertSnapshotRequest>;
export type SnapshotMonthParams = z.infer<typeof SnapshotMonthParams>;
