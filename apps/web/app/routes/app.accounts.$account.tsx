import {
  AccountResponse,
  DeleteAccountResponse,
  UpdateAccountResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import { netWorthBasisFromProfile } from "@flump/finance-engine";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

export const shouldRevalidate = revalidateOnConflict;

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = encodeURIComponent(
    String(formData.get("accountId") || args.params.account || ""),
  );

  try {
    if (intent === "update") {
      const name = formData.get("name");
      const type = formData.get("type");
      const rawBalance = formData.get("balance");
      const rawPlan = formData.get("studentLoanPlan");
      const studentLoanPlan = typeof rawPlan === "string" && rawPlan !== "" ? rawPlan : undefined;
      const rawSubtype = formData.get("accountSubtype");
      const accountSubtype =
        rawSubtype === null ? undefined : rawSubtype === "" ? null : String(rawSubtype);
      const rawCreditLimit = formData.get("creditLimit");
      const creditLimit =
        rawCreditLimit === null
          ? undefined
          : rawCreditLimit === ""
            ? null
            : Number.isFinite(Number(rawCreditLimit))
              ? roundTo2dp(Number(rawCreditLimit))
              : undefined;
      const rawPromoUntil = formData.get("promoZeroPercentUntil");
      const promoZeroPercentUntil =
        rawPromoUntil === null ? undefined : rawPromoUntil === "" ? null : String(rawPromoUntil);
      const balance =
        rawBalance !== null && rawBalance !== "" && Number.isFinite(Number(rawBalance))
          ? roundTo2dp(Number(rawBalance))
          : undefined;

      await backendFetch(`/accounts/${accountId}`, {
        accessToken: token,
        method: "PATCH",
        schema: UpdateAccountResponse,
        ifMatch: ifMatchFromForm(formData),
        body: {
          name,
          type,
          ...(accountSubtype !== undefined ? { accountSubtype } : {}),
          ...(studentLoanPlan !== undefined ? { studentLoanPlan } : {}),
          ...(balance !== undefined ? { balance } : {}),
          ...(creditLimit !== undefined ? { creditLimit } : {}),
          ...(promoZeroPercentUntil !== undefined ? { promoZeroPercentUntil } : {}),
        },
      });
      return data({ success: true });
    }
    if (intent === "delete") {
      await backendFetch(`/accounts/${accountId}`, {
        accessToken: token,
        method: "DELETE",
        schema: DeleteAccountResponse,
      });
      return redirect("/app/accounts");
    }
    return data({ success: false, error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const accountId = encodeURIComponent(args.params.account ?? "");
  if (!accessToken) throwRouteError(new BackendError("unauthorised", `/accounts/${accountId}`));

  try {
    const [account, userProfile] = await Promise.all([
      backendFetch(`/accounts/${accountId}`, {
        accessToken,
        signal: args.request.signal,
        schema: AccountResponse,
      }),
      // The net worth choices only: a failure here never blocks the account page. It leaves the
      // basis unknown (null), so the page says nothing about net worth rather than guess.
      backendFetch("/user-profile", {
        accessToken,
        signal: args.request.signal,
        schema: UserProfileResponse,
      }).catch(() => null),
    ]);
    if (!account) throw new BackendError("not-found", `/accounts/${accountId}`);
    const accountDetails = account.details || [];
    // Whether this account counts toward net worth follows the user's choices (net worth choices).
    // A profile that loaded but has no choices gets the defaults; a failed fetch stays unknown.
    const basis = userProfile === null ? null : netWorthBasisFromProfile(userProfile);
    return data({ account, accountDetails, basis, user });
  } catch (error) {
    throwRouteError(error);
  }
};

const AccountDetailComponent = (): ReactElement<ReactElement> => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
