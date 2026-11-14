import { UpsertSnapshotResponse } from "@flump/api-contract";
import { useOptionalToast } from "@repo/ui";
import { useCallback } from "react";
import { useRevalidator } from "react-router";
import { apiFetch } from "~/services/api-client";
import { SAVE_ERROR_TOAST, savedToast } from "./snapshotCopy";
import type { MonthKey, SnapshotPayload } from "./snapshotModel";

export interface SaveSnapshotArgs {
  month: MonthKey;
  payload: SnapshotPayload;
  saved: number;
  skipped: number;
}

export type SaveSnapshot = (args: SaveSnapshotArgs) => Promise<boolean>;

/**
 * Saves one month through `PUT /snapshots/:month` on the same-origin `/api` proxy, raises a toast
 * and reloads the route's saved data. Resolves true on success; a failure leaves saved data as it
 * was and raises an error toast.
 */
export function useSaveSnapshot(): SaveSnapshot {
  const toast = useOptionalToast()?.toast;
  const revalidator = useRevalidator();
  return useCallback<SaveSnapshot>(
    async ({ month, payload, saved, skipped }) => {
      try {
        await apiFetch(`/snapshots/${month}`, {
          schema: UpsertSnapshotResponse,
          method: "PUT",
          body: payload,
        });
      } catch {
        toast?.({ ...SAVE_ERROR_TOAST, tone: "danger" });
        return false;
      }
      toast?.({ ...savedToast(month, saved, skipped), tone: "positive" });
      revalidator.revalidate();
      return true;
    },
    [toast, revalidator],
  );
}
