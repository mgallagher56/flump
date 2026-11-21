import { z } from "zod";
import { pageQueryShape } from "../pagination.js";
import {
  hasAtMostTwoDecimals,
  IsoDate,
  IsoDateTime,
  MoneyNonNegative,
  Notes,
  Percent,
  ResponseMoney,
  Uuid,
} from "../primitives.js";

export const INVOICE_STATUSES = ["draft", "issued", "paid", "void"] as const;
export const InvoiceStatus = z.enum(INVOICE_STATUSES);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const WORK_LOG_INCOME_SOURCES = ["self-employed"] as const;
export const WorkLogIncomeSource = z.enum(WORK_LOG_INCOME_SOURCES);
export type WorkLogIncomeSource = z.infer<typeof WorkLogIncomeSource>;

export const HoursWorked = z
  .number()
  .finite()
  .min(0)
  .max(10_000)
  .refine(hasAtMostTwoDecimals, "hoursWorked must have at most 2 decimal places");

const TrimmedName200 = z.string().trim().min(1).max(200);
const TrimmedAddress500 = z.string().trim().min(1).max(500);
const TrimmedEmail = z.string().trim().email().max(254);
const TrimmedVatNumber = z.string().trim().min(1).max(32);

export const InvoicingSettingsDto = z.strictObject({
  id: Uuid.nullable(),
  defaultHourlyRate: ResponseMoney.nullable(),
  businessName: z.string().nullable(),
  businessAddress: z.string().nullable(),
  businessEmail: z.string().nullable(),
  vatNumber: z.string().nullable(),
  invoicePrefix: z.string(),
  nextInvoiceSequence: z.number().int().min(1),
  defaultPaymentTermsDays: z.number().int().min(0),
  createdAt: IsoDateTime.nullable(),
  updatedAt: IsoDateTime.nullable(),
});
export type InvoicingSettingsDto = z.infer<typeof InvoicingSettingsDto>;

export const InvoicingSettingsResponse = z.strictObject({
  settings: InvoicingSettingsDto,
});
export type InvoicingSettingsResponse = z.infer<typeof InvoicingSettingsResponse>;

