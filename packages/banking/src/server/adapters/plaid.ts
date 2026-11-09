import { enforceSignConvention } from "../../core/sign-enforcement.js";
import type {
  FlumpAccountCategory,
  FlumpBudgetBucket,
  NormalizedAccount,
  NormalizedTransaction,
} from "../../core/types.js";
import { decryptBankingToken, encryptBankingToken } from "../crypto.js";
import type { BankingProviderAdapter } from "../interface.js";

export interface PlaidConfig {
  clientId?: string;
  secret?: string;
  env?: "sandbox" | "development" | "production";
}

/**
 * Maps raw Plaid account type and subtype to Flump Account Category.
 */
export function mapPlaidAccountCategory(type: string, subtype?: string): FlumpAccountCategory {
  const sub = (subtype ?? "").toLowerCase();
  const main = type.toLowerCase();

  if (sub === "checking" || sub === "current" || (main === "depository" && sub !== "savings")) {
    return "CURRENT";
  }
  if (sub === "savings" || sub === "money market") {
    return "SAVINGS";
  }
  if (sub === "isa" || sub.includes("cash isa")) {
    return "CASH_ISA";
  }
  if (sub.includes("pension") || sub.includes("sipp") || sub.includes("retirement")) {
    return sub.includes("sipp") ? "PENSION_SIPP" : "PENSION_WORKPLACE";
  }
  if (sub.includes("stocks") || sub.includes("shares") || main === "investment") {
    return "STOCKS_ISA";
  }
  if (main === "credit" || sub === "credit card") {
    return "CREDIT_CARD";
  }
  if (sub === "overdraft") {
    return "OVERDRAFT";
  }
  if (main === "mortgage" || sub === "mortgage") {
    return "MORTGAGE_RESIDENTIAL";
  }
  if (main === "loan" || sub === "loan") {
    return "LOAN_PERSONAL";
  }

  return "CURRENT";
}

/**
 * Maps raw Plaid personal finance category or broad category to Flump Budget Bucket.
 */
export function mapPlaidCategoryToFlumpBucket(
  amount: number,
  categoryHierarchy?: string[],
  detailedCategory?: string,
): FlumpBudgetBucket {
  if (amount > 0) {
    return "INCOME";
  }

  const combined = [...(categoryHierarchy ?? []), detailedCategory ?? ""].join(" ").toUpperCase();

  if (
    combined.includes("RENT") ||
    combined.includes("MORTGAGE") ||
    combined.includes("GOVERNMENT") ||
    combined.includes("TAX") ||
    combined.includes("UTILITIES") ||
    combined.includes("ELECTRICITY") ||
    combined.includes("GAS") ||
    combined.includes("WATER")
  ) {
    return "PRIORITY_HOUSING_COUNCIL_ENERGY";
  }

  if (
    combined.includes("GROCERIES") ||
    combined.includes("SUPERMARKET") ||
    combined.includes("PHARMACY") ||
    combined.includes("HEALTHCARE") ||
    combined.includes("TELECOM") ||
    combined.includes("INTERNET") ||
    combined.includes("PHONE")
  ) {
    return "ESSENTIAL_BILLS_GROCERIES";
  }

  if (combined.includes("LOAN") || combined.includes("CREDIT") || combined.includes("REPAYMENT")) {
    return "DEBT_MINIMUM_REPAYMENT";
  }

  if (
    combined.includes("INVESTMENT") ||
    combined.includes("SAVINGS") ||
    combined.includes("TRANSFER")
  ) {
    return "SAVINGS_INVESTMENTS_TRANSFER";
  }

  return "DISCRETIONARY_WANTS";
}

export class PlaidAdapter implements BankingProviderAdapter {
  readonly providerName = "plaid" as const;
  readonly config: PlaidConfig;

  constructor(config: PlaidConfig = {}) {
    this.config = {
      clientId: config.clientId ?? process.env.PLAID_CLIENT_ID,
      secret: config.secret ?? process.env.PLAID_SECRET,
      env: config.env ?? (process.env.PLAID_ENV as PlaidConfig["env"]) ?? "sandbox",
    };
  }

  async createLinkSession(
    userId: string,
    reauthConnectionId?: string,
  ): Promise<{ linkTokenOrUrl: string; expiresAt: string }> {
    // In production, calls Plaid /link/token/create
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    return {
      linkTokenOrUrl: `link-sandbox-${encodeURIComponent(userId)}-${reauthConnectionId ?? "new"}`,
      expiresAt,
    };
  }

