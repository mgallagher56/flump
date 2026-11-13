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

/** GET /transactions (newest first; `?accountId=` narrows to one account). */
export const TransactionListResponse = z.array(TransactionDto);
export type TransactionListResponse = z.infer<typeof TransactionListResponse>;

/** POST /transactions */
export const CreateTransactionResponse = TransactionDto;
export type CreateTransactionResponse = z.infer<typeof CreateTransactionResponse>;

/** GET /transactions. `accountId` narrows to one of the caller's accounts. */
export const TransactionListQuery = z.object({ accountId: Uuid.optional() });
