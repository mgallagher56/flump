import { z } from "zod";
import { IsoDate, Money, ResponseMoney, Uuid } from "../primitives.js";

/** "YYYY-MM": the calendar month (Europe/London) a monthly snapshot belongs to. */
export const SnapshotMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const SnapshotMonthParams = z.strictObject({ month: SnapshotMonth });

/** The sources a client may send through `PUT /snapshots/:month`. */
export const SNAPSHOT_WRITE_SOURCES = ["manual", "confirmed", "calculated"] as const;
export const SnapshotWriteSource = z.enum(SNAPSHOT_WRITE_SOURCES);
export type SnapshotWriteSource = z.infer<typeof SnapshotWriteSource>;

export const SnapshotValue = z.strictObject({
  accountId: Uuid,
  /** Signed, like an account balance. Liabilities are stored positive and signed by account type. */
  value: Money,
  /** A date inside `month`. Omitted means the last day of the month (today for the current month). */
  asOfDate: IsoDate.optional(),
  /**
   * How the figure was given (R2-5 check-in): typed (`manual`, the default), "No change"
   * (`confirmed`) or a kept calculated loan balance (`calculated`, recomputed by the server).
   * Other sources are set by the server only.
   */
  source: SnapshotWriteSource.optional(),
});

/**
 * PUT /snapshots/:month. A batch upsert of account values for one month. Partial is allowed
 * (accounts not listed are untouched) and past months may be edited. `complete: true` also records
 * the check-in for the month.
 *
 * Without `If-Match` the latest write wins. With it (BE-16), the header lists the ETag of every
 * row for this month the client has read (`"<updatedAt>"` of each account detail, comma
 * separated). The write is refused with 412 `precondition_failed` when a row it would replace has
 * a version that is not in the list, unless that row already holds the same value, date and
 * source (a repeat of a save whose answer was lost). A row that does not exist yet is always
 * written. The answer's `ETag` is the version of every row this request wrote.
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
      source: SnapshotWriteSource,
    }),
  ),
  completed: z.boolean(),
});
export type UpsertSnapshotResponse = z.infer<typeof UpsertSnapshotResponse>;

/**
 * GET /snapshots/check-ins: the latest month whose check-in was finished (`snapshot_checkins`),
 * or null when none is. The check-in reminder reads it (system audit slice 4, L70), so a balance
 * recorded some other way (a new account, an edit) does not hide the reminder.
 */
export const SnapshotCheckInsResponse = z.strictObject({
  latestCompletedMonth: SnapshotMonth.nullable(),
});
export type SnapshotCheckInsResponse = z.infer<typeof SnapshotCheckInsResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type UpsertSnapshotRequest = z.infer<typeof UpsertSnapshotRequest>;
export type SnapshotMonthParams = z.infer<typeof SnapshotMonthParams>;
