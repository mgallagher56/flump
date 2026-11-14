import { z } from "zod";
import {
  CreateAccountRequest,
  UpdateAccountRequest,
  UpdateBalancesRequest,
} from "./domains/accounts.js";
import { ConnectBankRequest } from "./domains/bank-connections.js";
import {
  AddBudgetCategoryRequest,
  CreateBudgetEntryRequest,
  UpdateBudgetEntryRequest,
} from "./domains/budget.js";
import {
  CommitImportRequest,
  ImportIdParams,
  PreviewImportRequest,
  RevertImportRequest,
  StageImportRequest,
} from "./domains/imports.js";
import { CreateMcpTokenRequest, McpTokenActivityQuery } from "./domains/mcp-tokens.js";
import {
  DeleteUserRequest,
  ResetFinancialDataRequest,
  UpdateChecklistRequest,
  UpdateProfileRequest,
} from "./domains/profile.js";
import { SnapshotMonthParams, UpsertSnapshotRequest } from "./domains/snapshots.js";
import {
  BulkCreateTaxRecordsRequest,
  CreateTaxRecordRequest,
  UpdateTaxRecordRequest,
} from "./domains/tax.js";
import { CreateTransactionRequest, TransactionListQuery } from "./domains/transactions.js";
import { type PageKind, pageQuery } from "./pagination.js";
import { Uuid } from "./primitives.js";
import {
  AccountDetailListResponse,
  AccountListResponse,
  AccountResponse,
  AddBudgetCategoryResponse,
  BankConnectionCapabilityResponse,
  BankConnectionListResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  ConnectBankResponse,
  ContextPackResponse,
  CreateAccountResponse,
  CreateMcpTokenResponse,
  CreateTransactionResponse,
  DeleteAccountResponse,
  DeleteBankConnectionResponse,
  DeleteBudgetEntryResponse,
  DeleteTaxRecordResponse,
  DeleteUserResponse,
  HealthResponse,
  ImportBatchListResponse,
  ImportBatchResponse,
  ImportPreviewResponse,
  McpTokenActivityResponse,
  McpTokenListResponse,
  PortfolioSnapshotResponse,
  ReadinessResponse,
  ResetFinancialDataResponse,
  RevokeMcpTokenResponse,
  SendPasswordResetResponse,
  SyncBankConnectionResponse,
  TaxRecordListResponse,
  TaxRecordResponse,
  TransactionListResponse,
  UpdateAccountResponse,
  UpdateBalancesResponse,
  UpdateChecklistResponse,
  UpdateProfileResponse,
  UpsertSnapshotResponse,
  UserProfileResponse,
} from "./responses.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type SuccessStatus = 200 | 201 | 204;

/** The success status of a route: its `status`, else 200. */
export const successStatusOf = (route: RouteDefinition): SuccessStatus => route.status ?? 200;

export interface RouteDefinition {
  /** Stable id, `<domain>.<operation>`. Used as the key in logs and tests. */
  readonly id: string;
  readonly method: HttpMethod;
  /** Nest path template without a leading slash, for example `accounts/:id`. */
  readonly path: string;
  /** `user`: WorkOS JWT guard. `public`: no auth. `pat`: personal access token (MCP). */
  readonly auth: "user" | "public" | "pat";
  /** `user`: rows are filtered by the caller's id. `none`: no per-user data. */
  readonly ownership: "user" | "none";
  readonly params?: z.ZodType;
  readonly query?: z.ZodType;
  readonly body?: z.ZodType;
  /**
   * The 2xx JSON body after serialisation (dates as ISO strings, decimals as numbers). Strict
   * objects, so a field the backend starts returning is a violation until the contract lists it.
   * Absent only for routes in NON_JSON_RESPONSE_ROUTES.
   */
  readonly response?: z.ZodType;
  /**
   * The success status (BE-09, M-API5). Default 200. Creates are 201; a delete with no body is
   * 204. The controller's `@HttpCode` must match (test/contract/http-status.spec.ts).
   */
  readonly status?: SuccessStatus;
  /** Request-schema group, for promoting groups to enforcement one at a time later. */
  readonly group: ContractGroup;
  /** Deprecated alias of another route id (kept for old clients). */
  readonly aliasOf?: string;
  /**
   * A paginated list (BE-09, M-API1): the query takes `limit` and `cursor` sized by
   * `PAGE_LIMITS[page]`, and the response carries the next cursor in `X-Next-Cursor`.
   */
  readonly page?: PageKind;
  /**
   * Resource versioning (BE-09, M7): `read` answers with an `ETag`; `conditional` also accepts
   * `If-Match` and answers 412 `precondition_failed` when the resource has changed since.
   */
  readonly etag?: "read" | "conditional";
}

