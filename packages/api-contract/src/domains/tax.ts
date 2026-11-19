import { z } from "zod";
import { IsoDate, IsoDateTime, Money, Notes, ResponseMoney, Uuid } from "../primitives.js";

export const TAX_RECORD_TYPES = ["income", "expense"] as const;
export const TAX_RECORD_SOURCES = ["paye", "self-employed", "rental", "savings"] as const;
export const TAX_RECORD_FREQUENCIES = ["one-off", "monthly", "annual"] as const;

export const RECEIPT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

/**
 * The legacy PAYE salary category. The saved profile salary is the one salary figure (slice 6),
 * so a record can no longer be written as salary; migration RemovePayeSalaryRecords copied the
 * latest old one into an empty profile salary and removed them.
 */
export const LEGACY_PAYE_SALARY_CATEGORY = "paye_salary";

/**
 * Residential finance costs not relieved in earlier years (ITTOIA 2005 s.274AA(4)), entered as a
 * rental expense record in the year they are used. The engine reads the same id
 * (`FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY` in finance-engine).
 */
export const FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY = "finance_costs_brought_forward";

interface RecordShape {
  category?: string;
  source?: string;
  type?: string;
  frequency?: string;
}

/**
 * Why a record breaks the brought-forward rules, or null. That category is one figure for one
 * year, so it must be a rental expense and not monthly. Fields left out are not checked here, so
 * a partial update is checked again on the merged record (the backend's updateRecord).
 */
export const broughtForwardRuleError = (
  record: RecordShape,
): { path: "source" | "type" | "frequency"; message: string } | null => {
  if (record.category?.trim() !== FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY) return null;
  if (record.source !== undefined && record.source !== "rental") {
    return { path: "source", message: "Finance costs brought forward are rental records" };
  }
  if (record.type !== undefined && record.type !== "expense") {
    return { path: "type", message: "Finance costs brought forward are an expense" };
  }
  if (record.frequency === "monthly") {
    return { path: "frequency", message: "Finance costs brought forward are one figure a year" };
  }
  return null;
};

/**
 * The categories a record can be written with, one list per source: the ids the finance engine
 * counts (`ALL_TAX_CATEGORIES` in finance-engine `tax-calculator.ts`), without the legacy PAYE
 * salary. The engine leaves out any category it does not list, so the contract accepts only
 * these. Stored rows with other categories stay readable and deletable (`TaxRecordDto` is not
 * checked).
 *
 * The contract holds the ids itself, with no import of the engine: scripts load the contract's
 * source before anything is built, and the engine resolves to its build output. A contract test
 * (`tax.requests.test.ts`) fails if these lists and the engine's ever differ.
 */
export const TAX_RECORD_CATEGORIES = {
  paye: ["paye_bonus", "paye_benefit", "paye_pension"],
  "self-employed": [
    "self_employed_income",
    "office_costs",
    "travel_costs",
    "clothing_costs",
    "staff_costs",
    "premises_costs",
    "legal_finance_fees",
    "advertising_marketing",
    "stock_raw_materials",
    "other_expenses",
  ],
  rental: [
    "rental_income",
    "rent_rates_insurance",
    "legal_management_fees",
    "repairs_maintenance",
    "replace_domestic_items",
    "services_costs",
    "mortgage_interest",
    FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY,
  ],
  savings: ["savings_interest", "dividend_income", "isa_interest", "investment_fees"],
} as const satisfies Readonly<Record<(typeof TAX_RECORD_SOURCES)[number], readonly string[]>>;

const UNKNOWN_CATEGORY_MESSAGE = "Choose a category from the list for this income source";

const isListedCategory = (source: string | undefined, category: string): boolean =>
  source === undefined
    ? Object.values(TAX_RECORD_CATEGORIES).some((list) =>
        (list as readonly string[]).includes(category),
      )
    : (
        (TAX_RECORD_CATEGORIES[source as keyof typeof TAX_RECORD_CATEGORIES] ??
          []) as readonly string[]
      ).includes(category);

/**
 * Why a record's category is not one it can be written with, or null. With no source (a partial
 * update) the category only has to be on some list; the backend checks the merged record.
 */
export const taxCategoryError = (
  record: RecordShape,
): { path: "category"; message: string } | null => {
  const category = record.category?.trim();
  if (category === undefined || category === LEGACY_PAYE_SALARY_CATEGORY) return null;
  return isListedCategory(record.source, category)
    ? null
    : { path: "category", message: UNKNOWN_CATEGORY_MESSAGE };
};

