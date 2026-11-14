import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, type EntityManager, In } from "typeorm";
import { Account } from "../entities/account.entity";
import {
  type ImportBatch,
  ImportBatch as ImportBatchEntity,
  type ImportCounts,
  type ImportPayload,
  type RevertData,
  type RevertRow,
  type StagedAccount,
  type StagedBalance,
} from "../entities/import-batch.entity";
import { londonYearMonth } from "../snapshots/london-date";
import {
  checkSnapshotMonth,
  defaultAsOfDate,
  isValidSnapshotValue,
  UUID,
} from "../snapshots/snapshot-rules";
import { type SnapshotRowWrite, writeSnapshotRows } from "../snapshots/snapshot-write";
import { storedBalance } from "../snapshots/stored-balance";

/** E17 re-plan section 7 caps. */
export const MAX_IMPORT_ROWS = 5000;
export const MAX_OPEN_BATCHES = 3;
export const IMPORT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ERRORS_LISTED = 100;

const ACCOUNT_TYPES = new Set([
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
  "Property",
  "Student Loan",
  "Overdraft",
]);
const REF = /^[A-Za-z0-9_.-]{1,64}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_.:-]{8,128}$/;

export type ImportValidationCode =
  | "future_month"
  | "too_early"
  | "bad_month"
  | "bad_value"
  | "unknown_account_ref";

export interface ImportValidationError {
  ref: string;
  month?: string;
  code: ImportValidationCode;
}

export interface StageImportInput {
  batchId?: string;
  idempotencyKey: string;
  accounts: StagedAccount[];
  balances: StagedBalance[];
}

export interface CommitImportInput {
  accountMap?: Record<string, string | null>;
  overwriteManual?: string[];
}

/** The one response shape of every import route: refs, row keys and counts, never names. */
export interface ImportBatchView {
  batchId: string;
  status: ImportBatch["status"];
  counts: ImportCounts;
  rows: number;
  validationErrors: ImportValidationError[];
  skippedManual: string[];
  revert: { restored: number; removed: number; kept: number } | null;
  createdAt: string;
  expiresAt: string;
  committedAt: string | null;
  revertedAt: string | null;
}

const rowKey = (ref: string, month: string) => `${ref}:${month}`;
const NOT_FOUND = "Import not found";

/**
 * The import primitive (E17 re-plan sections 6 and 7; DECISIONS round 9): stage, commit, revert.
 * Staging validates with the E30 snapshot rules and stores the batch without touching live data.
 * Commit and revert run under a web session only, each in one transaction, and reuse the E30
 * upsert. Another user's batch is always the same 404 as a missing one.
 */
