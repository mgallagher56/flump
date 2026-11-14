/**
 * One fixture set per bank provider (audit M23): the fake API each provider talks to in tests,
 * and what the provider must make of it. `provider-failure-modes.spec.ts` runs every case
 * through the same failure suite; the per-provider specs check mapping details.
 */
import type { ConfigService } from "@nestjs/config";
import { MonzoProvider } from "../monzo.provider";
import {
  OPEN_BANKING_INSTITUTIONS,
  OpenBankingStandardProvider,
} from "../open-banking-standard.provider";
import type { BankProvider, ProviderAccount, ProviderTransaction } from "../provider.interface";
import { StarlingProvider } from "../starling.provider";
import { Trading212Provider } from "../trading212.provider";
import { type FakeRoute, json } from "./fake-bank";

export interface ProviderCase {
  name: string;
  make(): BankProvider;
  routes: FakeRoute[];
  /** Every route `fetchAccounts` calls. A failure on any of them must fail the fetch. */
  accountRouteKeys: string[];
  /** The balance route of the first account. */
  balanceRouteKey: string;
  /** A 2xx balance answer that lacks the balance. */
  balanceMissingBody: unknown;
  expectedAccounts: ProviderAccount[];
  transactions: { externalAccountId: string; routeKey: string; expected: ProviderTransaction[] };
  tokenRouteKey: string;
  revoke: { supported: true; routeKey: string } | { supported: false };
}

const configWithoutSandbox = { get: () => undefined } as unknown as ConfigService;

