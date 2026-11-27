/**
 * Adding, changing and deleting an account (E12 S8, plan 9.9b), the same `/v1` routes web's two
 * accounts actions call: `POST /accounts`, `POST /accounts/mortgage-with-property`,
 * `PATCH /accounts/:id` and `DELETE /accounts/:id`. Each body is parsed with the contract's strict
 * request schema before it is sent, so a body the backend would refuse never leaves the phone, and
 * each answer is read loosely, as S6 reads the list: a field a newer backend adds, or an older one
 * leaves out, never turns a save that landed into a failure.
 *
 * After any of them the accounts, their months and the check-in months are read again, so the
 * list, the account page, Home's hero and the two-figure strip show the change at once.
 */
import { type ApiClient, BackendError, type BackendErrorKind } from "@flump/api-client";
import {
  AccountDto,
  CreateAccountRequest,
  CreateMortgageWithPropertyRequest,
  CreateMortgageWithPropertyResponse,
  DeleteAccountResponse,
  UpdateAccountRequest,
} from "@flump/api-contract";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApi } from "./ApiProvider";
import { ifMatchFor } from "./profile";
import { queryKeys } from "./queryKeys";

/** A saved account as an answer, read loosely: only its id is needed. */
const SavedAccount = AccountDto.partial().required({ id: true }).loose();
/** Both saved accounts, each read as loosely as one. */
const SavedPair = CreateMortgageWithPropertyResponse.extend({
  mortgage: SavedAccount,
  property: SavedAccount,
}).loose();
const Deleted = DeleteAccountResponse.loose();

/**
 * How a write ended. `conflict`: refused with 412 because the account changed somewhere else, so
 * nothing was saved and the accounts are read again. `failed`: nothing changed, with the kind of
 * failure for web's words. `invalid`: the contract refused the body, so nothing was sent.
 */
export type AccountWriteResult =
  /** `id`: the new account's, after an add. */
  | { status: "saved"; id?: string }
  | { status: "conflict" }
  | { status: "failed"; kind: BackendErrorKind | "unknown" }
  | { status: "invalid" };

function need(api: ApiClient | null): ApiClient {
  if (!api) throw new Error("No API client");
  return api;
}

/** `POST /accounts`. The key is one per opening of the add form, so a retry never adds twice. */
export async function postAccount(
  api: ApiClient | null,
  body: unknown,
  idempotencyKey: string,
): Promise<string> {
  const saved = await need(api).request("/accounts", {
    method: "POST",
    body: CreateAccountRequest.parse(body),
    schema: SavedAccount,
    idempotencyKey,
  });
  return saved.id;
}

/** `POST /accounts/mortgage-with-property`: both added and linked in one transaction. */
export async function postMortgageWithProperty(
  api: ApiClient | null,
  body: unknown,
  idempotencyKey: string,
): Promise<void> {
  await need(api).request("/accounts/mortgage-with-property", {
    method: "POST",
    body: CreateMortgageWithPropertyRequest.parse(body),
    schema: SavedPair,
    idempotencyKey,
  });
}

/** `PATCH /accounts/:id` with `If-Match` for the version read, as web's `versionField`. */
export async function patchAccount(
  api: ApiClient | null,
  id: string,
  body: unknown,
  updatedAt: string | null | undefined,
): Promise<void> {
  const ifMatch = ifMatchFor(updatedAt);
  await need(api).request(`/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: UpdateAccountRequest.parse(body),
    schema: SavedAccount,
    ...(ifMatch ? { ifMatch } : {}),
  });
}

/** `DELETE /accounts/:id`: the account and its balance history. */
export async function deleteAccountById(api: ApiClient | null, id: string): Promise<void> {
  await need(api).request(`/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: Deleted,
  });
}

/** The reads an account write changes. */
function invalidateAccounts(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accountDetails() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.checkIns() }),
  ]).then(() => undefined);
}

/** Runs a write and says how it ended; never rejects. */
async function settle(
  write: () => Promise<string | undefined | void>,
  queryClient: QueryClient,
  { awaitRefresh = true }: { awaitRefresh?: boolean } = {},
): Promise<AccountWriteResult> {
  let id: string | undefined;
  try {
    id = (await write()) ?? undefined;
  } catch (error) {
    if (error instanceof BackendError) {
      if (error.status === 412) {
        // The saved account is read again, so the form's next save sends its version.
        await invalidateAccounts(queryClient).catch(() => undefined);
        return { status: "conflict" };
      }
      return { status: "failed", kind: error.kind };
    }
    // The contract refused the body before anything was sent.
    if (error instanceof Error && error.name === "ZodError") return { status: "invalid" };
    return { status: "failed", kind: "unknown" };
  }
  // A failed refresh keeps what is on screen; the save itself landed. After a delete the screen
  // leaves first: waiting would show the deleted account as not found for a moment.
  const refresh = invalidateAccounts(queryClient).catch(() => undefined);
  if (awaitRefresh) await refresh;
  return id ? { status: "saved", id } : { status: "saved" };
}

export interface AccountWrites {
  create(body: unknown, idempotencyKey: string): Promise<AccountWriteResult>;
  createMortgageWithProperty(body: unknown, idempotencyKey: string): Promise<AccountWriteResult>;
  update(
    id: string,
    body: unknown,
    updatedAt: string | null | undefined,
  ): Promise<AccountWriteResult>;
  remove(id: string): Promise<AccountWriteResult>;
}

/** The four writes, each reading the accounts again once it lands. */
export function useAccountWrites(): AccountWrites {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      create: (body, key) => settle(() => postAccount(api, body, key), queryClient),
      createMortgageWithProperty: (body, key) =>
        settle(() => postMortgageWithProperty(api, body, key), queryClient),
      update: (id, body, updatedAt) =>
        settle(() => patchAccount(api, id, body, updatedAt), queryClient),
      remove: (id) =>
        settle(() => deleteAccountById(api, id), queryClient, { awaitRefresh: false }),
    }),
    [api, queryClient],
  );
}
