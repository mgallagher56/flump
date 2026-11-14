import { UpsertSnapshotResponse } from "@flump/api-contract";
import { useOptionalToast } from "@repo/ui";
import { useMemo } from "react";
import { useRevalidator } from "react-router";
import { apiFetch } from "~/services/api-client";
import { hasSource, withoutSource } from "./checkInModel";
import { SAVE_ERROR_TOAST, savedToast } from "./snapshotCopy";
import type { MonthKey, SnapshotPayload } from "./snapshotModel";

export interface SaveSnapshotArgs {
  month: MonthKey;
  payload: SnapshotPayload;
  saved: number;
  skipped: number;
  /**
   * Save as you go (the account-by-account check-in): no toast and no reload of saved data. The
   * caller shows its own inline state and calls `refresh` once at the end.
   */
  quiet?: boolean;
}

export type SaveSnapshot = ((args: SaveSnapshotArgs) => Promise<boolean>) & {
  /** Reloads the route's saved data once, after a run of quiet saves. */
  refresh?: () => void;
};

/** A 400 validation error about `source` (an older backend's unrecognised key). */
export function rejectsSource(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { status, detail } = err as { status?: number; detail?: string };
  if (status !== 400) return false;
  return detail === undefined || /source|unrecogni[sz]ed/i.test(detail);
}

/**
 * Saves one month through `PUT /snapshots/:month` on the same-origin `/api` proxy, raises a toast
 * and reloads the route's saved data. Resolves true on success; a failure leaves saved data as it
 * was and raises an error toast. A `quiet` save does neither: the caller reports the outcome.
 */
export function useSaveSnapshot(): SaveSnapshot {
  const toast = useOptionalToast()?.toast;
  const revalidator = useRevalidator();
  return useMemo<SaveSnapshot>(() => {
    const put = (month: MonthKey, body: SnapshotPayload) =>
      apiFetch(`/snapshots/${month}`, { schema: UpsertSnapshotResponse, method: "PUT", body });
    const save = async ({ month, payload, saved, skipped, quiet = false }: SaveSnapshotArgs) => {
      try {
        try {
          await put(month, payload);
        } catch (err) {
          // Deploy order: a backend that does not know `source` yet rejects it. Save the same
          // figures once more without it, and say nothing.
          if (!hasSource(payload) || !rejectsSource(err)) throw err;
          await put(month, withoutSource(payload));
        }
      } catch {
        if (!quiet) toast?.({ ...SAVE_ERROR_TOAST, tone: "danger" });
        return false;
      }
      if (quiet) return true;
      toast?.({ ...savedToast(month, saved, skipped), tone: "positive" });
      revalidator.revalidate();
      return true;
    };
    return Object.assign(save, { refresh: () => revalidator.revalidate() });
  }, [toast, revalidator]);
}
