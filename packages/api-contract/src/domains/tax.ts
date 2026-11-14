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

const taxRecordFields = {
  type: z.enum(TAX_RECORD_TYPES),
  source: z.enum(TAX_RECORD_SOURCES),
  category: z.string().trim().min(1).max(64),
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
export const CreateTaxRecordRequest = z.strictObject({
  ...taxRecordFields,
  frequency: taxRecordFields.frequency.optional(),
  endDate: taxRecordFields.endDate.optional(),
  notes: taxRecordFields.notes.optional(),
  receiptFilename: taxRecordFields.receiptFilename.optional(),
  receiptMimeType: taxRecordFields.receiptMimeType.optional(),
  receiptData: taxRecordFields.receiptData.optional(),
});

export const UpdateTaxRecordRequest = CreateTaxRecordRequest.partial();

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
