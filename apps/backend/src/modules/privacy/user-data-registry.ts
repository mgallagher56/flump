import type { AccountExportKey } from "@flump/api-contract";
import type { ObjectLiteral } from "typeorm";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { AgentAuditEvent } from "../../entities/agent-audit-event.entity";
import { AuditEvent } from "../../entities/audit-event.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BankOAuthState } from "../../entities/bank-oauth-state.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { Consent } from "../../entities/consent.entity";
import { IdempotencyKey } from "../../entities/idempotency-key.entity";
import { ImportBatch } from "../../entities/import-batch.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { SnapshotCheckin } from "../../entities/snapshot-checkin.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";

/**
 * What "reset all financial data" does to a table (BE-04, M-PRIV1).
 * - `financial-clear`: every row of the user's is deleted (for the profile: the financial fields
 *   are set back to their defaults and the row stays).
 * - `revoke`: the rows are credentials; deleting them revokes them.
 * - `keep`: the rows survive a reset. Account deletion still removes them.
 */
type ResetHandling = {
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
  /**
   * Where each column sits in the value map (docs/system/value-map.yaml), for the "One home per
   * value" check (scripts/check-value-map.ts). Either every column is tied to the id of the fact it
   * holds or listed as holding no fact, with the reason; or the whole table holds no fact about the
   * user. user-data-registry.spec.ts checks that every column is covered exactly once.
   */
  valueMap: ValueMapTie<E>;
}

/** A column's place in the value map: the id of the fact it holds, or why it holds none. */
type ValueMapTie<E> =
  | {
      facts: Partial<Record<keyof E & string, string>>;
      notFacts: Partial<Record<keyof E & string, string>>;
    }
  | {
      noUserFacts: string;
      /** Every column, listed so that a new column on the table still has to be placed. */
      columns: readonly (keyof E & string)[];
    };

/** Checks an entry against its own entity's columns, then widens it for the shared list. */
const table = <E extends ObjectLiteral>(t: UserDataTable<E>): UserDataTable =>
  t as unknown as UserDataTable;

// a description of the userId field, not a credential
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
const USER_ID_IN_ENVELOPE = "the same for every row; given once as the document's userId";

