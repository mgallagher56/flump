import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import PensionContainer from "~/containers/pension/PensionContainer";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
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
        accessToken: token,
        method: "POST",
        body: {
          name,
          type: "Pension",
          balance: balance ? roundTo2dp(Number(balance)) : 0,
          interestRate:
            interestRate !== null && interestRate !== "" ? roundTo2dp(Number(interestRate)) : 5.0,
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
        accessToken: token,
        method: "PATCH",
        body: updatePayload,
      });
    } else if (intent === "deletePensionAccount") {
      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        accessToken: token,
        method: "DELETE",
      });
    } else if (intent === "updatePensionContributions") {
      const pensionPercent = formData.get("pensionPercent");
      const pensionEmployerPercent = formData.get("pensionEmployerPercent");
      const annualSalary = formData.get("annualSalary");
      const isSalarySacrifice = formData.get("isSalarySacrifice");
      const isSalarySacrificeEmployerNi = formData.get("isSalarySacrificeEmployerNi");

      await backendFetch(`/user-profile`, {
        accessToken: token,
        method: "PATCH",
        body: {
          ...(pensionPercent !== null
            ? { pensionPercent: roundTo2dp(Number(pensionPercent)) }
            : {}),
          ...(pensionEmployerPercent !== null
            ? { pensionEmployerPercent: roundTo2dp(Number(pensionEmployerPercent)) }
            : {}),
          ...(annualSalary !== null ? { annualSalary: roundTo2dp(Number(annualSalary)) } : {}),
          ...(isSalarySacrifice !== null
            ? { isSalarySacrifice: isSalarySacrifice === "true" }
            : {}),
          ...(isSalarySacrificeEmployerNi !== null
            ? { isSalarySacrificeEmployerNi: isSalarySacrificeEmployerNi === "true" }
            : {}),
        },
      });
    } else if (intent === "completePensionWizard") {
      const name = formData.get("name");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");
      const annualSalary = formData.get("annualSalary");
      const pensionPercent = formData.get("pensionPercent");
      const pensionEmployerPercent = formData.get("pensionEmployerPercent");
      const isSalarySacrifice = formData.get("isSalarySacrifice");
      const isSalarySacrificeEmployerNi = formData.get("isSalarySacrificeEmployerNi");

      // 1. Create initial pot
      await backendFetch(`/accounts`, {
        accessToken: token,
        method: "POST",
        body: {
          name: name || "Workplace Pension",
          type: "Pension",
          balance: balance ? roundTo2dp(Number(balance)) : 0,
          interestRate: interestRate ? roundTo2dp(Number(interestRate)) : 5.0,
          monthlyContribution: monthlyContribution ? roundTo2dp(Number(monthlyContribution)) : null,
        },
      });

      // 2. Update user profile
      await backendFetch(`/user-profile`, {
        accessToken: token,
        method: "PATCH",
        body: {
          ...(annualSalary ? { annualSalary: roundTo2dp(Number(annualSalary)) } : {}),
          ...(pensionPercent ? { pensionPercent: roundTo2dp(Number(pensionPercent)) } : {}),
          ...(pensionEmployerPercent
            ? { pensionEmployerPercent: roundTo2dp(Number(pensionEmployerPercent)) }
            : {}),
          ...(isSalarySacrifice !== null
            ? { isSalarySacrifice: isSalarySacrifice === "true" }
            : {}),
          ...(isSalarySacrificeEmployerNi !== null
            ? { isSalarySacrificeEmployerNi: isSalarySacrificeEmployerNi === "true" }
            : {}),
        },
      });

      // 3. Mark checklist step complete
      try {
        await backendFetch(`/user-profile/checklist`, {
          accessToken: token,
          method: "PATCH",
          body: { step: "pension", completed: true },
        });
      } catch (checklistErr) {
        // Best effort, as before: the pot and profile are saved, so a failed tick must not fail the wizard.
        if (!(checklistErr instanceof BackendError)) throw checklistErr;
      }
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, user } = await loadWorkspaceSnapshot(args);
  return data({ accounts, accountDetails, userProfile, user });
};

const PensionRoute = (): ReactElement => {
  return <PensionContainer />;
};

export default PensionRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
