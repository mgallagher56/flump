import { z } from "zod";

// --- Responses (E21) ---
// GET / returns the plain-text string "Flump API is running." (not JSON), so it has no schema.

/** GET /health (liveness). */
export const HealthResponse = z.strictObject({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

/**
 * GET /health/ready. 200 carries the version and short commit. The 503 body is JSON too
 * (`{ status: "unavailable" }` and nothing else, so no connection detail leaks) and the shadow
 * interceptor sees it, so the schema covers both.
 */
export const ReadinessResponse = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("ok"),
    version: z.string().min(1),
    /** First 7 characters of the deploy SHA, or "unknown". */
    commit: z.string().min(1).max(7),
  }),
  z.strictObject({ status: z.literal("unavailable") }),
]);
export type ReadinessResponse = z.infer<typeof ReadinessResponse>;
