/**
 * "Download your data" (E12 S9, plan 9.10; decided by the coordinator on 27 November 2026): the JSON
 * export, `GET /v1/user-profile/export`, handed to the system share sheet. `@flump/api-client`
 * parses JSON only and the file can be large, so it is downloaded straight to a file with the
 * bearer token; on a 401 the session's one shared refresh runs and the download is tried once more.
 *
 * Where the file lives: an `exports` folder in the app's cache folder (left out of backups), never
 * shared storage. It is deleted when the share sheet closes, whether or not it was shared, and the
 * whole folder is swept on launch, sign-out and deletion (`sweepExports`). The files and the share
 * sheet are injected (`deviceFiles.ts` gives the real ones), so every path is tested on Node.
 */
import type { Session } from "../auth/session";
import { ACCOUNT_DELETED_CODE } from "./account";

export const EXPORT_FOLDER = "exports";

/** The server's name for the file (`exportFileName` in the backend), checked before it is used. */
const SERVER_FILE_NAME = /filename="(flump-export-\d{4}-\d{2}-\d{2}\.json)"/i;
const FALLBACK_FILE_NAME = "flump-export.json";

/** The few file calls the export needs, on URIs in the cache folder. */
export interface ExportFiles {
  /** The app's cache folder, ending in "/"; null only off a phone. */
  cacheDirectory: string | null;
  /** Creates the folder and any parents; fine when it exists. */
  makeDirectory(uri: string): Promise<void>;
  /** Writes the response body to `to` whatever the status; rejects only when nothing came back. */
  download(
    url: string,
    to: string,
    headers: Record<string, string>,
  ): Promise<{ status: number; headers: Record<string, string> }>;
  /** Reads a small file as text (an error body). */
  readText(uri: string): Promise<string>;
  move(from: string, to: string): Promise<void>;
  /** Removes a file or a folder with everything in it; fine when it is not there. */
  remove(uri: string): Promise<void>;
}

export interface ShareSheet {
  isAvailable(): Promise<boolean>;
  /** Resolves when the sheet closes, shared or not. */
  share(uri: string, options: { mimeType: string; UTI: string }): Promise<void>;
}

/**
 * `shared`: the sheet opened and closed (the phone does not say whether the file was sent).
 * `rateLimited`: 429. `accountDeleted`: 410 `account_deleted`, the account is erased. `ended`: the
 * refresh ended the session, or it ended (a sign-out) while the file downloaded; the session has
 * already moved on. `failed`: anything else, a lost connection and a 410 with another code included.
 */
export type ExportOutcome = "shared" | "rateLimited" | "accountDeleted" | "ended" | "failed";

export interface ExportDataDeps {
  apiBaseUrl: string;
  session: Pick<Session, "getAccessToken" | "refresh">;
  files: ExportFiles;
  share: ShareSheet;
  /** `X-Flump-Client`, as the API client sends it. */
  clientHeader?: string;
}

function headerValue(headers: Record<string, string>, name: string): string {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return "";
}

/** The file name the share sheet shows: the server's, or a plain one if it sent anything else. */
function exportFileName(headers: Record<string, string>): string {
  return (
    SERVER_FILE_NAME.exec(headerValue(headers, "Content-Disposition"))?.[1] ?? FALLBACK_FILE_NAME
  );
}

function exportFolder(files: Pick<ExportFiles, "cacheDirectory">): string | null {
  return files.cacheDirectory ? `${files.cacheDirectory}${EXPORT_FOLDER}/` : null;
}

/** Deletes every export file left in the cache folder. Never throws. */
export async function sweepExports(files: ExportFiles): Promise<void> {
  const folder = exportFolder(files);
  if (!folder) return;
  try {
    await files.remove(folder);
  } catch {
    // Tried again on the next launch.
  }
}

let downloads = 0;

export function createExportData(deps: ExportDataDeps): () => Promise<ExportOutcome> {
  const { files } = deps;
  const url = `${deps.apiBaseUrl.replace(/\/+$/, "")}/v1/user-profile/export`;

  async function removeQuietly(uri: string) {
    try {
      await files.remove(uri);
    } catch {
      // Swept on the next launch, sign-out or deletion.
    }
  }

  /** Whether an error body names the erased account, as the API client reads `code`. */
  async function namesAccountDeleted(uri: string): Promise<boolean> {
    try {
      const body: unknown = JSON.parse(await files.readText(uri));
      return (
        typeof body === "object" &&
        body !== null &&
        Reflect.get(body, "code") === ACCOUNT_DELETED_CODE
      );
    } catch {
      return false;
    }
  }

  /** One download to a temporary name. Null when nothing came back (no network). */
  async function attempt(folder: string, token: string) {
    downloads += 1;
    const to = `${folder}download-${downloads}.json`;
    // Never kept by the phone's HTTP cache (E12 S7); the server sends no-store as well.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-store",
    };
    if (deps.clientHeader) headers["X-Flump-Client"] = deps.clientHeader;
    try {
      const answer = await files.download(url, to, headers);
      return { to, ...answer };
    } catch {
      await removeQuietly(to);
      return null;
    }
  }

  return async () => {
    const folder = exportFolder(files);
    const token = deps.session.getAccessToken();
    if (!folder || !token) return "failed";
    try {
      await files.makeDirectory(folder);
    } catch {
      return "failed";
    }

    let used = token;
    let answer = await attempt(folder, token);
    if (answer?.status === 401) {
      await removeQuietly(answer.to);
      const refreshed = await deps.session.refresh();
      if (refreshed === "ended") return "ended";
      const fresh = deps.session.getAccessToken();
      if (refreshed !== "refreshed" || !fresh) return "failed";
      used = fresh;
      answer = await attempt(folder, fresh);
    }
    if (!answer) return "failed";
    if (answer.status < 200 || answer.status > 299) {
      const deleted = answer.status === 410 && (await namesAccountDeleted(answer.to));
      await removeQuietly(answer.to);
      if (answer.status === 429) return "rateLimited";
      if (deleted) return "accountDeleted";
      return "failed";
    }
    // Signed out, or the session ended, while the file came in: it is not shared after all. A token
    // refreshed by another request meanwhile also stops it (failed, try again): rare, and safe.
    const now = deps.session.getAccessToken();
    if (now !== used) {
      await removeQuietly(answer.to);
      return now === null ? "ended" : "failed";
    }

    const shared = `${folder}${exportFileName(answer.headers)}`;
    try {
      await removeQuietly(shared);
      await files.move(answer.to, shared);
      if (!(await deps.share.isAvailable())) return "failed";
      await deps.share.share(shared, { mimeType: "application/json", UTI: "public.json" });
      return "shared";
    } catch {
      return "failed";
    } finally {
      // Whether or not it was shared, the copy on this phone goes as soon as the sheet closes.
      await removeQuietly(answer.to);
      await removeQuietly(shared);
    }
  };
}
