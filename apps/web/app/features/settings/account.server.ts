import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirectDocument } from "react-router";
import { apiConfig } from "~/config.server";
import { withRequestIdHeader } from "~/security/request-id.server";
import { appendSessionClearCookies } from "~/security/session-cookies.server";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import {
  ACCOUNT_DELETED_PATH,
  DELETE_ACCOUNT_CONFIRMATION,
  type DeleteAccountActionData,
  type DeleteUserResponse,
} from "./account";

/** Deleting every row can take longer than an ordinary write. */
export const DELETE_TIMEOUT_MS = 30_000;
/** Bound on waiting for the export's response headers; the body then streams without a timer. */
export const EXPORT_HEADERS_TIMEOUT_MS = 15_000;

const EXPORT_FILENAME = /^flump-export-\d{4}-\d{2}-\d{2}\.json$/;

const outcome = (value: DeleteAccountActionData["outcome"], status: number) =>
  data<DeleteAccountActionData>(
    { outcome: value },
    { status, headers: { "Cache-Control": "no-store" } },
  );

/**
 * Deletes the signed-in person's account (`profile.deleteUser`). On `deleted` it ends the web
 * session and sends the browser, with a full document load so no in-memory state survives, to the
 * signed-out confirmation page. `identity_pending`, a rate limit and any other failure come back
 * as data so the dialog can say what happened; repeating the request is safe.
 */
export async function deleteAccountAction(args: ActionFunctionArgs, formData: FormData) {
  if (formData.get("confirmation") !== DELETE_ACCOUNT_CONFIRMATION) return outcome("failed", 400);

  const token = requireAccessToken(await getAuthSession(args, { ensureSignedIn: true }));
  let result: DeleteUserResponse | undefined;
  try {
    result = await backendFetch<DeleteUserResponse>("/user-profile", {
      accessToken: token,
      method: "DELETE",
      body: { confirmation: DELETE_ACCOUNT_CONFIRMATION },
      signal: args.request.signal,
      timeoutMs: DELETE_TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 429) return outcome("rate_limited", 429);
    // The only 403 this owner-scoped route sends is the recent-login check
    // (`error: "recent_login_required"`); backendFetch does not pass the body on.
    if (error instanceof BackendError && error.kind === "forbidden") {
      return outcome("recent_login_required", 403);
    }
    if (error instanceof BackendError) {
      console.error("Account deletion failed", { kind: error.kind, status: error.status });
      return outcome("failed", 502);
    }
    throw error;
  }

  if (result?.status === "identity_pending") return outcome("identity_pending", 200);
  if (result?.status !== "deleted") return outcome("failed", 502);

  // The same cookie set `/logout` clears (`sessionClearCookies`). The WorkOS session is not ended
  // separately: the backend has removed the login it belongs to.
  const headers = appendSessionClearCookies(
    new Headers({ "Cache-Control": "no-store" }),
    args.request,
  );
  return redirectDocument(ACCOUNT_DELETED_PATH, { headers });
}

const exportHardening = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

const exportFailure = (status: number) =>
  new Response(JSON.stringify({ error: status === 429 ? "rate_limited" : "failed" }), {
    status,
    headers: { ...exportHardening, "Content-Type": "application/json" },
  });

const fallbackFilename = (now: Date) => `flump-export-${now.toISOString().slice(0, 10)}.json`;

export interface ExportDeps {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  headersTimeoutMs?: number;
}

/**
 * Streams the signed-in person's export file (`profile.export`) through the web session. The
 * backend body is passed straight through as a stream, never buffered, and never cached. Only
 * same-origin script calls (with the `X-Flump-Request` header the `/api` proxy also requires)
 * are served, so another site cannot start the download.
 */
export async function exportAccountData(
  args: LoaderFunctionArgs,
  deps: ExportDeps = {},
): Promise<Response> {
  const { request } = args;
  if (request.headers.get("x-flump-request") !== "1") return exportFailure(403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return exportFailure(403);

  const { accessToken } = await getAuthSession(args, { ensureSignedIn: false });
  if (!accessToken) return exportFailure(401);

  const controller = new AbortController();
  const onAbort = () => controller.abort(request.signal.reason);
  if (request.signal.aborted) onAbort();
  else request.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error("timeout")),
    deps.headersTimeoutMs ?? EXPORT_HEADERS_TIMEOUT_MS,
  );

  let res: Response;
  try {
    res = await (deps.fetchImpl ?? fetch)(`${apiConfig.apiBaseUrl}/user-profile/export`, {
      method: "GET",
      headers: withRequestIdHeader({ Authorization: `Bearer ${accessToken}` }),
      signal: controller.signal,
      redirect: "manual",
    });
  } catch {
    return exportFailure(503);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || !res.body) {
    await res.body?.cancel().catch(() => undefined);
    if (res.status === 429) return exportFailure(429);
    if (res.status === 401) return exportFailure(401);
    return exportFailure(502);
  }

  // Read through a name variable so the route-inventory scan never mistakes it for a call.
  const header = (name: string) => res.headers.get(name);
  const upstreamName = /filename="([^"]+)"/i.exec(header("Content-Disposition") ?? "")?.[1];
  const filename =
    upstreamName && EXPORT_FILENAME.test(upstreamName)
      ? upstreamName
      : fallbackFilename((deps.now ?? (() => new Date()))());

  return new Response(res.body, {
    status: 200,
    headers: {
      ...exportHardening,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