const recordRules = (record: RecordShape, ctx: z.RefinementCtx) => {
  const error = broughtForwardRuleError(record) ?? taxCategoryError(record);
  if (error) ctx.addIssue({ code: "custom", path: [error.path], message: error.message });
};

const taxRecordFields = {
  type: z.enum(TAX_RECORD_TYPES),
  source: z.enum(TAX_RECORD_SOURCES),
  category: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((category) => category !== LEGACY_PAYE_SALARY_CATEGORY, {
      message: "Salary is saved on your profile, not as a tax record",
    }),
  name: z.string().trim().min(1).max(120),
  amount: Money,
  frequency: z.enum(TAX_RECORD_FREQUENCIES),
  date: IsoDate,
  endDate: IsoDate.nullable(),
  notes: Notes.nullable(),
  receiptFilename: z.string().max(255).nullable(),
  receiptMimeType: z.enum(RECEIPT_MIME_TYPES).nullable(),
  // Decoded size limits and magic-byte sniffing belong to E20 Q9 (receipt-validation.ts).
  receiptData: z.string().nullable(),
};

/** `frequency` defaults to "one-off" in the column, so it is optional on create. */
const CreateTaxRecordFields = z.strictObject({
  ...taxRecordFields,
  frequency: taxRecordFields.frequency.optional(),
  endDate: taxRecordFields.endDate.optional(),
  notes: taxRecordFields.notes.optional(),
  receiptFilename: taxRecordFields.receiptFilename.optional(),
  receiptMimeType: taxRecordFields.receiptMimeType.optional(),
  receiptData: taxRecordFields.receiptData.optional(),
});

export const CreateTaxRecordRequest = CreateTaxRecordFields.superRefine(recordRules);

export const UpdateTaxRecordRequest = CreateTaxRecordFields.partial().superRefine(recordRules);

/** Most records (and most caps) one `POST tax-records/bulk` accepts; the backend handler enforces it too. */
export const MAX_BULK_TAX_RECORDS = 500;

/** One previous-year record to close: web sends `{id, endDate}` pairs (CopyTaxYearModal). */
export const TaxRecordCap = z.strictObject({ id: z.uuid(), endDate: IsoDate });
export type TaxRecordCap = z.infer<typeof TaxRecordCap>;

export const BulkCreateTaxRecordsRequest = z.strictObject({
  records: z.array(CreateTaxRecordRequest).max(MAX_BULK_TAX_RECORDS),
  capPreviousRecordIds: z.array(TaxRecordCap).max(MAX_BULK_TAX_RECORDS).optional(),
});
export type BulkCreateTaxRecordsRequest = z.infer<typeof BulkCreateTaxRecordsRequest>;

/**
 * A tax record as the client receives it. Never carries `receiptData` (the bytes come only from
 * `GET tax-records/:id/receipt`); `hasReceipt` says whether there are any. Nullable columns are
 * always present (null when unset), on reads and writes alike. `userId` is the caller's own id.
 */
export const TaxRecordDto = z.strictObject({
  id: Uuid,
  userId: z.string(),
  type: z.enum(TAX_RECORD_TYPES),
  source: z.enum(TAX_RECORD_SOURCES),
  category: z.string(),
  name: z.string(),
  amount: ResponseMoney,
  frequency: z.enum(TAX_RECORD_FREQUENCIES),
  date: IsoDate,
  endDate: IsoDate.nullable(),
  notes: z.string().nullable(),
  receiptFilename: z.string().nullable(),
  receiptMimeType: z.enum(RECEIPT_MIME_TYPES).nullable(),
  hasReceipt: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type TaxRecordDto = z.infer<typeof TaxRecordDto>;

/** `GET tax-records` and `POST tax-records/bulk` (the created records; `[]` for a cap-only call). */
export const TaxRecordListResponse = z.array(TaxRecordDto);
export type TaxRecordListResponse = z.infer<typeof TaxRecordListResponse>;

/** `GET tax-records/:id`, `POST tax-records` and `PATCH tax-records/:id`. */
export const TaxRecordResponse = TaxRecordDto;
export type TaxRecordResponse = z.infer<typeof TaxRecordResponse>;

/** `DELETE tax-records/:id`. */
export const DeleteTaxRecordResponse = z.strictObject({ success: z.literal(true) });
export type DeleteTaxRecordResponse = z.infer<typeof DeleteTaxRecordResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type CreateTaxRecordRequest = z.infer<typeof CreateTaxRecordRequest>;
export type UpdateTaxRecordRequest = z.infer<typeof UpdateTaxRecordRequest>;
