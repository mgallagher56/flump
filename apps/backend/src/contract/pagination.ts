import { NEXT_CURSOR_HEADER, PAGE_LIMITS, type PageKind, pageQuery } from "@flump/api-contract";
import { BadRequestException } from "@nestjs/common";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";

/**
 * Keyset pagination for list routes (BE-09, audit M-API1). A page is the rows after the cursor in
 * a stable total order (the list's own order plus the primary key as tiebreak), fetched with one
 * extra row to learn whether another page follows. The cursor is opaque base64url JSON of the last
 * row's sort key and id, so a page never shifts when earlier rows are added or deleted. The body
 * stays a JSON array; the next cursor travels in the X-Next-Cursor header (docs/api/versioning.md).
 */

export interface PageRequest {
  limit: number;
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  /** The cursor of the next page, or null on the last page. */
  nextCursor: string | null;
}

/** How a key column is compared, cast and written into the cursor. */
type KeyKind = "timestamp" | "date" | "int" | "uuid";

export interface KeyColumn {
  /** The quoted SQL column, for example `"a"."created_at"`. Never user input. */
  column: string;
  kind: KeyKind;
}

export interface KeysetOrder {
  /** Sort key columns, most significant first; the last one must be unique (the primary key). */
  keys: readonly KeyColumn[];
  direction: "ASC" | "DESC";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A `timestamp` key at Postgres's full microsecond precision, as to_char(... .US) writes it. */
const ISO_US = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type KeyValue = string | number;

/** A 400 `validation_failed` naming the query field, like the contract interceptor's. */
const invalidQuery = (field: "limit" | "cursor" | "offset", message: string): BadRequestException =>
  new BadRequestException({
    code: "validation_failed",
    message: "Request failed validation",
    issues: [{ path: `query.${field}`, code: `invalid_${field}`, message }],
  });

/**
 * The page a list request asks for. The contract interceptor has already parsed the query in
 * enforce mode; it is parsed again here so the limit and cursor rules hold in shadow or off mode.
 */
export function resolvePage(query: unknown, kind: PageKind): PageRequest {
  const raw = (query ?? {}) as Record<string, unknown>;
  const picked = Object.fromEntries(
    Object.entries({ limit: raw.limit, cursor: raw.cursor }).filter(([, v]) => v !== undefined),
  );
  const parsed = pageQuery(kind).safeParse(picked);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0] === "cursor" ? "cursor" : "limit";
    throw invalidQuery(
      field,
      field === "cursor"
        ? "must be a cursor from the X-Next-Cursor header"
        : `must be a whole number from 1 to ${PAGE_LIMITS[kind].max}`,
    );
  }
  return {
    limit: parsed.data.limit ?? PAGE_LIMITS[kind].default,
    ...(parsed.data.cursor !== undefined ? { cursor: parsed.data.cursor } : {}),
  };
}

/**
 * The `offset` of a list that also pages by position (GET /transactions, BE-08): a whole number
 * from 0 to `max`, never combined with a cursor. Parsed here so the rule holds in shadow or off mode.
 */
export function resolveOffset(query: unknown, max: number): { offset?: number } {
  const raw = (query ?? {}) as Record<string, unknown>;
  if (raw.offset === undefined || raw.offset === "") return {};
  const n =
    typeof raw.offset === "number" || typeof raw.offset === "string" ? Number(raw.offset) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw invalidQuery("offset", `must be a whole number from 0 to ${max}`);
  }
  if (raw.cursor !== undefined) {
    throw invalidQuery("offset", "cannot be combined with cursor");
  }
  return n === 0 ? {} : { offset: n };
}

export function encodeCursor(values: readonly KeyValue[]): string {
  return Buffer.from(JSON.stringify(values), "utf8").toString("base64url");
}

const validKey = (kind: KeyKind, value: unknown): value is KeyValue => {
  switch (kind) {
    case "timestamp":
      return (
        typeof value === "string" &&
        ISO_US.test(value) &&
        !Number.isNaN(Date.parse(`${value.slice(0, 23)}Z`))
      );
    case "date":
      return typeof value === "string" && ISO_DATE.test(value);
    case "int":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "uuid":
      return typeof value === "string" && UUID.test(value);
  }
};

