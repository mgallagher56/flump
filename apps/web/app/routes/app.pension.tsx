import {
  CreateAccountResponse,
  DeleteAccountResponse,
  RetirementPlanResponse,
  UpdateAccountResponse,
  UpdateChecklistResponse,
  UpdateProfileResponse,
} from "@flump/api-contract";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import PensionContainer from "~/containers/pension/PensionContainer";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { ifMatchFromForm, PROFILE_VERSION_FIELD, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

export const meta: MetaFunction = () => [{ title: "Your pension | Flump" }];

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");

  const token = requireAccessToken({ accessToken });

  try {
    if (intent === "createPensionAccount") {
      const name = formData.get("name");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");
      const isCurrent = formData.get("isCurrent");
      const isCurrentBool = isCurrent !== null ? isCurrent === "true" : true;

      await backendFetch(`/accounts`, {
        schema: CreateAccountResponse,
        accessToken: token,
        method: "POST",
        body: {
          name,
          type: "Pension",
          balance: balance ? roundTo2dp(Number(balance)) : 0,
          interestRate:
            // A blank rate stays unset: the page asks for one instead of saving an assumed figure.
            interestRate !== null && interestRate !== "" ? roundTo2dp(Number(interestRate)) : null,
          monthlyContribution:
            isCurrentBool && monthlyContribution !== null && monthlyContribution !== ""
              ? roundTo2dp(Number(monthlyContribution))
              : null,
          isCurrent: isCurrentBool,
        },
      });
    } else if (intent === "updatePensionAccount") {
      const name = formData.get("name");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");
      const isCurrent = formData.get("isCurrent");

      const updatePayload: Record<string, any> = {};
      if (name !== null && name !== undefined) updatePayload.name = name;
      if (balance !== null && balance !== undefined)
        updatePayload.balance = roundTo2dp(Number(balance));
      if (interestRate !== null && interestRate !== undefined) {
        updatePayload.interestRate = interestRate !== "" ? roundTo2dp(Number(interestRate)) : null;
      }
      if (isCurrent !== null && isCurrent !== undefined) {
        updatePayload.isCurrent = isCurrent === "true";
      }
      if (monthlyContribution !== null && monthlyContribution !== undefined) {
        updatePayload.monthlyContribution =
          monthlyContribution !== "" ? roundTo2dp(Number(monthlyContribution)) : null;
      }
      if (updatePayload.isCurrent === false) {
        updatePayload.monthlyContribution = null;
      }

      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        schema: UpdateAccountResponse,
        accessToken: token,
        method: "PATCH",
        body: updatePayload,
        ifMatch: ifMatchFromForm(formData),
      });
    } else if (intent === "deletePensionAccount") {
      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        schema: DeleteAccountResponse,
        accessToken: token,
        method: "DELETE",
      });
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

/**
 * RD9: whether this account can see Retirement (friends beta or open testing). The backend answers
 * /retirement-plan with its unknown-route 404 otherwise. Any failure counts as not available and
 * never fails the pension page.
 */
async function isRetirementAvailable(args: LoaderFunctionArgs): Promise<boolean> {
  try {
    const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
    await backendFetch("/retirement-plan", {
      schema: RetirementPlanResponse,
      accessToken: requireAccessToken({ accessToken }),
      method: "GET",
    });
    return true;
  } catch {
    return false;
  }
}

export const loader = async (args: LoaderFunctionArgs) => {
  const [{ accounts, accountDetails, userProfile, user }, retirementAvailable] = await Promise.all([
    loadWorkspaceSnapshot(args),
    isRetirementAvailable(args),
  ]);
  return data({ accounts, accountDetails, userProfile, user, retirementAvailable });
};

const PensionRoute = (): ReactElement => {
  return <PensionContainer />;
};

export default PensionRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
