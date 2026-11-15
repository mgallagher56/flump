import { parseEtag, UpsertSnapshotResponse } from "@flump/api-contract";
import { useOptionalToast } from "@repo/ui";
import { useMemo, useRef } from "react";
import { useRevalidator } from "react-router";
import { apiFetchVersioned } from "~/services/api-client";
import { CONFLICT_TOAST, isConflict, versionEtag } from "~/services/conflict";
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

/** A saved month row as the loader returns it (`GET /account-details`), with its version. */
export interface SavedSnapshotRow {
  accountId?: string | null;
  year?: number | string | null;
  month?: number | string | null;
  updatedAt?: string | null;
}

const rowKey = (month: MonthKey, accountId: string) => `${month}|${accountId.toLowerCase()}`;

/**
 * The `If-Match` list for one save (BE-16): the version of every row for `month` this tab has
 * read (loader data) or written (the ETag of its own earlier saves) for the accounts in
 * `payload`. Undefined when it knows none: the rows are new, so there is nothing to overwrite.
 */
export function snapshotIfMatch(
  month: MonthKey,
  payload: SnapshotPayload,
  saved: readonly SavedSnapshotRow[],
  written: ReadonlyMap<string, string>,
): string | undefined {
  const keys = new Set(payload.values.map((v) => rowKey(month, v.accountId)));
  // One version per row, so the list never outgrows the batch: the one this tab wrote since the
  // loader last ran, else the one the loader read.
  const versions = new Map<string, string>();
  for (const row of saved) {
    if (!row.accountId) continue;
    const key = rowKey(`${row.year}-${String(row.month).padStart(2, "0")}`, row.accountId);
    const etag = keys.has(key) ? versionEtag(row.updatedAt) : undefined;
    if (etag) versions.set(key, etag);
  }
  for (const key of keys) {
    const etag = written.get(key);
    if (etag) versions.set(key, etag);
  }
  const etags = new Set(versions.values());
  return etags.size > 0 ? [...etags].join(", ") : undefined;
}

/** A 400 validation error about `source` (an older backend's unrecognised key). */
export function rejectsSource(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { status, detail } = err as { status?: number; detail?: string };
  if (status !== 400) return false;
  // Only a rejection that names `source` (an older backend's "Unrecognized key: source"): any other
  // 400 is a real error, and stripping the source would store a calculated figure as typed.
  return typeof detail === "string" && /\bsource\b/i.test(detail);
}

/**
 * Saves one month through `PUT /snapshots/:month` on the same-origin `/api` proxy, raises a toast
 * and reloads the route's saved data. Resolves true on success; a failure leaves saved data as it
 * was and raises an error toast. A `quiet` save does neither: the caller reports the outcome.
 *
 * `saved` is the route's saved rows. Each save sends their versions for the accounts it writes
 * (`If-Match`), so a figure changed somewhere else since this page loaded is not overwritten: the
 * API answers 412, and this says so (also on a quiet save) and reloads the saved data. The caller
 * keeps what was typed, so it can be checked against the latest figure and saved again.
 */
export function useSaveSnapshot(saved: readonly SavedSnapshotRow[] = []): SaveSnapshot {
  const toast = useOptionalToast()?.toast;
  const revalidator = useRevalidator();
  const savedRef = useRef(saved);
  // The versions of rows this tab wrote since the loader last ran. Fresh loader data is the
  // latest truth (it may hold a change made somewhere else), so it replaces them.
  const written = useRef(new Map<string, string>());
  if (savedRef.current !== saved) written.current.clear();
  savedRef.current = saved;
  return useMemo<SaveSnapshot>(() => {
    const put = async (month: MonthKey, body: SnapshotPayload) => {
      const { etag } = await apiFetchVersioned(`/snapshots/${month}`, {
        schema: UpsertSnapshotResponse,
        method: "PUT",
        body,
        ifMatch: snapshotIfMatch(month, body, savedRef.current, written.current),
      });
      // The answer's ETag is the version of every row this request wrote.
      if (etag && parseEtag(etag)) {
        for (const v of body.values) written.current.set(rowKey(month, v.accountId), etag);
      }
    };
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
      } catch (err) {
        if (isConflict(err)) {
          toast?.({ ...CONFLICT_TOAST, tone: "warning" });
          revalidator.revalidate();
        } else if (!quiet) {
          toast?.({ ...SAVE_ERROR_TOAST, tone: "danger" });
        }
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
