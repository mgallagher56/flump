/**
 * The version gate (plan section 4.9): `GET /v1/app/client-policy`, compared with this build's
 * version. It fails open: if the check cannot be made, the app carries on, so an outage of the
 * policy route never locks anyone out.
 */
import { type ApiClient, isBelowMin } from "@flump/api-client";

export type UpdateCheck = () => Promise<boolean>;

/** True only when the server answered and this version is below its minimum. */
export function createUpdateCheck(
  api: Pick<ApiClient, "getClientPolicy">,
  appVersion: string,
): UpdateCheck {
  return async () => {
    try {
      const result = await api.getClientPolicy();
      return result.ok && isBelowMin(appVersion, result.policy);
    } catch {
      return false;
    }
  };
}
