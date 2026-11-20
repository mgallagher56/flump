import { recordDestructive } from "./destructive-budget";
import { BACKEND_URL } from "./env";

/**
 * Calls the e2e backend directly as the dev-bypass user, for set-up and clean-up steps the
 * browser `/api` proxy does not allow (it is a strict allow-list of the calls the web app makes
 * from the browser; tax records and account deletes go through route actions instead). The e2e
 * backend runs with AUTH_DEV_BYPASS=true only (see servers.ts). The dev token is the backend's
 * fixed public placeholder (`DEV_BYPASS_TOKEN` in apps/backend/src/auth/dev-bypass.verifier.ts),
 * built here at runtime.
 */
const DEV_TOKEN = ["mock", "session", "token"].join("-");

export async function backendCall<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  recordDestructive(method, path);
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEV_TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
