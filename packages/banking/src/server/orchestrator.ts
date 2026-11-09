import { enforceSignConvention } from "../core/sign-enforcement.js";
import type { FlumpAccountCategory, NormalizedAccount } from "../core/types.js";
import { encryptBankingToken, safeDecryptBankingToken } from "./crypto.js";

export interface MockAccountSeed {
  name: string;
  type: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment";
  balance: number;
  currency: string;
}

export interface MockHistoryPoint {
  month: number;
  year: number;
  value: number;
}

export interface MockTransactionSeed {
  amount: number;
  description: string;
  category: string;
  timestamp: Date;
}

export class BankSyncOrchestrator {
  /**
   * Encrypts a banking token (access or refresh token) using AES-256-GCM.
   */
  static encryptToken(token: string): string {
    return encryptBankingToken(token);
  }

  /**
   * Safely decrypts a banking token, returning plaintext if not encrypted.
   */
  static decryptToken(token: string): string {
    return safeDecryptBankingToken(token);
  }

  /**
   * Normalizes account balances to comply with the Flump Sign Convention Law:
   * - Assets (Current, Saving, Investment) have positive balance.
   * - Liabilities (Mortgage, Credit Card, Loan, Overdraft) have negative balance.
   */
  static normalizeAccountBalance(
    accountType: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment" | string,
    rawBalance: number,
  ): number {
    const isLiability =
      accountType === "Mortgage" ||
      accountType === "Credit Card" ||
      accountType === "Loan" ||
      accountType === "Overdraft";

    if (isLiability) {
      return -Math.abs(rawBalance);
    }
    return Math.abs(rawBalance);
  }

  /**
   * Returns canonical mock accounts for a given bank institution ID.
   */
  static getMockInstitutionAccounts(institutionId: string): MockAccountSeed[] {
    const instId = institutionId.toLowerCase();
    switch (instId) {
      case "hsbc":
        return [
          { name: "HSBC Premier Checking", type: "Current", balance: 2450.75, currency: "GBP" },
          { name: "HSBC Flexi Savings", type: "Saving", balance: 15800.0, currency: "GBP" },
          { name: "HSBC Fixed Mortgage", type: "Mortgage", balance: -135400.0, currency: "GBP" },
        ];
      case "barclays":
        return [
          { name: "Barclays Everyday Checking", type: "Current", balance: 980.5, currency: "GBP" },
          {
            name: "Barclays Platinum Credit Card",
            type: "Credit Card",
            balance: -420.25,
            currency: "GBP",
          },
        ];
      case "monzo":
        return [
          { name: "Monzo Card Account", type: "Current", balance: 1230.15, currency: "GBP" },
          { name: "Monzo Rainy Day Pot", type: "Saving", balance: 4500.0, currency: "GBP" },
        ];
      case "revolut":
        return [
          { name: "Revolut Card Account", type: "Current", balance: 750.6, currency: "GBP" },
          { name: "Revolut Savings Vault", type: "Saving", balance: 3200.0, currency: "GBP" },
        ];
      case "chase":
        return [
          { name: "Chase Checking", type: "Current", balance: 1550.0, currency: "GBP" },
          { name: "Chase Saver", type: "Saving", balance: 12000.0, currency: "GBP" },
        ];
      case "fidelity":
        return [
          { name: "Fidelity Brokerage", type: "Investment", balance: 28500.0, currency: "GBP" },
        ];
      case "vanguard":
        return [{ name: "Vanguard ISA", type: "Investment", balance: 42100.5, currency: "GBP" }];
      case "starling":
        return [
          { name: "Starling Personal Current", type: "Current", balance: 3420.5, currency: "GBP" },
          { name: "Starling Holiday Space", type: "Saving", balance: 1250.0, currency: "GBP" },
        ];
      default:
        return [
          { name: "External Checking Account", type: "Current", balance: 1000.0, currency: "GBP" },
        ];
    }
  }

  /**
   * Generates a realistic 12-month historical trajectory for a given account.
   */
  static generateMockHistory(
    balance: number,
    accountType: string,
    currentYear: number,
    currentMonth: number,
  ): MockHistoryPoint[] {
    const historyRows: MockHistoryPoint[] = [];
    for (let i = 0; i < 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      let multiplier = 1;
      if (accountType === "Mortgage") {
        multiplier = 1 + i * 0.003;
      } else if (accountType === "Investment" || accountType === "Saving") {
        multiplier = 1 - i * 0.005;
      } else {
        multiplier = 1 + Math.sin(i) * 0.05 - i * 0.002;
      }

      historyRows.push({
        month: m,
        year: y,
        value: Math.round(balance * multiplier * 100) / 100,
      });
    }
    return historyRows;
  }

  /**
   * Generates realistic mock transactions for a newly connected account.
   */
  static generateMockTransactions(
    accountType: string,
    institutionName: string,
    now: Date = new Date(),
  ): MockTransactionSeed[] {
    const txs: MockTransactionSeed[] = [];
    if (accountType === "Current") {
      txs.push(
        {
          amount: 2100.0,
          description: `${institutionName} Salary Direct Deposit`,
          category: "Salary",
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          amount: -45.2,
          description: "Supermarket Checkout",
          category: "Food",
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          amount: -3.8,
          description: "Coffee House",
          category: "Food",
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        },
      );
    } else if (accountType === "Saving") {
      txs.push({
        amount: 250.0,
        description: "Monthly Savings Allocation",
        category: "Transfer",
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      });
    } else if (accountType === "Mortgage") {
      txs.push({
        amount: -850.0,
        description: "Monthly Mortgage Payment (Principal & Interest)",
        category: "Housing",
        timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      });
    } else if (accountType === "Credit Card") {
      txs.push({
        amount: -65.4,
        description: "Trainline Ticket Purchase",
        category: "Travel",
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      });
    }
    return txs;
  }
}