@Injectable()
export class ImportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async stage(
    userId: string,
    input: StageImportInput,
    now: Date = new Date(),
  ): Promise<ImportBatchView> {
    const { key, accounts, balances } = parseStageInput(input);

    return this.dataSource.transaction(async (m) => {
      // One stage at a time per user, so the open-batch and row caps cannot be raced.
      await m.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`imports:${userId}`]);
      await expireStale(m, userId, now);

      const replayed: Array<{ id: string }> = await m.query(
        `SELECT "id" FROM "import_batches"
         WHERE "user_id" = $1
           AND ("idempotency_key" = $2 OR "payload"->'chunkKeys' @> jsonb_build_array($2::text))
         LIMIT 1`,
        [userId, key],
      );
      if (replayed.length > 0) {
        const batch = await m.findOneByOrFail(ImportBatchEntity, { id: replayed[0].id });
        return toView(batch);
      }

      let batch: ImportBatch | null = null;
      if (input.batchId !== undefined) {
        batch = await findOwned(m, userId, input.batchId);
        if (!batch) throw new NotFoundException(NOT_FOUND);
        if (batch.status !== "staged") throw new ConflictException("Import is not open");
      } else {
        const open = await m.count(ImportBatchEntity, { where: { userId, status: "staged" } });
        if (open >= MAX_OPEN_BATCHES) {
          throw new ConflictException(`At most ${MAX_OPEN_BATCHES} open imports`);
        }
      }

      const accountByRef = new Map((batch?.payload.accounts ?? []).map((a) => [a.ref, a]));
      for (const a of accounts) accountByRef.set(a.ref, a);
      const balanceByKey = new Map(
        (batch?.payload.balances ?? []).map((b) => [rowKey(b.accountRef, b.month), b]),
      );
      const errors: ImportValidationError[] = [];
      for (const b of balances) {
        if (!accountByRef.has(b.accountRef)) {
          errors.push({ ref: b.accountRef, month: b.month, code: "unknown_account_ref" });
          continue;
        }
        const month = checkSnapshotMonth(b.month, now);
        if (!month.ok) {
          errors.push({
            ref: b.accountRef,
            ...(month.code === "bad_month" ? {} : { month: b.month }),
            code: month.code,
          });
          continue;
        }
        if (!isValidSnapshotValue(b.value)) {
          errors.push({ ref: b.accountRef, month: b.month, code: "bad_value" });
          continue;
        }
        // Latest write wins inside a batch, as on the live table.
        balanceByKey.set(rowKey(b.accountRef, b.month), {
          accountRef: b.accountRef,
          month: b.month,
          value: b.value,
        });
      }
      const rows = accountByRef.size + balanceByKey.size;
      if (rows > MAX_IMPORT_ROWS) {
        throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows per import`);
      }

      const payload: ImportPayload = {
        accounts: [...accountByRef.values()],
        balances: [...balanceByKey.values()],
        chunkKeys: batch ? [...batch.payload.chunkKeys, key] : [],
      };
      // Nothing is mapped to an existing account until review, so every staged row is new.
      const counts: ImportCounts = {
        new: balanceByKey.size,
        overwrite: 0,
        unchanged: 0,
        errors: (batch?.counts.errors ?? 0) + errors.length,
      };
      let saved: ImportBatch;
      if (batch) {
        batch.payload = payload;
        batch.counts = counts;
        saved = await m.save(batch);
      } else {
        saved = await m.save(
          m.create(ImportBatchEntity, {
            userId,
            status: "staged",
            idempotencyKey: key,
            payload,
            counts,
            revertData: null,
            committedAt: null,
            revertedAt: null,
            expiresAt: new Date(now.getTime() + IMPORT_EXPIRY_MS),
          }),
        );
      }
      return toView(saved, errors.slice(0, MAX_ERRORS_LISTED));
    });
  }

  async get(userId: string, id: string, now: Date = new Date()): Promise<ImportBatchView> {
    const batch = await findOwned(this.dataSource.manager, userId, id);
    if (!batch) throw new NotFoundException(NOT_FOUND);
    if (isExpired(batch, now)) {
      await expireStale(this.dataSource.manager, userId, now);
      batch.status = "expired";
    }
    return toView(batch);
  }

  async commit(
    userId: string,
    id: string,
    input: CommitImportInput = {},
    now: Date = new Date(),
  ): Promise<ImportBatchView> {
    const accountMap = parseAccountMap(input?.accountMap);
    const overwrite = parseOverwrite(input?.overwriteManual);

    const result = await this.dataSource.transaction(async (m) => {
      const batch = await findOwned(m, userId, id, true);
      if (!batch) throw new NotFoundException(NOT_FOUND);
      if (isExpired(batch, now)) return { expired: true as const };
      if (batch.status !== "staged") throw new ConflictException("Import is not open");

      const refs = new Set(batch.payload.accounts.map((a) => a.ref));
      for (const ref of accountMap.keys()) {
        if (!refs.has(ref))
          throw new BadRequestException("accountMap names a ref not in the import");
      }

      // Ownership of every mapped account, inside the transaction (same 404 as an unknown id).
      const mappedIds = [...new Set([...accountMap.values()].filter((v): v is string => !!v))];
      if (mappedIds.length !== [...accountMap.values()].filter(Boolean).length) {
        throw new BadRequestException("an account can be mapped from one ref only");
      }
      const owned = mappedIds.length
        ? await m.find(Account, {
            where: { id: In(mappedIds), userId },
            select: { id: true, type: true, balance: true },
          })
        : [];
      if (owned.length !== mappedIds.length) throw new NotFoundException("Account not found");
      const ownedById = new Map(owned.map((a) => [a.id, a]));

      const latestByRef = new Map<string, StagedBalance>();
      for (const b of batch.payload.balances) {
        const prev = latestByRef.get(b.accountRef);
        if (!prev || b.month > prev.month) latestByRef.set(b.accountRef, b);
      }

      const accountByRef = new Map<string, { id: string; type: string }>();
      const createdAccountIds: string[] = [];
      for (const staged of batch.payload.accounts) {
        const mapped = accountMap.get(staged.ref);
        if (mapped) {
          const a = ownedById.get(mapped) as Account;
          accountByRef.set(staged.ref, { id: a.id, type: a.type });
          continue;
        }
        const latest = latestByRef.get(staged.ref);
        const created = await m.save(
          m.create(Account, {
            userId,
            name: staged.name,
            type: staged.type as Account["type"],
            balance: latest ? storedBalance(staged.type, latest.value) : 0,
            currency: "GBP",
            isCurrent: true,
            interestRate: staged.details?.interestRate ?? null,
            monthlyContribution: staged.details?.monthlyContribution ?? null,
            termMonths: staged.details?.termMonths ?? null,
            fixedRateEndDate: staged.details?.fixedRateEndDate ?? null,
          }),
        );
        createdAccountIds.push(created.id);
        accountByRef.set(staged.ref, { id: created.id, type: created.type });
      }

      // Existing values for the mapped accounts, locked for the rest of the transaction.
      const existing = new Map<
        string,
        { value: number; asOfDate: string; source: string; importBatchId: string | null }
      >();
      if (mappedIds.length > 0) {
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
           FROM "account_details" WHERE "account_id" = ANY($1::varchar[]) FOR UPDATE`,
          [mappedIds],
        );
        for (const r of rows) {
          existing.set(`${r.account_id}|${r.year}|${r.month}`, {
            value: Number(r.value),
            asOfDate: r.as_of_date,
            source: r.source,
            importBatchId: r.import_batch_id,
          });
        }
      }

      const current = londonYearMonth(now);
      const counts: ImportCounts = {
        new: 0,
        overwrite: 0,
        unchanged: 0,
        errors: batch.counts.errors,
      };
      const writes: SnapshotRowWrite[] = [];
      const revertRows: RevertRow[] = [];
      const skippedManual: string[] = [];
      for (const b of batch.payload.balances) {
        const month = checkSnapshotMonth(b.month, now);
        const account = accountByRef.get(b.accountRef);
        if (!month.ok || !account) {
          counts.errors++;
          continue;
        }
        const { year, month: mm } = month.target;
        const value = storedBalance(account.type, b.value);
        const prior = existing.get(`${account.id}|${year}|${mm}`) ?? null;
        if (prior && prior.value === value) {
          counts.unchanged++;
          continue;
        }
        if (prior && prior.source !== "agent" && !overwrite.has(rowKey(b.accountRef, b.month))) {
          skippedManual.push(rowKey(b.accountRef, b.month));
          continue;
        }
        if (prior) counts.overwrite++;
        else counts.new++;
        writes.push({
          accountId: account.id,
          year,
          month: mm,
          value,
          asOfDate: defaultAsOfDate(month.target, now),
        });
        revertRows.push({ accountId: account.id, year, month: mm, written: value, prior });
      }

      // Current-month writes move a mapped account's balance; keep the old one for revert.
      const balances: RevertData["balances"] = [];
      for (const w of writes) {
        const a = ownedById.get(w.accountId);
        if (a && w.year === current.year && w.month === current.month) {
          balances.push({ accountId: a.id, prior: Number(a.balance), written: w.value });
        }
      }

      await writeSnapshotRows(m, userId, writes, {
        source: "agent",
        importBatchId: batch.id,
        current,
      });

      batch.status = "committed";
      batch.committedAt = now;
      batch.counts = counts;
      batch.revertData = { rows: revertRows, createdAccountIds, balances, skippedManual };
      return { batch: await m.save(batch) };
    });

    if ("expired" in result) {
      await expireStale(this.dataSource.manager, userId, now);
      throw new ConflictException("Import has expired");
    }
    return toView(result.batch);
  }

  /**
   * Batch-level undo. Only rows still owned by the batch (stamped with it, source `agent` and
   * the value it wrote) are touched: a row with a prior value gets it back, a row the batch
   * created is removed. Accounts the batch created are removed when nothing else refers to them.
   */
  async revert(userId: string, id: string): Promise<ImportBatchView> {
    return this.dataSource.transaction(async (m) => {
      const batch = await findOwned(m, userId, id, true);
      if (!batch) throw new NotFoundException(NOT_FOUND);
      if (batch.status !== "committed" || !batch.revertData) {
        throw new ConflictException("Only a committed import can be reverted");
      }
      const data = batch.revertData;

      const stamped: Array<{
        id: number;
        account_id: string;
        year: number;
        month: number;
        value: string;
      }> = await m.query(
        `SELECT "id", "account_id", "year", "month", "value"::text AS "value"
           FROM "account_details"
           WHERE "import_batch_id" = $1 AND "source" = 'agent' AND "user_id" = $2
           ORDER BY "account_id", "year", "month" FOR UPDATE`,
        [batch.id, userId],
      );
      const stampedByKey = new Map(stamped.map((r) => [`${r.account_id}|${r.year}|${r.month}`, r]));

      let restored = 0;
      const removeIds: number[] = [];
      for (const r of data.rows) {
        const cur = stampedByKey.get(`${r.accountId}|${r.year}|${r.month}`);
        if (!cur || Number(cur.value) !== r.written) continue;
        if (r.prior === null) {
          removeIds.push(cur.id);
          continue;
        }
        await m.query(
          `UPDATE "account_details"
           SET "value" = $2, "as_of_date" = $3, "source" = $4, "import_batch_id" = $5,
               "updated_at" = now()
           WHERE "id" = $1`,
          [cur.id, r.prior.value, r.prior.asOfDate, r.prior.source, r.prior.importBatchId],
        );
        restored++;
      }
      if (removeIds.length > 0) {
        await m.query(`DELETE FROM "account_details" WHERE "id" = ANY($1::int[])`, [removeIds]);
      }
      for (const b of data.balances) {
        await m.query(
          `UPDATE "accounts" SET "balance" = $3 WHERE "id" = $1 AND "user_id" = $2 AND "balance" = $4`,
          [b.accountId, userId, b.prior, b.written],
        );
      }
      if (data.createdAccountIds.length > 0) {
        await m.query(
          `DELETE FROM "accounts" a
           WHERE a."id" = ANY($1::uuid[]) AND a."user_id" = $2 AND a."connection_id" IS NULL
             AND NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id" = a."id"::text)
             AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."account_id" = a."id"::text)`,
          [data.createdAccountIds, userId],
        );
      }

      const removed = removeIds.length;
      batch.status = "reverted";
      batch.revertedAt = new Date();
      batch.revertData = {
        ...data,
        result: { restored, removed, kept: data.rows.length - restored - removed },
      };
      return toView(await m.save(batch));
    });
  }
}

