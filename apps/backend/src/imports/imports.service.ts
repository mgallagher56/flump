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
import { isRealDate, londonYearMonth } from "../snapshots/london-date";
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
export const MAX_IMPORT_ACCOUNTS = 200;
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
  counts: Omit<ImportCounts, "rows">;
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
const cellKey = (accountId: string, year: number, month: number) => `${accountId}|${year}|${month}`;
const NOT_FOUND = "Import not found";

/**
 * The import primitive (E17 re-plan sections 6 and 7; DECISIONS round 9): stage, commit, revert.
 * Staging validates with the E30 snapshot rules and stores the batch without touching live data.
 * Commit and revert run under a web session only, each in one transaction, and reuse the E30
 * upsert. Every mutating call holds the per-user import lock, so stage, commit and revert of one
 * user never interleave. Another user's batch is always the same 404 as a missing one.
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
      await lockUser(m, userId);
      await expireStale(m, userId, now);

      const replayed: Array<{ id: string }> = await m.query(
        `SELECT "id" FROM "import_batches"
         WHERE "user_id" = $1
           AND ("idempotency_key" = $2 OR "payload"->'chunkKeys' @> jsonb_build_array($2::text))
         LIMIT 1`,
        [userId, key],
      );
      if (replayed.length > 0) {
        // A key names one stage call. Reusing it with a different batchId is a client bug.
        if (input.batchId !== undefined && input.batchId.toLowerCase() !== replayed[0].id) {
          throw new ConflictException("idempotencyKey belongs to another import");
        }
        const batch = await m.findOneByOrFail(ImportBatchEntity, { id: replayed[0].id });
        return toView(batch, (batch.validationErrors[key] ?? []) as ImportValidationError[]);
      }

      let batch: ImportBatch | null = null;
      if (input.batchId !== undefined) {
        batch = await findOwned(m, userId, input.batchId, true);
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
      if (accountByRef.size > MAX_IMPORT_ACCOUNTS) {
        throw new BadRequestException(`At most ${MAX_IMPORT_ACCOUNTS} accounts per import`);
      }
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
      // Nothing is mapped to an existing account until review, so new, overwrite, unchanged and
      // skipped are unknown (null) until commit.
      const counts: ImportCounts = {
        rows,
        staged: balanceByKey.size,
        new: null,
        overwrite: null,
        unchanged: null,
        skipped: null,
        errors: (batch?.counts.errors ?? 0) + errors.length,
      };
      const listed = errors.slice(0, MAX_ERRORS_LISTED);
      let saved: ImportBatch;
      if (batch) {
        batch.payload = payload;
        batch.counts = counts;
        batch.validationErrors = { ...batch.validationErrors, [key]: listed };
        saved = await m.save(batch);
      } else {
        saved = await m.save(
          m.create(ImportBatchEntity, {
            userId,
            status: "staged",
            idempotencyKey: key,
            payload,
            counts,
            validationErrors: { [key]: listed },
            revertData: null,
            committedAt: null,
            revertedAt: null,
            expiresAt: new Date(now.getTime() + IMPORT_EXPIRY_MS),
          }),
        );
      }
      return toView(saved, listed);
    });
  }

  async get(userId: string, id: string, now: Date = new Date()): Promise<ImportBatchView> {
    let batch = await findOwned(this.dataSource.manager, userId, id);
    if (!batch) throw new NotFoundException(NOT_FOUND);
    if (isExpired(batch, now)) {
      await expireStale(this.dataSource.manager, userId, now);
      batch = (await findOwned(this.dataSource.manager, userId, id)) as ImportBatch;
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
    const ticked = parseOverwrite(input?.overwriteManual);

    const result = await this.dataSource.transaction(async (m) => {
      await lockUser(m, userId);
      const batch = await findOwned(m, userId, id, true);
      if (!batch) throw new NotFoundException(NOT_FOUND);
      if (isExpired(batch, now)) return { expired: true as const };
      if (batch.status !== "staged") throw new ConflictException("Import is not open");

      const refs = new Set(batch.payload.accounts.map((a) => a.ref));
      for (const ref of accountMap.keys()) {
        if (!refs.has(ref)) {
          throw new BadRequestException("accountMap names a ref not in the import");
        }
      }

      // Ownership of every mapped account, inside the transaction (same 404 as an unknown id).
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
      const ownedById = new Map(owned.map((a) => [a.id, a]));

      const latestByRef = new Map<string, StagedBalance>();
      for (const b of batch.payload.balances) {
        const prev = latestByRef.get(b.accountRef);
        if (!prev || b.month > prev.month) latestByRef.set(b.accountRef, b);
      }

      const accountByRef = new Map<string, { id: string; type: string; connected: boolean }>();
      const createdAccountIds: string[] = [];
      for (const staged of batch.payload.accounts) {
        const mapped = accountMap.get(staged.ref);
        if (mapped) {
          const a = ownedById.get(mapped) as Account;
          accountByRef.set(staged.ref, { id: a.id, type: a.type, connected: !!a.connectionId });
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
        accountByRef.set(staged.ref, { id: created.id, type: created.type, connected: false });
      }

      // Existing values for the mapped accounts, locked for the rest of the transaction. Rows
      // inserted after this read are protected by the conditional upsert instead.
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
          existing.set(cellKey(r.account_id, r.year, r.month), {
            value: Number(r.value),
            asOfDate: r.as_of_date,
            source: r.source,
            importBatchId: r.import_batch_id,
          });
        }
      }

      const current = londonYearMonth(now);
      let errors = batch.counts.errors;
      let unchanged = 0;
      const skippedManual: string[] = [];
      const planned: Array<{ write: SnapshotRowWrite; key: string; prior: RevertRow["prior"] }> =
        [];
      const force: Array<{ accountId: string; year: number; month: number }> = [];
      for (const b of batch.payload.balances) {
        const month = checkSnapshotMonth(b.month, now);
        const account = accountByRef.get(b.accountRef);
        if (!month.ok || !account) {
          errors++;
          continue;
        }
        const key = rowKey(b.accountRef, b.month);
        const { year, month: mm } = month.target;
        const value = storedBalance(account.type, b.value);
        const prior = existing.get(cellKey(account.id, year, mm)) ?? null;
        if (prior && prior.value === value) {
          unchanged++;
          continue;
        }
        const isTicked = ticked.has(key);
        // A bank-connected account's current month belongs to sync unless the user ticks it.
        const connectedNow = account.connected && year === current.year && mm === current.month;
        if (!isTicked && (connectedNow || (prior && prior.source !== "agent"))) {
          skippedManual.push(key);
          continue;
        }
        if (isTicked) force.push({ accountId: account.id, year, month: mm });
        planned.push({
          key,
          prior,
          write: {
            accountId: account.id,
            year,
            month: mm,
            value,
            asOfDate: defaultAsOfDate(month.target, now),
          },
        });
      }

      const written = await writeSnapshotRows(
        m,
        userId,
        planned.map((p) => p.write),
        { source: "agent", importBatchId: batch.id, current, forceOverwrite: force },
      );
      const writtenKeys = new Set(written.map((w) => cellKey(w.accountId, w.year, w.month)));

      let created = 0;
      let overwritten = 0;
      const revertRows: RevertRow[] = [];
      const balances: RevertData["balances"] = [];
      for (const p of planned) {
        const w = p.write;
        if (!writtenKeys.has(cellKey(w.accountId, w.year, w.month))) {
          // A protected value appeared after the read: the database kept it.
          skippedManual.push(p.key);
          continue;
        }
        if (p.prior) overwritten++;
        else created++;
        revertRows.push({
          accountId: w.accountId,
          year: w.year,
          month: w.month,
          written: w.value,
          prior: p.prior,
        });
        const a = ownedById.get(w.accountId);
        if (a && w.year === current.year && w.month === current.month) {
          balances.push({
            accountId: a.id,
            year: w.year,
            month: w.month,
            prior: Number(a.balance),
            written: w.value,
          });
        }
      }

      batch.status = "committed";
      batch.committedAt = now;
      batch.counts = {
        rows: batch.counts.rows,
        staged: batch.counts.staged,
        new: created,
        overwrite: overwritten,
        unchanged,
        skipped: skippedManual.length,
        errors,
      };
      batch.revertData = { rows: revertRows, createdAccountIds, balances, skippedManual };
      // Names and values are not kept once committed; revert_data holds what revert needs.
      batch.payload = { accounts: [], balances: [], chunkKeys: batch.payload.chunkKeys };
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
   * created is removed. A current-month balance goes back only with its row. Accounts the batch
   * created are removed when nothing else refers to them.
   */
  async revert(userId: string, id: string): Promise<ImportBatchView> {
    return this.dataSource.transaction(async (m) => {
      await lockUser(m, userId);
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
      const stampedByKey = new Map(stamped.map((r) => [cellKey(r.account_id, r.year, r.month), r]));

      let restored = 0;
      const removeIds: number[] = [];
      const undone = new Set<string>();
      for (const r of data.rows) {
        const k = cellKey(r.accountId, r.year, r.month);
        const cur = stampedByKey.get(k);
        if (!cur || Number(cur.value) !== r.written) continue;
        undone.add(k);
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
        if (!undone.has(cellKey(b.accountId, b.year, b.month))) continue;
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
      // Prior values are not kept after the undo; only the outcome is.
      batch.revertData = {
        rows: [],
        createdAccountIds: [],
        balances: [],
        skippedManual: data.skippedManual,
        result: { restored, removed, kept: data.rows.length - restored - removed },
      };
      return toView(await m.save(batch));
    });
  }
}

/** Serialises every mutating import call of one user (stage, commit, revert). */
async function lockUser(m: EntityManager, userId: string): Promise<void> {
  await m.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`imports:${userId}`]);
}

function isExpired(batch: ImportBatch, now: Date): boolean {
  return batch.status === "staged" && batch.expiresAt.getTime() <= now.getTime();
}

/**
 * Lazy expiry (no scheduler in the app): staged batches past `expires_at` become `expired`, and
 * their staged names and values are dropped (counts and chunk keys stay).
 */
async function expireStale(m: EntityManager, userId: string, now: Date): Promise<void> {
  await m.query(
    `UPDATE "import_batches"
     SET "status" = 'expired', "updated_at" = now(),
         "payload" = jsonb_set(jsonb_set("payload", '{accounts}', '[]'), '{balances}', '[]')
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
    where: { id: id.toLowerCase(), userId },
    ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
  });
}

function toView(
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
