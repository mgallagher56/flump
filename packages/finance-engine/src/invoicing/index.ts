/**
 * Pure invoicing and billable work-log calculations (E37 S0 + section 10).
 *
 * Single source of truth for line amounts, invoice totals, VAT rounding,
 * invoice number formatting, KPI summaries, and UK tax year grouping.
 */

import { getUkTaxYearForDate } from "../uk-tax-year.js";

export { getUkTaxYearForDate };

export interface InvoiceLineInput {
  hoursWorked: number;
  amount: number;
}

export interface InvoiceTotals {
  lineCount: number;
  totalHours: number;
  subtotal: number;
  /** User-entered VAT rate percentage (e.g. 20 for 20%), or null when VAT is not set. */
  vatRatePct: number | null;
  vatAmount: number;
  total: number;
}

export interface InvoicingKpiWorkLogInput {
  hoursWorked: number;
  amount: number;
  invoiceId?: string | null;
}

export interface InvoicingKpiInvoiceInput {
  status: "draft" | "issued" | "paid" | "void";
  issueDate: string;
  paidDate?: string | null;
  subtotal: number;
  total: number;
}

export interface InvoicingKpiSummary {
  unbilledEntryCount: number;
  unbilledHours: number;
  unbilledAmount: number;
  outstandingInvoiceCount: number;
  outstandingAmount: number;
  paidInTaxYearCount: number;
  paidInTaxYearAmount: number;
  paidInTaxYearSubtotal: number;
  taxYear: string;
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

/**
 * Rounds a non-negative pound figure to the nearest penny, half a penny up.
 * Scales the epsilon tolerance with magnitude so half-penny float representations
 * such as 35.855 do not round down.
 */
export function roundHalfUpPence(value: number): number {
  const eps = Number.EPSILON * Math.max(1, value);
  return Math.round((value + eps) * 100) / 100;
}

/**
 * Computes a single work log entry amount in pounds, rounded half-up to 2 decimal places.
 */
export function calculateWorkLogAmount(hoursWorked: number, hourlyRate: number): number {
  assertNonNegativeFinite(hoursWorked, "hoursWorked");
  assertNonNegativeFinite(hourlyRate, "hourlyRate");
  return roundHalfUpPence(hoursWorked * hourlyRate);
}

export const calculateWorkItemAmount = calculateWorkLogAmount;

/**
 * Computes invoice totals from linked work log entries and an optional user-typed VAT rate.
 * Never defaults or suggests a VAT rate: omitting `vatRatePct` (or passing `null`) leaves
 * `vatRatePct` as `null` and `vatAmount` as `0`.
 */
export function calculateInvoiceTotals(
  entries: ReadonlyArray<InvoiceLineInput>,
  vatRatePct?: number | null,
): InvoiceTotals {
  let hoursSum = 0;
  let amountSum = 0;
  for (const entry of entries) {
    assertNonNegativeFinite(entry.hoursWorked, "hoursWorked");
    assertNonNegativeFinite(entry.amount, "amount");
    hoursSum += entry.hoursWorked;
    amountSum += entry.amount;
  }

  const totalHours = roundHalfUpPence(hoursSum);
  const subtotal = roundHalfUpPence(amountSum);

  let resolvedVatRatePct: number | null = null;
  let vatAmount = 0;
  if (vatRatePct !== undefined && vatRatePct !== null) {
    assertNonNegativeFinite(vatRatePct, "vatRatePct");
    if (vatRatePct > 100) {
      throw new RangeError("vatRatePct must be at most 100");
    }
    resolvedVatRatePct = vatRatePct;
    vatAmount = roundHalfUpPence((subtotal * vatRatePct) / 100);
  }

  const total = roundHalfUpPence(subtotal + vatAmount);

  return {
    lineCount: entries.length,
    totalHours,
    subtotal,
    vatRatePct: resolvedVatRatePct,
    vatAmount,
    total,
  };
}

/**
 * Formats an invoice number from prefix, sequence number, and optional zero-padding length.
 */
export function formatInvoiceNumber(prefix: string, sequence: number, padLength = 4): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError("sequence must be a positive integer");
  }
  if (!Number.isInteger(padLength) || padLength < 0) {
    throw new RangeError("padLength must be a non-negative integer");
  }
  return `${prefix}${String(sequence).padStart(padLength, "0")}`;
}

/**
 * Summarises the 4 top-level invoicing KPI figures for the `<KpiStrip>`:
 * unbilled hours, unbilled amount, outstanding issued invoices, and paid invoices in the given UK tax year.
 */