function isExpired(batch: ImportBatch, now: Date): boolean {
  return batch.status === "staged" && batch.expiresAt.getTime() <= now.getTime();
}

/** Lazy expiry (no scheduler in the app): staged batches past `expires_at` become `expired`. */
async function expireStale(m: EntityManager, userId: string, now: Date): Promise<void> {
  await m.query(
    `UPDATE "import_batches" SET "status" = 'expired', "updated_at" = now()
     WHERE "user_id" = $1 AND "status" = 'staged' AND "expires_at" <= $2`,
    [userId, now],
  );
}

async function findOwned(
  m: EntityManager,
  userId: string,
  id: string,
  lock = false,
): Promise<ImportBatch | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  return m.findOne(ImportBatchEntity, {
    where: { id, userId },
    ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
  });
}

function toView(
  batch: ImportBatch,
  validationErrors: ImportValidationError[] = [],
): ImportBatchView {
  return {
    batchId: batch.id,
    status: batch.status,
    counts: {
      new: batch.counts.new,
      overwrite: batch.counts.overwrite,
      unchanged: batch.counts.unchanged,
      errors: batch.counts.errors,
    },
    rows: batch.payload.accounts.length + batch.payload.balances.length,
    validationErrors,
    skippedManual: batch.revertData?.skippedManual ?? [],
    revert: batch.revertData?.result ?? null,
    createdAt: batch.createdAt.toISOString(),
    expiresAt: batch.expiresAt.toISOString(),
    committedAt: batch.committedAt?.toISOString() ?? null,
    revertedAt: batch.revertedAt?.toISOString() ?? null,
  };
}

