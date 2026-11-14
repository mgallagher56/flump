import { z } from "zod";

/**
 * Request and response headers of the v1 write conventions (BE-09, audit M7, L15). See
 * docs/api/versioning.md.
 */

/** Optional on create POSTs (see `isIdempotentRoute`): a retry with the same key replays. */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
/** `true` on a response replayed from a stored idempotent result. */
export const IDEMPOTENT_REPLAYED_HEADER = "Idempotent-Replayed";
/** Optional on update routes (see `isConditionalRoute`): the ETag the client last saw. */
export const IF_MATCH_HEADER = "If-Match";
/** The resource version, `"<updatedAt ISO string>"`, on GET-one and update responses. */
export const ETAG_HEADER = "ETag";

/** How long a stored idempotent result is replayed. Older keys are treated as unused. */
export const IDEMPOTENCY_KEY_TTL_HOURS = 24;

/** 1 to 255 printable ASCII characters. */
export const IdempotencyKey = z
  .string()
  .regex(/^[\x20-\x7E]{1,255}$/, "must be 1 to 255 printable ASCII characters");

/** A strong ETag: an ISO date-time in double quotes, for example `"2026-11-14T09:30:00.000Z"`. */
export const ResourceEtag = z
  .string()
  .regex(/^"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"$/, "must be an ETag from this API");

/** The ETag of a resource last changed at `updatedAt`. */
export const etagFor = (updatedAt: Date | string): string =>
  `"${(updatedAt instanceof Date ? updatedAt : new Date(updatedAt)).toISOString()}"`;

/**
 * The `updatedAt` an `If-Match` value names, or null when it is not one of this API's ETags.
 * A weak prefix (`W/`) is accepted and ignored; `*` and lists are not supported.
 */
export const parseEtag = (value: string): Date | null => {
  const raw = value.trim().replace(/^W\//, "");
  if (!ResourceEtag.safeParse(raw).success) return null;
  const date = new Date(raw.slice(1, -1));
  return Number.isNaN(date.getTime()) ? null : date;
};
