import { z } from "zod";
import { CreateAccountRequest, UpdateAccountRequest } from "./domains/accounts.js";
import { ConnectBankRequest } from "./domains/bank-connections.js";
import {
  AddBudgetCategoryRequest,
  CreateBudgetEntryRequest,
  UpdateBudgetEntryRequest,
} from "./domains/budget.js";
import { CreateMcpTokenRequest } from "./domains/mcp-tokens.js";
import { UpdateChecklistRequest, UpdateProfileRequest } from "./domains/profile.js";
import {
  BulkCreateTaxRecordsRequest,
  CreateTaxRecordRequest,
  UpdateTaxRecordRequest,
} from "./domains/tax.js";
import { CreateTransactionRequest } from "./domains/transactions.js";
import { Uuid } from "./primitives.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

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
  /** Request-schema group, for promoting groups to enforcement one at a time later. */
  readonly group: ContractGroup;
  /** Deprecated alias of another route id (kept for old clients). */
  readonly aliasOf?: string;
}

export const CONTRACT_GROUPS = [
  "accounts",
  "budget",
  "tax",
  "profile",
  "bank-connections",
  "transactions",
  "mcp-tokens",
  "app",
] as const;
export type ContractGroup = (typeof CONTRACT_GROUPS)[number];

export const defineRoute = <const R extends RouteDefinition>(route: R): R => route;

const IdParams = z.object({ id: Uuid });
const AnonymizeQuery = z.object({ anonymize: z.string().optional() });

export const routes = {
  accounts: {
    list: defineRoute({
      id: "accounts.list",
      method: "GET",
      path: "accounts",
      auth: "user",
      ownership: "user",
      group: "accounts",
    }),
    listDetails: defineRoute({
      id: "accounts.listDetails",
      method: "GET",
      path: "account-details",
      auth: "user",
      ownership: "user",
      group: "accounts",
    }),
    get: defineRoute({
      id: "accounts.get",
      method: "GET",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
    }),
    getDetails: defineRoute({
      id: "accounts.getDetails",
      method: "GET",
      path: "accounts/:id/details",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
    }),
    portfolioSnapshot: defineRoute({
      id: "accounts.portfolioSnapshot",
      method: "GET",
      path: "portfolio-snapshot",
      auth: "user",
      ownership: "user",
      group: "accounts",
    }),
    create: defineRoute({
      id: "accounts.create",
      method: "POST",
      path: "accounts",
      auth: "user",
      ownership: "user",
      body: CreateAccountRequest,
      group: "accounts",
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
      aliasOf: "accounts.update",
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
    }),
    remove: defineRoute({
      id: "accounts.remove",
      method: "DELETE",
      path: "accounts/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "accounts",
    }),
  },
  transactions: {
    list: defineRoute({
      id: "transactions.list",
      method: "GET",
      path: "transactions",
      auth: "user",
      ownership: "user",
      group: "transactions",
    }),
    create: defineRoute({
      id: "transactions.create",
      method: "POST",
      path: "transactions",
      auth: "user",
      ownership: "user",
      body: CreateTransactionRequest,
      group: "transactions",
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
    }),
    capability: defineRoute({
      id: "bankConnections.capability",
      method: "GET",
      path: "bank-connections/capability",
      auth: "user",
      ownership: "user",
      group: "bank-connections",
    }),
    connect: defineRoute({
      id: "bankConnections.connect",
      method: "POST",
      path: "bank-connections",
      auth: "user",
      ownership: "user",
      body: ConnectBankRequest,
      group: "bank-connections",
    }),
    refresh: defineRoute({
      id: "bankConnections.refresh",
      method: "POST",
      path: "bank-connections/:id/refresh",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "bank-connections",
    }),
    sync: defineRoute({
      id: "bankConnections.sync",
      method: "POST",
      path: "bank-connections/:id/sync",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "bank-connections",
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
    }),
    seedDefaults: defineRoute({
      id: "budget.seedDefaults",
      method: "POST",
      path: "budget-entries/seed-defaults",
      auth: "user",
      ownership: "user",
      group: "budget",
    }),
    addCategory: defineRoute({
      id: "budget.addCategory",
      method: "POST",
      path: "budget-entries/categories",
      auth: "user",
      ownership: "user",
      body: AddBudgetCategoryRequest,
      group: "budget",
    }),
    create: defineRoute({
      id: "budget.create",
      method: "POST",
      path: "budget-entries",
      auth: "user",
      ownership: "user",
      body: CreateBudgetEntryRequest,
      group: "budget",
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
    }),
    remove: defineRoute({
      id: "budget.remove",
      method: "DELETE",
      path: "budget-entries/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "budget",
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
    }),
    get: defineRoute({
      id: "tax.get",
      method: "GET",
      path: "tax-records/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "tax",
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
      path: "tax-records/bulk",
      auth: "user",
      ownership: "user",
      body: BulkCreateTaxRecordsRequest,
      group: "tax",
    }),
    create: defineRoute({
      id: "tax.create",
      method: "POST",
      path: "tax-records",
      auth: "user",
      ownership: "user",
      body: CreateTaxRecordRequest,
      group: "tax",
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
    }),
    remove: defineRoute({
      id: "tax.remove",
      method: "DELETE",
      path: "tax-records/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "tax",
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
    }),
    update: defineRoute({
      id: "profile.update",
      method: "PATCH",
      path: "user-profile",
      auth: "user",
      ownership: "user",
      body: UpdateProfileRequest,
      group: "profile",
    }),
    sendPasswordReset: defineRoute({
      id: "profile.sendPasswordReset",
      method: "POST",
      path: "user-profile/send-password-reset",
      auth: "user",
      ownership: "user",
      group: "profile",
    }),
    resetFinancialData: defineRoute({
      id: "profile.resetFinancialData",
      method: "POST",
      path: "user-profile/reset-financial-data",
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
    }),
    create: defineRoute({
      id: "mcpTokens.create",
      method: "POST",
      path: "mcp-tokens",
      auth: "user",
      ownership: "user",
      body: CreateMcpTokenRequest,
      group: "mcp-tokens",
    }),
    revoke: defineRoute({
      id: "mcpTokens.revoke",
      method: "DELETE",
      path: "mcp-tokens/:id",
      auth: "user",
      ownership: "user",
      params: IdParams,
      group: "mcp-tokens",
    }),
    contextPack: defineRoute({
      id: "mcpTokens.contextPack",
      method: "GET",
      path: "mcp-tokens/context-pack",
      auth: "user",
      ownership: "user",
      query: AnonymizeQuery,
      group: "mcp-tokens",
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
    }),
    ready: defineRoute({
      id: "app.ready",
      method: "GET",
      path: "health/ready",
      auth: "public",
      ownership: "none",
      group: "app",
    }),
  },
} as const;

export const allRoutes: readonly RouteDefinition[] = Object.values(routes).flatMap((group) =>
  Object.values(group),
);

/** Look up a route by its HTTP method and Nest path template (no leading slash). */
export const findRoute = (method: string, path: string): RouteDefinition | undefined =>
  allRoutes.find((route) => route.method === method && route.path === path);
