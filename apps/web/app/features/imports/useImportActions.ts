import { useMemo } from "react";
import { useRevalidator } from "react-router";
import { apiFetch } from "~/services/api-client";
import type { AccountMap, ImportBatch, ImportPreview } from "./importModel";

export interface ImportActions {
  /** Dry run of the commit for this account map. Writes nothing. */
  preview: (accountMap: AccountMap, signal?: AbortSignal) => Promise<ImportPreview>;
  /** Commits under the web session, then reloads the route's data. */
  commit: (accountMap: AccountMap, overwriteManual: string[]) => Promise<ImportBatch>;
  /** Batch-level undo, then reloads the route's data. */
  revert: () => Promise<ImportBatch>;
}

/**
 * Calls the import routes through the same-origin `/api` proxy, so they run under the user's web
 * session (an MCP token can stage but never commit or revert). Failures throw `BackendError`.
 */
export function useImportActions(batchId: string): ImportActions {
  const revalidator = useRevalidator();
  return useMemo<ImportActions>(() => {
    const id = encodeURIComponent(batchId);
    return {
      preview: (accountMap, signal) =>
        apiFetch<ImportPreview>(`/imports/${id}/preview`, {
          method: "POST",
          body: { accountMap },
          signal,
        }),
      commit: async (accountMap, overwriteManual) => {
        const done = await apiFetch<ImportBatch>(`/imports/${id}/commit`, {
          method: "POST",
          body: { accountMap, overwriteManual },
          timeoutMs: 60_000,
        });
        revalidator.revalidate();
        return done;
      },
      revert: async () => {
        const done = await apiFetch<ImportBatch>(`/imports/${id}/revert`, {
          method: "POST",
          body: {},
          timeoutMs: 60_000,
        });
        revalidator.revalidate();
        return done;
      },
    };
  }, [batchId, revalidator]);
}
