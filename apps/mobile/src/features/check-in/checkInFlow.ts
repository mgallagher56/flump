/**
 * The account-by-account check-in on a phone (plan 9.6), as web's `useCheckIn` runs it (#709,
 * #727): one card per account in the engine's order, Update or No change (Keep this figure on a
 * calculated loan), the one-press keep for the rest, and the summary once every account has a
 * figure. Every rule (the steps, the calculated figure, the answers, the payloads, whether the
 * check-in is part done and the summary) comes from `@flump/finance-engine`; this module only holds
 * which card shows and what is saving. The app does no arithmetic and holds no copy of the rules.
 */
import {
  answerValue,
  buildCheckInSteps,
  buildCheckInSummary,
  type CheckInAnswer,
  type CheckInMonth,
  type CheckInStep,
  type CheckInSummary,
  type CheckInValue,
  compareCheckInMonths,
  isCheckInDue,
  type StepFigure,
  selectCheckInPartDone,
  stepFigure,
} from "@flump/finance-engine/check-in";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHECK_IN, rowLine } from "../../copy/checkIn";
import type { CheckInDataState, CheckInInputs } from "./useCheckInData";
import type { SaveCheckIn } from "./useSaveCheckIn";

/* ------------------------------------------------------------------------------------------ */
/* The row on the signed-in screen                                                             */
/* ------------------------------------------------------------------------------------------ */

export interface CheckInRowView {
  /** "Start monthly check-in" or "Continue check-in" (from `selectCheckInPartDone`). */
  action: string;
  line: string;
}

/**
 * The row, or null when no check-in is due. As web's `CheckInRow`: due from the saved check-in day
 * and the latest finished check-in (CH-3); "Continue check-in" only when the engine says the month
 * is part done. When the reads failed, the row still shows: unknown shows it, as on web, and the
 * check-in screen then says what went wrong. While loading, nothing shows yet.
 */
