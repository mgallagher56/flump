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
  /** The save is a monthly check-in answer: with at least one value it starts the month's check-in. */
  checkIn: z.boolean().optional(),
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
  /**
   * The latest month a check-in was started for, finished or not (CH-3). Optional so a web app
   * newer than the backend still reads the answer; absent reads as unknown.
   */
  latestStartedMonth: SnapshotMonth.nullable().optional(),
});
export type SnapshotCheckInsResponse = z.infer<typeof SnapshotCheckInsResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type UpsertSnapshotRequest = z.infer<typeof UpsertSnapshotRequest>;
export type SnapshotMonthParams = z.infer<typeof SnapshotMonthParams>;

// --- E35 W5: the two optional questions after a check-in (plan section 7) ---

/** The three answers to "After this check-in, how do you feel about your money?". */
export const WELLBEING_FEELINGS = ["more_in_control", "about_the_same", "more_worried"] as const;
export const WellbeingFeeling = z.enum(WELLBEING_FEELINGS);
export type WellbeingFeeling = z.infer<typeof WellbeingFeeling>;

/** Longest answer to "Did anything here make you feel worse? Tell us what." */
export const WELLBEING_TEXT_MAX_LENGTH = 1000;

/**
 * GET /snapshots/wellbeing-questions: whether to offer the two questions after this check-in.
 * True only when they are not paused for everyone, the person has them switched on, and nothing
 * (an answer or a skip) is recorded for the current quarter (Europe/London).
 */
export const WellbeingQuestionsStatusResponse = z.strictObject({ due: z.boolean() });
export type WellbeingQuestionsStatusResponse = z.infer<typeof WellbeingQuestionsStatusResponse>;

/**
 * POST /snapshots/wellbeing-questions: the answer for the current quarter, which the server
 * works out. Both null records a skip. The first record of a quarter stands; a repeat changes
 * nothing. The text is personal data that may be sensitive: never logged or sent anywhere else.
 */
export const AnswerWellbeingQuestionsRequest = z.strictObject({
  feeling: WellbeingFeeling.nullable(),
  /** Trimmed; an empty answer is stored as null. */
  worseText: z.string().trim().max(WELLBEING_TEXT_MAX_LENGTH).nullable(),
});
export type AnswerWellbeingQuestionsRequest = z.infer<typeof AnswerWellbeingQuestionsRequest>;

/** `recorded`: false when the quarter already had a record, or the questions are off or paused. */
export const AnswerWellbeingQuestionsResponse = z.strictObject({ recorded: z.boolean() });
export type AnswerWellbeingQuestionsResponse = z.infer<typeof AnswerWellbeingQuestionsResponse>;
