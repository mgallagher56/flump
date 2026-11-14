import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  type KeysetOrder,
  keysetPage,
  type Page,
  type PageRequest,
} from "../../contract/pagination";
import { Account } from "../../entities/account.entity";
import {
  type ImportBatch,
  ImportBatch as ImportBatchEntity,
  type ImportCounts,
  type ImportPayload,
  type RevertData,
  type RevertRow,
  type StagedBalance,
} from "../../entities/import-batch.entity";
import { londonYearMonth } from "../snapshots/london-date";
import { checkSnapshotMonth, isValidSnapshotValue } from "../snapshots/snapshot-rules";
import { type SnapshotRowWrite, writeSnapshotRows } from "../snapshots/snapshot-write";
import { storedBalance } from "../snapshots/stored-balance";

/** E17 re-plan section 7 caps. */
import {
  cellKey,
  classifyRows,
  expireStale,
  findOwned,
  isExpired,
  lockUser,
  NOT_FOUND,
  parseAccountMap,
  parseOverwrite,
  parseStageInput,
  readExisting,
  resolveAccountMap,
  rowKey,
  suggestAccount,
  toView,
} from "./import-helpers";
import {
  CommitImportInput,
  IMPORT_EXPIRY_MS,
  ImportBatchView,
  ImportPreviewView,
  ImportValidationError,
  MAX_ERRORS_LISTED,
  MAX_IMPORT_ACCOUNTS,
  MAX_IMPORT_ROWS,
  MAX_OPEN_BATCHES,
  PreviewImportInput,
  StageImportInput,
} from "./imports.types";

export * from "./imports.types";

