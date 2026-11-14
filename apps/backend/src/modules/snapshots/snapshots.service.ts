import { SNAPSHOT_WRITE_SOURCES, type SnapshotWriteSource } from "@flump/api-contract";
import { calculateCheckInBalance } from "@flump/finance-engine";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, type EntityManager, In } from "typeorm";
import { Account } from "../../entities/account.entity";
import { isRealDate, londonDate, londonYearMonth, monthKey } from "./london-date";
import { checkSnapshotMonth, defaultAsOfDate, isValidSnapshotValue, UUID } from "./snapshot-rules";
import { writeSnapshotRows } from "./snapshot-write";
import { storedBalance } from "./stored-balance";

const MAX_SNAPSHOT_VALUES = 200;

interface SnapshotValueInput {
  accountId: string;
  value: number;
  asOfDate?: string;
  /** manual (default), confirmed or calculated; anything else is rejected (R2-5). */
  source?: string;
}

export interface UpsertSnapshotInput {
  values: SnapshotValueInput[];
  complete?: boolean;
}

export interface UpsertSnapshotResult {
  month: string;
  values: Array<{
    accountId: string;
    value: number;
    asOfDate: string;
    source: SnapshotWriteSource;
  }>;
  completed: boolean;
}

const MONTH_ERRORS = {
  bad_month: "month must be YYYY-MM",
  future_month: "month must not be in the future",
  too_early: "month is too far in the past",
} as const;

/**
 * Monthly snapshot writes (E30). The service re-validates everything the contract describes,
 * because the contract may run in shadow mode.
 */
