import type { ContractSchema } from "@flump/api-client";
import {
  BankConnectionCapabilityResponse,
  ConnectBankResponse,
  CreateAccountResponse,
  CreateMortgageWithPropertyResponse,
  DeleteAccountResponse,
  DeleteBankConnectionResponse,
  SyncBankConnectionResponse,
  UpdateAccountResponse,
} from "@flump/api-contract";
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
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

/**
 * The form field carrying the mortgage's version when a property is added for it, so linking the
 * new property does not overwrite a change made to the mortgage elsewhere.
 */
export const LINK_MORTGAGE_VERSION_FIELD = "linkMortgageVersion";

/** Shown when a property saved but linking it to the mortgage it was added for did not. */
export const MORTGAGE_NOT_LINKED_NOTICE =
  "We saved the property but could not link it to your mortgage. Edit the mortgage to choose it.";

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
      // A mortgage added with its property's value and no property to link to: the backend adds
      // both in one transaction, linked, the property at the mortgage's ownership and share
      // (decision 14 B) and of its kind (a rental for buy to let, else the home).
      const homeValue = Number(formData.get("homeValue"));
      if (
        type === "Mortgage" &&
        Number.isFinite(homeValue) &&
        homeValue > 0 &&
        !fields.linkedAccountId
      ) {
        const { linkedAccountId: _notLinked, ...mortgageFields } = fields;
        const pairBody = {
          mortgage: { name, ...mortgageFields },
          property: { balance: roundTo2dp(homeValue) },
        };
        await backendFetch("/accounts/mortgage-with-property", {
          accessToken: token,
          method: "POST",
          schema: CreateMortgageWithPropertyResponse,
          body: pairBody,
          idempotencyKey: keyFor("mortgage"),
        });
        return data({ success: true });
      }
      const createBody = { name, type, ...fields };
      const created = await backendFetch("/accounts", {
        accessToken: token,
        method: "POST",
        schema: CreateAccountResponse,
        body: createBody,
        idempotencyKey: keyFor(type === "Mortgage" ? "mortgage" : "account"),
      });
      // A property added for a mortgage ("Add an estimate"): link the mortgage to it, at the
      // mortgage's version. The property is kept either way; a failed link says so.
      const linkMortgageId = formData.get("linkMortgageId");
      if (
        type === "Property" &&
        typeof linkMortgageId === "string" &&
        linkMortgageId !== "" &&
        created?.id
      ) {
        try {
          await backendFetch(`/accounts/${encodeURIComponent(linkMortgageId)}`, {
            accessToken: token,
            method: "PATCH",
            schema: UpdateAccountResponse,
            ifMatch: ifMatchFromForm(formData, LINK_MORTGAGE_VERSION_FIELD),
            body: { linkedAccountId: created.id },
          });
        } catch {
          return data({ success: true, notice: MORTGAGE_NOT_LINKED_NOTICE });
        }
      }
    } else if (intent === "update") {
      // An edit sends only the fields the user changed: a name or type left out stays as saved.
      await backendFetch(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, {
        accessToken: token,
        method: "PATCH",
        schema: UpdateAccountResponse,
        ifMatch: ifMatchFromForm(formData),
        body: {
          ...(name !== null ? { name } : {}),
          ...(type !== null ? { type } : {}),
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
