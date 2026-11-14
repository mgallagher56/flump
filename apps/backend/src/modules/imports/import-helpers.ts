import { BadRequestException, NotFoundException } from "@nestjs/common";
import { type EntityManager, In } from "typeorm";
import { Account } from "../../entities/account.entity";
import {
  type ImportBatch,
  ImportBatch as ImportBatchEntity,
  type StagedAccount,
  type StagedBalance,
} from "../../entities/import-batch.entity";
import { isRealDate, londonYearMonth } from "../snapshots/london-date";
import {
  checkSnapshotMonth,
  defaultAsOfDate,
  isValidSnapshotValue,
  UUID,
} from "../snapshots/snapshot-rules";
import { type SnapshotRowWrite } from "../snapshots/snapshot-write";
import { storedBalance } from "../snapshots/stored-balance";

/** E17 re-plan section 7 caps. */
import {
  ACCOUNT_TYPES,
  IDEMPOTENCY_KEY,
  ImportBatchView,
  ImportValidationError,
  MAX_IMPORT_ACCOUNTS,
  MAX_IMPORT_ROWS,
  REF,
  StageImportInput,
} from "./imports.types";

/** Parsing, classification and per-transaction queries behind ImportsService (E17). */
export const rowKey = (ref: string, month: string) => `${ref}:${month}`;
export const cellKey = (accountId: string, year: number, month: number) =>
  `${accountId}|${year}|${month}`;
export const NOT_FOUND = "Import not found";

export type ExistingCell = {
  value: number;
  asOfDate: string;
  source: string;
  importBatchId: string | null;
};
export type RefAccount = { id: string; type: string; connected: boolean };

/**
 * Checks the account map against the batch and the caller's accounts (same 404 as an unknown id
 * for an account that is not theirs). Each existing account can be mapped from one ref only.
 */
export async function resolveAccountMap(
  m: EntityManager,
  userId: string,
  batch: ImportBatch,
  accountMap: Map<string, string | null>,
): Promise<{ mappedIds: string[]; ownedById: Map<string, Account> }> {
  const refs = new Set(batch.payload.accounts.map((a) => a.ref));
  for (const ref of accountMap.keys()) {
    if (!refs.has(ref)) {
      throw new BadRequestException("accountMap names a ref not in the import");
    }
  }
  const mappedValues = [...accountMap.values()].filter((v): v is string => !!v);
  const mappedIds = [...new Set(mappedValues)];
  if (mappedIds.length !== mappedValues.length) {
    throw new BadRequestException("an account can be mapped from one ref only");
  }
  const owned = mappedIds.length
    ? await m.find(Account, {
        where: { id: In(mappedIds), userId },
        select: { id: true, type: true, balance: true, connectionId: true },
      })
    : [];
  if (owned.length !== mappedIds.length) throw new NotFoundException("Account not found");
  return { mappedIds, ownedById: new Map(owned.map((a) => [a.id, a])) };
}

/** Stored monthly values of the given (already ownership-checked) accounts, by cell key. */
export async function readExisting(
  m: EntityManager,
  accountIds: string[],
  lock: boolean,
): Promise<Map<string, ExistingCell>> {
  const existing = new Map<string, ExistingCell>();
  if (accountIds.length === 0) return existing;
  const rows: Array<{
    account_id: string;
    year: number;
    month: number;
    value: string;
    as_of_date: string;
    source: string;
    import_batch_id: string | null;
  }> = await m.query(
    `SELECT "account_id", "year", "month", "value"::text AS "value",
            to_char("as_of_date", 'YYYY-MM-DD') AS "as_of_date", "source", "import_batch_id"
     FROM "account_details" WHERE "account_id" = ANY($1::uuid[])${lock ? " FOR UPDATE" : ""}`,
    [accountIds],
  );
  for (const r of rows) {
    existing.set(cellKey(r.account_id, r.year, r.month), {
      value: Number(r.value),
      asOfDate: r.as_of_date,
      source: r.source,
      importBatchId: r.import_batch_id,
    });
  }
  return existing;
}

export type ClassifiedRow =
  | { status: "error" }
  | {
      status: "new" | "overwrite" | "unchanged";
      key: string;
      ref: string;
      month: string;
      prior: ExistingCell | null;
      /** True when writing needs the user's tick: a non-import value, or a synced current month. */
      needsTick: boolean;
      write: SnapshotRowWrite;
    };

