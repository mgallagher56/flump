import {
  CreateAccountResponse,
  DeleteAccountResponse,
  UpdateAccountResponse,
} from "@flump/api-contract";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import DebtContainer from "~/containers/debt/DebtContainer";
import { buildDebtInputs, debtInputsFromPicture } from "~/features/debt/utils/debtInputs";
import { backendFetch, loadWorkspacePicture } from "~/services/backend-client.server";
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
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
      const creditLimit = optionalNumber(formData.get("creditLimit"));
      const promoRaw = formData.get("promoZeroPercentUntil");
      await backendFetch("/accounts", {
        schema: CreateAccountResponse,
        accessToken: token,
        method: "POST",
        body: {
          name: formData.get("name"),
          type: formData.get("type"),
          balance: storedLiabilityBalance(formData.get("balance")),
          interestRate: optionalNumber(formData.get("interestRate")),
          monthlyContribution: optionalNumber(formData.get("monthlyContribution")),
          // Only a card or overdraft has these, and only when the user gave them.
          ...(creditLimit !== null ? { creditLimit } : {}),
          ...(typeof promoRaw === "string" && promoRaw !== ""
            ? { promoZeroPercentUntil: promoRaw }
            : {}),
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
      if (formData.has("creditLimit")) {
        body.creditLimit = optionalNumber(formData.get("creditLimit"));
      }
      if (formData.has("promoZeroPercentUntil")) {
        const promoRaw = formData.get("promoZeroPercentUntil");
        body.promoZeroPercentUntil =
          typeof promoRaw === "string" && promoRaw !== "" ? promoRaw : null;
      }
      await backendFetch(`/accounts/${accountId}`, {
        schema: UpdateAccountResponse,
        accessToken: token,
        method: "PATCH",
        body,
        ifMatch: ifMatchFromForm(formData),
      });
    } else if (intent === "deleteDebt") {
      await backendFetch(`/accounts/${accountId}`, {
        schema: DeleteAccountResponse,
        accessToken: token,
        method: "DELETE",
      });
    } else {
      return data(
        {
          success: false as const,
          error: "We could not save that change. Your debts are unchanged. Try again.",
        },
        { status: 400 },
      );
    }

    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const meta: MetaFunction = () => [{ title: "Cards and loans | Flump" }];

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, user, picture } = await loadWorkspacePicture(args);

  return data({
    accounts,
    accountDetails,
    userProfile,
    // From the shared loader's picture: nothing is rebuilt, and the picture itself stays on the
    // server. Null only with nobody signed in (no rows).
    debtInputs: picture ? debtInputsFromPicture(picture) : buildDebtInputs([], [], []),
    user,
  });
};

const DebtRoute = (): ReactElement => {
  return <DebtContainer />;
};

export default DebtRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
