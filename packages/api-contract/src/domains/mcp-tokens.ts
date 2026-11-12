import { z } from "zod";

/** Expiry choices (E17 D5-A). `null` ("never expires") is rejected. */
export const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;

export const CreateMcpTokenRequest = z.object({
  name: z.string().trim().min(1).max(64),
  expiryDays: z
    .number()
    .refine((v) => (PAT_EXPIRY_DAYS as readonly number[]).includes(v), "must be 7, 30, 90 or 365")
    .optional(),
  anonymizeInstitutions: z.boolean().optional(),
});
