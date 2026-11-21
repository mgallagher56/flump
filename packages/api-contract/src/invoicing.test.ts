import { describe, expect, it } from "vitest";
import {
  CreateInvoiceRequest,
  CreateWorkLogEntryRequest,
  InvoiceDto,
  InvoiceListQuery,
  InvoicingSettingsDto,
  MarkInvoicePaidRequest,
  UpdateInvoiceRequest,
  UpdateInvoicingSettingsRequest,
  UpdateWorkLogEntryRequest,
  WorkLogListQuery,
} from "./domains/invoicing.js";

describe("invoicing contract schemas (E37 S1)", () => {
  it("validates InvoicingSettingsDto and UpdateInvoicingSettingsRequest with optional vatNumber", () => {
    const settings = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      defaultHourlyRate: 75,
      businessName: "Studio Ltd",
      businessAddress: "12 High Street, London",
      businessEmail: "billing@studio.example",
      vatNumber: "GB123456789",
      invoicePrefix: "INV-",
      nextInvoiceSequence: 1,
      defaultPaymentTermsDays: 30,
      createdAt: "2026-11-21T10:00:00.000Z",
      updatedAt: "2026-11-21T10:00:00.000Z",
    };
    expect(InvoicingSettingsDto.safeParse(settings).success).toBe(true);
    expect(InvoicingSettingsDto.safeParse({ ...settings, extra: true }).success).toBe(false);

    const parsedUpdate = UpdateInvoicingSettingsRequest.parse({
      defaultHourlyRate: 85,
      businessName: "  Studio Ltd  ",
      vatNumber: "  GB123456789  ",
      invoicePrefix: "  INV-  ",
      nextInvoiceSequence: 5,
      defaultPaymentTermsDays: 14,
    });
    expect(parsedUpdate.businessName).toBe("Studio Ltd");
    expect(parsedUpdate.vatNumber).toBe("GB123456789");
    expect(parsedUpdate.invoicePrefix).toBe("INV-");

    expect(UpdateInvoicingSettingsRequest.safeParse({ defaultHourlyRate: -1 }).success).toBe(false);
    expect(UpdateInvoicingSettingsRequest.safeParse({ nextInvoiceSequence: 0 }).success).toBe(
      false,
    );
  });

  it("validates CreateWorkLogEntryRequest, UpdateWorkLogEntryRequest, and WorkLogListQuery", () => {
    const validCreate = CreateWorkLogEntryRequest.parse({
      date: "2026-11-21",
      description: "  API integration work  ",
      hoursWorked: 3.75,
      hourlyRate: 80,
      clientName: "  Acme Ltd  ",
      incomeSource: "self-employed",
    });
    expect(validCreate.description).toBe("API integration work");
    expect(validCreate.clientName).toBe("Acme Ltd");

    expect(
      CreateWorkLogEntryRequest.safeParse({
        date: "2026-11-21",
        description: "Work",
        hoursWorked: 1.125, // > 2dp rejected
        hourlyRate: 80,
      }).success,
    ).toBe(false);

    expect(UpdateWorkLogEntryRequest.safeParse({ hoursWorked: 2.5 }).success).toBe(true);
    expect(
      WorkLogListQuery.safeParse({
        fromDate: "2026-04-06",
        toDate: "2027-04-05",
        billed: "false",
        limit: "50",
      }).success,
    ).toBe(true);
  });

  it("validates CreateInvoiceRequest, UpdateInvoiceRequest, MarkInvoicePaidRequest, and InvoiceDto", () => {
    const entryId = "123e4567-e89b-12d3-a456-426614174001";
    const createNoVat = CreateInvoiceRequest.parse({
      workLogEntryIds: [entryId],
      clientName: "  Acme Client  ",
      issueDate: "2026-11-21",
    });
    expect(createNoVat.clientName).toBe("Acme Client");
    expect(createNoVat.vatRatePct).toBeUndefined();

    const createWithVat = CreateInvoiceRequest.parse({
      workLogEntryIds: [entryId],
      clientName: "Acme Client",
      issueDate: "2026-11-21",
      vatRatePct: 20,
    });
    expect(createWithVat.vatRatePct).toBe(20);

    expect(
      CreateInvoiceRequest.safeParse({
        workLogEntryIds: [],
        clientName: "Acme",
        issueDate: "2026-11-21",
      }).success,
    ).toBe(false);

    expect(UpdateInvoiceRequest.safeParse({ vatRatePct: null }).success).toBe(true);
    expect(MarkInvoicePaidRequest.safeParse({ paidDate: "2026-11-25" }).success).toBe(true);
    expect(InvoiceListQuery.safeParse({ status: "issued", limit: "25" }).success).toBe(true);

    const dto = {
      id: "123e4567-e89b-12d3-a456-426614174002",
      invoiceNumber: "INV-0001",
      status: "issued",
      clientName: "Acme Client",
      clientEmail: null,
      clientAddress: null,
      issueDate: "2026-11-21",
      dueDate: "2026-12-21",
      paidDate: null,
      taxYear: "2026/27",
      lineCount: 1,
      totalHours: 10,
      subtotal: 1250,
      vatRatePct: 20,
      vatAmount: 250,
      total: 1500,
      notes: null,
      taxRecordId: null,
      entries: [],
      createdAt: "2026-11-21T10:00:00.000Z",
      updatedAt: "2026-11-21T10:00:00.000Z",
    };
    expect(InvoiceDto.safeParse(dto).success).toBe(true);
  });
});
