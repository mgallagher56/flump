import { z } from "zod";

/**
 * Page sizes for every paginated list (BE-09, audit M-API1), in one place. `default` is used when
 * a request names no `limit`; `max` is the most one page returns. The small per-user lists default
 * to their maximum, so a client that does not page yet still gets every row a real user has.
 *
 * The web client ignores X-Next-Cursor until BE-10 makes it follow the cursor, so the lists it
 * reads whole are sized for a long-lived account: `accountDetails` (monthly values of every
 * account, e.g. 10 accounts over 40 years is 4,800 rows) and `tax` (records and receipts over
 * many tax years) are raised but stay bounded.
 */
export const PAGE_LIMITS = {
  accounts: { default: 500, max: 500 },
  accountDetails: { default: 5000, max: 5000 },
  bankConnections: { default: 500, max: 500 },
  budget: { default: 500, max: 500 },
  tax: { default: 2000, max: 2000 },
  mcpTokens: { default: 500, max: 500 },
  imports: { default: 500, max: 500 },
  // BE-08 bounded GET /transactions at these sizes (DEFAULT_TRANSACTION_PAGE, MAX_TRANSACTION_PAGE).
  transactions: { default: 500, max: 1000 },
  activity: { default: 100, max: 500 },
} as const;
export type PageKind = keyof typeof PAGE_LIMITS;

/**
 * The response header that carries the next page's cursor. Absent on the last page. The body of a
 * paginated list stays a JSON array (v1 changes are additive only; see docs/api/versioning.md).
 */
export const NEXT_CURSOR_HEADER = "X-Next-Cursor";

/**
 * An opaque page cursor: base64url, built by the server from the last row's sort key and id.
 * Clients pass back the `X-Next-Cursor` value unchanged and never build or parse one.
 */
export const PageCursor = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,512}$/, "must be a cursor from the X-Next-Cursor header");

/** The `limit` and `cursor` query fields of a list route of `kind`. */
export const pageQueryShape = (kind: PageKind) => ({
  /** Rows per page, 1 to the kind's maximum (see PAGE_LIMITS). */
  limit: z.coerce.number().int().min(1).max(PAGE_LIMITS[kind].max).optional(),
  /** The previous page's `X-Next-Cursor` header. */
  cursor: PageCursor.optional(),
});

/** The query schema of a list route that takes only paging fields. */
export const pageQuery = (kind: PageKind) => z.strictObject(pageQueryShape(kind));
