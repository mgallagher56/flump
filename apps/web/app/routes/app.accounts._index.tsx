import type { ContractSchema } from "@flump/api-client";
import {
  AccountListResponse,
  BankConnectionCapabilityResponse,
  ConnectBankResponse,
  CreateAccountResponse,
  DeleteAccountResponse,
  DeleteBankConnectionResponse,
  SyncBankConnectionResponse,
  UpdateAccountResponse,
} from "@flump/api-contract";
import {
  HOME_ESTIMATE_LABEL,
  isBuyToLetAccount,
  isResidentialHomeAccount,
} from "@flump/finance-engine";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { accountFieldsFromForm } from "~/features/accounts/accountFormBody";
import {
  backendFetch,
  backendFetchAll,
  type HttpMethod,
  loadWorkspacePicture,
} from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { ifMatchFromForm, revalidateOnConflict, versionEtag } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

/** Shown when the mortgage saved but the home value did not. */
export const HOME_NOT_SAVED_NOTICE =
  "We saved your mortgage but could not save your home value. Add it on the mortgage page.";

/** Shown when the mortgage saved and a home was already on Accounts, so the typed value was not added. */
export const HOME_ALREADY_THERE_NOTICE =
  "We saved your mortgage. Your home value was not added because you already have a home on Accounts. Update it on the mortgage page.";

/**
 * Adds the home for a mortgage that has just been saved: a Property account labelled
 * HOME_ESTIMATE_LABEL with the mortgage's ownership and share. Returns a notice for the user when
 * the value was not added (a home was already there, or the save failed), or null when it was.
 * The mortgage is never taken away again: it saved, so it stays.
 */
