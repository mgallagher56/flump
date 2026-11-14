import type { AccountExportKey } from "@flump/api-contract";
import type { ObjectLiteral } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { AgentAuditEvent } from "../entities/agent-audit-event.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { BankOAuthState } from "../entities/bank-oauth-state.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { IdempotencyKey } from "../entities/idempotency-key.entity";
import { ImportBatch } from "../entities/import-batch.entity";
import { McpToken } from "../entities/mcp-token.entity";
import { SnapshotCheckin } from "../entities/snapshot-checkin.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { UserProfile } from "../entities/user-profile.entity";

/**
 * What "reset all financial data" does to a table (BE-04, M-PRIV1).
 * - `financial-clear`: every row of the user's is deleted (for the profile: the financial fields
 *   are set back to their defaults and the row stays).
 * - `revoke`: the rows are credentials; deleting them revokes them.
 * - `keep`: the rows survive a reset. Account deletion still removes them.
 */
export type ResetHandling = {
  kind: "financial-clear" | "revoke" | "keep";
  reason: string;
};

type Columns<E> = readonly (keyof E & string)[];

/** One table that carries a user id. */
export interface UserDataTable<E extends ObjectLiteral = ObjectLiteral> {
  entity: new () => E;
  /** Key in the export document and in the audit counts (`removed`). */
  key: AccountExportKey;
  /**
   * Account deletion removes every row where `userId` is the user. Always true: it is here so the
   * coverage test can read one explicit decision per table.
   */
  deleteOnErasure: true;
  export: {
    /** `object`: at most one row, exported as an object or null. `rows`: an array. */
    shape: "object" | "rows";
    /** Allow-list of properties written to the export, in this order. */
    columns: Columns<E>;
    /** Properties deliberately left out, each with the reason. With `columns`, covers every column. */
    excluded: Partial<Record<keyof E & string, string>>;
    /** Stable order for paging. */
    orderBy: Columns<E>;
    /** Rows read per page. Small where a row can be large (receipts are up to 5 MB). */
    batchSize: number;
  };
  reset: ResetHandling;
}

/** Checks an entry against its own entity's columns, then widens it for the shared list. */
const table = <E extends ObjectLiteral>(t: UserDataTable<E>): UserDataTable =>
  t as unknown as UserDataTable;

// a description of the userId field, not a credential
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
const USER_ID_IN_ENVELOPE = "the same for every row; given once as the document's userId";

/**
 * Every entity that carries a user id, with its delete, export and reset handling. The order is the
 * deletion order: children before parents (account_details references import_batches; history and
 * transactions belong to accounts), the profile last.
 *
 * user-data-registry.spec.ts fails when an entity in ENTITIES has a user id column and no entry
 * here, or when an entry does not classify one of its columns as exported or excluded.
 */
