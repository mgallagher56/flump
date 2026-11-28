import { AccountExportSummaryResponse } from "@flump/api-contract";
import { backendFetch } from "~/services/backend-client.server";

/**
 * Whether to offer "Download your data" on a screen outside the app (the not-invited page and the
 * terms screen): only when the backend says the account holds something to export
 * (`GET /user-profile/export/summary`). A never-invited or brand-new account has nothing; a
 * removed member keeps their data and keeps the download. One condition for both screens. If the
 * answer cannot be had, the download is offered: a missing data-rights control is worse than one
 * that downloads an almost empty file.
 */
export async function offerDataDownload(accessToken: string, signal?: AbortSignal) {
  try {
    const { hasData } = await backendFetch("/user-profile/export/summary", {
      accessToken,
      schema: AccountExportSummaryResponse,
      signal,
    });
    return hasData;
  } catch {
    return true;
  }
}
