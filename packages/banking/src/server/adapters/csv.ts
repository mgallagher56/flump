import { enforceSignConvention } from "../../core/sign-enforcement.js";
import type {
  FlumpAccountCategory,
  FlumpBudgetBucket,
  NormalizedAccount,
  NormalizedTransaction,
} from "../../core/types.js";
import { decryptBankingToken, encryptBankingToken } from "../crypto.js";
import type { BankingProviderAdapter } from "../interface.js";

export type SupportedBankCsvFormat = "monzo" | "starling" | "amex" | "hsbc" | "generic";

/**
 * Categorizes a UK bank transaction into a Flump budget bucket based on merchant/description.
 */
export function categorizeUkMerchant(
  merchant: string,
  amountGbp: number,
  rawCategory?: string,
): FlumpBudgetBucket {
  if (amountGbp > 0) {
    return "INCOME";
  }

  const text = `${merchant} ${rawCategory ?? ""}`.toLowerCase();

  // Priority housing, council tax, energy, utilities
  if (
    text.includes("council") ||
    text.includes("rent") ||
    text.includes("mortgage") ||
    text.includes("rates") ||
    text.includes("octopus") ||
    text.includes("british gas") ||
    text.includes("edf") ||
    text.includes("water") ||
    text.includes("severn trent") ||
    text.includes("thames water") ||
    text.includes("ovo") ||
    text.includes("e.on")
  ) {
    return "PRIORITY_HOUSING_COUNCIL_ENERGY";
  }

  // Essential bills and groceries
  if (
    text.includes("tesco") ||
    text.includes("sainsbury") ||
    text.includes("asda") ||
    text.includes("morrisons") ||
    text.includes("aldi") ||
    text.includes("lidl") ||
    text.includes("waitrose") ||
    text.includes("marks & spencer") ||
    text.includes("m&s simply food") ||
    text.includes("pharmacy") ||
    text.includes("boots") ||
    text.includes("broadband") ||
    text.includes("bt group") ||
    text.includes("vodafone") ||
    text.includes("ee mobile") ||
    text.includes("o2") ||
    text.includes("three")
  ) {
    return "ESSENTIAL_BILLS_GROCERIES";
  }

  // Debt repayments
  if (
    text.includes("barclaycard") ||
    text.includes("american express") ||
    text.includes("amex payment") ||
    text.includes("capital one") ||
    text.includes("mbna") ||
    text.includes("loan payment") ||
    text.includes("klarna") ||
    text.includes("clearpay")
  ) {
    return "DEBT_MINIMUM_REPAYMENT";
  }

  // Savings / investments transfers
  if (
    text.includes("vanguard") ||
    text.includes("hargreaves") ||
    text.includes("hl ") ||
    text.includes("trading 212") ||
    text.includes("freetrade") ||
    text.includes("monzo pot") ||
    text.includes("isa transfer")
  ) {
    return "SAVINGS_INVESTMENTS_TRANSFER";
  }

  return "DISCRETIONARY_WANTS";
}

/**
 * Detects CSV bank format from CSV header line.
 */
export function detectBankCsvFormat(headerLine: string): SupportedBankCsvFormat {
  const lower = headerLine.toLowerCase();
  if (lower.includes("emoji") || (lower.includes("notes and #tags") && lower.includes("monzo"))) {
    return "monzo";
  }
  if (
    lower.includes("counter party") ||
    (lower.includes("starling") && lower.includes("reference"))
  ) {
    return "starling";
  }
  if (
    lower.includes("card member") ||
    lower.includes("account #") ||
    lower.includes("american express")
  ) {
    return "amex";
  }
  if (lower.includes("balance") && lower.includes("description") && lower.includes("date")) {
    return "hsbc";
  }
  return "generic";
}

/**
 * Parses simple CSV rows, handling commas inside quotation marks.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

/**
 * Standardizes UK CSV Statements from Monzo, Starling, Amex, and HSBC.
 */