/**
 * Create routes that take no `Idempotency-Key` header, each with its reason. Shrink-only.
 * - `imports.stage`: carries its own `idempotencyKey` in the body (E17).
 * - `mcpTokens.create`: the response holds the plaintext token, shown once; storing it to replay
 *   would keep a usable secret in the database.
 * - `bankConnections.connect`: the request body carries a bank token or OAuth code; storing an
 *   unkeyed hash of it would keep a guessable fingerprint of a credential.
 */
export const IDEMPOTENCY_EXCLUDED_ROUTES = [
  "imports.stage",
  "mcpTokens.create",
  "bankConnections.connect",
] as const;

/** Whether a route accepts the `Idempotency-Key` header: every create POST not excluded above. */
export const isIdempotentRoute = (route: RouteDefinition): boolean =>
  route.method === "POST" &&
  successStatusOf(route) === 201 &&
  !(IDEMPOTENCY_EXCLUDED_ROUTES as readonly string[]).includes(route.id);

export const CONTRACT_GROUPS = [
  "accounts",
  "budget",
  "tax",
  "profile",
  "bank-connections",
  "transactions",
  "snapshots",
  "imports",
  "mcp-tokens",
  "app",
] as const;
export type ContractGroup = (typeof CONTRACT_GROUPS)[number];

export const defineRoute = <const R extends RouteDefinition>(route: R): R => route;

const IdParams = z.strictObject({ id: Uuid });
const AnonymizeQuery = z.strictObject({ anonymize: z.string().optional() });

