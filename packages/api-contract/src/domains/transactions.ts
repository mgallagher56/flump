import { z } from "zod";
import { IsoDateTime, Money, Uuid } from "../primitives.js";

export const CreateTransactionRequest = z.object({
  accountId: Uuid,
  /** Signed: negative is money out. */
  amount: Money,
  description: z.string().min(1).max(255),
  category: z.string().min(1).max(64),
  timestamp: IsoDateTime.optional(),
});

export const TransactionDto = z.strictObject({
  id: Uuid,
  accountId: Uuid,
  /** The caller's own user id. */
  userId: z.string().min(1),
  /** Signed: negative is money out. */
  amount: z.number().finite(),
  description: z.string(),
  category: z.string(),
  timestamp: IsoDateTime,
});
export type TransactionDto = z.infer<typeof TransactionDto>;

/** GET /transactions (newest first, at most `limit` rows; `?accountId=` narrows to one account). */
export const TransactionListResponse = z.array(TransactionDto);
export type TransactionListResponse = z.infer<typeof TransactionListResponse>;

/** POST /transactions */
export const CreateTransactionResponse = TransactionDto;
export type CreateTransactionResponse = z.infer<typeof CreateTransactionResponse>;

/** Rows `GET /transactions` returns when no `limit` is sent, and the most it ever returns. */
export const DEFAULT_TRANSACTION_PAGE = 500;
export const MAX_TRANSACTION_PAGE = 1000;
/** Deepest `offset` accepted, so a page can never ask Postgres to skip an unbounded number of rows. */
export const MAX_TRANSACTION_OFFSET = 100_000;

/**
 * GET /transactions. `accountId` narrows to one of the caller's accounts; `limit` (default
 * DEFAULT_TRANSACTION_PAGE, at most MAX_TRANSACTION_PAGE) and `offset` page through the list,
 * newest first. The response stays a plain array.
 */
export const TransactionListQuery = z.object({
  accountId: Uuid.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_TRANSACTION_PAGE).optional(),
  offset: z.coerce.number().int().min(0).max(MAX_TRANSACTION_OFFSET).optional(),
});