export function summarizeInvoicingKpis(
  entries: ReadonlyArray<InvoicingKpiWorkLogInput>,
  invoices: ReadonlyArray<InvoicingKpiInvoiceInput>,
  taxYear: string,
): InvoicingKpiSummary {
  let unbilledEntryCount = 0;
  let unbilledHoursSum = 0;
  let unbilledAmountSum = 0;

  for (const entry of entries) {
    if (entry.invoiceId === null) {
      unbilledEntryCount += 1;
      unbilledHoursSum += entry.hoursWorked;
      unbilledAmountSum += entry.amount;
    }
  }

  let outstandingInvoiceCount = 0;
  let outstandingAmountSum = 0;
  let paidInTaxYearCount = 0;
  let paidInTaxYearAmountSum = 0;
  let paidInTaxYearSubtotalSum = 0;

  for (const invoice of invoices) {
    if (invoice.status === "issued") {
      outstandingInvoiceCount += 1;
      outstandingAmountSum += invoice.total;
    } else if (invoice.status === "paid") {
      const effectiveDate = invoice.paidDate ?? invoice.issueDate;
      if (getUkTaxYearForDate(effectiveDate) === taxYear) {
        paidInTaxYearCount += 1;
        paidInTaxYearAmountSum += invoice.total;
        paidInTaxYearSubtotalSum += invoice.subtotal;
      }
    }
  }

  return {
    unbilledEntryCount,
    unbilledHours: roundHalfUpPence(unbilledHoursSum),
    unbilledAmount: roundHalfUpPence(unbilledAmountSum),
    outstandingInvoiceCount,
    outstandingAmount: roundHalfUpPence(outstandingAmountSum),
    paidInTaxYearCount,
    paidInTaxYearAmount: roundHalfUpPence(paidInTaxYearAmountSum),
    paidInTaxYearSubtotal: roundHalfUpPence(paidInTaxYearSubtotalSum),
    taxYear,
  };
}

export interface WorkLogCsvRowInput {
  date: string;
  description: string;
  hoursWorked: number;
  hourlyRate: number;
  amount: number;
  invoiceNumber?: string | null;
  status?: string | null;
  clientName?: string | null;
}

export interface InvoiceCsvRowInput {
  invoiceNumber: string;
  status: "draft" | "issued" | "paid" | "void";
  clientName: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  taxYear: string;
  totalHours: number;
  subtotal: number;
  vatRatePct?: number | null;
  vatAmount: number;
  total: number;
}

const FORMULA_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Formats and escapes a single CSV cell per RFC 4180 while neutralising spreadsheet
 * formula injection: any cell whose raw or left-trimmed string begins with `=`, `+`,
 * `-`, `@`, `\t`, or `\r` is prefixed with a single quote `'`.
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("CSV numeric cell must be a finite number");
    }
    return String(value);
  }
  const safe =
    FORMULA_INJECTION_PREFIX_RE.test(value) || FORMULA_INJECTION_PREFIX_RE.test(value.trimStart())
      ? `'${value}`
      : value;

  if (safe.includes(",") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

function formatFixed2(value: number, label: string): string {
  assertNonNegativeFinite(value, label);
  return roundHalfUpPence(value).toFixed(2);
}

/**
 * Exports work log entries as an RFC 4180 CSV string with formula-safe string cells.
 * Columns (E37 section 7): `date,description,hoursWorked,hourlyRate,amount,invoiceNumber,status,clientName`.
 */
export function formatWorkLogsCsv(entries: ReadonlyArray<WorkLogCsvRowInput>): string {
  const header = "date,description,hoursWorked,hourlyRate,amount,invoiceNumber,status,clientName";
  const rows = entries.map((entry) => {
    const resolvedStatus = entry.status ?? (entry.invoiceNumber ? "billed" : "unbilled");
    return [
      sanitizeCsvCell(entry.date),
      sanitizeCsvCell(entry.description),
      formatFixed2(entry.hoursWorked, "hoursWorked"),
      formatFixed2(entry.hourlyRate, "hourlyRate"),
      formatFixed2(entry.amount, "amount"),
      sanitizeCsvCell(entry.invoiceNumber ?? ""),
      sanitizeCsvCell(resolvedStatus),
      sanitizeCsvCell(entry.clientName ?? ""),
    ].join(",");
  });
  return [header, ...rows].join("\r\n");
}

/**
 * Exports invoices as an RFC 4180 CSV string with formula-safe string cells.
 * Columns (E37 sections 7 & 10):
 * `invoiceNumber,status,clientName,issueDate,dueDate,paidDate,taxYear,totalHours,subtotal,vatRatePct,vatAmount,total`.
 */
export function formatInvoicesCsv(invoices: ReadonlyArray<InvoiceCsvRowInput>): string {
  const header =
    "invoiceNumber,status,clientName,issueDate,dueDate,paidDate,taxYear,totalHours,subtotal,vatRatePct,vatAmount,total";
  const rows = invoices.map((inv) => {
    let vatRateCell = "";
    if (inv.vatRatePct !== undefined && inv.vatRatePct !== null) {
      assertNonNegativeFinite(inv.vatRatePct, "vatRatePct");
      vatRateCell = String(inv.vatRatePct);
    }
    return [
      sanitizeCsvCell(inv.invoiceNumber),
      sanitizeCsvCell(inv.status),
      sanitizeCsvCell(inv.clientName),
      sanitizeCsvCell(inv.issueDate),
      sanitizeCsvCell(inv.dueDate),
      sanitizeCsvCell(inv.paidDate ?? ""),
      sanitizeCsvCell(inv.taxYear),
      formatFixed2(inv.totalHours, "totalHours"),
      formatFixed2(inv.subtotal, "subtotal"),
      vatRateCell,
      formatFixed2(inv.vatAmount, "vatAmount"),
      formatFixed2(inv.total, "total"),
    ].join(",");
  });
  return [header, ...rows].join("\r\n");
}
