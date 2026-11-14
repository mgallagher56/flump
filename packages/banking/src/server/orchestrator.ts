import { enforceSignConvention, normalizeStoredBalance } from "../core/sign-enforcement.js";
import type { FlumpAccountCategory, NormalizedAccount } from "../core/types.js";
import { encryptBankingToken, safeDecryptBankingToken } from "./crypto.js";
import type { BankingProviderAdapter } from "./interface.js";

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

export interface RefreshTokenOptions {
  connection: {
    institutionId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | null;
  };
  exchangeRefreshToken: (plainRefreshToken: string) => Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  marginMs?: number;
}

export interface RefreshedTokenResult {
  activeAccessToken: string;
  updatedEncryptedAccessToken?: string;
  updatedEncryptedRefreshToken?: string;
  newExpiresAt?: Date;
  wasRefreshed: boolean;
}

export class BankSyncOrchestrator {
  private static adapters: Map<string, BankingProviderAdapter> = new Map();

  /**
   * Registers a banking provider adapter by provider name.
   */
  static registerAdapter(providerName: string, adapter: BankingProviderAdapter): void {
    this.adapters.set(providerName.toLowerCase(), adapter);
  }

  /**
   * Retrieves a registered banking provider adapter.
   */
  static getAdapter(providerName: string): BankingProviderAdapter | undefined {
    return this.adapters.get(providerName.toLowerCase());
  }

  /**
   * Encrypts a banking token (access or refresh token) using AES-256-GCM.
   */
  static encryptToken(token: string): string {
    return encryptBankingToken(token);
  }

  /**
   * Decrypts a banking token. Throws if a non-empty token is not encrypted or cannot be
   * decrypted (wrong key or corruption); empty input is returned unchanged.
   */
  static decryptToken(token: string): string {
    return safeDecryptBankingToken(token);
  }

  /**
   * Determines whether a token is close to expiry or already expired.
   */
  static isTokenExpiring(expiresAt?: Date | string | null, marginMs = 300_000): boolean {
    if (!expiresAt) return false;
    const expiryTime =
      typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();
    return expiryTime - Date.now() < marginMs;
  }

  /**
   * Calculates a future expiry Date from a TTL in seconds.
   */
  static calculateExpiryDate(expiresInSeconds?: number): Date | undefined {
    if (!expiresInSeconds) return undefined;
    return new Date(Date.now() + expiresInSeconds * 1000);
  }

  /**
   * Encapsulates token lifecycle and automatic refresh. If token is expiring and a refresh token
   * is present, calls the provider's token exchange, encrypts the new tokens, and updates state.
   */
  static async refreshConnectionTokensIfNeeded(
    options: RefreshTokenOptions,
  ): Promise<RefreshedTokenResult> {
    const { connection, exchangeRefreshToken, marginMs = 300_000 } = options;

    if (!connection.accessToken) {
      throw new Error("No access token provided on connection");
    }

    let activeAccessToken = this.decryptToken(connection.accessToken);

    const shouldRefresh =
      this.isTokenExpiring(connection.expiresAt, marginMs) && Boolean(connection.refreshToken);

    if (shouldRefresh && connection.refreshToken) {
      const plainRefreshToken = this.decryptToken(connection.refreshToken);
      const tokenRes = await exchangeRefreshToken(plainRefreshToken);

      activeAccessToken = tokenRes.accessToken;
      const updatedEncryptedAccessToken = this.encryptToken(tokenRes.accessToken);
      const updatedEncryptedRefreshToken = tokenRes.refreshToken
        ? this.encryptToken(tokenRes.refreshToken)
        : undefined;
      const newExpiresAt = this.calculateExpiryDate(tokenRes.expiresIn);

      return {
        activeAccessToken,
        updatedEncryptedAccessToken,
        updatedEncryptedRefreshToken,
        newExpiresAt,
        wasRefreshed: true,
      };
    }

    return {
      activeAccessToken,
      wasRefreshed: false,
    };
  }

  /**
   * Generates canonical OAuth redirect URLs for supported banking institutions.
   */
  static getOAuthUrl(
    institutionId: string,
    callbackUrl: string,
    clientId?: string,
    state?: string,
  ): string | null {
    const encCallback = encodeURIComponent(callbackUrl);
    const targetState = encodeURIComponent(state || institutionId);
    const id = institutionId.toLowerCase();

    switch (id) {
      case "monzo":
        return `https://auth.monzo.com/?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&state=${targetState}`;
      case "starling":
        return `https://oauth.starlingbank.com/?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&state=${targetState}`;
      case "trading212":
        return `https://live.trading212.com/oauth/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&state=${targetState}`;
      case "revolut":
        return `https://business.revolut.com/app-confirm?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&state=${targetState}`;
      case "hsbc":
        return `https://api.hsbc.com/oauth/v1/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=openid%20accounts&state=${targetState}`;
      case "barclays":
        return `https://oauth.barclays.com/as/authorization.oauth2?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=openid%20accounts&state=${targetState}`;
      case "santander":
        return `https://api.santander.co.uk/oauth/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=accounts&state=${targetState}`;
      case "natwest":
        return `https://api.natwest.com/open-banking/v3.1/aisp/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=accounts&state=${targetState}`;
      case "lloyds":
        return `https://api.lloydsbank.com/open-banking/v3.1/aisp/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=accounts&state=${targetState}`;
      case "chase":
        return `https://secure.chase.com/web/auth/oauth2/v2/authorize?client_id=${clientId || "flump-client"}&redirect_uri=${encCallback}&response_type=code&scope=accounts&state=${targetState}`;
      default:
        return null;
    }
  }

  /**
   * Normalizes account balances to comply with the Flump Sign Convention Law (see
   * `normalizeStoredBalance`, the one rule every write path uses).
   */
  static normalizeAccountBalance(
    accountType: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment" | string,
    rawBalance: number,
  ): number {
    return normalizeStoredBalance(accountType, rawBalance);
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
