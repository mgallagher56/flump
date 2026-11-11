import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import PensionContainer from "~/containers/pension/PensionContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Pension & Retirement | Flump" }];

export const handle = {
  i18n: ["common"],
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const authHeader = `Bearer ${requireAccessToken({ accessToken })}`;

  try {
    if (intent === "createPensionAccount") {
      const name = formData.get("name");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");
      const isCurrent = formData.get("isCurrent");
      const isCurrentBool = isCurrent !== null ? isCurrent === "true" : true;

      const res = await fetch(`${apiUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name,
          type: "Pension",
          balance: balance ? Number(balance) : 0,
          interestRate: interestRate !== null && interestRate !== "" ? Number(interestRate) : 5.0,
          monthlyContribution:
            isCurrentBool && monthlyContribution !== null && monthlyContribution !== ""
              ? Number(monthlyContribution)
              : null,
          isCurrent: isCurrentBool,
        }),
      });

      if (!res.ok) throw new Error("Failed to create pension account");
    } else if (intent === "updatePensionAccount") {
      const name = formData.get("name");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");
      const isCurrent = formData.get("isCurrent");

      const updatePayload: Record<string, any> = {};
      if (name !== null && name !== undefined) updatePayload.name = name;
      if (balance !== null && balance !== undefined) updatePayload.balance = Number(balance);
      if (interestRate !== null && interestRate !== undefined) {
        updatePayload.interestRate = interestRate !== "" ? Number(interestRate) : null;
      }
      if (isCurrent !== null && isCurrent !== undefined) {
        updatePayload.isCurrent = isCurrent === "true";
      }
      if (monthlyContribution !== null && monthlyContribution !== undefined) {
        updatePayload.monthlyContribution =
          monthlyContribution !== "" ? Number(monthlyContribution) : null;
      }
      if (updatePayload.isCurrent === false) {
        updatePayload.monthlyContribution = null;
      }

      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error("Failed to update pension account");
    } else if (intent === "deletePensionAccount") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      });

      if (!res.ok) throw new Error("Failed to delete pension account");
    } else if (intent === "updatePensionContributions") {
      const pensionPercent = formData.get("pensionPercent");
      const pensionEmployerPercent = formData.get("pensionEmployerPercent");
      const annualSalary = formData.get("annualSalary");
      const isSalarySacrifice = formData.get("isSalarySacrifice");
      const isSalarySacrificeEmployerNi = formData.get("isSalarySacrificeEmployerNi");

      const res = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...(pensionPercent !== null ? { pensionPercent: Number(pensionPercent) } : {}),
          ...(pensionEmployerPercent !== null
            ? { pensionEmployerPercent: Number(pensionEmployerPercent) }
            : {}),
          ...(annualSalary !== null ? { annualSalary: Number(annualSalary) } : {}),
          ...(isSalarySacrifice !== null
            ? { isSalarySacrifice: isSalarySacrifice === "true" }
            : {}),
          ...(isSalarySacrificeEmployerNi !== null
            ? { isSalarySacrificeEmployerNi: isSalarySacrificeEmployerNi === "true" }
            : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to update pension contributions");
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
      const accountRes = await fetch(`${apiUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name: name || "Workplace Pension",
          type: "Pension",
          balance: balance ? Number(balance) : 0,
          interestRate: interestRate ? Number(interestRate) : 5.0,
          monthlyContribution: monthlyContribution ? Number(monthlyContribution) : null,
        }),
      });

      if (!accountRes.ok) throw new Error("Failed to create initial pension account");

      // 2. Update user profile
      const profileRes = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...(annualSalary ? { annualSalary: Number(annualSalary) } : {}),
          ...(pensionPercent ? { pensionPercent: Number(pensionPercent) } : {}),
          ...(pensionEmployerPercent
            ? { pensionEmployerPercent: Number(pensionEmployerPercent) }
            : {}),
          ...(isSalarySacrifice !== null
            ? { isSalarySacrifice: isSalarySacrifice === "true" }
            : {}),
          ...(isSalarySacrificeEmployerNi !== null
            ? { isSalarySacrificeEmployerNi: isSalarySacrificeEmployerNi === "true" }
            : {}),
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to update profile during wizard");

      // 3. Mark checklist step complete
      await fetch(`${apiUrl}/user-profile/checklist`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ step: "pension", completed: true }),
      });
    }

    return data({ success: true });
  } catch (error) {
    console.error("Action error in pension route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 500 });
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
