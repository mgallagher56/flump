/**
 * How the check-in saves (plan 9.6): each answer is one `PUT /snapshots/:month` with the body the
 * engine's `checkInPayload` builds, so it carries `checkIn: true` (the server records the month as
 * started) and `complete: true` once every account has a figure. Saves run one at a time, in order,
 * so each payload knows what was saved before it, as on web. A failure resolves false: the caller
 * keeps the answer on screen and offers to try again; nothing is retried behind the person's back.
 */
import {
  type CheckInStep,
  type CheckInValue,
  checkInPayload,
  type SnapshotPayload,
} from "@flump/finance-engine/check-in";
import { useCallback, useRef } from "react";
import { useApi } from "../../data/ApiProvider";
import { putSnapshot } from "../../data/checkIn";

export interface SaveCheckIn {
  /** Saves some answers. `answered` reads the accounts saved in this check-in when the save runs. */
  save(
    steps: readonly CheckInStep[],
    values: readonly CheckInValue[],
    answered: () => ReadonlySet<string>,
  ): Promise<boolean>;
  /** Marks the month done when every account already had a figure (web's "Finish check-in"). */
  finish(): Promise<boolean>;
}

export function useSaveCheckIn(month: string): SaveCheckIn {
  const api = useApi();
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const send = useCallback(
    (payload: () => SnapshotPayload) => {
      const run = async () => {
        try {
          await putSnapshot(api, month, payload());
          return true;
        } catch {
          return false;
        }
      };
      const result = queue.current.then(run, run);
      queue.current = result;
      return result;
    },
    [api, month],
  );

  return {
    save: useCallback(
      (steps, values, answered) =>
        // Built when its turn comes, not when queued: the answers saved before it are known then.
        send(() => checkInPayload(steps, values, answered(), { withSource: true })),
      [send],
    ),
    finish: useCallback(() => send(() => ({ values: [], complete: true })), [send]),
  };
}