export const USER_DATA_REGISTRY: readonly UserDataTable[] = [
  table({
    entity: Transaction,
    key: "transactions",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["id", "accountId", "amount", "description", "category", "timestamp"],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "account movements are financial data" },
  }),
  table({
    entity: AccountDetail,
    key: "accountDetails",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "accountId",
        "year",
        "month",
        "value",
        "asOfDate",
        "source",
        "importBatchId",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "monthly balance history is financial data" },
  }),
  table({
    entity: SnapshotCheckin,
    key: "snapshotCheckins",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["month", "completedAt"],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["month"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "check-ins confirm balances that reset removes" },
  }),
  table({
    entity: ImportBatch,
    key: "importBatches",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "status",
        "payload",
        "counts",
        "validationErrors",
        "revertData",
        "createdAt",
        "updatedAt",
        "committedAt",
        "revertedAt",
        "expiresAt",
      ],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        idempotencyKey: "a random retry key made by the browser, not personal data",
      },
      orderBy: ["id"],
      batchSize: 20,
    },
    reset: { kind: "financial-clear", reason: "staged imports hold account names and values" },
  }),
  table({
    entity: Account,
    key: "accounts",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "name",
        "type",
        "balance",
        "interestRate",
        "monthlyContribution",
        "termMonths",
        "fixedRateEndDate",
        "isCurrent",
        "currency",
        "studentLoanPlan",
        "connectionId",
        "externalAccountId",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "accounts and balances are financial data" },
  }),
  table({
    entity: BankConnection,
    key: "bankConnections",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "institutionId",
        "institutionName",
        "status",
        "authType",
        "expiresAt",
        "lastSyncedAt",
        "createdAt",
        "updatedAt",
      ],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        accessToken: "secret: a bank credential, never exported",
        refreshToken: "secret: a bank credential, never exported",
        syncStartedAt: "operational: the sync lease, cleared when each sync ends",
      },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "financial-clear",
      reason: "bank links carry credentials to financial data; consent is revoked first",
    },
  }),
  table({
    entity: BankOAuthState,
    key: "bankOAuthStates",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["id", "institutionId", "expiresAt", "createdAt"],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        stateHash: "secret: identifies a pending bank consent, never exported",
        codeVerifier: "secret: the PKCE verifier for a pending bank consent, never exported",
        redirectUri: "server configuration, not the user's data",
      },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "revoke",
      reason: "a pending bank consent could link a bank after the reset; it is cancelled",
    },
  }),
  table({
    entity: BudgetEntry,
    key: "budgetEntries",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "category",
        "name",
        "amount",
        "frequency",
        "isIncome",
        "isPrimaryIncome",
        "isEssential",
        "notes",
        "isDefault",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "income and outgoings are financial data" },
  }),
  table({
    entity: TaxRecord,
    key: "taxRecords",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "type",
        "source",
        "category",
        "name",
        "amount",
        "frequency",
        "date",
        "endDate",
        "notes",
        "receiptFilename",
        "receiptMimeType",
        "receiptData",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      // receipt_data is up to 5 MB per row.
      batchSize: 5,
    },
    reset: { kind: "financial-clear", reason: "tax records and receipts are financial data" },
  }),
  table({
    entity: AgentAuditEvent,
    key: "agentAuditEvents",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "tokenId",
        "clientName",
        "toolName",
        "scopesUsed",
        "outcome",
        "errorCode",
        "latencyMs",
        "responseBytes",
        "createdAt",
      ],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        argsFingerprint: "a keyed hash with no meaning outside the server, not the arguments",
      },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "keep",
      reason:
        "security log of what agents did (tool names, timings, no amounts); kept 13 months so the person can still see past agent access",
    },
  }),
  table({
    entity: McpToken,
    key: "mcpTokens",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: [
        "id",
        "name",
        "tokenPrefix",
        "scopes",
        "anonymizeInstitutions",
        "expiresAt",
        "lastUsedAt",
        "totalToolCalls",
        "revokedAt",
        "createdAt",
      ],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        tokenHash: "secret: the hash that authenticates the token, never exported",
      },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "revoke",
      reason: "an agent token reads financial data; a reset must not leave a working one behind",
    },
  }),
  table({
    entity: IdempotencyKey,
    key: "idempotencyKeys",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["id", "routeId", "statusCode", "createdAt"],
      excluded: {
        userId: USER_ID_IN_ENVELOPE,
        key: "a random retry key made by the client, not personal data",
        requestHash: "a hash of a request body, with no meaning outside the server",
        responseBody:
          "a stored copy of a create response; the rows it describes are exported above",
        responseHeaders: "the ETag and Location of a stored create response, operational only",
      },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "financial-clear",
      reason:
        "stored create responses (BE-09 Idempotency-Key) echo the accounts and amounts a reset removes",
    },
  }),
  table({
    entity: UserProfile,
    key: "profile",
    deleteOnErasure: true,
    export: {
      shape: "object",
      columns: [
        "id",
        "displayName",
        "firstName",
        "lastName",
        "avatarUrl",
        "currency",
        "country",
        "employmentType",
        "annualSalary",
        "monthlyTakeHome",
        "hasSecondIncome",
        "secondIncomeMonthly",
        "hasRentalIncome",
        "rentalIncomeMonthly",
        "hasMortgage",
        "mortgageType",
        "propertyOwnershipShare",
        "hasBuyToLet",
        "buyToLetCount",
        "buyToLetPropertyValue",
        "buyToLetMonthlyRental",
        "buyToLetMortgageBalance",
        "buyToLetMortgageRate",
        "buyToLetMortgageType",
        "pensionPercent",
        "pensionEmployerPercent",
        "isSalarySacrifice",
        "isSalarySacrificeEmployerNi",
        "monthlySavingsTarget",
        "savingsAllocationMode",
        "savingsDefaultInterestRate",
        "setupChecklistCompletedSteps",
        "customBudgetCategories",
        "enabledPages",
        "dashboardWidgets",
        "dashboardWidgetOrder",
        "dashboardWidgetSizes",
        "dashboardWidgetConfig",
        "hasResetFinancialData",
        "onboardingCompleted",
        "taxRegion",
        "birthYear",
        "studentLoanPlans",
        "housingStatus",
        "monthlyHousingCost",
        "monthlyOtherOutgoings",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 1,
    },
    reset: {
      kind: "financial-clear",
      reason:
        "the row stays (name, avatar and preferences are not financial); every financial field is set back to its default",
    },
  }),
];

/** Row counts per registry table, for audit events. Counts only, never values. */
export type RemovedCounts = Partial<Record<AccountExportKey, number>>;

/**
 * Entities in ENTITIES that are deliberately not user data, each with the reason. The coverage
 * tests fail on any other entity that has a user-like column (/user|owner/i) or a relation and is
 * not in the registry.
 */
export const NON_USER_ENTITIES: Readonly<Record<string, string>> = {
  AccountDeletionTombstone:
    "proof of erasure: a keyed hash of the user id and timestamps, no user id and no personal data",
};

/**
 * Tables with no entity that reference a registry table, each erased by an ON DELETE CASCADE from
 * that parent, with the reason they are not exported. The integration test fails on any other
 * foreign key into the registry.
 */
export const CASCADE_ONLY_TABLES: Readonly<Record<string, { parent: string; reason: string }>> = {
  liability_sign_backfill: {
    parent: "accounts",
    reason:
      "BE-05 migration before-image (old and new balance signs) kept so its down() can restore them; rows go with the account by ON DELETE CASCADE; not exported, as the current balances are in the export",
  },
};

/**
 * Columns whose names match /user|owner/i but are not links to a user, each with the reason.
 * Keys are `Entity.property` for the unit test; the integration test uses the column names.
 */
export const NOT_USER_LINK_COLUMNS: Readonly<Record<string, { column: string; reason: string }>> = {
  "UserProfile.propertyOwnershipShare": {
    column: "property_ownership_share",
    reason: "the share of a property the person owns, a percentage, not a link to a user",
  },
};
