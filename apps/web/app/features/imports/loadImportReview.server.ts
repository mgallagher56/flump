import type { LoaderFunctionArgs } from "react-router";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";
import {
  type ExistingAccount,
  type ImportBatch,
  type ImportPreview,
  initialAccountMap,
} from "./importModel";

export interface ImportReviewData {
  batch: ImportBatch;
  initialPreview: ImportPreview | null;
  existingAccounts: ExistingAccount[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads one import for review. For an open batch it runs the dry run twice at most: once to get
 * the suggested matches, then again with them, so the page opens on the suggested mapping.
 */
export async function loadImportReview(args: LoaderFunctionArgs): Promise<ImportReviewData> {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const id = args.params.id ?? "";
  if (!UUID.test(id)) throwRouteError(new BackendError("not-found", "/imports/:id"));
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/imports/:id"));
  const signal = args.request.signal;
  const safeId = encodeURIComponent(id);

  try {
    const [batch, accounts] = await Promise.all([
      backendFetch<ImportBatch>(`/imports/${safeId}`, { accessToken, signal }),
      backendFetch<Array<{ id: string; name: string; type: string }>>("/accounts", {
        accessToken,
        signal,
      }),
    ]);
    const existingAccounts = accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }));
    if (batch.status !== "staged") return { batch, initialPreview: null, existingAccounts };

    const preview = (accountMap: Record<string, string | null>) =>
      backendFetch<ImportPreview>(`/imports/${safeId}/preview`, {
        accessToken,
        signal,
        method: "POST",
        body: { accountMap },
      });
    let initialPreview: ImportPreview;
    try {
      initialPreview = await preview({});
      const map = initialAccountMap(initialPreview.accounts);
      if (Object.values(map).some((v) => v !== null)) initialPreview = await preview(map);
    } catch (error) {
      // 409: the batch expired or was committed since it was read. Show its current state.
      if (error instanceof BackendError && error.status === 409) {
        const fresh = await backendFetch<ImportBatch>(`/imports/${safeId}`, {
          accessToken,
          signal,
        });
        return { batch: fresh, initialPreview: null, existingAccounts };
      }
      throw error;
    }
    return { batch, initialPreview, existingAccounts };
  } catch (error) {
    throwRouteError(error);
  }
}