/** The key values inside `cursor`, checked against `keys`; a 400 when it is not one of ours. */
export function decodeCursor(cursor: string, keys: readonly KeyColumn[]): KeyValue[] {
  let values: unknown;
  try {
    values = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    values = null;
  }
  if (
    !Array.isArray(values) ||
    values.length !== keys.length ||
    !values.every((value, i) => validKey((keys[i] as KeyColumn).kind, value))
  ) {
    throw invalidQuery("cursor", "must be a cursor from the X-Next-Cursor header");
  }
  return values as KeyValue[];
}

const SQL_CAST: Record<KeyKind, string> = {
  timestamp: "timestamp",
  date: "date",
  int: "integer",
  uuid: "uuid",
};

/** The cursor value as SQL of the key's type; a timestamp is read back as a UTC instant. */
const keyParam = (kind: KeyKind, i: number): string =>
  kind === "timestamp"
    ? `(CAST(:__keyset${i} AS timestamp) AT TIME ZONE 'UTC')`
    : `CAST(:__keyset${i} AS ${SQL_CAST[kind]})`;

/** The key's value as text exactly as the cursor stores it, read from the row by Postgres. */
const keyText = ({ column, kind }: KeyColumn): string => {
  switch (kind) {
    case "timestamp":
      // Every timestamp column is timestamptz (BE-08): the cursor holds the instant in UTC.
      return `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')`;
    case "date":
      return `to_char(${column}, 'YYYY-MM-DD')`;
    case "int":
    case "uuid":
      return `${column}::text`;
  }
};

/**
 * Runs `qb` (already filtered to the caller's rows) as one keyset page: adds the cursor predicate
 * and the order, fetches `limit + 1` rows and returns the page with the next cursor. The cursor
 * keys are read back as text from Postgres at full (microsecond) precision, so no precision is lost
 * through JavaScript dates. Order and predicate use the raw columns, so the (user_id, key) indexes
 * serve them.
 */
export async function keysetPage<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  order: KeysetOrder,
  page: PageRequest,
): Promise<Page<T>> {
  const { keys, direction } = order;
  if (page.cursor !== undefined) {
    const values = decodeCursor(page.cursor, keys);
    const params = Object.fromEntries(values.map((value, i) => [`__keyset${i}`, value]));
    const left = keys.map((key) => key.column).join(", ");
    const right = keys.map((key, i) => keyParam(key.kind, i)).join(", ");
    qb.andWhere(`(${left}) ${direction === "ASC" ? ">" : "<"} (${right})`, params);
  }
  keys.forEach((key, i) => {
    qb.addSelect(keyText(key), `__keyset_${i}`);
    if (i === 0) qb.orderBy(key.column, direction);
    else qb.addOrderBy(key.column, direction);
  });
  qb.limit(page.limit + 1);
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.slice(0, page.limit);
  if (entities.length <= page.limit) return { items, nextCursor: null };
  const last = raw[page.limit - 1] as Record<string, unknown>;
  const values = keys.map((key, i) => {
    const text = String(last[`__keyset_${i}`]);
    return key.kind === "int" ? Number(text) : text;
  });
  return { items, nextCursor: encodeCursor(values) };
}

interface HeaderSink {
  setHeader(name: string, value: string): unknown;
}

/**
 * Sets X-Next-Cursor (when another page follows) and returns the page's rows, mapped. `res` is
 * absent when a unit test calls the handler directly.
 */
export function sendPage<T>(res: HeaderSink | undefined, page: Page<T>): T[];
export function sendPage<T, R>(
  res: HeaderSink | undefined,
  page: Page<T>,
  map: (item: T) => R,
): R[];
export function sendPage<T, R>(
  res: HeaderSink | undefined,
  page: Page<T>,
  map?: (item: T) => R,
): Array<T | R> {
  if (page.nextCursor) res?.setHeader(NEXT_CURSOR_HEADER, page.nextCursor);
  return map ? page.items.map(map) : [...page.items];
}