@Injectable()
export class SnapshotsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * `PUT /snapshots/:month`: batch upsert of account values for one Europe/London month. Partial
   * allowed, latest write wins, past months editable, future months rejected. Every account must
   * belong to `userId`; a foreign or unknown id fails the whole request with the same 404 as an
   * unknown account, and nothing is written.
   */
  async upsertMonth(
    userId: string,
    monthParam: string,
    input: UpsertSnapshotInput,
    now: Date = new Date(),
  ): Promise<UpsertSnapshotResult> {
    const checked = checkSnapshotMonth(monthParam, now);
    if (!checked.ok) throw new BadRequestException(MONTH_ERRORS[checked.code]);
    const target = checked.target;
    const current = londonYearMonth(now);

    const values = input?.values;
    if (!Array.isArray(values)) throw new BadRequestException("values must be an array");
    if (values.length > MAX_SNAPSHOT_VALUES) {
      throw new BadRequestException(`at most ${MAX_SNAPSHOT_VALUES} values per request`);
    }
    const today = londonDate(now);
    const defaultDate = defaultAsOfDate(target, now);
    const seen = new Set<string>();
    const rows = values.map((entry) => {
      if (!entry || typeof entry.accountId !== "string" || entry.accountId.length === 0) {
        throw new BadRequestException("each value needs an accountId");
      }
      const accountId = entry.accountId.toLowerCase();
      if (seen.has(accountId)) {
        throw new BadRequestException("an account can appear only once per request");
      }
      seen.add(accountId);
      const value = entry.value;
      if (!isValidSnapshotValue(value)) {
        throw new BadRequestException("value must be a number with at most 2 decimal places");
      }
      let asOfDate = defaultDate;
      if (entry.asOfDate !== undefined) {
        if (typeof entry.asOfDate !== "string" || !isRealDate(entry.asOfDate)) {
          throw new BadRequestException("asOfDate must be a valid YYYY-MM-DD date");
        }
        if (entry.asOfDate.slice(0, 7) !== monthKey(target)) {
          throw new BadRequestException("asOfDate must fall inside the month");
        }
        if (entry.asOfDate > today) {
          throw new BadRequestException("asOfDate must not be in the future");
        }
        asOfDate = entry.asOfDate;
      }
      // The server decides which sources a client may send: onboarding, connected, backfill and
      // agent stay server-set (R2-5).
      const source = entry.source ?? "manual";
      if (!(SNAPSHOT_WRITE_SOURCES as readonly string[]).includes(source)) {
        throw new BadRequestException("source must be manual, confirmed or calculated");
      }
      return { accountId, value, asOfDate, source: source as SnapshotWriteSource };
    });
    // Stable lock order for concurrent batches (the response keeps this order).
    rows.sort((x, y) => (x.accountId < y.accountId ? -1 : x.accountId > y.accountId ? 1 : 0));

    await this.dataSource.transaction(async (manager) => {
      // Authorisation inside the transaction (no gap in which an account can be deleted). Only
      // UUID-shaped ids can match; every id must be the caller's, else the same 404 as unknown.
      const types = new Map<string, string>();
      if (rows.length > 0) {
        const ids = rows.map((r) => r.accountId);
        const owned = ids.every((id) => UUID.test(id))
          ? await manager.find(Account, {
              where: { id: In(ids), userId },
              select: { id: true, type: true, interestRate: true, monthlyContribution: true },
            })
          : [];
        if (owned.length !== ids.length) throw new NotFoundException("Account not found");
        for (const a of owned) types.set(a.id, a.type);
        await this.checkCalculatedValues(manager, userId, rows, owned, monthKey(target));
        // Liabilities are stored negative, as connected sync does, whatever sign was typed.
        for (const r of rows) {
          r.value = storedBalance(types.get(r.accountId) ?? "", r.value);
        }
      }
      await writeSnapshotRows(
        manager,
        userId,
        rows.map((r) => ({ ...r, year: target.year, month: target.month })),
        { source: "manual", importBatchId: null, current },
      );
      if (input.complete === true) {
        await manager.query(
          `INSERT INTO "snapshot_checkins" ("user_id", "month") VALUES ($1, $2)
           ON CONFLICT ("user_id", "month") DO NOTHING`,
          [userId, monthKey(target)],
        );
      }
    });

    return {
      month: monthKey(target),
      values: rows.map((r) => ({
        accountId: r.accountId,
        value: r.value,
        asOfDate: r.asOfDate,
        source: r.source,
      })),
      completed: input.complete === true,
    };
  }

  /**
   * A `calculated` value must be the figure the engine works out from the account's rate, regular
   * payment and latest earlier recorded value, to the penny, so the label cannot be put on an
   * arbitrary number (R2-5). Anything else fails the whole request and nothing is written.
   */
  private async checkCalculatedValues(
    manager: EntityManager,
    userId: string,
    rows: ReadonlyArray<{ accountId: string; value: number; source: SnapshotWriteSource }>,
    accounts: ReadonlyArray<Pick<Account, "id" | "type" | "interestRate" | "monthlyContribution">>,
    month: string,
  ): Promise<void> {
    const calculated = rows.filter((r) => r.source === "calculated");
    if (calculated.length === 0) return;
    const [year, monthNumber] = month.split("-").map(Number) as [number, number];
    const bases: Array<{ account_id: string; year: number; month: number; value: string }> =
      await manager.query(
        `SELECT DISTINCT ON ("account_id") "account_id", "year", "month", "value"
           FROM "account_details"
          WHERE "user_id" = $1 AND "account_id" = ANY($2::uuid[])
            AND ("year" * 12 + "month") < ($3::int * 12 + $4::int)
          ORDER BY "account_id", "year" DESC, "month" DESC`,
        [userId, calculated.map((r) => r.accountId), year, monthNumber],
      );
    for (const r of calculated) {
      const account = accounts.find((a) => a.id === r.accountId);
      const base = bases.find((b) => b.account_id === r.accountId);
      const expected = calculateCheckInBalance({
        type: account?.type,
        interestRate: account?.interestRate,
        monthlyPayment: account?.monthlyContribution,
        base: base
          ? {
              value: Number(base.value),
              month: `${base.year}-${String(base.month).padStart(2, "0")}`,
            }
          : null,
        month,
      });
      if (!expected || Math.round(Math.abs(r.value) * 100) !== Math.round(expected.value * 100)) {
        throw new BadRequestException("a calculated value must match the calculated balance");
      }
    }
  }
}
