import { CreateMortgageWithPropertyResponse } from "@flump/api-contract";
import type { ActionFunctionArgs } from "react-router";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

/**
 * Resource route (no default export) for onboarding's "mortgage with its home" seed job: one
 * `POST /accounts/mortgage-with-property` made on the server with the session's token, so the
 * mortgage and the home are created and linked in one transaction (system audit slice 4) without
 * widening the browser's `/api` proxy allow-list. The same-origin check in the security
 * middleware covers this write like every other route action. The body is passed through as it
 * is: the backend contract is strict and checks every field. The caller sends one key per
 * opening of onboarding, forwarded as the Idempotency-Key, so a retry replays the first answer;
 * it also asks which accounts already exist before a retry (useFinishOnboarding).
 */
export const action = async (args: ActionFunctionArgs): Promise<Response> => {
  if (args.request.method.toUpperCase() !== "POST") {
    return Response.json({ success: false }, { status: 405 });
  }
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  let body: { payload?: unknown; key?: unknown };
  try {
    body = (await args.request.json()) as { payload?: unknown; key?: unknown };
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }
  if (typeof body?.payload !== "object" || body.payload === null) {
    return Response.json({ success: false }, { status: 400 });
  }
  try {
    const created = await backendFetch("/accounts/mortgage-with-property", {
      accessToken: token,
      method: "POST",
      schema: CreateMortgageWithPropertyResponse,
      body: body.payload,
      idempotencyKey:
        typeof body.key === "string" && /^[\x20-\x7E]{1,200}$/.test(body.key)
          ? `onboarding-pair:${body.key}`
          : undefined,
      signal: args.request.signal,
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    // A backend refusal keeps its status (400 for a bad body, 401 for a lost session); the
    // caller only needs to know the pair was not saved. Checked by name as well, since a test
    // environment can load the error class twice.
    const refused =
      error instanceof BackendError ||
      (error as { name?: unknown } | null)?.name === "BackendError";
    if (refused) {
      const status = (error as { status?: number }).status;
      return Response.json({ success: false }, { status: status ?? 502 });
    }
    throw error;
  }
};