async function addHomeForMortgage(opts: {
  token: string;
  signal: AbortSignal;
  homeValue: number;
  mortgage: Pick<CreateAccountResponse, "ownership" | "sharePercent">;
  idempotencyKey: string | undefined;
}): Promise<string | null> {
  const { token, signal, homeValue, mortgage, idempotencyKey } = opts;
  const ownership = mortgage.ownership === "joint" ? "joint" : "sole";
  const sharePercent = ownership === "joint" ? (mortgage.sharePercent ?? null) : null;
  try {
    const existing = await backendFetchAll("/accounts", {
      accessToken: token,
      signal,
      schema: AccountListResponse,
    });
    const homes = existing.filter(isResidentialHomeAccount);
    if (homes.length > 0) {
      // A retry after a timeout that did save: the one home is the one this add saved before
      // (our label and the same value). It takes the mortgage's ownership and share.
      const earlier =
        homes.length === 1 &&
        homes[0]?.name === HOME_ESTIMATE_LABEL &&
        Number(homes[0]?.balance) === homeValue
          ? homes[0]
          : null;
      if (!earlier) return HOME_ALREADY_THERE_NOTICE;
      if (earlier.ownership !== ownership || (earlier.sharePercent ?? null) !== sharePercent) {
        await backendFetch(`/accounts/${encodeURIComponent(earlier.id)}`, {
          accessToken: token,
          method: "PATCH",
          schema: UpdateAccountResponse,
          ifMatch: versionEtag(earlier.updatedAt),
          body: { ownership, sharePercent },
        });
      }
      return null;
    }
    await backendFetch("/accounts", {
      accessToken: token,
      method: "POST",
      schema: CreateAccountResponse,
      body: {
        name: HOME_ESTIMATE_LABEL,
        type: "Property",
        balance: homeValue,
        ownership,
        sharePercent,
      },
      idempotencyKey,
    });
    return null;
  } catch {
    return HOME_NOT_SAVED_NOTICE;
  }
}

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");
  const connectionId = formData.get("connectionId");
  const name = formData.get("name");
  const type = formData.get("type");
  const fields = accountFieldsFromForm(formData);

  // Literal methods, so the conditional-writes law can see every write this action makes.
  const post = <T,>(endpoint: string, schema: ContractSchema<T>, body?: unknown) =>
    backendFetch(endpoint, { accessToken: token, method: "POST", body, schema });
  const remove = <T,>(endpoint: string, schema: ContractSchema<T>) =>
    backendFetch(endpoint, { accessToken: token, method: "DELETE", schema });

  try {
    if (intent === "create") {
      // One id per opening of the add dialog. Each POST is keyed from it, so a retry after a
      // timeout that did save replays the first answer instead of adding a second copy.
      const requestId = formData.get("requestId");
      const keyFor = (part: string): string | undefined =>
        typeof requestId === "string" && requestId !== "" ? `${requestId}:${part}` : undefined;
      const createBody = { name, type, ...fields };
      const mortgage = await backendFetch("/accounts", {
        accessToken: token,
        method: "POST",
        schema: CreateAccountResponse,
        body: createBody,
        idempotencyKey: keyFor(type === "Mortgage" ? "mortgage" : "account"),
      });
      // A residential mortgage added with the home's value adds the home after it, as a Property
      // account with the mortgage's ownership and share. A buy-to-let value is never stored here:
      // the mortgage page keeps it on the profile.
      const homeValue = Number(formData.get("homeValue"));
      const btl = isBuyToLetAccount({
        name: typeof name === "string" ? name : "",
        accountSubtype: fields.accountSubtype ?? null,
      });
      if (type === "Mortgage" && !btl && Number.isFinite(homeValue) && homeValue > 0) {
        const notice = await addHomeForMortgage({
          token,
          signal: args.request.signal,
          homeValue: roundTo2dp(homeValue),
          mortgage,
          idempotencyKey: keyFor("home"),
        });
        if (notice) return data({ success: true, notice });
      }
    } else if (intent === "update") {
      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        accessToken: token,
        method: "PATCH",
        schema: UpdateAccountResponse,
        ifMatch: ifMatchFromForm(formData),
        body: {
          name,
          type,
          ...fields,
        },
      });
    } else if (intent === "delete") {
      await remove(
        `/accounts/${encodeURIComponent(String(accountId ?? ""))}`,
        DeleteAccountResponse,
      );
    } else if (intent === "syncConnection") {
      await post(
        `/bank-connections/${encodeURIComponent(String(connectionId ?? ""))}/refresh`,
        SyncBankConnectionResponse,
      );
    } else if (intent === "disconnectConnection") {
      await remove(
        `/bank-connections/${encodeURIComponent(String(connectionId ?? ""))}`,
        DeleteBankConnectionResponse,
      );
    } else if (intent === "connectBank") {
      const institutionId = String(formData.get("institutionId") || "");
      const bankToken = formData.get("token");
      const authType = formData.get("authType");
      const isOAuth = authType === "oauth" || (!bankToken && authType !== "token");

      let backendData: any = null;
      try {
        backendData = await post("/bank-connections", ConnectBankResponse, {
          institutionId,
          token: bankToken ? String(bankToken) : undefined,
        });
      } catch (connectErr) {
        // OAuth connections may be completed through the provider redirect even if this call fails.
        if (!isOAuth || !(connectErr instanceof BackendError)) throw connectErr;
      }

      if (isOAuth) {
        if (backendData?.oauth && backendData?.redirectUrl) {
          return data({ success: true, oauth: true, redirectUrl: backendData.redirectUrl });
        }

        // Bank OAuth is cut (E16): the /auth/callback route no longer exists.
        return data(
          { success: false, error: "Connecting a bank is not available at the moment." },
          { status: 501 },
        );
      }
      return data(backendData || { success: true });
    }
    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const meta: MetaFunction = () => [{ title: "Accounts | Flump" }];

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, bankConnections, user, accessToken, userProfile, picture } =
    await loadWorkspacePicture(args, {
      includeConnections: true,
    });
  // Bank connection is owner-only (E19 D3-B). Failing closed: any error hides the entry points.
  let bankConnectionsEnabled = false;
  if (accessToken) {
    try {
      const capability = await backendFetch("/bank-connections/capability", {
        accessToken,
        signal: args.request.signal,
        schema: BankConnectionCapabilityResponse,
      });
      bankConnectionsEnabled = capability?.enabled === true;
    } catch {
      bankConnectionsEnabled = false;
    }
  }
  // The profile carries the user's own home estimate, which net worth counts (E16 D3).
  return data({
    accounts,
    accountDetails,
    bankConnections,
    bankConnectionsEnabled,
    user,
    userProfile,
    // Net worth from the shared picture (audit slice 3); only this part leaves the server.
    netWorth: picture?.netWorth ?? null,
  });
};

const Accounts = (): ReactElement<ReactElement> => {
  return <AccountsContainer />;
};
export default Accounts;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
