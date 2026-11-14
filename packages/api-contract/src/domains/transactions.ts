import { z } from "zod";
import { PAGE_LIMITS, pageQueryShape } from "../pagination.js";
import { IsoDateTime, Money, ResponseMoney, Uuid } from "../primitives.js";

export const CreateTransactionRequest = z.strictObject({
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
  amount: ResponseMoney,
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

/**
 * Rows `GET /transactions` returns when no `limit` is sent, and the most it ever returns (BE-08).
 * PAGE_LIMITS.transactions holds the values, so the keyset paging (BE-09) and these names agree.
 */
export const DEFAULT_TRANSACTION_PAGE = PAGE_LIMITS.transactions.default;
export const MAX_TRANSACTION_PAGE = PAGE_LIMITS.transactions.max;
/** Deepest `offset` accepted, so a page can never ask Postgres to skip an unbounded number of rows. */
export const MAX_TRANSACTION_OFFSET = 100_000;

/**
 * GET /transactions, newest first. `accountId` narrows to one of the caller's accounts. `limit`
 * (default DEFAULT_TRANSACTION_PAGE, at most MAX_TRANSACTION_PAGE) sizes the page; the next page is
 * the `X-Next-Cursor` header's value sent back as `cursor` (BE-09). `offset` (BE-08) still skips
 * rows for clients that page by position; it cannot be combined with `cursor`. The response stays
 * a plain array.
 */
export const TransactionListQuery = z.strictObject({
  accountId: Uuid.optional(),
  ...pageQueryShape("transactions"),
  offset: z.coerce.number().int().min(0).max(MAX_TRANSACTION_OFFSET).optional(),
});

// Parsed request types (z.output: what a handler receives in enforce mode).
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequest>;
export type TransactionListQuery = z.infer<typeof TransactionListQuery>;
