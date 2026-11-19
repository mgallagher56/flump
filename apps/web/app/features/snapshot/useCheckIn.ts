import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  answerValue,
  buildCheckInSteps,
  CHECK_IN_SENDS_SOURCE,
  type CheckInAccountInput,
  type CheckInAnswer,
  type CheckInStep,
  type CheckInValue,
  checkInPayload,
  type StepFigure,
  stepFigure,
} from "./checkInModel";
import type { AccountDetailInput, MonthKey } from "./snapshotModel";
import type { SaveSnapshot } from "./useSaveSnapshot";

export interface UseCheckInArgs {
  accounts: readonly CheckInAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  /** The month being checked in. */
  month: MonthKey;
  open: boolean;
  onSave: SaveSnapshot;
  /**
   * Whether the month's check-in was finished (the latest `snapshot_checkins` month is this one or
   * later). Only then does the check-in open on its summary.
   */
  checkedIn?: boolean;
}

export interface CheckInController {
  month: MonthKey;
  steps: CheckInStep[];
  /** The step a phone card shows. */
  index: number;
  setIndex: (index: number) => void;
  /** This check-in's answers, saved. */
  answers: Readonly<Record<string, CheckInValue>>;
  /** The figure a step holds for the month (saved in this check-in or recorded before). */
  figure: (accountId: string) => StepFigure | null;
  /** Done: has a figure (or one is saving) and is not reopened with "Change". */
  isDone: (accountId: string) => boolean;
  isSaving: (accountId: string) => boolean;
  hasError: (accountId: string) => boolean;
  /** Reopen a done step to correct it. */
  edit: (accountId: string) => void;
  draft: (accountId: string) => number | null;
  setDraft: (accountId: string, value: number | null) => void;
  /** Save one answer at once (one PUT). Resolves true once saved. */
  confirm: (step: CheckInStep, answer: CheckInAnswer) => Promise<boolean>;
  /** Save the answer that failed again. */
  retry: (step: CheckInStep) => Promise<boolean>;
  /** The first open step after `from` (wrapping to the start), or -1 when every step is done. */
  nextOpen: (from: number, skip?: string) => number;
  /** Every step is saved and the summary shows. */
  finished: boolean;
  /**
   * The check-in opened with every account already recorded this month, so only the summary
   * shows; false again once the user goes back to the steps.
   */
  openedFinished: boolean;
  /** From the summary back to the steps. */
  reopen: () => void;
  /** Every step has a figure this month (recorded, or answered in this check-in). */
  allAnswered: boolean;
  /**
   * Finishes the month's check-in when every step already has a figure but the check-in was not
   * finished: records it as done (`complete`) without writing any balance. Resolves true on success.
   */
  finish: () => Promise<boolean>;
  /** True once, after anything was saved since the last call: the caller refreshes saved data. */
  takeDirty: () => boolean;
}

const omit = <T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  if (!(key in record)) return record as Record<string, T>;
  const next = { ...record };
  delete next[key];
  return next;
};

/**
 * The account-by-account check-in's state, shared by the phone card and the desktop list. Each
 * confirmed step is saved at once through `PUT /snapshots/:month` (quietly: no toast, no reload),
 * one save at a time so the last one knows whether the month is complete. A step already recorded
 * for the month counts as done, so a check-in closed part-way resumes at the first open step.
 */