const MAX_LISTED_BATCHES = 50;
/** GET /imports order: newest first, id as tiebreak (keyset pagination, BE-09). */
const BATCH_ORDER: KeysetOrder = {
  keys: [
    { column: '"b"."created_at"', kind: "timestamp" },
    { column: '"b"."id"', kind: "uuid" },
  ],
  direction: "DESC",
};

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

  /**
   * True when `idempotencyKey` already names one of the user's stage calls, so `stage` would
   * replay it. Read-only and unlocked: a hint for callers (the MCP adapter skips the rate limit
   * for a replay); `stage` itself stays the source of truth.
   */
  async isReplay(userId: string, idempotencyKey: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM "import_batches"
       WHERE "user_id" = $1
         AND ("idempotency_key" = $2 OR "payload"->'chunkKeys' @> jsonb_build_array($2::text))
       LIMIT 1`,
      [userId, idempotencyKey],
    );
    return rows.length > 0;
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

  /** The caller's batches, newest first (at most 50). Expired ones are marked as such first. */
  async list(userId: string, now: Date = new Date()): Promise<ImportBatchView[]> {
    await expireStale(this.dataSource.manager, userId, now);
    const batches = await this.dataSource.manager.find(ImportBatchEntity, {
      where: { userId },
      order: { createdAt: "DESC" },
      take: MAX_LISTED_BATCHES,
    });
    return batches.map((b) => toView(b));
  }

  /** One page of the caller's batches, newest first (GET /imports, BE-09 keyset pagination). */
  async listPage(
    userId: string,
    page: PageRequest,
    now: Date = new Date(),
  ): Promise<Page<ImportBatchView>> {
    await expireStale(this.dataSource.manager, userId, now);
    const qb = this.dataSource.manager
      .createQueryBuilder(ImportBatchEntity, "b")
      .where("b.userId = :userId", { userId });
    const { items, nextCursor } = await keysetPage(qb, BATCH_ORDER, page);
    return { items: items.map((b) => toView(b)), nextCursor };
  }

  /**
   * Dry run of a commit for the review page: what each staged row would do with this account map,
   * using the same classification as commit. Writes nothing and takes no locks. Session auth only,
   * so it may show the user their own staged account names and values.
   */
  async preview(
    userId: string,
    id: string,
    input: PreviewImportInput = {},
    now: Date = new Date(),
  ): Promise<ImportPreviewView> {
    const accountMap = parseAccountMap(input?.accountMap);
    const m = this.dataSource.manager;
    const batch = await findOwned(m, userId, id);
    if (!batch) throw new NotFoundException(NOT_FOUND);
    if (isExpired(batch, now)) {
      await expireStale(m, userId, now);
      throw new ConflictException("Import has expired");
    }
    if (batch.status !== "staged") throw new ConflictException("Import is not open");

    const { mappedIds, ownedById } = await resolveAccountMap(m, userId, batch, accountMap);
    const existing = await readExisting(m, mappedIds, false);

    const userAccounts = await m.find(Account, {
      where: { userId },
      select: { id: true, name: true, type: true },
    });
    const accountByRef = new Map<string, { id: string; type: string; connected: boolean }>();
    const accounts: ImportPreviewView["accounts"] = [];
    for (const staged of batch.payload.accounts) {
      const mapped = accountMap.get(staged.ref) ?? null;
      const owned = mapped ? ownedById.get(mapped) : undefined;
      accountByRef.set(
        staged.ref,
        owned
          ? { id: owned.id, type: owned.type, connected: !!owned.connectionId }
          : // An unmapped ref becomes a new account: nothing to compare with, never connected.
            { id: `new:${staged.ref}`, type: staged.type, connected: false },
      );
      accounts.push({
        ref: staged.ref,
        name: staged.name,
        type: staged.type,
        mappedAccountId: owned ? owned.id : null,
        suggestedAccountId: suggestAccount(staged, userAccounts),
      });
    }

    const rows: ImportPreviewView["rows"] = [];
    const totals = { new: 0, overwrite: 0, unchanged: 0, needsTick: 0, errors: 0 };
    for (const row of classifyRows(batch.payload.balances, accountByRef, existing, now)) {
      if (row.status === "error") {
        totals.errors++;
        continue;
      }
      totals[row.status]++;
      if (row.needsTick) totals.needsTick++;
      rows.push({
        key: row.key,
        ref: row.ref,
        month: row.month,
        value: row.write.value,
        prior: row.prior?.value ?? null,
        priorSource: row.prior?.source ?? null,
        status: row.status,
        needsTick: row.needsTick,
      });
    }
    rows.sort((a, b) =>
      a.month === b.month ? a.ref.localeCompare(b.ref) : a.month < b.month ? -1 : 1,
    );
    return {
      batchId: batch.id,
      status: "staged",
      expiresAt: batch.expiresAt.toISOString(),
      accounts,
      rows,
      totals,
    };
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

      const { mappedIds, ownedById } = await resolveAccountMap(m, userId, batch, accountMap);

      const latestByRef = new Map<string, StagedBalance>();
      for (const b of batch.payload.balances) {
        const prev = latestByRef.get(b.accountRef);
        if (!prev || b.month > prev.month) latestByRef.set(b.accountRef, b);
      }

      const accountByRef = new Map<string, { id: string; type: string; connected: boolean }>();
      const toCreate: Array<{ ref: string; account: Account }> = [];
      for (const staged of batch.payload.accounts) {
        const mapped = accountMap.get(staged.ref);
        if (mapped) {
          const a = ownedById.get(mapped) as Account;
          accountByRef.set(staged.ref, { id: a.id, type: a.type, connected: !!a.connectionId });
          continue;
        }
        const latest = latestByRef.get(staged.ref);
        toCreate.push({
          ref: staged.ref,
          account: m.create(Account, {
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
        });
      }
      // One insert for every new account instead of one per account (audit L13); the saved
      // entities come back in input order, so each ref keeps its own id.
      const createdAccounts = toCreate.length
        ? await m.save(
            Account,
            toCreate.map((c) => c.account),
          )
        : [];
      const createdAccountIds = createdAccounts.map((a) => a.id);
      createdAccounts.forEach((created, i) => {
        accountByRef.set(toCreate[i].ref, { id: created.id, type: created.type, connected: false });
      });

      // Existing values for the mapped accounts, locked for the rest of the transaction. Rows
      // inserted after this read are protected by the conditional upsert instead.
      const existing = await readExisting(m, mappedIds, true);

      const current = londonYearMonth(now);
      let errors = batch.counts.errors;
      let unchanged = 0;
      const skippedManual: string[] = [];
      const planned: Array<{ write: SnapshotRowWrite; key: string; prior: RevertRow["prior"] }> =
        [];
      const force: Array<{ accountId: string; year: number; month: number }> = [];
      for (const row of classifyRows(batch.payload.balances, accountByRef, existing, now)) {
        if (row.status === "error") {
          errors++;
          continue;
        }
        if (row.status === "unchanged") {
          unchanged++;
          continue;
        }
        const isTicked = ticked.has(row.key);
        if (!isTicked && row.needsTick) {
          skippedManual.push(row.key);
          continue;
        }
        const w = row.write;
        if (isTicked) force.push({ accountId: w.accountId, year: w.year, month: w.month });
        planned.push({ key: row.key, prior: row.prior, write: w });
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
      // A prior value recorded before the BE-05 backfill can carry a liability's old positive
      // sign: restore it through the same sign rule as every other write (audit H6).
      const typeIds = [
        ...new Set([
          ...data.rows.map((r) => r.accountId),
          ...data.balances.map((b) => b.accountId),
        ]),
      ];
      const typeRows: Array<{ id: string; type: string }> = typeIds.length
        ? await m.query(
            `SELECT "id"::text AS "id", "type" FROM "accounts" WHERE "id" = ANY($1::uuid[]) AND "user_id" = $2`,
            [typeIds, userId],
          )
        : [];
      const typeById = new Map(typeRows.map((t) => [t.id, t.type]));

      const removeIds: number[] = [];
      const undone = new Set<string>();
      // Each restored cell's prior value, applied in one statement below (audit L13).
      const restore = { ids: [] as number[], values: [] as number[], asOf: [] as string[] };
      const restoreMeta = { sources: [] as string[], batchIds: [] as (string | null)[] };
      for (const r of data.rows) {
        const k = cellKey(r.accountId, r.year, r.month);
        const cur = stampedByKey.get(k);
        if (!cur || Number(cur.value) !== r.written) continue;
        undone.add(k);
        if (r.prior === null) {
          removeIds.push(cur.id);
          continue;
        }
        restore.ids.push(cur.id);
        restore.values.push(storedBalance(typeById.get(r.accountId), Number(r.prior.value)));
        restore.asOf.push(r.prior.asOfDate);
        restoreMeta.sources.push(r.prior.source);
        restoreMeta.batchIds.push(r.prior.importBatchId);
      }
      const restored = restore.ids.length;
      if (restored > 0) {
        await m.query(
          `UPDATE "account_details" d
           SET "value" = v."value", "as_of_date" = v."as_of_date", "source" = v."source",
               "import_batch_id" = v."import_batch_id", "updated_at" = now()
           FROM unnest($1::int[], $2::numeric[], $3::date[], $4::varchar[], $5::uuid[])
             AS v("id", "value", "as_of_date", "source", "import_batch_id")
           WHERE d."id" = v."id"`,
          [restore.ids, restore.values, restore.asOf, restoreMeta.sources, restoreMeta.batchIds],
        );
      }
      if (removeIds.length > 0) {
        await m.query(`DELETE FROM "account_details" WHERE "id" = ANY($1::int[])`, [removeIds]);
      }
      // A current-month balance goes back only with its row, and only if nothing changed it since.
      const balances = data.balances.filter((b) =>
        undone.has(cellKey(b.accountId, b.year, b.month)),
      );
      if (balances.length > 0) {
        await m.query(
          `UPDATE "accounts" a SET "balance" = v."balance", "updated_at" = now()
           FROM unnest($2::uuid[], $3::numeric[], $4::numeric[]) AS v("id", "balance", "written")
           WHERE a."id" = v."id" AND a."user_id" = $1 AND a."balance" = v."written"`,
          [
            userId,
            balances.map((b) => b.accountId),
            balances.map((b) => storedBalance(typeById.get(b.accountId), b.prior)),
            balances.map((b) => b.written),
          ],
        );
      }
      if (data.createdAccountIds.length > 0) {
        await m.query(
          `DELETE FROM "accounts" a
           WHERE a."id" = ANY($1::uuid[]) AND a."user_id" = $2 AND a."connection_id" IS NULL
             AND NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id" = a."id")
             AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."account_id" = a."id")`,
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