export const monzoCase: ProviderCase = {
  name: "monzo",
  make: () => new MonzoProvider(),
  routes: [
    {
      key: "accounts",
      path: /^https:\/\/api\.monzo\.com\/accounts$/,
      respond: json({
        accounts: [
          { id: "acc_1", type: "uk_retail", closed: false },
          { id: "acc_closed", type: "uk_retail", closed: true },
          { id: "acc_joint", type: "uk_retail_joint", closed: false },
        ],
      }),
    },
    {
      key: "balance",
      path: /\/balance\?account_id=acc_1$/,
      respond: json({ balance: 125050, currency: "GBP" }),
    },
    {
      key: "pots",
      path: /\/pots\?current_account_id=acc_1$/,
      respond: json({
        pots: [
          { id: "pot_1", name: "Holiday", balance: 50000, currency: "GBP", deleted: false },
          { id: "pot_gone", name: "Old", balance: 100, currency: "GBP", deleted: true },
        ],
      }),
    },
    {
      key: "balance-joint",
      path: /\/balance\?account_id=acc_joint$/,
      respond: json({ balance: -2025, currency: "GBP" }),
    },
    {
      key: "pots-joint",
      path: /\/pots\?current_account_id=acc_joint$/,
      respond: json({ pots: [] }),
    },
    {
      key: "transactions",
      path: /\/transactions\?account_id=acc_1&limit=30$/,
      respond: json({
        transactions: [
          {
            amount: -1250,
            merchant: { name: "Tesco" },
            category: "groceries",
            created: "2026-11-01T10:00:00.000Z",
          },
          {
            amount: 250000,
            description: "ACME LTD",
            category: "salary",
            created: "2026-11-02T09:00:00.000Z",
          },
          {
            amount: -500,
            decline_reason: "INSUFFICIENT_FUNDS",
            category: "shopping",
            created: "2026-11-02T10:00:00.000Z",
          },
        ],
      }),
    },
    {
      key: "token",
      method: "POST",
      path: /\/oauth2\/token$/,
      respond: json({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    },
    { key: "revoke", method: "POST", path: /\/oauth2\/logout$/, respond: json({}) },
  ],
  accountRouteKeys: ["accounts", "balance", "pots", "balance-joint", "pots-joint"],
  balanceRouteKey: "balance",
  balanceMissingBody: { currency: "GBP" },
  expectedAccounts: [
    {
      externalAccountId: "acc_1",
      name: "Monzo Current Account",
      type: "Current",
      balance: 1250.5,
      currency: "GBP",
    },
    {
      externalAccountId: "pot_1",
      name: "Monzo Pot: Holiday",
      type: "Saving",
      balance: 500,
      currency: "GBP",
    },
    {
      externalAccountId: "acc_joint",
      name: "Monzo Joint Account",
      type: "Current",
      balance: -20.25,
      currency: "GBP",
    },
  ],
  transactions: {
    externalAccountId: "acc_1",
    routeKey: "transactions",
    expected: [
      {
        amount: -12.5,
        description: "Tesco",
        category: "Food",
        timestamp: new Date("2026-11-01T10:00:00.000Z"),
      },
      {
        amount: 2500,
        description: "ACME LTD",
        category: "Salary",
        timestamp: new Date("2026-11-02T09:00:00.000Z"),
      },
    ],
  },
  tokenRouteKey: "token",
  revoke: { supported: true, routeKey: "revoke" },
};

export const starlingCase: ProviderCase = {
  name: "starling",
  make: () => new StarlingProvider(configWithoutSandbox),
  routes: [
    {
      key: "accounts",
      path: /^https:\/\/api\.starlingbank\.com\/api\/v2\/accounts$/,
      respond: json({
        accounts: [
          { accountUid: "a-1", defaultCategory: "c-1", accountType: "PRIMARY", currency: "GBP" },
        ],
      }),
    },
    {
      key: "balance",
      path: /\/api\/v2\/accounts\/a-1\/balance$/,
      respond: json({ effectiveBalance: { minorUnits: 98765, currency: "GBP" } }),
    },
    {
      key: "spaces",
      path: /\/api\/v2\/account\/a-1\/savings-goals$/,
      respond: json({
        savingsGoals: [
          {
            savingsGoalUid: "g-1",
            name: "Rainy day",
            totalSaved: { minorUnits: 30000, currency: "GBP" },
          },
        ],
      }),
    },
    {
      key: "transactions",
      path: /\/api\/v2\/feed\/account\/a-1\/category\/c-1\?changesSince=\d{4}-\d{2}-\d{2}T[\d%A.]+Z$/,
      respond: json({
        feedItems: [
          {
            direction: "OUT",
            amount: { minorUnits: 1999 },
            counterPartyName: "Pret",
            spendingCategory: "EATING_OUT",
            transactionTime: "2026-11-02T08:00:00.000Z",
          },
          {
            direction: "IN",
            amount: { minorUnits: 100000 },
            reference: "Pay",
            spendingCategory: "INCOME",
            transactionTime: "2026-11-03T08:00:00.000Z",
          },
        ],
      }),
    },
    {
      key: "token",
      method: "POST",
      path: /\/oauth\/access-token$/,
      respond: json({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    },
  ],
  accountRouteKeys: ["accounts", "balance", "spaces"],
  balanceRouteKey: "balance",
  balanceMissingBody: { effectiveBalance: { currency: "GBP" } },
  expectedAccounts: [
    {
      externalAccountId: "a-1:c-1",
      name: "Starling Current Account",
      type: "Current",
      balance: 987.65,
      currency: "GBP",
    },
    {
      externalAccountId: "space:a-1:g-1",
      name: "Starling Saving: Rainy day",
      type: "Saving",
      balance: 300,
      currency: "GBP",
    },
  ],
  transactions: {
    externalAccountId: "a-1:c-1",
    routeKey: "transactions",
    expected: [
      {
        amount: -19.99,
        description: "Pret",
        category: "Food",
        timestamp: new Date("2026-11-02T08:00:00.000Z"),
      },
      {
        amount: 1000,
        description: "Pay",
        category: "Salary",
        timestamp: new Date("2026-11-03T08:00:00.000Z"),
      },
    ],
  },
  tokenRouteKey: "token",
  revoke: { supported: false },
};

export const openBankingCase: ProviderCase = {
  name: "open banking (hsbc)",
  make: () => new OpenBankingStandardProvider(OPEN_BANKING_INSTITUTIONS.hsbc as never),
  routes: [
    {
      key: "accounts",
      path: /\/open-banking\/v3\.1\/aisp\/accounts$/,
      respond: json({
        Data: {
          Account: [
            {
              AccountId: "111",
              Currency: "GBP",
              Nickname: "Main",
              AccountSubType: "CurrentAccount",
            },
            { AccountId: "222", Currency: "GBP", Nickname: "Card", AccountSubType: "CreditCard" },
          ],
        },
      }),
    },
    {
      key: "balance",
      path: /\/aisp\/accounts\/111\/balances$/,
      respond: json({
        Data: {
          Balance: [
            { Amount: { Amount: "1500.25", Currency: "GBP" }, CreditDebitIndicator: "Credit" },
          ],
        },
      }),
    },
    {
      key: "balance-card",
      path: /\/aisp\/accounts\/222\/balances$/,
      respond: json({
        Data: {
          Balance: [
            { Amount: { Amount: "320.00", Currency: "GBP" }, CreditDebitIndicator: "Debit" },
          ],
        },
      }),
    },
    {
      key: "transactions",
      path: /\/aisp\/accounts\/111\/transactions$/,
      respond: json({
        Data: {
          Transaction: [
            {
              Amount: { Amount: "12.50", Currency: "GBP" },
              CreditDebitIndicator: "Debit",
              TransactionInformation: "Coffee",
              BookingDateTime: "2026-11-03T09:00:00.000Z",
              ProprietaryBankTransactionCode: { Code: "POS" },
            },
            {
              Amount: { Amount: "2000.00", Currency: "GBP" },
              CreditDebitIndicator: "Credit",
              TransactionInformation: "Salary",
              BookingDateTime: "2026-11-04T09:00:00.000Z",
            },
          ],
        },
      }),
    },
    {
      key: "token",
      method: "POST",
      path: /\/oauth\/v1\/token$/,
      respond: json({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    },
  ],
  accountRouteKeys: ["accounts", "balance", "balance-card"],
  balanceRouteKey: "balance",
  balanceMissingBody: { Data: { Balance: [{ Amount: { Currency: "GBP" } }] } },
  expectedAccounts: [
    {
      externalAccountId: "hsbc-111",
      name: "HSBC Bank Main",
      type: "Current",
      balance: 1500.25,
      currency: "GBP",
    },
    {
      externalAccountId: "hsbc-222",
      name: "HSBC Bank Card",
      type: "Credit Card",
      balance: -320,
      currency: "GBP",
    },
  ],
  transactions: {
    externalAccountId: "hsbc-111",
    routeKey: "transactions",
    expected: [
      {
        amount: -12.5,
        description: "Coffee",
        category: "POS",
        timestamp: new Date("2026-11-03T09:00:00.000Z"),
      },
      {
        amount: 2000,
        description: "Salary",
        category: "General",
        timestamp: new Date("2026-11-04T09:00:00.000Z"),
      },
    ],
  },
  tokenRouteKey: "token",
  revoke: { supported: false },
};

export const trading212Case: ProviderCase = {
  name: "trading212",
  make: () => new Trading212Provider(),
  routes: [
    {
      key: "cash",
      path: /\/api\/v0\/equity\/account\/cash$/,
      respond: json({ total: 10234.56, free: 100 }),
    },
    {
      key: "info",
      path: /\/api\/v0\/equity\/account\/info$/,
      respond: json({ id: 12345, currencyCode: "GBP" }),
    },
    {
      key: "transactions",
      path: /\/api\/v0\/equity\/history\/orders\?limit=50$/,
      respond: json({
        items: [
          {
            status: "FILLED",
            type: "MARKET",
            filledQuantity: 5,
            filledValue: 500,
            fillPrice: 100,
            ticker: "VUSA",
            dateExecuted: "2026-11-04T14:00:00.000Z",
          },
          {
            status: "CANCELLED",
            type: "LIMIT",
            filledQuantity: 0,
            filledValue: null,
            ticker: "TSLA",
            dateExecuted: "2026-11-04T15:00:00.000Z",
          },
          {
            // A sale has a negative quantity; filledValue can be null, then fillPrice × quantity.
            status: "FILLED",
            type: "MARKET",
            filledQuantity: -2,
            filledValue: null,
            fillPrice: 100,
            ticker: "AAPL",
            dateExecuted: "2026-11-05T14:00:00.000Z",
          },
        ],
      }),
    },
    {
      key: "token",
      method: "POST",
      path: /\/oauth\/token$/,
      respond: json({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    },
  ],
  accountRouteKeys: ["cash", "info"],
  balanceRouteKey: "cash",
  balanceMissingBody: { free: 100 },
  expectedAccounts: [
    {
      externalAccountId: "t212-12345",
      name: "Trading 212 Portfolio",
      type: "Investment",
      balance: 10234.56,
      currency: "GBP",
    },
  ],
  transactions: {
    externalAccountId: "t212-12345",
    routeKey: "transactions",
    expected: [
      {
        amount: -500,
        description: "Bought VUSA",
        category: "Investment",
        timestamp: new Date("2026-11-04T14:00:00.000Z"),
      },
      {
        amount: 200,
        description: "Sold AAPL",
        category: "Investment",
        timestamp: new Date("2026-11-05T14:00:00.000Z"),
      },
    ],
  },
  tokenRouteKey: "token",
  revoke: { supported: false },
};

export const PROVIDER_CASES: ProviderCase[] = [
  monzoCase,
  starlingCase,
  openBankingCase,
  trading212Case,
];
