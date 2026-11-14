import { ACCOUNT_EXPORT_PATH } from "./account";

export type ExportFailure = "rate_limited" | "failed";

export class AccountExportError extends Error {
  readonly reason: ExportFailure;
  constructor(reason: ExportFailure) {
    super(`Account export failed: ${reason}`);
    this.name = "AccountExportError";
    this.reason = reason;
  }
}

const FILENAME = /filename="(flump-export-\d{4}-\d{2}-\d{2}\.json)"/i;

/**
 * Fetches the export through the web server and hands it to the browser as a file download.
 * Throws AccountExportError on any failure, so the caller can show a calm message.
 */
export async function downloadAccountExport(doc: Document = document): Promise<void> {
  let res: Response;
  try {
    res = await fetch(ACCOUNT_EXPORT_PATH, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Flump-Request": "1" },
    });
  } catch {
    throw new AccountExportError("failed");
  }
  if (!res.ok) throw new AccountExportError(res.status === 429 ? "rate_limited" : "failed");

  let blob: Blob;
  try {
    blob = await res.blob();
  } catch {
    throw new AccountExportError("failed");
  }
  const filename =
    FILENAME.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "flump-export.json";

  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  doc.body.append(link);
  link.click();
  link.remove();
  // Revoke after the click has been handed to the browser's download manager.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
