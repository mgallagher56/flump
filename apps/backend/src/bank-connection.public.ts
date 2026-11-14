import type { BankConnection } from "./entities/bank-connection.entity";

/** The only shape of a bank connection that may be sent to a client. */
export interface PublicBankConnection {
  id: string;
  institutionId: string;
  institutionName: string;
  status: "connected" | "disconnected" | "error" | "needs_reconnect";
  authType: "oauth" | "token";
  expiresAt: Date | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Allowlist mapper: never exposes accessToken, refreshToken or userId. */
export function toPublicConnection(connection: BankConnection): PublicBankConnection {
  return {
    id: connection.id,
    institutionId: connection.institutionId,
    institutionName: connection.institutionName,
    status: connection.status,
    authType: connection.authType,
    // A connection created by the token flow has never set expiresAt, so the saved entity has no
    // key at all; the wire shape always carries it (null when unknown).
    expiresAt: connection.expiresAt ?? null,
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}