/**
 * What each staged row would do against the stored values. The one classification shared by
 * preview and commit, so the review page shows exactly what commit does.
 */
export function classifyRows(
  balances: StagedBalance[],
  accountByRef: Map<string, RefAccount>,
  existing: Map<string, ExistingCell>,
  now: Date,
): ClassifiedRow[] {
  const current = londonYearMonth(now);
  return balances.map((b): ClassifiedRow => {
    const month = checkSnapshotMonth(b.month, now);
    const account = accountByRef.get(b.accountRef);
    if (!month.ok || !account) return { status: "error" };
    const { year, month: mm } = month.target;
    const value = storedBalance(account.type, b.value);
    const prior = existing.get(cellKey(account.id, year, mm)) ?? null;
    // A bank-connected account's current month belongs to sync unless the user ticks it.
    const connectedNow = account.connected && year === current.year && mm === current.month;
    const unchanged = !!prior && prior.value === value;
    return {
      status: unchanged ? "unchanged" : prior ? "overwrite" : "new",
      key: rowKey(b.accountRef, b.month),
      ref: b.accountRef,
      month: b.month,
      prior,
      needsTick: !unchanged && (connectedNow || (!!prior && prior.source !== "agent")),
      write: {
        accountId: account.id,
        year,
        month: mm,
        value,
        asOfDate: defaultAsOfDate(month.target, now),
      },
    };
  });
}

const normaliseName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** An existing account with the same name and type, when exactly one matches. */
export function suggestAccount(
  staged: StagedAccount,
  accounts: Array<Pick<Account, "id" | "name" | "type">>,
): string | null {
  const name = normaliseName(staged.name);
  const matches = accounts.filter(
    (a) => a.type === staged.type && normaliseName(a.name ?? "") === name,
  );
  const [only] = matches;
  return matches.length === 1 && only ? only.id : null;
}

/** Serialises every mutating import call of one user (stage, commit, revert). */
export async function lockUser(m: EntityManager, userId: string): Promise<void> {
  await m.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`imports:${userId}`]);
}

export function isExpired(batch: ImportBatch, now: Date): boolean {
  return batch.status === "staged" && batch.expiresAt.getTime() <= now.getTime();
}

/**
 * Lazy expiry (no scheduler in the app): staged batches past `expires_at` become `expired`, and
 * their staged names and values are dropped (counts and chunk keys stay).
 */
export async function expireStale(m: EntityManager, userId: string, now: Date): Promise<void> {
  await m.query(
    `UPDATE "import_batches"
     SET "status" = 'expired', "updated_at" = now(),
         "payload" = jsonb_set(jsonb_set("payload", '{accounts}', '[]'), '{balances}', '[]')
     WHERE "user_id" = $1 AND "status" = 'staged' AND "expires_at" <= $2`,
    [userId, now],
  );
}

export async function findOwned(
  m: EntityManager,
  userId: string,
  id: string,
  lock = false,
): Promise<ImportBatch | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  return m.findOne(ImportBatchEntity, {
    where: { id: id.toLowerCase(), userId },
    ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
  });
}

export function toView(
  batch: ImportBatch,
  validationErrors: ImportValidationError[] = [],
): ImportBatchView {
  const c = batch.counts;
  return {
    batchId: batch.id,
    status: batch.status,
    counts: {
      staged: c.staged,
      new: c.new,
      overwrite: c.overwrite,
      unchanged: c.unchanged,
      skipped: c.skipped,
      errors: c.errors,
    },
    rows: c.rows,
    validationErrors,
    skippedManual: batch.revertData?.skippedManual ?? [],
    revert: batch.revertData?.result ?? null,
    createdAt: batch.createdAt.toISOString(),
    expiresAt: batch.expiresAt.toISOString(),
    committedAt: batch.committedAt?.toISOString() ?? null,
    revertedAt: batch.revertedAt?.toISOString() ?? null,
  };
}

const twoDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