export function checkInRow(
  state: CheckInDataState,
  now: { today: string; month: CheckInMonth },
): CheckInRowView | null {
  // Not set up: Home shows the way to set up instead of a row.
  if (state.status === "loading" || state.status === "notSetUp") return null;
  if (state.status === "error") {
    return { action: CHECK_IN.start, line: rowLine(now.month, undefined) };
  }
  const { inputs } = state;
  // Today is read on every render, not when the data arrived: the screen can stay open for days.
  const due = isCheckInDue({
    today: now.today,
    checkInDay: inputs.checkInDay,
    lastRecordedMonth: inputs.latestCompletedMonth,
  });
  if (!due) return null;
  const partDone = selectCheckInPartDone({
    accounts: inputs.accounts,
    details: inputs.details,
    currentMonth: now.month,
    latestStartedMonth: inputs.latestStartedMonth,
    latestCompletedMonth: inputs.latestCompletedMonth,
  });
  return {
    action: partDone ? CHECK_IN.continue : CHECK_IN.start,
    line: rowLine(now.month, inputs.latestCompletedMonth),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* The walk-through                                                                            */
/* ------------------------------------------------------------------------------------------ */

export interface CheckInFlow {
  month: CheckInMonth;
  steps: readonly CheckInStep[];
  /** The card showing. */
  index: number;
  setIndex(index: number): void;
  /** The figure a step holds for the month: saved in this check-in, saving, or recorded before. */
  figure(accountId: string): StepFigure | null;
  /** Has a figure and is not reopened with Change. */
  isDone(accountId: string): boolean;
  isSaving(accountId: string): boolean;
  hasError(accountId: string): boolean;
  /** Reopen a done card to correct it. */
  edit(accountId: string): void;
  /** The typed figure for a card, null when the field is blank (never 0). */
  draft(accountId: string): number | null;
  setDraft(accountId: string, value: number | null): void;
  /** Saves one answer (one PUT), then moves to the next open card. Resolves true once saved. */
  answer(step: CheckInStep, answer: CheckInAnswer): Promise<boolean>;
  /** Saves the answer that failed again. */
  retry(step: CheckInStep): Promise<boolean>;
  /** The first open card after `from`, wrapping, or -1 when every card is done. */
  nextOpen(from: number, skip?: string): number;
  /** Open cards one press can keep as they are: a saved balance, no calculated figure, nothing typed. */
  keepable: readonly CheckInStep[];
  /** Saves No change for every keepable card in one PUT. Resolves to how many it kept (0 on failure). */
  keepRest(): Promise<number>;
  /** How many the last keep kept, for the line that says so, or null. */
  kept: number | null;
  /** Every card is saved: the summary shows. */
  finished: boolean;
  summary: CheckInSummary | null;
  /** Every card has a figure, but the month's check-in is not finished (web's Finish check-in). */
  canFinish: boolean;
  finish(): Promise<boolean>;
  finishFailed: boolean;
  /** From the summary back to the cards ("Change a balance"). */
  reopen(): void;
  /** Anything was saved: the caller reads the saved data again when the check-in closes. */
  saved: boolean;
}

const omit = <T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  if (!(key in record)) return record as Record<string, T>;
  const next = { ...record };
  delete next[key];
  return next;
};

const omitAll = <T>(record: Readonly<Record<string, T>>, keys: readonly string[]) =>
  keys.reduce<Record<string, T>>((r, k) => omit(r, k), record as Record<string, T>);

export function useCheckInFlow(inputs: CheckInInputs, saver: SaveCheckIn): CheckInFlow {
  const { month, accounts, details, basis } = inputs;
  const steps = useMemo(
    () => buildCheckInSteps(accounts, details, month),
    [accounts, details, month],
  );
  const checkedIn =
    inputs.latestCompletedMonth !== null &&
    compareCheckInMonths(inputs.latestCompletedMonth, month) >= 0;

  const [answers, setAnswers] = useState<Record<string, CheckInValue>>({});
  const [pending, setPending] = useState<Record<string, CheckInValue>>({});
  const [failed, setFailed] = useState<Record<string, CheckInAnswer>>({});
  const [editing, setEditing] = useState<Record<string, true>>({});
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});
  const [kept, setKept] = useState<number | null>(null);
  const [finishFailed, setFinishFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  // A resumed check-in opens at the first card with nothing recorded this month; the summary opens
  // only when the month's check-in was finished (a history row alone is not a check-in, CH-3).
  const [index, setIndex] = useState(() => {
    const first = steps.findIndex((s) => s.recorded === null);
    return first === -1 ? 0 : first;
  });
  const [finished, setFinished] = useState(
    () => steps.length > 0 && steps.every((s) => s.recorded !== null) && checkedIn,
  );
  // The month's check-in is finished: before it opened, or by a save in it (its payload carried
  // `complete`). Reopening the cards from the summary then offers no second Finish.
  const [completed, setCompleted] = useState(checkedIn);

  const answersRef = useRef(answers);
  // Synchronous guard against a double tap: state updates land a frame later than a second tap.
  const inFlight = useRef(new Set<string>());
  const justAnswered = useRef(false);

  const hasFigure = useCallback(
    (s: CheckInStep, withPending = true) =>
      Boolean(answers[s.accountId] || (withPending && pending[s.accountId]) || s.recorded),
    [answers, pending],
  );

  const isDone = useCallback(
    (accountId: string) => {
      if (editing[accountId] || failed[accountId]) return false;
      const step = steps.find((s) => s.accountId === accountId);
      return step ? hasFigure(step) : false;
    },
    [steps, editing, failed, hasFigure],
  );

  const nextOpen = useCallback(
    (from: number, skip?: string) => {
      const n = steps.length;
      for (let k = 1; k <= n; k++) {
        const i = (from + k) % n;
        const s = steps[i];
        if (s && s.accountId !== skip && !isDone(s.accountId)) return i;
      }
      return -1;
    },
    [steps, isDone],
  );

  // Once the last open card is saved, the summary shows.
  useEffect(() => {
    if (!justAnswered.current) return;
    const allSaved =
      steps.length > 0 &&
      steps.every((s) => answers[s.accountId] || s.recorded) &&
      Object.keys(pending).length === 0 &&
      Object.keys(editing).length === 0 &&
      Object.keys(failed).length === 0;
    if (allSaved) {
      justAnswered.current = false;
      setFinished(true);
      setCompleted(true);
    }
  }, [answers, pending, editing, failed, steps]);

  const save = useCallback(
    async (values: CheckInValue[]) => {
      const ok = await saver.save(steps, values, () => new Set(Object.keys(answersRef.current)));
      if (ok) {
        const next = { ...answersRef.current };
        for (const v of values) next[v.accountId] = v;
        answersRef.current = next;
        setAnswers(next);
        setSaved(true);
        justAnswered.current = true;
      }
      return ok;
    },
    [saver, steps],
  );

  const answer = useCallback(
    async (step: CheckInStep, given: CheckInAnswer) => {
      const id = step.accountId;
      if (inFlight.current.has(id)) return false;
      const value = answerValue(step, given);
      if (!value) return false;
      inFlight.current.add(id);
      setPending((p) => ({ ...p, [id]: value }));
      setFailed((f) => omit(f, id));
      setEditing((e) => omit(e, id));
      const ok = await save([value]);
      inFlight.current.delete(id);
      setPending((p) => omit(p, id));
      if (!ok) {
        // The typed figure stays in the field and the answer is kept, so Try again sends it again.
        setFailed((f) => ({ ...f, [id]: given }));
        return false;
      }
      setDrafts((d) => omit(d, id));
      const position = steps.indexOf(step);
      const n = steps.length;
      for (let k = 1; k <= n; k++) {
        const i = (position + k) % n;
        const s = steps[i];
        if (!s || s.accountId === id) continue;
        if (!answersRef.current[s.accountId] && !s.recorded) {
          setIndex(i);
          break;
        }
      }
      return true;
    },
    [save, steps],
  );

  const retry = useCallback(
    (step: CheckInStep) => {
      const given = failed[step.accountId];
      return given ? answer(step, given) : Promise.resolve(false);
    },
    [failed, answer],
  );

  const keepable = useMemo(
    () =>
      steps.filter(
        (s) =>
          !hasFigure(s) &&
          !s.calculated &&
          s.lastValue !== null &&
          (drafts[s.accountId] ?? null) === null,
      ),
    [steps, hasFigure, drafts],
  );

  const keepRest = useCallback(async () => {
    const values = keepable
      .filter((s) => !inFlight.current.has(s.accountId))
      .map((s) => answerValue(s, { kind: "noChange" }))
      .filter((v): v is CheckInValue => v !== null);
    if (values.length === 0) return 0;
    const ids = values.map((v) => v.accountId);
    for (const id of ids) inFlight.current.add(id);
    setPending((p) => ({ ...p, ...Object.fromEntries(values.map((v) => [v.accountId, v])) }));
    setFailed((f) => omitAll(f, ids));
    setEditing((e) => omitAll(e, ids));
    const ok = await save(values);
    for (const id of ids) inFlight.current.delete(id);
    setPending((p) => omitAll(p, ids));
    if (!ok) {
      setFailed((f) => ({
        ...f,
        ...Object.fromEntries(ids.map((id) => [id, { kind: "noChange" } as CheckInAnswer])),
      }));
      setKept(null);
      return 0;
    }
    setKept(values.length);
    // The card moves to the first account still open (a calculated figure, a typed one, no figure).
    const open = steps.findIndex((s) => !answersRef.current[s.accountId] && !s.recorded);
    if (open !== -1) setIndex(open);
    return values.length;
  }, [keepable, save, steps]);

  const summary = useMemo(
    () => (finished ? buildCheckInSummary(steps, answers, accounts, details, month, basis) : null),
    [finished, steps, answers, accounts, details, month, basis],
  );

  return {
    month,
    steps,
    index: Math.min(index, Math.max(steps.length - 1, 0)),
    setIndex,
    figure: (accountId) => {
      const step = steps.find((s) => s.accountId === accountId);
      return step ? stepFigure(step, answers[accountId] ?? pending[accountId]) : null;
    },
    isDone,
    isSaving: (id) => Boolean(pending[id]),
    hasError: (id) => Boolean(failed[id]),
    edit: (id) => {
      setEditing((e) => ({ ...e, [id]: true }));
      setFinished(false);
    },
    draft: (id) => drafts[id] ?? null,
    setDraft: (id, value) => setDrafts((d) => ({ ...d, [id]: value })),
    answer,
    retry,
    nextOpen,
    keepable,
    keepRest,
    kept,
    finished,
    summary,
    canFinish:
      !finished && !completed && steps.length > 0 && steps.every((s) => hasFigure(s, false)),
    finish: async () => {
      if (inFlight.current.has("__finish")) return false;
      inFlight.current.add("__finish");
      const ok = await saver.finish();
      inFlight.current.delete("__finish");
      setFinishFailed(!ok);
      if (ok) {
        setSaved(true);
        setFinished(true);
        setCompleted(true);
      }
      return ok;
    },
    finishFailed,
    reopen: () => {
      setKept(null);
      setFinished(false);
      setIndex(0);
    },
    saved,
  };
}
