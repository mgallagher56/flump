import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { Account } from "../../entities/account.entity";
import { isRealDate, londonDate, londonYearMonth, monthKey } from "./london-date";
import {
  checkSnapshotMonth,
  defaultAsOfDate,
  EARLIEST_SNAPSHOT,
  isValidSnapshotValue,
  UUID,
} from "./snapshot-rules";
import { writeSnapshotRows } from "./snapshot-write";
import { storedBalance } from "./stored-balance";

export { EARLIEST_SNAPSHOT };
export const MAX_SNAPSHOT_VALUES = 200;

export interface SnapshotValueInput {
  accountId: string;
  value: number;
  asOfDate?: string;
}

export interface UpsertSnapshotInput {
  values: SnapshotValueInput[];
  complete?: boolean;
}

export interface UpsertSnapshotResult {
  month: string;
  values: Array<{ accountId: string; value: number; asOfDate: string; source: "manual" }>;
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
      return { accountId, value, asOfDate };
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
              select: { id: true, type: true },
            })
          : [];
        if (owned.length !== ids.length) throw new NotFoundException("Account not found");
        for (const a of owned) types.set(a.id, a.type);
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
        source: "manual" as const,
      })),
      completed: input.complete === true,
    };
  }
}
