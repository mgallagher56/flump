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
