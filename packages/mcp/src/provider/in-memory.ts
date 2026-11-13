import type { BuildContextPackInput } from "@flump/finance-engine";
import type {
  AccountCoverage,
  AccountSnapshotRow,
  McpTaxRecord,
  McpUserDataProvider,
  MonthRange,
} from "../types.js";

/** Month index (year * 12 + month - 1); "YYYY-MM" strings compare the same way. */
export const monthIndex = (year: number, month: number): number => year * 12 + (month - 1);

export function monthLabel(index: number): string {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Parses "YYYY-MM" to a month index, or null. */
export function parseMonth(value: string): number | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return m ? monthIndex(Number(m[1]), Number(m[2])) : null;
}

type Queries = Omit<McpUserDataProvider, "getUserFinancialData">;

function rowsOf(data: BuildContextPackInput): AccountSnapshotRow[] {
  const owned = new Set((data.accounts ?? []).map((a) => String(a.id)));
  const out: AccountSnapshotRow[] = [];
  for (const d of data.accountDetails ?? []) {
    const accountId = String(d.accountId ?? d.account_id ?? "");
    const year = Number(d.year);
    const month = Number(d.month);
    const value = Number(d.value);
    if (!owned.has(accountId) || !Number.isInteger(year) || !Number.isInteger(month)) continue;
    if (month < 1 || month > 12 || !Number.isFinite(value)) continue;
    out.push({ accountId, year, month, value, source: String(d.source ?? "manual") });
  }
  return out.sort(
    (a, b) =>
      a.accountId.localeCompare(b.accountId) ||
      monthIndex(a.year, a.month) - monthIndex(b.year, b.month),
  );
}

/**
 * The ranged provider methods over an already-loaded data set. Used by the stdio transport (which
 * only has the context pack) and by tests. The backend implements them in SQL instead.
 */
export function inMemoryQueries(load: (userId: string) => Promise<BuildContextPackInput>): Queries {
  return {
    async getAccounts(userId) {
      return (await load(userId)).accounts ?? [];
    },
    async getBaseline(userId) {
      return (await load(userId)).baseline;
    },
    async getAccountSnapshots(userId, range) {
      const from = parseMonth(range.from);
      const to = parseMonth(range.to);
      if (from === null || to === null) return [];
      const wanted = range.accountIds ? new Set(range.accountIds) : null;
      const rows = rowsOf(await load(userId)).filter((r) => !wanted || wanted.has(r.accountId));
      const seeds = new Map<string, AccountSnapshotRow>();
      const inRange: AccountSnapshotRow[] = [];
      for (const r of rows) {
        const idx = monthIndex(r.year, r.month);
        if (idx < from) seeds.set(r.accountId, r);
        else if (idx <= to) inRange.push(r);
      }
      return [...seeds.values(), ...inRange];
    },
    async getDataCoverage(userId) {
      const byAccount = new Map<string, AccountSnapshotRow[]>();
      for (const r of rowsOf(await load(userId))) {
        const list = byAccount.get(r.accountId) ?? [];
        list.push(r);
        byAccount.set(r.accountId, list);
      }
      const out: AccountCoverage[] = [];
      for (const [accountId, list] of byAccount) {
        const months = [...new Set(list.map((r) => monthIndex(r.year, r.month)))].sort(
          (a, b) => a - b,
        );
        const gaps: MonthRange[] = [];
        for (let i = 1; i < months.length; i++) {
          const prev = months[i - 1] as number;
          const cur = months[i] as number;
          if (cur - prev > 1) gaps.push({ from: monthLabel(prev + 1), to: monthLabel(cur - 1) });
        }
        out.push({
          accountId,
          firstMonth: monthLabel(months[0] as number),
          lastMonth: monthLabel(months[months.length - 1] as number),
          recordedMonths: months.length,
          gaps,
          sources: [...new Set(list.map((r) => r.source))].sort(),
        });
      }
      return out;
    },
    async getTaxRecords(userId, { fromDate, toDate }) {
      const records = ((await load(userId)).taxRecords ?? []) as unknown as McpTaxRecord[];
      return records.filter((r) => {
        if (r.date > toDate) return false;
        if (r.frequency === "monthly") return !r.endDate || r.endDate >= fromDate;
        return r.date >= fromDate;
      });
    },
  };
}