  async exchangePublicToken(publicTokenOrCode: string): Promise<{
    accessTokenEncrypted: string;
    providerItemId: string;
    consentExpiresAt: string;
  }> {
    // In production, exchanges public token via Plaid /item/public_token/exchange
    const mockAccessToken = `access-sandbox-${publicTokenOrCode.slice(0, 16)}-${Date.now()}`;
    const accessTokenEncrypted = encryptBankingToken(mockAccessToken);
    // UK Open Banking FCA consent lasts 90 days
    const consentExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    return {
      accessTokenEncrypted,
      providerItemId: `item_${Date.now()}`,
      consentExpiresAt,
    };
  }

  async getAccounts(accessTokenEncrypted: string): Promise<NormalizedAccount[]> {
    const _decryptedToken = decryptBankingToken(accessTokenEncrypted);

    // Standardized account payload matching Plaid response schema
    const rawPlaidAccounts = [
      {
        account_id: "plaid-acc-cur-1",
        name: "Everyday Current Account",
        official_name: "Everyday Checking",
        type: "depository",
        subtype: "checking",
        balances: {
          current: 1250.45,
          iso_currency_code: "GBP",
        },
      },
      {
        account_id: "plaid-acc-cc-1",
        name: "Rewards Credit Card",
        official_name: "Platinum Cashback Credit Card",
        type: "credit",
        subtype: "credit card",
        balances: {
          current: 1840.2, // In Plaid, credit balance is positive for balance owed
          limit: 3500.0,
          iso_currency_code: "GBP",
        },
      },
    ];

    return rawPlaidAccounts.map((raw) => {
      const category = mapPlaidAccountCategory(raw.type, raw.subtype);
      const isLiability = raw.type === "credit" || raw.type === "loan";
      const balance = raw.balances.current ?? 0;

      const unnormalized: NormalizedAccount = {
        externalAccountId: raw.account_id,
        provider: "plaid",
        institutionName: "Plaid Connected Bank",
        name: raw.name,
        category,
        currency: raw.balances.iso_currency_code ?? "GBP",
        netWorthImpactGbp: isLiability ? -balance : balance,
        principalOwedGbp: isLiability ? balance : 0,
        creditLimitGbp: raw.balances.limit ?? undefined,
        isTaxFreeIsaWrapper: false,
        lastSyncedAt: new Date().toISOString(),
      };

      return enforceSignConvention(unnormalized);
    });
  }

  async syncTransactions(
    accessTokenEncrypted: string,
    _cursor?: string,
  ): Promise<{
    added: NormalizedTransaction[];
    modified: NormalizedTransaction[];
    removedIds: string[];
    nextCursor: string;
  }> {
    const _decryptedToken = decryptBankingToken(accessTokenEncrypted);

    // In Plaid: positive amount indicates money moving OUT of the account (outflow).
    // In Flump: Outflows are NEGATIVE, Inflows are POSITIVE.
    const rawTransactions = [
      {
        transaction_id: "plaid-tx-1",
        account_id: "plaid-acc-cur-1",
        amount: 42.5, // Plaid outflow -> Flump -42.50
        date: new Date().toISOString().slice(0, 10),
        name: "Sainsbury’s Supermarket",
        category: ["Shops", "Supermarkets and Groceries"],
      },
      {
        transaction_id: "plaid-tx-2",
        account_id: "plaid-acc-cur-1",
        amount: -2500.0, // Plaid negative amount -> Inflow -> Flump +2500.00
        date: new Date().toISOString().slice(0, 10),
        name: "Monthly Payroll Employer",
        category: ["Transfer", "Payroll"],
      },
    ];

    const added: NormalizedTransaction[] = rawTransactions.map((tx) => {
      // Invert Plaid sign: Plaid (+) = outflow -> Flump (-)
      const flumpAmount = -tx.amount;
      const bucket = mapPlaidCategoryToFlumpBucket(flumpAmount, tx.category);

      return {
        externalTransactionId: tx.transaction_id,
        externalAccountId: tx.account_id,
        postedDate: tx.date,
        merchantOrDescription: tx.name,
        amountGbp: flumpAmount,
        flumpBucket: bucket,
        isRecurringContract: bucket === "PRIORITY_HOUSING_COUNCIL_ENERGY",
      };
    });

    return {
      added,
      modified: [],
      removedIds: [],
      nextCursor: `plaid_cursor_${Date.now()}`,
    };
  }

  async revokeConnection(accessTokenEncrypted: string): Promise<void> {
    const _decryptedToken = decryptBankingToken(accessTokenEncrypted);
    // In production, calls Plaid /item/remove
    return Promise.resolve();
  }
}