export function parseBankCsvContent(
  csvContent: string,
  externalAccountId = "csv-account-default",
  category: FlumpAccountCategory = "CURRENT",
): { account: NormalizedAccount; transactions: NormalizedTransaction[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("CSV content is empty.");
  }

  const headerLine = lines[0]!;
  const format = detectBankCsvFormat(headerLine);
  const rows = lines.slice(1);

  const transactions: NormalizedTransaction[] = [];
  let computedBalance = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]!;
    const cols = parseCsvLine(row);
    if (cols.length < 3) continue;

    let date = "";
    let merchant = "";
    let amount = 0;
    let rawCategory: string | undefined;

    if (format === "monzo") {
      // Monzo: Transaction ID (0), Date (1), Time (2), Type (3), Name (4), Emoji (5), Category (6), Amount (7), Currency (8)
      date = cols[1] ?? "";
      merchant = cols[4] || cols[13] || "Monzo Transaction";
      rawCategory = cols[6];
      amount = Number.parseFloat((cols[7] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
    } else if (format === "starling") {
      // Starling: Date (0), Counter Party (1), Reference (2), Type (3), Amount (GBP) (4), Balance (GBP) (5), Spending Category (6)
      date = cols[0] ?? "";
      merchant = cols[1] || cols[2] || "Starling Transaction";
      amount = Number.parseFloat((cols[4] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      rawCategory = cols[6];
    } else if (format === "amex") {
      // Amex: Date (0), Description (1), Card Member (2), Account # (3), Amount (4)
      date = cols[0] ?? "";
      merchant = cols[1] || "American Express Transaction";
      const rawAmexAmount = Number.parseFloat((cols[4] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      // In Amex statements: charges are positive, repayments are negative.
      // We flip to Flump Standard: Outflows negative, Inflows positive.
      amount = -rawAmexAmount;
      rawCategory = "Credit Card";
    } else {
      // HSBC / Generic: Date (0), Description (1), Amount (2), Balance (3)
      date = cols[0] ?? "";
      merchant = cols[1] || "Bank Transaction";
      amount = Number.parseFloat((cols[2] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
    }

    if (Number.isNaN(amount)) continue;

    computedBalance += amount;

    // Convert date to 'YYYY-MM-DD' if UK formatted 'DD/MM/YYYY'
    let isoDate = date;
    if (date.includes("/")) {
      const parts = date.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }

    const flumpBucket = categorizeUkMerchant(merchant, amount, rawCategory);

    transactions.push({
      externalTransactionId: `csv-tx-${idx + 1}-${date.replace(/\D/g, "")}`,
      externalAccountId,
      postedDate: isoDate,
      merchantOrDescription: merchant,
      amountGbp: Math.round(amount * 100) / 100,
      flumpBucket,
      isRecurringContract: flumpBucket === "PRIORITY_HOUSING_COUNCIL_ENERGY",
      rawProviderCategory: rawCategory,
    });
  }

  const institutionName =
    format === "monzo"
      ? "Monzo"
      : format === "starling"
        ? "Starling"
        : format === "amex"
          ? "American Express"
          : "HSBC";

  const account = enforceSignConvention({
    externalAccountId,
    provider: "csv",
    institutionName,
    name: `${institutionName} Statement`,
    category,
    currency: "GBP",
    netWorthImpactGbp: Math.round(computedBalance * 100) / 100,
    principalOwedGbp: category === "CREDIT_CARD" ? Math.abs(computedBalance) : 0,
    isTaxFreeIsaWrapper: false,
    lastSyncedAt: new Date().toISOString(),
  });

  return { account, transactions };
}

export class CsvStatementParser implements BankingProviderAdapter {
  readonly providerName = "csv" as const;

  async createLinkSession(userId: string): Promise<{ linkTokenOrUrl: string; expiresAt: string }> {
    return {
      linkTokenOrUrl: `csv://upload?userId=${encodeURIComponent(userId)}`,
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    };
  }

  async exchangePublicToken(csvStringContent: string): Promise<{
    accessTokenEncrypted: string;
    providerItemId: string;
    consentExpiresAt: string;
  }> {
    // Encrypt the uploaded CSV statement using AES-256-GCM
    const encryptedCsv = encryptBankingToken(csvStringContent);
    return {
      accessTokenEncrypted: encryptedCsv,
      providerItemId: `csv_statement_${Date.now()}`,
      consentExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Manual CSV has 1-year lifespan
    };
  }

  async getAccounts(accessTokenEncrypted: string): Promise<NormalizedAccount[]> {
    const csvContent = decryptBankingToken(accessTokenEncrypted);
    const { account } = parseBankCsvContent(csvContent);
    return [account];
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
    const csvContent = decryptBankingToken(accessTokenEncrypted);
    const { transactions } = parseBankCsvContent(csvContent);
    return {
      added: transactions,
      modified: [],
      removedIds: [],
      nextCursor: `cursor_csv_${Date.now()}`,
    };
  }

  async revokeConnection(_accessTokenEncrypted: string): Promise<void> {
    return Promise.resolve();
  }
}
