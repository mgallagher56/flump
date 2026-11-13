import { MCP_NOTICE } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { parseMonth } from "../../provider/in-memory.js";
import { ACCOUNT_CATEGORIES, ASK_NO_ACCOUNTS, loadAccountIndex, type Missing } from "./common.js";
import { SNAPSHOT_SOURCES, safeSnapshotSource } from "./getBalanceHistory.js";

/** Most gap ranges listed per account; the count still covers them all. */
export const MAX_GAPS_PER_ACCOUNT = 12;
/** Accounts per response page. */
export const ACCOUNTS_PER_PAGE = 25;

const SOURCES = [...SNAPSHOT_SOURCES, "other"] as const;

const result = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: z.enum(ACCOUNT_CATEGORIES),
      /** "YYYY-MM", or null when nothing is recorded. */
      firstMonth: z.string().nullable(),
      lastMonth: z.string().nullable(),
      recordedMonths: z.number(),
      /** Months with no row between the first and last recorded month. */
      missingMonths: z.number(),
      /** Runs of missing months (inclusive), at most 12 per account. */
      gaps: z.array(z.object({ from: z.string(), to: z.string() })),
      gapsTruncated: z.boolean(),
      sources: z.array(z.enum(SOURCES)),
    }),
  ),
  accountsWithHistory: z.number(),
  page: z.number(),
  totalPages: z.number(),
  notes: z.array(z.string()),
});

export const getDataCoverage = defineFlumpTool({
  name: "get_data_coverage",
  title: "Data coverage",
  description:
    "For each account, which months have a recorded month-end balance: the first and last recorded month, how many months are recorded, the gaps in between, and how the values were recorded (onboarding, manual, connected or backfill). Use it to see which months are missing before reading or adding history. Paged at 25 accounts; ask for the next page while page is below totalPages.",
  input: {
    category: z.enum(ACCOUNT_CATEGORIES).optional().describe("Only accounts in this category"),
    page: z.number().int().min(1).max(1000).default(1).describe("Result page, from 1"),
  },
  result,
  maxTokens: 5000,
  async handler({ category, page }, ctx) {
    const index = await loadAccountIndex(ctx);
    const coverage = new Map(
      (await ctx.dataProvider.getDataCoverage(ctx.token.userId)).map((c) => [c.accountId, c]),
    );
    const missing: Missing[] = [];
    if (index.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);

    const selected = index.accounts.filter((a) => !category || a.category === category);
    const totalPages = Math.ceil(selected.length / ACCOUNTS_PER_PAGE);
    if (totalPages > 0 && page > totalPages) {
      throw new FlumpToolError("INVALID_ARGUMENT", `There are only ${totalPages} page(s).`, {
        field: "page",
        hint: "Ask for page 1.",
      });
    }
    const pageAccounts = selected.slice((page - 1) * ACCOUNTS_PER_PAGE, page * ACCOUNTS_PER_PAGE);
    const withHistory = selected.filter((a) => coverage.has(a.id)).length;
    const accounts = pageAccounts.map((a) => {
      const c = coverage.get(a.id);
      if (!c) {
        return {
          id: index.idOf("acc", a.id),
          label: index.labelOf(a),
          category: a.category,
          firstMonth: null,
          lastMonth: null,
          recordedMonths: 0,
          missingMonths: 0,
          gaps: [],
          gapsTruncated: false,
          sources: [],
        };
      }
      const first = parseMonth(c.firstMonth) ?? 0;
      const last = parseMonth(c.lastMonth) ?? 0;
      return {
        id: index.idOf("acc", a.id),
        label: index.labelOf(a),
        category: a.category,
        firstMonth: c.firstMonth,
        lastMonth: c.lastMonth,
        recordedMonths: c.recordedMonths,
        missingMonths: Math.max(0, last - first + 1 - c.recordedMonths),
        gaps: c.gaps.slice(0, MAX_GAPS_PER_ACCOUNT),
        gapsTruncated: c.gaps.length > MAX_GAPS_PER_ACCOUNT,
        // Closed vocabulary: anything unexpected is reported as "other", never echoed.
        sources: [
          ...new Set(c.sources.map((s) => safeSnapshotSource(s) as (typeof SOURCES)[number])),
        ],
      };
    });

    if (selected.length > 0 && withHistory === 0) {
      missing.push({
        field: "accountHistory",
        why: "No month-end balance is recorded for any account.",
        askUser:
          "Would you like to record month-end balances for your accounts so a history can be shown?",
      });
    }

    return {
      result: {
        accounts,
        accountsWithHistory: withHistory,
        page,
        totalPages,
        notes: [
          "A month with no recorded value is shown elsewhere as the last known value carried forward; it is still counted as missing here.",
        ],
      },
      provenance: { accounts: "account_history" },
      missing,
      notice: MCP_NOTICE,
    };
  },
});
