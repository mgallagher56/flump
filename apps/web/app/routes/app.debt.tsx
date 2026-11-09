import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import DebtContainer from "~/containers/debt/DebtContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, budgetEntries, user } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });

  return data({
    accounts,
    accountDetails,
    userProfile,
    budgetData: budgetEntries.length > 0 ? budgetEntries : null,
    user,
  });
};

const DebtRoute = (): ReactElement => {
  return <DebtContainer />;
};

export default DebtRoute;