/** Re-validates the request shape (the contract may run in shadow mode). */
function parseStageInput(input: StageImportInput): {
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
  if (input.accounts.length + input.balances.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows per import`);
  }
  const accounts = input.accounts.map((a): StagedAccount => {
    const name = typeof a?.name === "string" ? a.name.trim() : "";
    if (!a || typeof a.ref !== "string" || !REF.test(a.ref)) {
      throw new BadRequestException("each account needs a valid ref");
    }
    if (name.length < 1 || name.length > 120)
      throw new BadRequestException("account name must be 1-120 characters");
    if (!ACCOUNT_TYPES.has(a.type)) throw new BadRequestException("account type is not recognised");
    const d = a.details;
    return {
      ref: a.ref,
      name,
      type: a.type,
      ...(d
        ? {
            details: {
              ...(typeof d.interestRate === "number" ? { interestRate: d.interestRate } : {}),
              ...(typeof d.monthlyContribution === "number"
                ? { monthlyContribution: d.monthlyContribution }
                : {}),
              ...(Number.isInteger(d.termMonths) ? { termMonths: d.termMonths } : {}),
              ...(typeof d.fixedRateEndDate === "string"
                ? { fixedRateEndDate: d.fixedRateEndDate }
                : {}),
            },
          }
        : {}),
    };
  });
  const balances = input.balances.map((b): StagedBalance => {
    if (!b || typeof b.accountRef !== "string" || !REF.test(b.accountRef)) {
      throw new BadRequestException("each balance needs a valid accountRef");
    }
    return { accountRef: b.accountRef, month: String(b.month), value: b.value };
  });
  return { key, accounts, balances };
}

function parseAccountMap(raw: unknown): Map<string, string | null> {
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

function parseOverwrite(raw: unknown): Set<string> {
  if (raw === undefined || raw === null) return new Set();
  if (!Array.isArray(raw) || raw.some((k) => typeof k !== "string")) {
    throw new BadRequestException("overwriteManual must be an array of row keys");
  }
  return new Set(raw as string[]);
}
