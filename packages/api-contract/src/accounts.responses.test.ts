import { describe, expect, it } from "vitest";
import {
  AccountDetailListResponse,
  AccountDto,
  AccountListResponse,
  AccountResponse,
  CreateAccountResponse,
  DeleteAccountResponse,
  PortfolioSnapshotResponse,
  UpdateAccountResponse,
  UpdateBalancesResponse,
} from "./domains/accounts.js";
import {
  BankConnectionCapabilityResponse,
  BankConnectionListResponse,
  ConnectBankResponse,
  DeleteBankConnectionResponse,
  SyncBankConnectionResponse,
} from "./domains/bank-connections.js";
import { UpsertSnapshotResponse } from "./domains/snapshots.js";
import {
  CreateTransactionResponse,
  TransactionDto,
  TransactionListResponse,
} from "./domains/transactions.js";
import { checkAgainst } from "./validate.js";

const ACCOUNT_ID = "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f";
const CONNECTION_ID = "0b7e9d10-2c4f-4a8b-b1d2-3e4f5a6b7c8d";
const USER_ID = "user_01HXYZABCDEF";

const account = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: "Everyday current",
  type: "Current",
  balance: 1234.56,
  interestRate: null,
  monthlyContribution: null,
  termMonths: null,
  fixedRateEndDate: null,
  isCurrent: true,
  currency: "GBP",
  studentLoanPlan: null,
  connectionId: null,
  externalAccountId: null,
  createdAt: "2026-01-04T09:12:00.000Z",
};

const mortgage = {
  ...account,
  id: "a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d",
  name: "Home",
  type: "Mortgage",
  balance: -182500.75,
  interestRate: 4.29,
  monthlyContribution: 1150,
  termMonths: 300,
  fixedRateEndDate: "2028-03-31",
  connectionId: CONNECTION_ID,
  externalAccountId: "ext-123",
};

const detail = {
  id: 42,
  accountId: ACCOUNT_ID,
  userId: USER_ID,
  year: 2026,
  month: 10,
  value: 1100.1,
  asOfDate: "2026-10-31",
  source: "manual",
  importBatchId: null,
  updatedAt: "2026-10-31T20:00:00.000Z",
};

const resolved = {
  id: ACCOUNT_ID,
  name: "Everyday current",
  rawType: "Current",
  category: "cash",
  isAsset: true,
  isLiability: false,
  nominalBalance: 1234.56,
  netWorthBalance: 1234.56,
  latestBalance: 1234.56,
  overdrawnAmount: 0,
  interestRate: 0,
  interestRateKnown: false,
  monthlyContribution: 0,
  monthlyContributionKnown: false,
  currency: "GBP",
  latestMonth: 10,
  latestYear: 2026,
  history: [{ year: 2026, month: 10, value: 1100.1 }],
};

const connection = {
  id: CONNECTION_ID,
  institutionId: "monzo",
  institutionName: "Monzo Bank",
  status: "connected",
  authType: "token",
  expiresAt: null,
  lastSyncedAt: "2026-11-01T08:00:00.000Z",
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-11-01T08:00:00.000Z",
};

const transaction = {
  id: "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
  accountId: ACCOUNT_ID,
  userId: USER_ID,
  amount: -12.5,
  description: "Coffee",
  category: "Eating out",
  timestamp: "2026-11-02T10:00:00.000Z",
};

const ok = (schema: Parameters<typeof checkAgainst>[0], value: unknown) =>
  expect(checkAgainst(schema, value)).toEqual({ ok: true });
const bad = (schema: Parameters<typeof checkAgainst>[0], value: unknown) =>
  expect(checkAgainst(schema, value).ok).toBe(false);