export function useCheckIn({
  accounts,
  accountDetails,
  month,
  open,
  onSave,
  checkedIn = false,
}: UseCheckInArgs): CheckInController {
  const steps = useMemo(
    () => buildCheckInSteps(accounts, accountDetails, month),
    [accounts, accountDetails, month],
  );
  const [answers, setAnswers] = useState<Record<string, CheckInValue>>({});
  const [pending, setPending] = useState<Record<string, CheckInValue>>({});
  const [failed, setFailed] = useState<Record<string, CheckInAnswer>>({});
  const [editing, setEditing] = useState<Record<string, true>>({});
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [openedFinished, setOpenedFinished] = useState(false);

  const answersRef = useRef(answers);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const dirty = useRef(false);
  const justAnswered = useRef(false);

  // A new month starts a fresh check-in.
  useEffect(() => {
    answersRef.current = {};
    setAnswers({});
    setDrafts({});
  }, [month]);

  const hasFigure = useCallback(
    (s: CheckInStep, withPending = true) =>
      Boolean(answers[s.accountId] || (withPending && pending[s.accountId]) || s.recorded),
    [answers, pending],
  );

  // On opening: resume at the first step with nothing recorded this month. The summary ("November
  // is checked in.") opens only when the month's check-in was finished (`snapshot_checkins`, system
  // audit slice 4): a history row alone (a new account, a balance edit) is not a check-in (CH-3).
  useEffect(() => {
    if (!open) return;
    const firstOpen = steps.findIndex((s) => !hasFigure(s));
    setEditing({});
    setFailed({});
    setIndex(firstOpen === -1 ? 0 : firstOpen);
    const done = steps.length > 0 && firstOpen === -1 && checkedIn;
    setFinished(done);
    setOpenedFinished(done);
  }, [open]);

  // Once the last open step is saved, the summary shows.
  useEffect(() => {
    if (!justAnswered.current) return;
    const allSaved =
      steps.length > 0 &&
      steps.every((s) => answers[s.accountId] || s.recorded) &&
      Object.keys(pending).length === 0 &&
      Object.keys(editing).length === 0;
    if (allSaved) {
      justAnswered.current = false;
      setFinished(true);
    }
  }, [answers, pending, editing, steps]);

  const save = useCallback(
    (values: CheckInValue[]) => {
      const run = async () => {
        const payload = checkInPayload(
          stepsRef.current,
          values,
          new Set(Object.keys(answersRef.current)),
          { withSource: CHECK_IN_SENDS_SOURCE },
        );
        let ok = false;
        try {
          ok = await onSave({ month, payload, saved: values.length, skipped: 0, quiet: true });
        } catch {
          ok = false;
        }
        if (ok) {
          const next = { ...answersRef.current };
          for (const v of values) next[v.accountId] = v;
          answersRef.current = next;
          setAnswers(next);
          dirty.current = true;
          justAnswered.current = true;
        }
        return ok;
      };
      // One save at a time, in order: each payload sees the answers saved before it.
      const result = queue.current.then(run, run);
      queue.current = result.catch(() => undefined);
      return result;
    },
    [month, onSave],
  );

  const confirm = useCallback(
    async (step: CheckInStep, answer: CheckInAnswer) => {
      const value = answerValue(step, answer);
      if (!value) return false;
      const id = step.accountId;
      setPending((p) => ({ ...p, [id]: value }));
      setFailed((f) => omit(f, id));
      setEditing((e) => omit(e, id));
      const ok = await save([value]);
      setPending((p) => omit(p, id));
      if (ok) {
        setDrafts((d) => omit(d, id));
      } else {
        setFailed((f) => ({ ...f, [id]: answer }));
      }
      return ok;
    },
    [save],
  );

  const retry = useCallback(
    (step: CheckInStep) => {
      const answer = failed[step.accountId];
      return answer ? confirm(step, answer) : Promise.resolve(false);
    },
    [failed, confirm],
  );

  const figure = useCallback(
    (accountId: string) => {
      const step = steps.find((s) => s.accountId === accountId);
      if (!step) return null;
      return stepFigure(step, answers[accountId] ?? pending[accountId]);
    },
    [steps, answers, pending],
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

  return {
    month,
    steps,
    index,
    setIndex,
    answers,
    figure,
    isDone,
    isSaving: (id) => Boolean(pending[id]),
    hasError: (id) => Boolean(failed[id]),
    edit: (id) => {
      setEditing((e) => ({ ...e, [id]: true }));
      setFinished(false);
    },
    draft: (id) => drafts[id] ?? null,
    setDraft: (id, value) => setDrafts((d) => ({ ...d, [id]: value })),
    confirm,
    retry,
    nextOpen,
    finished,
    openedFinished,
    allAnswered: steps.length > 0 && steps.every((s) => hasFigure(s, false)),
    finish: async () => {
      let ok = false;
      try {
        ok = await onSave({
          month,
          payload: { values: [], complete: true },
          saved: 0,
          skipped: 0,
          quiet: true,
        });
      } catch {
        ok = false;
      }
      if (ok) {
        dirty.current = true;
        setFinished(true);
      }
      return ok;
    },
    reopen: () => {
      setFinished(false);
      setOpenedFinished(false);
      setIndex(0);
    },
    takeDirty: () => {
      const was = dirty.current;
      dirty.current = false;
      return was;
    },
  };
}
