import { normalizeStoredBalance } from "../core/sign-enforcement.js";
import {
  bankingTokenNeedsReencrypt,
  encryptBankingToken,
  safeDecryptBankingToken,
} from "./crypto.js";

export class BankSyncOrchestrator {
  /**
   * Encrypts a banking token (access or refresh token) using AES-256-GCM under the active key.
   * `aad` (for example `<connectionId>:accessToken`) binds the ciphertext to its context and must
   * be passed again to decrypt.
   */
  static encryptToken(token: string, aad?: string): string {
    return encryptBankingToken(token, { aad });
  }

  /**
   * Decrypts a banking token. Throws if a non-empty token is not encrypted or cannot be
   * decrypted (unknown key version, wrong key, wrong AAD or corruption); empty input is returned
   * unchanged. Legacy unprefixed tokens are read with the version-1 key and no AAD.
   */
  static decryptToken(token: string, aad?: string): string {
    return safeDecryptBankingToken(token, { aad });
  }

  /**
   * True when a stored token is in the legacy format or under a key version that is not the
   * active one, so the caller should re-encrypt it on its next write.
   */
  static tokenNeedsReencrypt(token: string): boolean {
    return bankingTokenNeedsReencrypt(token);
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
   * Normalizes account balances to comply with the Flump Sign Convention Law (see
   * `normalizeStoredBalance`, the one rule every write path uses).
   */
  static normalizeAccountBalance(
    accountType: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment" | string,
    rawBalance: number,
  ): number {
    return normalizeStoredBalance(accountType, rawBalance);
  }
}