/** Reasons for columns that hold no fact about the user, shared by the valueMap entries. */
const ROW_ID = "the row's own id";
const OWNER = "the owner of the row";
const WRITTEN_AT = "when the row was written, kept by the database";

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
    valueMap: {
      facts: {
        accountId: "transactions",
        amount: "transactions",
        description: "transactions",
        category: "transactions",
        timestamp: "transactions",
      },
      notFacts: { id: ROW_ID, userId: OWNER },
    },
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
    valueMap: {
      facts: {
        value: "balance-history",
        year: "balance-history",
        month: "balance-history",
        asOfDate: "balance-history",
        source: "balance-history",
      },
      notFacts: {
        id: ROW_ID,
        accountId: "the account the month belongs to",
        userId: OWNER,
        importBatchId: "the import that wrote the row, kept so the import can be undone",
        updatedAt: WRITTEN_AT,
      },
    },
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
    valueMap: {
      facts: { month: "check-in-done", completedAt: "check-in-done" },
      notFacts: { userId: OWNER },
    },
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
    valueMap: {
      facts: { payload: "balance-history", revertData: "balance-history" },
      notFacts: {
        id: ROW_ID,
        userId: OWNER,
        status: "where the import is in its staged, committed or reverted steps",
        idempotencyKey: "a random retry key made by the browser",
        counts: "how many rows the import holds, for the review screen",
        validationErrors: "problems found in the file, for the review screen",
        createdAt: WRITTEN_AT,
        updatedAt: WRITTEN_AT,
        committedAt: "when the import was committed",
        revertedAt: "when the import was undone",
        expiresAt: "when an uncommitted import is cleared",
      },
    },
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
        "ownership",
        "sharePercent",
        // Added after the existing columns, so earlier columns keep their CSV position.
        "accountSubtype",
        "creditLimit",
        "promoZeroPercentUntil",
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
    valueMap: {
      facts: {
        name: "account-name",
        type: "account-type",
        accountSubtype: "account-type",
        isCurrent: "account-type",
        balance: "account-balance",
        interestRate: "account-rate",
        monthlyContribution: "account-monthly-amount",
        creditLimit: "card-limit-and-zero-percent-end",
        promoZeroPercentUntil: "card-limit-and-zero-percent-end",
        termMonths: "mortgage-term-and-fix-end",
        fixedRateEndDate: "mortgage-term-and-fix-end",
        currency: "currency-and-country",
        studentLoanPlan: "student-loan-plan",
        ownership: "ownership-share",
        sharePercent: "ownership-share",
      },
      notFacts: {
        id: ROW_ID,
        userId: OWNER,
        connectionId: "the bank link for the deferred bank sync; empty today",
        externalAccountId: "the bank's own id for the deferred bank sync; empty today",
        createdAt: WRITTEN_AT,
        updatedAt: WRITTEN_AT,
      },
    },
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
    valueMap: {
      noUserFacts:
        "credentials and status of a bank link for the deferred bank sync; no fact about the person's money",
      columns: [
        "id",
        "userId",
        "institutionId",
        "institutionName",
        "status",
        "accessToken",
        "refreshToken",
        "expiresAt",
        "authType",
        "lastSyncedAt",
        "syncStartedAt",
        "createdAt",
        "updatedAt",
      ],
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
    valueMap: {
      noUserFacts: "a pending bank consent, kept for minutes while the bank redirects back",
      columns: [
        "id",
        "userId",
        "institutionId",
        "stateHash",
        "codeVerifier",
        "redirectUri",
        "expiresAt",
        "createdAt",
      ],
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
        "ownership",
        "sharePercent",
        "linkKind",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: { kind: "financial-clear", reason: "income and outgoings are financial data" },
    valueMap: {
      facts: {
        category: "budget-entries",
        name: "budget-entries",
        amount: "budget-entries",
        frequency: "budget-entries",
        isIncome: "budget-entries",
        isPrimaryIncome: "budget-entries",
        isEssential: "budget-entries",
        notes: "budget-entries",
        isDefault: "budget-entries",
        ownership: "budget-entries",
        sharePercent: "budget-entries",
        linkKind: "budget-entry-link-kind",
      },
      notFacts: { id: ROW_ID, userId: OWNER, createdAt: WRITTEN_AT, updatedAt: WRITTEN_AT },
    },
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
    valueMap: {
      facts: {
        type: "tax-records",
        source: "tax-records",
        category: "tax-records",
        name: "tax-records",
        amount: "tax-records",
        frequency: "tax-records",
        date: "tax-records",
        endDate: "tax-records",
        notes: "tax-records",
        receiptFilename: "tax-records",
        receiptMimeType: "tax-records",
        receiptData: "tax-records",
      },
      notFacts: { id: ROW_ID, userId: OWNER, createdAt: WRITTEN_AT, updatedAt: WRITTEN_AT },
    },
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
    valueMap: {
      noUserFacts: "a security log of what agents did: tool names and timings, no amounts",
      columns: [
        "id",
        "userId",
        "tokenId",
        "clientName",
        "toolName",
        "scopesUsed",
        "outcome",
        "errorCode",
        "latencyMs",
        "responseBytes",
        "argsFingerprint",
        "createdAt",
      ],
    },
  }),
  table({
    entity: AuditEvent,
    key: "auditEvents",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["id", "action", "actorType", "targetId", "requestId", "metadata", "createdAt"],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "keep",
      reason:
        "security record of sensitive actions (BE-06, H12), the reset itself among them; kept 13 months by the retention job",
    },
    valueMap: {
      noUserFacts: "a security record of sensitive actions, not a fact about the person's money",
      columns: [
        "id",
        "userId",
        "action",
        "actorType",
        "targetId",
        "requestId",
        "metadata",
        "createdAt",
      ],
    },
  }),
  table({
    entity: Consent,
    key: "consents",
    deleteOnErasure: true,
    export: {
      shape: "rows",
      columns: ["id", "kind", "version", "targetId", "grantedAt", "withdrawnAt"],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 500,
    },
    reset: {
      kind: "keep",
      reason:
        "record of what the person agreed to and when; the reset withdraws the AI and bank consents rather than deleting them",
    },
    valueMap: {
      noUserFacts: "a record of what the person agreed to and when, not a fact about their money",
      columns: ["id", "userId", "kind", "version", "targetId", "grantedAt", "withdrawnAt"],
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
    valueMap: {
      noUserFacts: "an agent access token and its settings, not a fact about the person's money",
      columns: [
        "id",
        "userId",
        "name",
        "tokenHash",
        "tokenPrefix",
        "scopes",
        "anonymizeInstitutions",
        "expiresAt",
        "lastUsedAt",
        "totalToolCalls",
        "revokedAt",
        "createdAt",
      ],
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
    valueMap: {
      noUserFacts:
        "a stored create response kept so a retried request is not applied twice; the rows it describes are the facts",
      columns: [
        "id",
        "userId",
        "routeId",
        "key",
        "requestHash",
        "statusCode",
        "responseBody",
        "responseHeaders",
        "createdAt",
      ],
    },
  }),
  table({
    entity: RetirementPlan,
    key: "retirementPlan",
    deleteOnErasure: true,
    export: {
      shape: "object",
      columns: [
        "id",
        "retirementAge",
        "planToAge",
        "target",
        "housingOverride",
        "statePensionAge",
        "statePensionAnnualForecastGbp",
        "statePensionQualifyingYears",
        "growthRates",
        "inflationRate",
        "cashSavingsNominalRate",
        "realRentGrowthRate",
        "excludedAccountIds",
        "createdAt",
        "updatedAt",
      ],
      excluded: { userId: USER_ID_IN_ENVELOPE },
      orderBy: ["id"],
      batchSize: 1,
    },
    reset: {
      kind: "financial-clear",
      reason: "retirement plan targets and assumptions are financial data",
    },
    valueMap: {
      facts: {
        retirementAge: "retirement-plan",
        planToAge: "retirement-plan",
        target: "retirement-plan",
        housingOverride: "retirement-plan",
        statePensionAge: "retirement-plan",
        statePensionAnnualForecastGbp: "retirement-plan",
        statePensionQualifyingYears: "retirement-plan",
        growthRates: "investment-return",
        inflationRate: "retirement-plan",
        cashSavingsNominalRate: "retirement-plan",
        realRentGrowthRate: "retirement-plan",
        excludedAccountIds: "retirement-plan",
      },
      notFacts: { id: ROW_ID, userId: OWNER, createdAt: WRITTEN_AT, updatedAt: WRITTEN_AT },
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
        "checkInDay",
        "studentLoanPlans",
        "housingStatus",
        "monthlyHousingCost",
        "monthlyOtherOutgoings",
        "lastActiveAt",
        "netWorthCountsProperty",
        "netWorthCountsStudentLoan",
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
    valueMap: {
      facts: {
        displayName: "name-and-avatar",
        firstName: "name-and-avatar",
        lastName: "name-and-avatar",
        avatarUrl: "name-and-avatar",
        currency: "currency-and-country",
        country: "currency-and-country",
        employmentType: "employment-type",
        annualSalary: "salary",
        monthlyTakeHome: "typed-take-home",
        hasSecondIncome: "second-and-rental-income",
        secondIncomeMonthly: "second-and-rental-income",
        hasRentalIncome: "second-and-rental-income",
        rentalIncomeMonthly: "second-and-rental-income",
        hasMortgage: "housing-status",
        mortgageType: "housing-status",
        propertyOwnershipShare: "rental-share-for-tax",
        hasBuyToLet: "buy-to-let-mortgage",
        buyToLetCount: "buy-to-let-mortgage",
        buyToLetPropertyValue: "home-value",
        buyToLetMonthlyRental: "buy-to-let-rent",
        buyToLetMortgageBalance: "buy-to-let-mortgage",
        buyToLetMortgageRate: "buy-to-let-mortgage",
        buyToLetMortgageType: "buy-to-let-mortgage",
        pensionPercent: "pension-rates",
        pensionEmployerPercent: "pension-rates",
        isSalarySacrifice: "pension-rates",
        isSalarySacrificeEmployerNi: "pension-rates",
        monthlySavingsTarget: "savings-settings",
        savingsAllocationMode: "savings-settings",
        savingsDefaultInterestRate: "savings-settings",
        setupChecklistCompletedSteps: "setup-checklist",
        customBudgetCategories: "custom-budget-categories",
        enabledPages: "enabled-pages-and-widgets",
        dashboardWidgets: "enabled-pages-and-widgets",
        dashboardWidgetOrder: "enabled-pages-and-widgets",
        dashboardWidgetSizes: "enabled-pages-and-widgets",
        dashboardWidgetConfig: "enabled-pages-and-widgets",
        taxRegion: "tax-region",
        birthYear: "birth-year",
        checkInDay: "check-in-day",
        studentLoanPlans: "student-loan-plan",
        housingStatus: "housing-status",
        monthlyHousingCost: "housing-cost",
        monthlyOtherOutgoings: "other-outgoings",
        netWorthCountsProperty: "net-worth-choices",
        netWorthCountsStudentLoan: "net-worth-choices",
      },
      notFacts: {
        id: ROW_ID,
        userId: OWNER,
        hasResetFinancialData:
          "app state: the person has used reset; profile-view.ts then shows unset pension rates as 0",
        onboardingCompleted: "app state: onboarding has finished, used to route the first visit",
        lastActiveAt: "when the person last used the app, for the inactive-account policy",
        createdAt: WRITTEN_AT,
        updatedAt: WRITTEN_AT,
      },
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
  "Account.ownership": {
    column: "ownership",
    reason: "ownership mode ('sole' | 'joint') for E34, not a link to a user",
  },
  "BudgetEntry.ownership": {
    column: "ownership",
    reason: "ownership mode ('sole' | 'joint') for E34, not a link to a user",
  },
  "UserProfile.propertyOwnershipShare": {
    column: "property_ownership_share",
    reason: "the share of a property the person owns, a percentage, not a link to a user",
  },
};
