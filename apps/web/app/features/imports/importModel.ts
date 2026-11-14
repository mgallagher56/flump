/**
 * Staged import review (E17 re-plan PR E). Shapes mirror `packages/api-contract` (domains/imports):
 * `ImportBatchResponse` and `ImportPreviewResponse`. The web tsconfig does not import the contract
 * package, so they are restated here; the backend contract tests keep the server side honest.
 */

export type ImportStatus = "staged" | "committed" | "reverted" | "expired";

export interface ImportBatch {
  batchId: string;
  status: ImportStatus;
  counts: {
    staged: number;
    new: number | null;
    overwrite: number | null;
    unchanged: number | null;
    skipped: number | null;
    errors: number;
  };
  rows: number;
  skippedManual: string[];
  revert: { restored: number; removed: number; kept: number } | null;
  createdAt: string;
  expiresAt: string;
  committedAt: string | null;
  revertedAt: string | null;
}

export type RowStatus = "new" | "overwrite" | "unchanged";

export interface PreviewRow {
  key: string;
  ref: string;
  month: string;
  /** Signed as stored: debts are negative. */
  value: number;
  prior: number | null;
  priorSource: string | null;
  status: RowStatus;
  /** Commit skips the row unless it is ticked. */
  needsTick: boolean;
}

export interface PreviewAccount {
  ref: string;
  name: string;
  type: string;
  mappedAccountId: string | null;
  suggestedAccountId: string | null;
}

export interface ImportPreview {
  batchId: string;
  status: "staged";
  expiresAt: string;
  accounts: PreviewAccount[];
  rows: PreviewRow[];
  totals: { new: number; overwrite: number; unchanged: number; needsTick: number; errors: number };
}

/** An existing Flump account the user can map a staged account to. */
export interface ExistingAccount {
  id: string;
  name: string;
  type: string;
}

/** `ref` to an existing account id, or null for a new account. */
export type AccountMap = Record<string, string | null>;

/** The starting map: each staged account goes to its suggested match, or to a new account. */
export function initialAccountMap(accounts: readonly PreviewAccount[]): AccountMap {
  const map: AccountMap = {};
  const used = new Set<string>();
  for (const a of accounts) {
    const pick = a.mappedAccountId ?? a.suggestedAccountId;
    // An existing account can take one staged account only.
    if (pick && !used.has(pick)) {
      map[a.ref] = pick;
      used.add(pick);
    } else {
      map[a.ref] = null;
    }
  }
  return map;
}

/** Existing accounts already chosen for another staged account. */
export function takenAccountIds(map: AccountMap, exceptRef: string): Set<string> {
  const taken = new Set<string>();
  for (const [ref, id] of Object.entries(map)) if (id && ref !== exceptRef) taken.add(id);
  return taken;
}

export interface CommitPlan {
  new: number;
  overwrite: number;
  unchanged: number;
  /** Flagged rows left unticked: commit keeps the existing value. */
  kept: number;
}

/** What the commit will do with the current ticks. Mirrors the server's classification. */
export function commitPlan(rows: readonly PreviewRow[], ticked: ReadonlySet<string>): CommitPlan {
  const plan: CommitPlan = { new: 0, overwrite: 0, unchanged: 0, kept: 0 };
  for (const r of rows) {
    if (r.status === "unchanged") plan.unchanged++;
    else if (r.needsTick && !ticked.has(r.key)) plan.kept++;
    else plan[r.status]++;
  }
  return plan;
}

/** Only flagged rows can be ticked; anything else in the set is dropped. */
export function overwriteKeys(rows: readonly PreviewRow[], ticked: ReadonlySet<string>): string[] {
  return rows.filter((r) => r.needsTick && ticked.has(r.key)).map((r) => r.key);
}

export interface MonthGroup {
  month: string;
  rows: PreviewRow[];
}

/** Rows by month, newest month first; inside a month in staged account order. */
export function groupByMonth(
  rows: readonly PreviewRow[],
  accounts: readonly PreviewAccount[],
): MonthGroup[] {
  const order = new Map(accounts.map((a, i) => [a.ref, i]));
  const byMonth = new Map<string, PreviewRow[]>();
  for (const r of rows) {
    const list = byMonth.get(r.month) ?? [];
    list.push(r);
    byMonth.set(r.month, list);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([month, list]) => ({
      month,
      rows: list.sort((x, y) => (order.get(x.ref) ?? 0) - (order.get(y.ref) ?? 0)),
    }));
}

/** First and last staged month, for the page description. */
export function monthRange(rows: readonly PreviewRow[]): { from: string; to: string } | null {
  if (rows.length === 0) return null;
  let from = rows[0]?.month ?? "";
  let to = from;
  for (const r of rows) {
    if (r.month < from) from = r.month;
    if (r.month > to) to = r.month;
  }
  return { from, to };
}

/** Whole days left before a staged import expires (never negative). */
export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
