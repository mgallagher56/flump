import { z } from "zod";
import { IsoDateTime, Uuid } from "../primitives.js";

/** Providers wired into the backend registry today (apps/backend/src/providers). */
export const INSTITUTION_IDS = ["monzo", "starling", "trading212"] as const;

export const ConnectBankRequest = z.object({
  institutionId: z.string().trim().min(1).max(64),
  token: z.string().min(1).max(512).optional(),
  code: z.string().min(1).max(2048).optional(),
});

export const BANK_CONNECTION_STATUSES = ["connected", "disconnected", "error"] as const;
export const BANK_CONNECTION_AUTH_TYPES = ["oauth", "token"] as const;

/** The allowlisted public connection (backend `toPublicConnection`): never tokens or userId. */
export const BankConnectionDto = z.strictObject({
  id: Uuid,
  institutionId: z.string().min(1),
  institutionName: z.string(),
  status: z.enum(BANK_CONNECTION_STATUSES),
  authType: z.enum(BANK_CONNECTION_AUTH_TYPES),
  expiresAt: IsoDateTime.nullable(),
  lastSyncedAt: IsoDateTime,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type BankConnectionDto = z.infer<typeof BankConnectionDto>;

/** GET /bank-connections */
export const BankConnectionListResponse = z.array(BankConnectionDto);
export type BankConnectionListResponse = z.infer<typeof BankConnectionListResponse>;

/** GET /bank-connections/capability */
export const BankConnectionCapabilityResponse = z.strictObject({ enabled: z.boolean() });
export type BankConnectionCapabilityResponse = z.infer<typeof BankConnectionCapabilityResponse>;

/**
 * POST /bank-connections: either the token flow connected and synced, or the OAuth flow hands
 * back the provider's consent URL to redirect to.
 */
export const ConnectBankResponse = z.union([
  z.strictObject({ success: z.literal(true), connection: BankConnectionDto, message: z.string() }),
  z.strictObject({ success: z.literal(true), oauth: z.literal(true), redirectUrl: z.url() }),
]);
export type ConnectBankResponse = z.infer<typeof ConnectBankResponse>;

/**
 * POST /bank-connections/:id/refresh (and the /sync alias). A provider failure is still a 2xx with
 * `success: false` and a generic message; provider error text is never returned.
 */
export const SyncBankConnectionResponse = z.union([
  z.strictObject({ success: z.literal(true), connection: BankConnectionDto, message: z.string() }),
  z.strictObject({ success: z.literal(false), connection: BankConnectionDto, error: z.string() }),
]);
export type SyncBankConnectionResponse = z.infer<typeof SyncBankConnectionResponse>;

/** DELETE /bank-connections/:id */
export const DeleteBankConnectionResponse = z.strictObject({ success: z.literal(true) });
export type DeleteBankConnectionResponse = z.infer<typeof DeleteBankConnectionResponse>;
