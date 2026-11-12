import { z } from "zod";

/** Providers wired into the backend registry today (apps/backend/src/providers). */
export const INSTITUTION_IDS = ["monzo", "starling", "trading212"] as const;

export const ConnectBankRequest = z.object({
  institutionId: z.string().trim().min(1).max(64),
  token: z.string().min(1).max(512).optional(),
  code: z.string().min(1).max(2048).optional(),
});
