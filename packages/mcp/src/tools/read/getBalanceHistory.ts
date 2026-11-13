import { MCP_NOTICE, type ResolvedAccount, selectNetWorthSeries } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { monthIndex, monthLabel, parseMonth } from "../../provider/in-memory.js";
import type { AccountSnapshotRow } from "../../types.js";
import { ACCOUNT_CATEGORIES, loadAccountIndex, type Missing, round2 } from "./common.js";

/** Most periods one series may have; past this the caller must widen the interval or narrow the range. */
export const MAX_PERIODS = 120;
/** Most points in one response page, across all series. */
export const MAX_POINTS_PER_PAGE = 200;

const MONTH = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM, such as 2025-04");

const point = z.object({
  /** "YYYY-MM", "YYYY-Qn" or "YYYY". */
  period: z.string(),
  /** The chosen metric; null for a delta with no earlier value. */
  value: z.number().nullable(),
  /** True when any value behind this point is a carried-forward month, not a recorded one. */
  carriedForward: z.boolean(),
  /** Source of the recorded row(s) behind the value, or "mixed". */
  source: z.string(),
  /** Detailed format, delta metrics only: the balance at the end of the period. */
  balance: z.number().optional(),
});

const result = z.object({
  from: z.string(),
  to: z.string(),
  groupBy: z.enum(["account", "category", "total"]),
  metric: z.enum(["balance", "delta", "pctDelta"]),
  interval: z.enum(["month", "quarter", "year"]),
  series: z.array(
    z.object({
      /** Short account id, category name, or "total". */
      key: z.string(),
      label: z.string(),
      category: z.enum(ACCOUNT_CATEGORIES).optional(),
      /** Values are amounts owed: a falling value is a smaller debt. */
      isLiability: z.boolean(),
      points: z.array(point),
    }),
  ),
  seriesCount: z.number(),
  page: z.number(),
  totalPages: z.number(),
  notes: z.array(z.string()),
});

type Interval = "month" | "quarter" | "year";

interface Period {
  label: string;
  /** First and last month index of the period, clipped to the requested range. */
  start: number;
  end: number;
}

function periods(from: number, to: number, interval: Interval): Period[] {
  const out: Period[] = [];
  let cursor = from;
  while (cursor <= to) {
    const year = Math.floor(cursor / 12);
    const month = cursor % 12;
    let naturalEnd: number;
    let label: string;
    if (interval === "month") {
      naturalEnd = cursor;
      label = monthLabel(cursor);
    } else if (interval === "quarter") {
      const q = Math.floor(month / 3);
      naturalEnd = year * 12 + q * 3 + 2;
      label = `${year}-Q${q + 1}`;
    } else {
      naturalEnd = year * 12 + 11;
      label = String(year);
    }
    const end = Math.min(naturalEnd, to);
    out.push({ label, start: cursor, end });
    cursor = end + 1;
  }
  return out;
}

/** Sources the E30 CHECK allows; anything else is reported as "other", never echoed. */
export const SNAPSHOT_SOURCES = ["onboarding", "manual", "connected", "backfill"] as const;

export function safeSnapshotSource(source: string): string {
  return (SNAPSHOT_SOURCES as readonly string[]).includes(source) ? source : "other";
}

interface Cell {
  value: number;
  carried: boolean;
  source: string;
}

/** month index -> account id -> value, from the E30 selector (carry-forward, liabilities as owed). */
function buildGrid(
  accounts: readonly ResolvedAccount[],
  rows: readonly AccountSnapshotRow[],
  to: number,
): Map<number, Map<string, Cell>> {
  const sourceAt = new Map<string, string>();
  for (const r of rows) {
    sourceAt.set(`${r.accountId}|${monthIndex(r.year, r.month)}`, safeSnapshotSource(r.source));
  }
  const series = selectNetWorthSeries(
    accounts.map((a) => ({ id: a.id, type: a.rawType })),
    rows,
    { through: monthLabel(to) },
  );
  const grid = new Map<number, Map<string, Cell>>();
  const lastSource = new Map<string, string>();
  for (const p of series) {
    const idx = parseMonth(p.month) as number;
    const cells = new Map<string, Cell>();
    for (const v of p.accounts) {
      const recorded = sourceAt.get(`${v.accountId}|${idx}`);
      if (recorded !== undefined) lastSource.set(v.accountId, recorded);
      cells.set(v.accountId, {
        value: v.value,
        carried: v.carried,
        source: lastSource.get(v.accountId) ?? "manual",
      });
    }
    grid.set(idx, cells);
  }
  return grid;
}