export const UpdateInvoicingSettingsRequest = z.strictObject({
  defaultHourlyRate: MoneyNonNegative.nullable().optional(),
  businessName: TrimmedName200.nullable().optional(),
  businessAddress: TrimmedAddress500.nullable().optional(),
  businessEmail: TrimmedEmail.nullable().optional(),
  vatNumber: TrimmedVatNumber.nullable().optional(),
  invoicePrefix: z.string().trim().min(1).max(20).optional(),
  nextInvoiceSequence: z.number().int().min(1).max(999_999_999).optional(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
});
export type UpdateInvoicingSettingsRequest = z.infer<typeof UpdateInvoicingSettingsRequest>;

export const WorkLogEntryDto = z.strictObject({
  id: Uuid,
  date: IsoDate,
  description: z.string(),
  hoursWorked: ResponseMoney,
  hourlyRate: ResponseMoney,
  amount: ResponseMoney,
  clientName: z.string().nullable(),
  incomeSource: WorkLogIncomeSource,
  invoiceId: Uuid.nullable(),
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type WorkLogEntryDto = z.infer<typeof WorkLogEntryDto>;

export const WorkLogEntryResponse = z.strictObject({
  entry: WorkLogEntryDto,
});
export type WorkLogEntryResponse = z.infer<typeof WorkLogEntryResponse>;

export const WorkLogEntryListResponse = z.strictObject({
  entries: z.array(WorkLogEntryDto),
  nextCursor: z.string().nullable(),
});
export type WorkLogEntryListResponse = z.infer<typeof WorkLogEntryListResponse>;

export const CreateWorkLogEntryRequest = z.strictObject({
  date: IsoDate,
  description: z.string().trim().min(1).max(500),
  hoursWorked: HoursWorked,
  hourlyRate: MoneyNonNegative,
  clientName: TrimmedName200.nullable().optional(),
  incomeSource: WorkLogIncomeSource.optional(),
  notes: Notes.nullable().optional(),
});
export type CreateWorkLogEntryRequest = z.infer<typeof CreateWorkLogEntryRequest>;

export const UpdateWorkLogEntryRequest = z.strictObject({
  date: IsoDate.optional(),
  description: z.string().trim().min(1).max(500).optional(),
  hoursWorked: HoursWorked.optional(),
  hourlyRate: MoneyNonNegative.optional(),
  clientName: TrimmedName200.nullable().optional(),
  incomeSource: WorkLogIncomeSource.optional(),
  notes: Notes.nullable().optional(),
});
export type UpdateWorkLogEntryRequest = z.infer<typeof UpdateWorkLogEntryRequest>;

export const DeleteWorkLogEntryResponse = z.strictObject({
  id: Uuid,
});
export type DeleteWorkLogEntryResponse = z.infer<typeof DeleteWorkLogEntryResponse>;

export const WorkLogListQuery = z.strictObject({
  ...pageQueryShape("workLogs"),
  fromDate: IsoDate.optional(),
  toDate: IsoDate.optional(),
  billed: z.enum(["true", "false"]).optional(),
  invoiceId: Uuid.optional(),
  incomeSource: WorkLogIncomeSource.optional(),
});
export type WorkLogListQuery = z.infer<typeof WorkLogListQuery>;

export const InvoiceDto = z.strictObject({
  id: Uuid,
  invoiceNumber: z.string(),
  status: InvoiceStatus,
  clientName: z.string(),
  clientEmail: z.string().nullable(),
  clientAddress: z.string().nullable(),
  issueDate: IsoDate,
  dueDate: IsoDate,
  paidDate: IsoDate.nullable(),
  taxYear: z.string(),
  lineCount: z.number().int().min(0),
  totalHours: ResponseMoney,
  subtotal: ResponseMoney,
  vatRatePct: Percent.nullable(),
  vatAmount: ResponseMoney,
  total: ResponseMoney,
  notes: z.string().nullable(),
  taxRecordId: Uuid.nullable(),
  entries: z.array(WorkLogEntryDto),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type InvoiceDto = z.infer<typeof InvoiceDto>;

export const InvoiceResponse = z.strictObject({
  invoice: InvoiceDto,
});
export type InvoiceResponse = z.infer<typeof InvoiceResponse>;

export const InvoiceListResponse = z.strictObject({
  invoices: z.array(InvoiceDto),
  nextCursor: z.string().nullable(),
});
export type InvoiceListResponse = z.infer<typeof InvoiceListResponse>;

export const CreateInvoiceRequest = z.strictObject({
  workLogEntryIds: z.array(Uuid).min(1).max(200),
  clientName: TrimmedName200,
  clientEmail: TrimmedEmail.nullable().optional(),
  clientAddress: TrimmedAddress500.nullable().optional(),
  issueDate: IsoDate,
  dueDate: IsoDate.optional(),
  vatRatePct: Percent.nullable().optional(),
  notes: Notes.nullable().optional(),
});
export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceRequest>;

export const UpdateInvoiceRequest = z.strictObject({
  workLogEntryIds: z.array(Uuid).min(1).max(200).optional(),
  clientName: TrimmedName200.optional(),
  clientEmail: TrimmedEmail.nullable().optional(),
  clientAddress: TrimmedAddress500.nullable().optional(),
  issueDate: IsoDate.optional(),
  dueDate: IsoDate.optional(),
  vatRatePct: Percent.nullable().optional(),
  notes: Notes.nullable().optional(),
});
export type UpdateInvoiceRequest = z.infer<typeof UpdateInvoiceRequest>;

export const IssueInvoiceRequest = z.strictObject({});
export type IssueInvoiceRequest = z.infer<typeof IssueInvoiceRequest>;

export const MarkInvoicePaidRequest = z.strictObject({
  paidDate: IsoDate,
});
export type MarkInvoicePaidRequest = z.infer<typeof MarkInvoicePaidRequest>;

export const VoidInvoiceRequest = z.strictObject({});
export type VoidInvoiceRequest = z.infer<typeof VoidInvoiceRequest>;

export const DeleteInvoiceResponse = z.strictObject({
  id: Uuid,
});
export type DeleteInvoiceResponse = z.infer<typeof DeleteInvoiceResponse>;

export const InvoiceListQuery = z.strictObject({
  ...pageQueryShape("invoices"),
  status: InvoiceStatus.optional(),
  fromDate: IsoDate.optional(),
  toDate: IsoDate.optional(),
});
export type InvoiceListQuery = z.infer<typeof InvoiceListQuery>;