export const routes = {
  accounts: {
    list: defineRoute({
      id: "accounts.list",
      method: "GET",
      path: "accounts",
      auth: "user",
      ownership: "user",
      group: "accounts",
      response: AccountListResponse,
      page: "accounts",
      query: pageQuery("accounts"),
    }),
    listDetails: defineRoute({
      id: "accounts.listDetails",
      method: "GET",
      path: "account-details",
      auth: "user",
      ownership: "user",
      group: "accounts",
      response: AccountDetailListResponse,
      page: "accountDetails",
      query: pageQuery("accountDetails"),
    }),
    get: defineRoute({
      id: "accounts.get",
      method: "GET",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
      response: AccountResponse,
      etag: "read",
    }),
    getDetails: defineRoute({
      id: "accounts.getDetails",
      method: "GET",
      path: "accounts/:id/details",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
      response: AccountDetailListResponse,
      page: "accountDetails",
      query: pageQuery("accountDetails"),
    }),
    portfolioSnapshot: defineRoute({
      id: "accounts.portfolioSnapshot",
      method: "GET",
      path: "portfolio-snapshot",
      auth: "user",
      ownership: "user",
      group: "accounts",
      response: PortfolioSnapshotResponse,
    }),
    create: defineRoute({
      id: "accounts.create",
      method: "POST",
      status: 201,
      path: "accounts",
      auth: "user",
      ownership: "user",
      body: CreateAccountRequest,
      group: "accounts",
      response: CreateAccountResponse,
    }),
    // Declared before accounts/:id so Nest matches "balances" literally.
    updateBalances: defineRoute({
      id: "accounts.updateBalances",
      method: "PATCH",
      path: "accounts/balances",
      auth: "user",
      ownership: "user",
      body: UpdateBalancesRequest,
      group: "accounts",
      response: UpdateBalancesResponse,
    }),
    replace: defineRoute({
      id: "accounts.replace",
      method: "PUT",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      body: UpdateAccountRequest,
      group: "accounts",
      response: UpdateAccountResponse,
      aliasOf: "accounts.update",
      etag: "conditional",
    }),
    update: defineRoute({
      id: "accounts.update",
      method: "PATCH",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      body: UpdateAccountRequest,
      group: "accounts",
      response: UpdateAccountResponse,
      etag: "conditional",
    }),
    remove: defineRoute({
      id: "accounts.remove",
      method: "DELETE",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
      response: DeleteAccountResponse,
    }),
  },
  snapshots: {
    upsert: defineRoute({
      id: "snapshots.upsert",
      method: "PUT",
      path: "snapshots/:month",
      auth: "user",
      ownership: "user",
      params: SnapshotMonthParams,
      body: UpsertSnapshotRequest,
      group: "snapshots",
      response: UpsertSnapshotResponse,
    }),
  },
  imports: {
    stage: defineRoute({
      id: "imports.stage",
      method: "POST",
      status: 201,
      path: "imports",
      auth: "user",
      ownership: "user",
      body: StageImportRequest,
      group: "imports",
      response: ImportBatchResponse,
    }),
    list: defineRoute({
      id: "imports.list",
      method: "GET",
      path: "imports",
      auth: "user",
      ownership: "user",
      group: "imports",
      response: ImportBatchListResponse,
      page: "imports",
      query: pageQuery("imports"),
    }),
    get: defineRoute({
      id: "imports.get",
      method: "GET",
      path: "imports/:id",
      auth: "user",
      ownership: "user",
      params: ImportIdParams,
      group: "imports",
      response: ImportBatchResponse,
    }),
    preview: defineRoute({
      id: "imports.preview",
      method: "POST",
      path: "imports/:id/preview",
      auth: "user",
      ownership: "user",
      params: ImportIdParams,
      body: PreviewImportRequest,
      group: "imports",
      response: ImportPreviewResponse,
    }),
    commit: defineRoute({
      id: "imports.commit",
      method: "POST",
      path: "imports/:id/commit",
      auth: "user",
      ownership: "user",
      params: ImportIdParams,
      body: CommitImportRequest,
      group: "imports",
      response: ImportBatchResponse,
    }),
    revert: defineRoute({
      id: "imports.revert",
      method: "POST",
      path: "imports/:id/revert",
      auth: "user",
      ownership: "user",
      params: ImportIdParams,
      body: RevertImportRequest,
      group: "imports",
      response: ImportBatchResponse,
    }),
  },
  transactions: {
    list: defineRoute({
      id: "transactions.list",
      method: "GET",
      path: "transactions",
      auth: "user",
      ownership: "user",
      query: TransactionListQuery,
      group: "transactions",
      response: TransactionListResponse,
      page: "transactions",
    }),
    create: defineRoute({
      id: "transactions.create",
      method: "POST",
      status: 201,
      path: "transactions",
      auth: "user",
      ownership: "user",
      body: CreateTransactionRequest,
      group: "transactions",
      response: CreateTransactionResponse,
    }),
  },
  bankConnections: {
    list: defineRoute({
      id: "bankConnections.list",
      method: "GET",
      path: "bank-connections",
      auth: "user",
      ownership: "user",
      group: "bank-connections",
      response: BankConnectionListResponse,
      page: "bankConnections",
      query: pageQuery("bankConnections"),
    }),
    capability: defineRoute({
      id: "bankConnections.capability",
      method: "GET",
      path: "bank-connections/capability",
      auth: "user",
      ownership: "user",
      group: "bank-connections",
      response: BankConnectionCapabilityResponse,
    }),
    connect: defineRoute({
      id: "bankConnections.connect",
      method: "POST",
      status: 201,
      path: "bank-connections",
      auth: "user",
      ownership: "user",
      body: ConnectBankRequest,
      group: "bank-connections",
      response: ConnectBankResponse,
    }),
    refresh: defineRoute({
      id: "bankConnections.refresh",
      method: "POST",
      path: "bank-connections/:id/refresh",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "bank-connections",
      response: SyncBankConnectionResponse,
    }),
    sync: defineRoute({
      id: "bankConnections.sync",
      method: "POST",
      path: "bank-connections/:id/sync",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "bank-connections",
      response: SyncBankConnectionResponse,
      aliasOf: "bankConnections.refresh",
    }),
    remove: defineRoute({
      id: "bankConnections.remove",
      method: "DELETE",
      path: "bank-connections/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "bank-connections",
      response: DeleteBankConnectionResponse,
    }),
  },
  budget: {
    list: defineRoute({
      id: "budget.list",
      method: "GET",
      path: "budget-entries",
      auth: "user",
      ownership: "user",
      group: "budget",
      response: BudgetEntryListResponse,
      page: "budget",
      query: pageQuery("budget"),
    }),
    seedDefaults: defineRoute({
      id: "budget.seedDefaults",
      method: "POST",
      path: "budget-entries/seed-defaults",
      auth: "user",
      ownership: "user",
      group: "budget",
      response: BudgetEntryListResponse,
    }),
    addCategory: defineRoute({
      id: "budget.addCategory",
      method: "POST",
      status: 201,
      path: "budget-entries/categories",
      auth: "user",
      ownership: "user",
      body: AddBudgetCategoryRequest,
      group: "budget",
      response: AddBudgetCategoryResponse,
    }),
    create: defineRoute({
      id: "budget.create",
      method: "POST",
      status: 201,
      path: "budget-entries",
      auth: "user",
      ownership: "user",
      body: CreateBudgetEntryRequest,
      group: "budget",
      response: BudgetEntryResponse,
    }),
    update: defineRoute({
      id: "budget.update",
      method: "PATCH",
      path: "budget-entries/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      body: UpdateBudgetEntryRequest,
      group: "budget",
      response: BudgetEntryResponse,
      etag: "conditional",
    }),
    remove: defineRoute({
      id: "budget.remove",
      method: "DELETE",
      path: "budget-entries/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "budget",
      response: DeleteBudgetEntryResponse,
    }),
  },
  tax: {
    list: defineRoute({
      id: "tax.list",
      method: "GET",
      path: "tax-records",
      auth: "user",
      ownership: "user",
      group: "tax",
      response: TaxRecordListResponse,
      page: "tax",
      query: pageQuery("tax"),
    }),
    get: defineRoute({
      id: "tax.get",
      method: "GET",
      path: "tax-records/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "tax",
      response: TaxRecordResponse,
      etag: "read",
    }),
    receipt: defineRoute({
      id: "tax.receipt",
      method: "GET",
      path: "tax-records/:id/receipt",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "tax",
    }),
    bulkCreate: defineRoute({
      id: "tax.bulkCreate",
      method: "POST",
      status: 201,
      path: "tax-records/bulk",
      auth: "user",
      ownership: "user",
      body: BulkCreateTaxRecordsRequest,
      group: "tax",
      response: TaxRecordListResponse,
    }),
    create: defineRoute({
      id: "tax.create",
      method: "POST",
      status: 201,
      path: "tax-records",
      auth: "user",
      ownership: "user",
      body: CreateTaxRecordRequest,
      group: "tax",
      response: TaxRecordResponse,
    }),
    update: defineRoute({
      id: "tax.update",
      method: "PATCH",
      path: "tax-records/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      body: UpdateTaxRecordRequest,
      group: "tax",
      response: TaxRecordResponse,
      etag: "conditional",
    }),
    remove: defineRoute({
      id: "tax.remove",
      method: "DELETE",
      path: "tax-records/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "tax",
      response: DeleteTaxRecordResponse,
    }),
  },
  profile: {
    get: defineRoute({
      id: "profile.get",
      method: "GET",
      path: "user-profile",
      auth: "user",
      ownership: "user",
      group: "profile",
      response: UserProfileResponse,
      etag: "read",
    }),
    update: defineRoute({
      id: "profile.update",
      method: "PATCH",
      path: "user-profile",
      auth: "user",
      ownership: "user",
      body: UpdateProfileRequest,
      group: "profile",
      response: UpdateProfileResponse,
      etag: "conditional",
    }),
    sendPasswordReset: defineRoute({
      id: "profile.sendPasswordReset",
      method: "POST",
      path: "user-profile/send-password-reset",
      auth: "user",
      ownership: "user",
      group: "profile",
      response: SendPasswordResetResponse,
    }),
    resetFinancialData: defineRoute({
      id: "profile.resetFinancialData",
      method: "POST",
      path: "user-profile/reset-financial-data",
      auth: "user",
      ownership: "user",
      body: ResetFinancialDataRequest,
      group: "profile",
      response: ResetFinancialDataResponse,
    }),
    deleteUser: defineRoute({
      id: "profile.deleteUser",
      method: "DELETE",
      path: "user-profile",
      auth: "user",
      ownership: "user",
      body: DeleteUserRequest,
      group: "profile",
      response: DeleteUserResponse,
    }),
    export: defineRoute({
      id: "profile.export",
      method: "GET",
      path: "user-profile/export",
      auth: "user",
      ownership: "user",
      group: "profile",
    }),
    updateChecklist: defineRoute({
      id: "profile.updateChecklist",
      method: "PATCH",
      path: "user-profile/checklist",
      auth: "user",
      ownership: "user",
      body: UpdateChecklistRequest,
      group: "profile",
      response: UpdateChecklistResponse,
    }),
  },
  mcpTokens: {
    list: defineRoute({
      id: "mcpTokens.list",
      method: "GET",
      path: "mcp-tokens",
      auth: "user",
      ownership: "user",
      group: "mcp-tokens",
      response: McpTokenListResponse,
      page: "mcpTokens",
      query: pageQuery("mcpTokens"),
    }),
    create: defineRoute({
      id: "mcpTokens.create",
      method: "POST",
      status: 201,
      path: "mcp-tokens",
      auth: "user",
      ownership: "user",
      body: CreateMcpTokenRequest,
      group: "mcp-tokens",
      response: CreateMcpTokenResponse,
    }),
    revoke: defineRoute({
      id: "mcpTokens.revoke",
      method: "DELETE",
      path: "mcp-tokens/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "mcp-tokens",
      response: RevokeMcpTokenResponse,
    }),
    activity: defineRoute({
      id: "mcpTokens.activity",
      method: "GET",
      path: "mcp-tokens/:id/activity",
      auth: "user",
      ownership: "user",
      params: IdParams,
      query: McpTokenActivityQuery,
      group: "mcp-tokens",
      response: McpTokenActivityResponse,
    }),
    contextPack: defineRoute({
      id: "mcpTokens.contextPack",
      method: "GET",
      path: "mcp-tokens/context-pack",
      auth: "user",
      ownership: "user",
      query: AnonymizeQuery,
      group: "mcp-tokens",
      response: ContextPackResponse,
    }),
  },
  mcp: {
    post: defineRoute({
      id: "mcp.post",
      method: "POST",
      path: "mcp",
      auth: "pat",
      ownership: "none",
      group: "app",
    }),
    get: defineRoute({
      id: "mcp.get",
      method: "GET",
      path: "mcp",
      auth: "pat",
      ownership: "none",
      group: "app",
    }),
  },
  app: {
    hello: defineRoute({
      id: "app.hello",
      method: "GET",
      path: "",
      auth: "public",
      ownership: "none",
      group: "app",
    }),
    health: defineRoute({
      id: "app.health",
      method: "GET",
      path: "health",
      auth: "public",
      ownership: "none",
      group: "app",
      response: HealthResponse,
    }),
    ready: defineRoute({
      id: "app.ready",
      method: "GET",
      path: "health/ready",
      auth: "public",
      ownership: "none",
      group: "app",
      response: ReadinessResponse,
    }),
  },
} as const;

/**
 * Routes whose 2xx body is not JSON, so they carry no response schema. Shrink-only.
 * - `tax.receipt`: the receipt file bytes.
 * - `mcp.post`, `mcp.get`: JSON-RPC over the MCP streamable transport, written to the raw response.
 * - `app.hello`: a plain-text banner.
 */
export const NON_JSON_RESPONSE_ROUTES = [
  "app.hello",
  "mcp.get",
  "mcp.post",
  "profile.export",
  "tax.receipt",
] as const;

export const allRoutes: readonly RouteDefinition[] = Object.values(routes).flatMap((group) =>
  Object.values(group),
);

/** Look up a route by its HTTP method and Nest path template (no leading slash). */
export const findRoute = (method: string, path: string): RouteDefinition | undefined =>
  allRoutes.find((route) => route.method === method && route.path === path);
