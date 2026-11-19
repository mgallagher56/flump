import {
  CreateAccountResponse,
  DeleteAccountResponse,
  UpdateAccountResponse,
  UpdateProfileResponse,
} from "@flump/api-contract";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import SavingsContainer from "~/containers/savings/SavingsContainer";
import { backendFetch, loadWorkspacePicture } from "~/services/backend-client.server";
import { ifMatchFromForm, PROFILE_VERSION_FIELD, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

export const meta: MetaFunction = () => [{ title: "Your savings | Flump" }];

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");

  const token = requireAccessToken({ accessToken });

  try {
    if (intent === "createSavingsAccount") {
      const name = formData.get("name");
      const type = formData.get("type") || "Saving";
      const accountSubtype = formData.get("accountSubtype");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      await backendFetch(`/accounts`, {
        schema: CreateAccountResponse,
        accessToken: token,
        method: "POST",
        body: {
          name,
          type,
          ...(typeof accountSubtype === "string" && accountSubtype !== ""
            ? { accountSubtype }
            : {}),
          balance: balance ? roundTo2dp(Number(balance)) : 0,
          interestRate:
            interestRate !== null && interestRate !== "" ? roundTo2dp(Number(interestRate)) : null,
          monthlyContribution:
            monthlyContribution !== null && monthlyContribution !== ""
              ? roundTo2dp(Number(monthlyContribution))
              : null,
        },
      });
    } else if (intent === "updateSavingsAccount") {
      const name = formData.get("name");
      const type = formData.get("type");
      const accountSubtype = formData.get("accountSubtype");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      const updatePayload: Record<string, any> = {};
      if (name !== null && name !== undefined) updatePayload.name = name;
      if (type !== null && type !== undefined) updatePayload.type = type;
      if (accountSubtype !== null && accountSubtype !== undefined) {
        updatePayload.accountSubtype = accountSubtype !== "" ? accountSubtype : null;
      }
      // Sent only when a saved joint account is saved as an ISA, which is held in one name. The
      // backend clears the share of a sole account, so no share is sent.
      if (formData.get("ownership") === "sole") updatePayload.ownership = "sole";
      if (balance !== null && balance !== undefined)
        updatePayload.balance = roundTo2dp(Number(balance));
      if (interestRate !== null && interestRate !== undefined) {
        updatePayload.interestRate = interestRate !== "" ? roundTo2dp(Number(interestRate)) : null;
      }
      if (monthlyContribution !== null && monthlyContribution !== undefined) {
        updatePayload.monthlyContribution =
          monthlyContribution !== "" ? roundTo2dp(Number(monthlyContribution)) : null;
      }

      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        schema: UpdateAccountResponse,
        accessToken: token,
        method: "PATCH",
        body: updatePayload,
        ifMatch: ifMatchFromForm(formData),
      });
    } else if (intent === "deleteAccount") {
      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        schema: DeleteAccountResponse,
        accessToken: token,
        method: "DELETE",
      });
    } else if (intent === "updateSavingsSettings") {
      const savingsAllocationMode = formData.get("savingsAllocationMode");
      const monthlySavingsTarget = formData.get("monthlySavingsTarget");

      await backendFetch(`/user-profile`, {
        schema: UpdateProfileResponse,
        accessToken: token,
        method: "PATCH",
        ifMatch: ifMatchFromForm(formData, PROFILE_VERSION_FIELD),
        body: {
          ...(savingsAllocationMode ? { savingsAllocationMode } : {}),
          ...(monthlySavingsTarget !== null
            ? { monthlySavingsTarget: roundTo2dp(Number(monthlySavingsTarget)) }
            : {}),
        },
      });
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, budgetEntries, user, picture } =
    await loadWorkspacePicture(args);

  return data({ accounts, accountDetails, userProfile, budgetEntries, user, picture });
};

const SavingsRoute = (): ReactElement => {
  return <SavingsContainer />;
};

export default SavingsRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
