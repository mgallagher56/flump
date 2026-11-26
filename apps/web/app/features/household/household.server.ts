import { callBackend } from "@flump/api-client";
import {
  CreateHouseholdInvitationResponse,
  HouseholdDoneResponse,
  HouseholdJointSummaryResponse,
  HouseholdResponse,
  UpdateHouseholdSharingResponse,
} from "@flump/api-contract";
import { data } from "react-router";
import { apiConfig } from "~/config.server";
import { expectedOrigin } from "~/security/csrf.server";
import { withRequestIdHeader } from "~/security/request-id.server";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { withClientIpHeaders } from "~/services/client-ip.server";
import { actionErrorResponse } from "~/services/route-error.server";
import {
  ALREADY_IN_HOUSEHOLD_MESSAGE,
  HOUSEHOLD_INTENT,
  type HouseholdActionData,
  type HouseholdIntent,
  type HouseholdSettingsData,
} from "./household";

export const isBackendStatus = (error: unknown, status: number, code?: string): boolean =>
  error instanceof BackendError &&
  error.status === status &&
  (code === undefined || error.code === code);

export const isAlreadyInHousehold = (error: unknown): boolean =>
  isBackendStatus(error, 409, "already_in_household");

/** The web's ordinary unknown-route answer, the same as the catch-all route (`$.tsx`). */
export const householdNotFound = () =>
  new Response("Not Found", { status: 404, statusText: "Not Found" });

const SWITCH_PROBE_TIMEOUT_MS = 3000;

/**
 * Whether the household switch is on, asked without a session: the backend's gate runs before
 * its sign-in check, so an anonymous `GET /household` answers 404 when the switch is off and 401
 * when it is on. Anything other than 401 or 200 (an error, a timeout, an unexpected status)
 * counts as off, so the household pages fail closed.
 */
export async function householdSwitchOn(signal?: AbortSignal): Promise<boolean> {
  try {
    const { status } = await callBackend(
      {
        baseUrl: apiConfig.apiBaseUrl,
        fetch: (input, init) => fetch(input, init),
        headers: () => withClientIpHeaders(withRequestIdHeader({})),
      },
      "/household",
      { schema: null, allowEmpty: true, signal, timeoutMs: SWITCH_PROBE_TIMEOUT_MS },
    );
    return status === 200;
  } catch (error) {
    return isBackendStatus(error, 401);
  }
}

/**
 * The settings loader's household probe. Null for a 404 (the switch is off) and for any other
 * failure too, so the tab never appears unless the backend answered (fail closed). The joint
 * summary is read only for someone in a household; if it fails the tab still shows, without it.
 */
export async function loadHouseholdSettings(
  accessToken: string,
  signal?: AbortSignal,
): Promise<HouseholdSettingsData | null> {
  let state: HouseholdResponse;
  try {
    state = await backendFetch("/household", { accessToken, signal, schema: HouseholdResponse });
  } catch {
    return null;
  }
  if (!state.household) return { state, jointSummary: null };
  const jointSummary = await backendFetch("/household/joint-summary", {
    accessToken,
    signal,
    schema: HouseholdJointSummaryResponse,
  }).then(
    (summary) => summary.items,
    () => null,
  );
  return { state, jointSummary };
}

/** The household intents of the settings route action. */
export async function householdAction(
  request: Request,
  accessToken: string,
  intent: HouseholdIntent,
  form: FormData,
) {
  try {
    if (intent === HOUSEHOLD_INTENT.createLink) {
      const created = await backendFetch("/household/invitations", {
        accessToken,
        method: "POST",
        body: {},
        idempotencyKey: false,
        schema: CreateHouseholdInvitationResponse,
      });
      // Built from the address the person is using, so the link opens the same app.
      const link = `${expectedOrigin(request)}/household/join/${created.token}`;
      return data<HouseholdActionData>(
        { intent, link, expiresAt: created.expiresAt },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (intent === HOUSEHOLD_INTENT.cancelLink) {
      await backendFetch("/household/invitations", {
        accessToken,
        method: "DELETE",
        schema: HouseholdDoneResponse,
      });
      return data<HouseholdActionData>({ intent, success: true });
    }
    if (intent === HOUSEHOLD_INTENT.leave) {
      await backendFetch("/household/leave", {
        accessToken,
        method: "POST",
        body: {},
        idempotencyKey: false,
        schema: HouseholdDoneResponse,
      });
      return data<HouseholdActionData>({ intent, success: true });
    }
    const saved = await backendFetch("/household/sharing", {
      accessToken,
      method: "POST",
      body: { sharesJointSummary: form.get("sharesJointSummary") === "true" },
      idempotencyKey: false,
      schema: UpdateHouseholdSharingResponse,
    });
    return data<HouseholdActionData>({ intent, sharesJointSummary: saved.sharesJointSummary });
  } catch (error) {
    if (isAlreadyInHousehold(error)) {
      return data<HouseholdActionData>(
        { success: false, error: ALREADY_IN_HOUSEHOLD_MESSAGE },
        { status: 409 },
      );
    }
    return actionErrorResponse(error);
  }
}
