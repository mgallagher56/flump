import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import SavingsContainer from "~/containers/savings/SavingsContainer";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Savings & Forecasting | Flump" }];

export const handle = {
  i18n: ["common"],
};

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
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      await backendFetch(`/accounts`, {
        accessToken: token,
        method: "POST",
        body: {
          name,
          type,
          balance: balance ? Number(balance) : 0,
          interestRate: interestRate !== null && interestRate !== "" ? Number(interestRate) : null,
          monthlyContribution:
            monthlyContribution !== null && monthlyContribution !== ""
              ? Number(monthlyContribution)
              : null,
        },
      });
    } else if (intent === "updateSavingsAccount") {
      const name = formData.get("name");
      const type = formData.get("type");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      const updatePayload: Record<string, any> = {};
      if (name !== null && name !== undefined) updatePayload.name = name;
      if (type !== null && type !== undefined) updatePayload.type = type;
      if (balance !== null && balance !== undefined) updatePayload.balance = Number(balance);
      if (interestRate !== null && interestRate !== undefined) {
        updatePayload.interestRate = interestRate !== "" ? Number(interestRate) : null;
      }
      if (monthlyContribution !== null && monthlyContribution !== undefined) {
        updatePayload.monthlyContribution =
          monthlyContribution !== "" ? Number(monthlyContribution) : null;
      }

      await backendFetch(`/accounts/${accountId}`, {
        accessToken: token,
        method: "PATCH",
        body: updatePayload,
      });
    } else if (intent === "deleteAccount") {
      await backendFetch(`/accounts/${accountId}`, { accessToken: token, method: "DELETE" });
    } else if (intent === "updateSavingsSettings") {
      const savingsAllocationMode = formData.get("savingsAllocationMode");
      const monthlySavingsTarget = formData.get("monthlySavingsTarget");

      await backendFetch(`/user-profile`, {
        accessToken: token,
        method: "PATCH",
        body: {
          ...(savingsAllocationMode ? { savingsAllocationMode } : {}),
          ...(monthlySavingsTarget !== null
            ? { monthlySavingsTarget: Number(monthlySavingsTarget) }
            : {}),
        },
      });
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, budgetEntries, user } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });

  return data({ accounts, accountDetails, userProfile, budgetEntries, user });
};

const SavingsRoute = (): ReactElement => {
  return <SavingsContainer />;
};

export default SavingsRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