/** Account details, checked against the column ranges so a commit can never fail on them. */
function parseDetails(d: unknown): StagedAccount["details"] | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== "object" || Array.isArray(d)) {
    throw new BadRequestException("account details must be an object");
  }
  const raw = d as Record<string, unknown>;
  const out: NonNullable<StagedAccount["details"]> = {};
  if (raw.interestRate !== undefined) {
    const v = raw.interestRate;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100 || !twoDecimals(v)) {
      throw new BadRequestException("interestRate must be 0 to 100 with at most 2 decimals");
    }
    out.interestRate = v;
  }
  if (raw.monthlyContribution !== undefined) {
    const v = raw.monthlyContribution;
    if (!isValidSnapshotValue(v) || v < 0) {
      throw new BadRequestException("monthlyContribution must be a non-negative amount");
    }
    out.monthlyContribution = v;
  }
  if (raw.termMonths !== undefined) {
    const v = raw.termMonths;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 600) {
      throw new BadRequestException("termMonths must be a whole number from 1 to 600");
    }
    out.termMonths = v;
  }
  if (raw.fixedRateEndDate !== undefined) {
    const v = raw.fixedRateEndDate;
    if (typeof v !== "string" || !isRealDate(v)) {
      throw new BadRequestException("fixedRateEndDate must be a valid YYYY-MM-DD date");
    }
    out.fixedRateEndDate = v;
  }
  const extra = Object.keys(raw).filter(
    (k) => !["interestRate", "monthlyContribution", "termMonths", "fixedRateEndDate"].includes(k),
  );
  if (extra.length > 0) throw new BadRequestException("account details has unknown fields");
  return out;
}

/** Re-validates the request shape (the contract may run in shadow mode). */
export function parseStageInput(input: StageImportInput): {
  key: string;
  accounts: StagedAccount[];
  balances: StagedBalance[];
} {
  const key = input?.idempotencyKey;
  if (typeof key !== "string" || !IDEMPOTENCY_KEY.test(key)) {
    throw new BadRequestException("idempotencyKey must be 8-128 of A-Z a-z 0-9 _ . : -");
  }
  if (
    input.batchId !== undefined &&
    (typeof input.batchId !== "string" || !UUID.test(input.batchId))
  ) {
    throw new NotFoundException(NOT_FOUND);
  }
  if (!Array.isArray(input.accounts) || !Array.isArray(input.balances)) {
    throw new BadRequestException("accounts and balances must be arrays");
  }
  if (input.accounts.length > MAX_IMPORT_ACCOUNTS) {
    throw new BadRequestException(`At most ${MAX_IMPORT_ACCOUNTS} accounts per import`);
  }
  if (input.accounts.length + input.balances.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows per import`);
  }
  const accounts = input.accounts.map((a): StagedAccount => {
    if (!a || typeof a.ref !== "string" || !REF.test(a.ref)) {
      throw new BadRequestException("each account needs a valid ref");
    }
    const name = typeof a.name === "string" ? a.name.trim() : "";
    if (name.length < 1 || name.length > 120) {
      throw new BadRequestException("account name must be 1-120 characters");
    }
    if (!ACCOUNT_TYPES.has(a.type)) throw new BadRequestException("account type is not recognised");
    const details = parseDetails(a.details);
    return { ref: a.ref, name, type: a.type, ...(details ? { details } : {}) };
  });
  const balances = input.balances.map((b): StagedBalance => {
    if (!b || typeof b.accountRef !== "string" || !REF.test(b.accountRef)) {
      throw new BadRequestException("each balance needs a valid accountRef");
    }
    return { accountRef: b.accountRef, month: String(b.month), value: b.value };
  });
  return { key, accounts, balances };
}

export function parseAccountMap(raw: unknown): Map<string, string | null> {
  const map = new Map<string, string | null>();
  if (raw === undefined || raw === null) return map;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestException("accountMap must be an object");
  }
  for (const [ref, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!REF.test(ref)) throw new BadRequestException("accountMap has an invalid ref");
    if (value === null) map.set(ref, null);
    else if (typeof value === "string" && UUID.test(value)) map.set(ref, value.toLowerCase());
    else throw new BadRequestException("accountMap values must be an account id or null");
  }
  return map;
}

export function parseOverwrite(raw: unknown): Set<string> {
  if (raw === undefined || raw === null) return new Set();
  if (!Array.isArray(raw) || raw.some((k) => typeof k !== "string")) {
    throw new BadRequestException("overwriteManual must be an array of row keys");
  }
  return new Set(raw as string[]);
}
