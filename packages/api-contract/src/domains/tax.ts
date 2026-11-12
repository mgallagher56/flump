import { z } from "zod";
import { IsoDate, Money, Notes } from "../primitives.js";

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
export const CreateTaxRecordRequest = z.object({
  ...taxRecordFields,
  frequency: taxRecordFields.frequency.optional(),
  endDate: taxRecordFields.endDate.optional(),
  notes: taxRecordFields.notes.optional(),
  receiptFilename: taxRecordFields.receiptFilename.optional(),
  receiptMimeType: taxRecordFields.receiptMimeType.optional(),
  receiptData: taxRecordFields.receiptData.optional(),
});

export const UpdateTaxRecordRequest = CreateTaxRecordRequest.partial();

export const BulkCreateTaxRecordsRequest = z.object({
  records: z.array(CreateTaxRecordRequest).max(500),
  capPreviousRecordIds: z.array(z.uuid()).max(500).optional(),
});
