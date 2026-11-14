import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import DebtContainer from "~/containers/debt/DebtContainer";
import { buildDebtInputs } from "~/features/debt/utils/debtInputs";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

const optionalNumber = (value: FormDataEntryValue | null): number | null =>
  value !== null && value !== "" && Number.isFinite(Number(value))
    ? roundTo2dp(Number(value))
    : null;

/** Liabilities are stored as minus the amount owed (E4 D2-A), whatever sign the client sends. */
const storedLiabilityBalance = (value: FormDataEntryValue | null): number => {
  const amount = Math.abs(optionalNumber(value) ?? 0);
  return amount === 0 ? 0 : -amount;
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = encodeURIComponent(String(formData.get("accountId") ?? ""));
  const token = requireAccessToken({ accessToken });

  try {
    if (intent === "createDebt") {
      await backendFetch("/accounts", {
        accessToken: token,
        method: "POST",
        body: {
          name: formData.get("name"),
          type: formData.get("type"),
          balance: storedLiabilityBalance(formData.get("balance")),
          interestRate: optionalNumber(formData.get("interestRate")),
          monthlyContribution: optionalNumber(formData.get("monthlyContribution")),
        },
      });
    } else if (intent === "updateDebt") {
      const body: Record<string, unknown> = {};
      const name = formData.get("name");
      const type = formData.get("type");
      if (name !== null) body.name = name;
      if (type !== null) body.type = type;
      if (formData.has("balance")) body.balance = storedLiabilityBalance(formData.get("balance"));
      if (formData.has("interestRate"))
        body.interestRate = optionalNumber(formData.get("interestRate"));
      if (formData.has("monthlyContribution")) {
        body.monthlyContribution = optionalNumber(formData.get("monthlyContribution"));
      }
      await backendFetch(`/accounts/${accountId}`, {
        accessToken: token,
        method: "PATCH",
        body,
      });
    } else if (intent === "deleteDebt") {
      await backendFetch(`/accounts/${accountId}`, { accessToken: token, method: "DELETE" });
    } else {
      return data({ success: false as const, error: "Unknown action." }, { status: 400 });
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const meta: MetaFunction = () => [{ title: "Debt payoff | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, budgetEntries, user } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });

  return data({
    accounts,
    accountDetails,
    userProfile,
    debtInputs: buildDebtInputs(accounts, accountDetails, budgetEntries),
    user,
  });
};

const DebtRoute = (): ReactElement => {
  return <DebtContainer />;
};

export default DebtRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
