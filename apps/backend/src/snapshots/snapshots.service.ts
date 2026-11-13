import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import {
  compareYearMonth,
  isRealDate,
  lastDayOfMonth,
  londonDate,
  londonYearMonth,
  monthKey,
  parseMonthKey,
  type YearMonth,
} from "./london-date";
import { storedBalance } from "./stored-balance";

/** Earliest month a snapshot may be written for (back-filling a spreadsheet history). */
export const EARLIEST_SNAPSHOT: YearMonth = { year: 2000, month: 1 };
export const MAX_SNAPSHOT_VALUES = 200;
const MAX_ABS_VALUE = 1e10;

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

const hasAtMostTwoDecimals = (v: number): boolean => {
  const scaled = v * 100;
  return Math.abs(scaled - Math.round(scaled)) <= Math.max(1e-6, Math.abs(scaled) * 1e-12);
};

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
    const target = parseMonthKey(monthParam);
    if (!target) throw new BadRequestException("month must be YYYY-MM");
    const current = londonYearMonth(now);
    if (compareYearMonth(target, current) > 0) {
      throw new BadRequestException("month must not be in the future");
    }
    if (compareYearMonth(target, EARLIEST_SNAPSHOT) < 0) {
      throw new BadRequestException("month is too far in the past");
    }

    const values = input?.values;
    if (!Array.isArray(values)) throw new BadRequestException("values must be an array");
    if (values.length > MAX_SNAPSHOT_VALUES) {
      throw new BadRequestException(`at most ${MAX_SNAPSHOT_VALUES} values per request`);
    }
    const today = londonDate(now);
    const defaultDate = compareYearMonth(target, current) === 0 ? today : lastDayOfMonth(target);
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
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        Math.abs(value) >= MAX_ABS_VALUE ||
        !hasAtMostTwoDecimals(value)
      ) {
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
    // Stable lock order for concurrent batches.
    rows.sort((x, y) => (x.accountId < y.accountId ? -1 : x.accountId > y.accountId ? 1 : 0));

    const now2 = new Date();
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
      if (rows.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(AccountDetail)
          .values(
            rows.map((r) => ({
              accountId: r.accountId,
              userId,
              year: target.year,
              month: target.month,
              value: r.value,
              asOfDate: r.asOfDate,
              source: "manual" as const,
              updatedAt: now2,
            })),
          )
          .orUpdate(
            ["value", "as_of_date", "source", "updated_at"],
            ["account_id", "year", "month"],
          )
          .execute();
        // The current month's check-in is the user's statement of "now", so the account's
        // current balance follows it. Back-dated or edited past months never touch it.
        if (compareYearMonth(target, current) === 0) {
          for (const r of rows) {
            await manager.update(Account, { id: r.accountId, userId }, { balance: r.value });
          }
        }
      }
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