describe("accounts responses", () => {
  it("accepts accounts with their history and rejects a leaked key", () => {
    ok(AccountListResponse, [
      { ...account, details: [detail] },
      { ...mortgage, details: [] },
    ]);
    ok(AccountResponse, { ...account, details: [detail] });
    bad(AccountResponse, { ...account, details: [detail], accessToken: "x" });
  });

  it("rejects a decimal column that arrives as a string (B-05)", () => {
    ok(AccountDto, mortgage);
    bad(AccountDto, { ...mortgage, balance: "-182500.75" });
    bad(AccountDto, { ...mortgage, interestRate: "4.29" });
  });

  it("requires every nullable key on create and update (no absent keys)", () => {
    ok(CreateAccountResponse, account);
    ok(UpdateAccountResponse, mortgage);
    const { interestRate: _omit, ...withoutRate } = account;
    bad(CreateAccountResponse, withoutRate);
    bad(UpdateAccountResponse, { ...account, type: "checking" });
  });

  it("accepts the balance check-in result and rejects a non-boolean isCurrent", () => {
    ok(UpdateBalancesResponse, [account, mortgage]);
    bad(UpdateBalancesResponse, [{ ...account, isCurrent: null }]);
  });

  it("accepts monthly details and rejects a string value", () => {
    ok(AccountDetailListResponse, [detail]);
    bad(AccountDetailListResponse, [{ ...detail, value: "1100.10" }]);
    bad(AccountDetailListResponse, [{ ...detail, source: "import" }]);
  });

  it("accepts the delete result and rejects extra keys", () => {
    ok(DeleteAccountResponse, { success: true });
    bad(DeleteAccountResponse, { success: true, id: ACCOUNT_ID });
  });

  it("accepts a portfolio snapshot, with and without history", () => {
    const snapshot = {
      netWorth: -181266.19,
      totalAssets: 1234.56,
      totalLiabilities: 182500.75,
      totalLiquidCash: 1234.56,
      totalInvestments: 0,
      totalPensions: 0,
      totalConsumerDebt: 0,
      totalMortgageBalance: 182500.75,
      totalProperty: 0,
      totalStudentLoans: 0,
      resolvedAccounts: [
        resolved,
        {
          ...resolved,
          id: mortgage.id,
          rawType: "Mortgage",
          category: "mortgages",
          isAsset: false,
          isLiability: true,
          latestMonth: undefined,
          latestYear: undefined,
          history: [],
        },
      ],
      monthlyHistory: [
        {
          year: 2026,
          month: 10,
          label: "Oct 2026",
          netWorth: 1100.1,
          totalAssets: 1100.1,
          totalLiabilities: 0,
        },
      ],
      currency: "GBP",
    };
    // JSON.stringify drops undefined keys, as the wire does.
    ok(PortfolioSnapshotResponse, JSON.parse(JSON.stringify(snapshot)));
    bad(PortfolioSnapshotResponse, { ...snapshot, netWorth: "-181266.19" });
    bad(PortfolioSnapshotResponse, { ...snapshot, resolvedAccounts: [{ ...resolved, extra: 1 }] });
  });
});

describe("snapshots responses", () => {
  const result = {
    month: "2026-10",
    values: [{ accountId: ACCOUNT_ID, value: -250.5, asOfDate: "2026-10-31", source: "manual" }],
    completed: true,
  };

  it("accepts the upsert result and rejects an extra key", () => {
    ok(UpsertSnapshotResponse, result);
    ok(UpsertSnapshotResponse, { ...result, values: [], completed: false });
    bad(UpsertSnapshotResponse, { ...result, userId: USER_ID });
    bad(UpsertSnapshotResponse, { ...result, values: [{ ...result.values[0], value: "-250.50" }] });
  });
});

describe("transactions responses", () => {
  it("accepts a transaction list and the created transaction", () => {
    ok(TransactionListResponse, [transaction]);
    ok(CreateTransactionResponse, transaction);
  });

  it("rejects an amount as a string and an unknown key", () => {
    bad(TransactionDto, { ...transaction, amount: "-12.50" });
    bad(CreateTransactionResponse, { ...transaction, merchant: "Cafe" });
  });
});

describe("bank-connections responses", () => {
  it("accepts the public connection list and rejects a leaked token", () => {
    ok(BankConnectionListResponse, [
      connection,
      { ...connection, expiresAt: connection.createdAt },
    ]);
    bad(BankConnectionListResponse, [{ ...connection, accessToken: "enc:abc" }]);
    bad(BankConnectionListResponse, [{ ...connection, userId: USER_ID }]);
  });

  it("requires expiresAt to be present (null when unknown)", () => {
    const { expiresAt: _omit, ...withoutExpiry } = connection;
    bad(BankConnectionListResponse, [withoutExpiry]);
  });

  it("accepts the capability flag", () => {
    ok(BankConnectionCapabilityResponse, { enabled: false });
    bad(BankConnectionCapabilityResponse, { enabled: "yes" });
  });

  it("accepts both connect outcomes", () => {
    ok(ConnectBankResponse, {
      success: true,
      connection,
      message: "Connected successfully! Sync'd 2 accounts.",
    });
    ok(ConnectBankResponse, {
      success: true,
      oauth: true,
      redirectUrl: "https://auth.monzo.com/?client_id=abc&state=monzo",
    });
    bad(ConnectBankResponse, { success: true, oauth: true, redirectUrl: "not a url" });
    bad(ConnectBankResponse, { success: true, connection, message: "ok", token: "secret" });
  });

  it("accepts sync success and the generic failure", () => {
    ok(SyncBankConnectionResponse, { success: true, connection, message: "Sync'd 2 accounts." });
    ok(SyncBankConnectionResponse, {
      success: false,
      connection: { ...connection, status: "error" },
      error: "Sync failed. Please try again, or reconnect the bank if it keeps failing.",
    });
    bad(SyncBankConnectionResponse, { success: false, connection, message: "provider said 401" });
  });

  it("accepts the delete result and rejects extra keys", () => {
    ok(DeleteBankConnectionResponse, { success: true });
    bad(DeleteBankConnectionResponse, { success: false });
  });
});
