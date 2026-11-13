import {
  ALL_TAX_CATEGORIES,
  getMonthsForTaxYear,
  getRecordValueForMonth,
  SUPPORTED_UK_TAX_YEARS,
  type TaxRecord,
  type UkTaxYear,
} from "@flump/finance-engine";
import { z } from "zod";
import { defaultTaxYear } from "../../assumptions.js";
import type { ToolOutput } from "../../envelope.js";
import type { McpServerContext, McpTaxRecord } from "../../types.js";

export const TAX_SOURCES = ["paye", "self-employed", "rental", "savings"] as const;
export type TaxSourceId = (typeof TAX_SOURCES)[number];

/** The engine's closed category ids; a stored category outside this set is reported as "other". */
export const TAX_CATEGORY_IDS: ReadonlySet<string> = new Set(ALL_TAX_CATEGORIES.map((c) => c.id));

export const taxYearInput = z
  .enum(SUPPORTED_UK_TAX_YEARS)
  .optional()
  .describe("UK tax year, such as 2025/26 (defaults to the current tax year)");

type Assumption = NonNullable<ToolOutput<unknown>["assumptions"]>[number];

/** The requested year, or the current one, plus an assumption when the engine lags the calendar. */
export function resolveTaxYear(requested: UkTaxYear | undefined): {
  taxYear: UkTaxYear;
  assumptions: Assumption[];
} {
  if (requested) return { taxYear: requested, assumptions: [] };
  const fallback = defaultTaxYear();
  return {
    taxYear: fallback.taxYear,
    assumptions: fallback.assumptions.map((a) => ({ ...a, source: "default" as const })),
  };
}

/** The tax year's months ("YYYY-MM", April to March) and its first and last day. */
export function taxYearMonths(taxYear: string): {
  months: string[];
  fromDate: string;
  toDate: string;
} {
  const months = getMonthsForTaxYear(taxYear);
  return { months, fromDate: `${months[0]}-01`, toDate: `${months[months.length - 1]}-31` };
}

/** The user's tax records that can fall in the tax year, read by date range in the database. */
export async function loadTaxYearRecords(
  ctx: McpServerContext,
  taxYear: string,
): Promise<{ months: string[]; records: TaxRecord[] }> {
  const { months, fromDate, toDate } = taxYearMonths(taxYear);
  const rows = await ctx.dataProvider.getTaxRecords(ctx.token.userId, { fromDate, toDate });
  return { months, records: rows.map(asEngineRecord) };
}

/** Shape the engine's `TaxRecord` needs. Receipts are never present (E20-N15). */
function asEngineRecord(r: McpTaxRecord): TaxRecord {
  return {
    ...r,
    userId: "",
    notes: r.notes ?? null,
    receiptFilename: null,
    receiptMimeType: null,
    createdAt: "",
    updatedAt: "",
  } as TaxRecord;
}

/** A record's value in each month of the year, by the engine's own month rule. */
export function monthlyValues(record: TaxRecord, months: readonly string[]): number[] {
  return months.map((m) => getRecordValueForMonth(record, m));
}

export function safeSource(source: string): TaxSourceId | "other" {
  return (TAX_SOURCES as readonly string[]).includes(source) ? (source as TaxSourceId) : "other";
}

export function safeCategory(category: string): string {
  return TAX_CATEGORY_IDS.has(category) ? category : "other";
}