interface Group {
  key: string;
  label: string;
  category?: (typeof ACCOUNT_CATEGORIES)[number];
  isLiability: boolean;
  members: ResolvedAccount[];
  /** Net worth (assets minus liabilities) rather than a plain sum. */
  net: boolean;
}

/** The group's balance at one month, or null when none of its accounts has a value yet. */
function groupAt(grid: Map<number, Map<string, Cell>>, g: Group, idx: number) {
  const cells = grid.get(idx);
  if (!cells) return null;
  let total = 0;
  let any = false;
  let carried = false;
  const sources = new Set<string>();
  for (const a of g.members) {
    const c = cells.get(a.id);
    if (!c) continue;
    any = true;
    carried ||= c.carried;
    sources.add(c.source);
    total += g.net && a.isLiability ? -c.value : c.value;
  }
  if (!any) return null;
  return {
    value: round2(total),
    carried,
    source: sources.size === 1 ? ([...sources][0] as string) : "mixed",
  };
}

export const getBalanceHistory = defineFlumpTool({
  name: "get_balance_history",
  title: "Balance history",
  description:
    "Month-end balances recorded in Flump between two months, per account, per category or as a net-worth total, at monthly, quarterly or yearly intervals. metric balance gives the value at the end of each period; delta gives the change from the end of the previous period (current minus previous, up or down); pctDelta gives that change as a percentage. Liabilities are the amount owed as a positive number. A month with no recorded value carries the last known value forward and is flagged carriedForward; source says how each value was recorded. Student loans are excluded. Results are paged: ask for the next page while page is below totalPages.",
  input: {
    from: MONTH.describe("First month, YYYY-MM"),
    to: MONTH.describe("Last month, YYYY-MM"),
    accountIds: z
      .array(z.string().max(40))
      .max(50)
      .optional()
      .describe("Only these accounts (short ids from list_accounts)"),
    category: z.enum(ACCOUNT_CATEGORIES).optional().describe("Only accounts in this category"),
    groupBy: z
      .enum(["account", "category", "total"])
      .default("total")
      .describe("One series per account, per category, or one net-worth total (default)"),
    metric: z.enum(["balance", "delta", "pctDelta"]).default("balance"),
    interval: z.enum(["month", "quarter", "year"]).default("month"),
    page: z.number().int().min(1).max(1000).default(1).describe("Result page, from 1"),
  },
  result,
  maxTokens: 6000,
  async handler(input, ctx, { responseFormat }) {
    const from = parseMonth(input.from) as number;
    const to = parseMonth(input.to) as number;
    if (from > to) {
      throw new FlumpToolError("INVALID_ARGUMENT", "from must not be after to.", {
        field: "from",
        hint: "Swap the months or pick a later to.",
      });
    }
    const grid = periods(from, to, input.interval);
    if (grid.length > MAX_PERIODS) {
      throw new FlumpToolError(
        "INVALID_ARGUMENT",
        `That range has ${grid.length} periods; the most is ${MAX_PERIODS}.`,
        { field: "interval", hint: "Use a quarter or year interval, or a shorter range." },
      );
    }

    const index = await loadAccountIndex(ctx);
    let selected = index.accounts.filter((a) => a.category !== "studentLoans");
    if (input.accountIds) {
      const wanted = new Set<string>();
      for (const id of input.accountIds) {
        const account = index.resolve(id);
        if (!account) {
          throw new FlumpToolError("NOT_FOUND", "An account id was not recognised.", {
            field: "accountIds",
            hint: "Use the short ids returned by list_accounts.",
          });
        }
        wanted.add(account.id);
      }
      selected = selected.filter((a) => wanted.has(a.id));
    }
    if (input.category) selected = selected.filter((a) => a.category === input.category);

    const rows =
      selected.length === 0
        ? []
        : await ctx.dataProvider.getAccountSnapshots(ctx.token.userId, {
            from: input.from,
            to: input.to,
            accountIds: selected.map((a) => a.id),
          });
    const cells = buildGrid(selected, rows, to);
    const recorded = new Set(rows.map((r) => r.accountId));
    const withData = selected.filter((a) => recorded.has(a.id));

    let groups: Group[];
    if (input.groupBy === "account") {
      groups = withData.map((a) => ({
        key: index.idOf("acc", a.id),
        label: index.labelOf(a),
        category: a.category,
        isLiability: a.isLiability,
        members: [a],
        net: false,
      }));
    } else if (input.groupBy === "category") {
      groups = ACCOUNT_CATEGORIES.flatMap((category) => {
        const members = withData.filter((a) => a.category === category);
        if (members.length === 0) return [];
        return [
          {
            key: category,
            label: category,
            category,
            // One category is all assets or all liabilities, so its series is a plain sum.
            isLiability: members[0]?.isLiability ?? false,
            members,
            net: false,
          },
        ];
      });
    } else {
      groups =
        withData.length === 0
          ? []
          : [
              {
                key: "total",
                label: "Net worth",
                isLiability: false,
                members: withData,
                net: true,
              },
            ];
    }

    const perPage = Math.max(1, Math.floor(MAX_POINTS_PER_PAGE / grid.length));
    const totalPages = Math.ceil(groups.length / perPage);
    if (totalPages > 0 && input.page > totalPages) {
      throw new FlumpToolError("INVALID_ARGUMENT", `There are only ${totalPages} page(s).`, {
        field: "page",
        hint: "Ask for page 1.",
      });
    }
    const pageGroups = groups.slice((input.page - 1) * perPage, input.page * perPage);

    const series = pageGroups.map((g) => {
      const points: z.infer<typeof point>[] = [];
      for (const p of grid) {
        const end = groupAt(cells, g, p.end);
        if (!end) continue;
        if (input.metric === "balance") {
          points.push({
            period: p.label,
            value: end.value,
            carriedForward: end.carried,
            source: end.source,
          });
          continue;
        }
        const prev = groupAt(cells, g, p.start - 1);
        const delta = prev ? round2(end.value - prev.value) : null;
        const value =
          input.metric === "delta"
            ? delta
            : delta === null || !prev || prev.value === 0
              ? null
              : round2((delta / Math.abs(prev.value)) * 100);
        points.push({
          period: p.label,
          value,
          carriedForward: end.carried,
          source: end.source,
          ...(responseFormat === "detailed" ? { balance: end.value } : {}),
        });
      }
      return {
        key: g.key,
        label: g.label,
        ...(g.category ? { category: g.category } : {}),
        isLiability: g.isLiability,
        points,
      };
    });

    const missing: Missing[] = [];
    if (selected.length > 0 && withData.length === 0) {
      missing.push({
        field: "accountHistory",
        why: "No month-end balance is recorded on or before the requested months for the selected accounts.",
        askUser:
          "Would you like to record month-end balances for your accounts so a history can be shown?",
      });
    } else if (withData.length < selected.length) {
      missing.push({
        field: "accountHistory.accounts",
        why: `${selected.length - withData.length} of ${selected.length} selected account(s) have no month-end balance on or before ${input.to}, so they are left out.`,
        askUser: "Would you like to record month-end balances for the accounts with no history?",
      });
    }

    const notes = [
      "Values are month-end balances recorded in Flump; a month with no recorded value repeats the last known value (carriedForward true).",
      "A quarter or year shows the balance at its last month within the range; a delta compares it with the month before the period starts.",
      "An account's first recorded month adds its whole balance, so a delta there is partly a new account rather than a change.",
      ...(input.groupBy === "total"
        ? ["The total is assets minus liabilities for the selected accounts."]
        : []),
      ...(index.accounts.some((a) => a.category === "studentLoans")
        ? ["Student loans are income-contingent and excluded."]
        : []),
    ];

    return {
      result: {
        from: input.from,
        to: input.to,
        groupBy: input.groupBy,
        metric: input.metric,
        interval: input.interval,
        series,
        seriesCount: groups.length,
        page: input.page,
        totalPages,
        notes,
      },
      provenance: { series: "account_history" },
      missing,
      notice: MCP_NOTICE,
    };
  },
});
