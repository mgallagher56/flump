import { MCP_NOTICE } from "@flump/finance-engine";
import { z } from "zod";
import { effectiveAnonymize } from "../../auth/scopes.js";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { shortId, shortIdKey } from "../../short-ids.js";
import { round2, sanitiseText } from "./common.js";
import {
  loadTaxYearRecords,
  monthlyValues,
  resolveTaxYear,
  safeCategory,
  safeSource,
  TAX_CATEGORY_IDS,
  TAX_SOURCES,
  taxYearInput,
} from "./tax-common.js";

/** Rows returned per call; totals always cover every record. */
export const MAX_TAX_ROWS = { concise: 25, detailed: 100 } as const;

const SOURCE = z.enum([...TAX_SOURCES, "other"]);

const result = z.object({
  totals: z.object({
    incomeGbp: z.number(),
    expensesGbp: z.number(),
    bySource: z.array(z.object({ source: SOURCE, incomeGbp: z.number(), expensesGbp: z.number() })),
  }),
  groupBy: z.enum(["month", "category"]),
  groups: z.array(
    z.object({
      /** "YYYY-MM" when grouped by month, else the category id. */
      key: z.string(),
      source: SOURCE.optional(),
      incomeGbp: z.number(),
      expensesGbp: z.number(),
    }),
  ),
  rows: z.array(
    z.object({
      id: z.string(),
      source: SOURCE,
      type: z.enum(["income", "expense"]),
      category: z.string(),
      frequency: z.enum(["one-off", "monthly", "annual"]),
      date: z.string(),
      endDate: z.string().nullable(),
      /** Amount per occurrence as recorded. */
      amountGbp: z.number(),
      /** What the record adds up to inside this tax year. */
      inYearGbp: z.number(),
      /** Full-access tokens only, sanitised. */
      name: z.string().optional(),
    }),
  ),
  rowCount: z.number(),
  rowsTruncated: z.boolean(),
  notes: z.array(z.string()),
});

const FREQUENCIES = ["one-off", "monthly", "annual"] as const;

export const listTaxRecords = defineFlumpTool({
  name: "list_tax_records",
  title: "Tax records",
  description:
    "The income and expense records the user keeps for a UK tax year (PAYE, self-employment, rental and savings), with totals by source and either a month-by-month or a per-category breakdown, plus the records themselves (up to 25, or 100 in detailed format). Amounts are what each record adds up to inside the tax year. Record names appear only with full read access; notes and receipts never do.",
  input: {
    taxYear: taxYearInput,
    category: z
      .string()
      .max(40)
      .optional()
      .describe(
        "Only this category id, such as rental_income or mortgage_interest; other selects records with an unrecognised category",
      ),
    groupBy: z.enum(["month", "category"]).default("category"),
  },
  result,
  maxTokens: 5000,
  async handler(input, ctx, { responseFormat }) {
    if (
      input.category !== undefined &&
      input.category !== "other" &&
      !TAX_CATEGORY_IDS.has(input.category)
    ) {
      throw new FlumpToolError("INVALID_ARGUMENT", "Unknown tax record category.", {
        field: "category",
        hint: "Leave category out to see every category id used in this tax year.",
      });
    }
    const { taxYear, assumptions } = resolveTaxYear(input.taxYear);
    const anonymise = effectiveAnonymize(ctx.token.anonymizeInstitutions, ctx.token.scopes);
    const key = shortIdKey(ctx.token);
    const { months, records } = await loadTaxYearRecords(ctx, taxYear);

    const sourceTotals = new Map<string, { incomeGbp: number; expensesGbp: number }>();
    const groupTotals = new Map<
      string,
      { source?: string; incomeGbp: number; expensesGbp: number }
    >();
    if (input.groupBy === "month") {
      for (const m of months) groupTotals.set(m, { incomeGbp: 0, expensesGbp: 0 });
    }
    let income = 0;
    let expenses = 0;
    const rows: z.infer<typeof result>["rows"] = [];

    for (const r of records) {
      const category = safeCategory(r.category);
      if (input.category && category !== input.category) continue;
      const perMonth = monthlyValues(r, months);
      const inYear = perMonth.reduce((a, b) => a + b, 0);
      if (inYear <= 0) continue;
      const source = safeSource(r.source);
      const isIncome = r.type === "income";
      if (isIncome) income += inYear;
      else expenses += inYear;

      const st = sourceTotals.get(source) ?? { incomeGbp: 0, expensesGbp: 0 };
      if (isIncome) st.incomeGbp += inYear;
      else st.expensesGbp += inYear;
      sourceTotals.set(source, st);

      if (input.groupBy === "month") {
        perMonth.forEach((v, i) => {
          const g = groupTotals.get(months[i] as string);
          if (!g || v <= 0) return;
          if (isIncome) g.incomeGbp += v;
          else g.expensesGbp += v;
        });
      } else {
        const gk = `${source}|${category}`;
        const g = groupTotals.get(gk) ?? { source, incomeGbp: 0, expensesGbp: 0 };
        if (isIncome) g.incomeGbp += inYear;
        else g.expensesGbp += inYear;
        groupTotals.set(gk, g);
      }

      rows.push({
        id: shortId(key, "tax", r.id),
        source,
        type: isIncome ? "income" : "expense",
        category,
        frequency: (FREQUENCIES as readonly string[]).includes(r.frequency)
          ? r.frequency
          : "one-off",
        date: r.date,
        endDate: r.endDate ?? null,
        amountGbp: round2(Number(r.amount) || 0),
        inYearGbp: round2(inYear),
        ...(anonymise ? {} : { name: sanitiseText(r.name ?? "") }),
      });
    }

    const unrecognised = rows.filter((r) => r.category === "other").length;
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const cap = MAX_TAX_ROWS[responseFormat];

    return {
      taxYear,
      result: {
        totals: {
          incomeGbp: round2(income),
          expensesGbp: round2(expenses),
          bySource: [...sourceTotals.entries()].map(([source, t]) => ({
            source: source as z.infer<typeof SOURCE>,
            incomeGbp: round2(t.incomeGbp),
            expensesGbp: round2(t.expensesGbp),
          })),
        },
        groupBy: input.groupBy,
        groups: [...groupTotals.entries()].map(([k, g]) => ({
          key: input.groupBy === "month" ? k : k.slice(k.indexOf("|") + 1),
          ...(g.source ? { source: g.source as z.infer<typeof SOURCE> } : {}),
          incomeGbp: round2(g.incomeGbp),
          expensesGbp: round2(g.expensesGbp),
        })),
        rows: rows.slice(0, cap),
        rowCount: rows.length,
        rowsTruncated: rows.length > cap,
        notes: [
          ...(unrecognised > 0
            ? [
                `${unrecognised} record(s) use a category the tax calculation does not recognise (shown as "other"), so get_tax_year_position leaves them out.`,
              ]
            : []),
          "Records are bucketed by calendar month: April belongs wholly to the tax year that starts in it.",
          "A monthly record counts in every month from its date to its end date; one-off and annual records count once, in the month of their date.",
        ],
      },
      provenance: { totals: "tax_records" },
      assumptions,
      missing:
        records.length === 0
          ? [
              {
                field: "taxRecords",
                why: `No tax records fall in ${taxYear}.`,
                askUser: `Do you have income or expenses to record for the ${taxYear} tax year, such as rent received or self-employed income?`,
              },
            ]
          : [],
      notice: MCP_NOTICE,
    };
  },
});
