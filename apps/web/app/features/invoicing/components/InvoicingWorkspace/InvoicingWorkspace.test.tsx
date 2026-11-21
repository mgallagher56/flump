import type { InvoiceDto, InvoicingSettingsDto, WorkLogEntryDto } from "@flump/api-contract";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoicingWorkspace } from "./InvoicingWorkspace";

const settingsFixture: InvoicingSettingsDto = {
  id: "11111111-1111-4111-8111-111111111111",
  defaultHourlyRate: 80,
  businessName: "Studio North Ltd",
  businessAddress: "14 King Street, Manchester",
  businessEmail: "billing@studionorth.example",
  vatNumber: "GB123456789",
  invoicePrefix: "INV-",
  nextInvoiceSequence: 3,
  defaultPaymentTermsDays: 30,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-15T10:00:00.000Z",
};

const workLogsFixture: WorkLogEntryDto[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    date: "2026-11-18",
    description: "Frontend accessibility pass",
    hoursWorked: 10,
    hourlyRate: 62.5,
    amount: 625,
    clientName: "Britannia Media Ltd",
    incomeSource: "self-employed",
    invoiceId: null,
    notes: null,
    createdAt: "2026-11-18T17:00:00.000Z",
    updatedAt: "2026-11-18T17:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    date: "2026-11-19",
    description: "Backend contract wiring",
    hoursWorked: 10,
    hourlyRate: 62.5,
    amount: 625,
    clientName: "Britannia Media Ltd",
    incomeSource: "self-employed",
    invoiceId: null,
    notes: null,
    createdAt: "2026-11-19T17:00:00.000Z",
    updatedAt: "2026-11-19T17:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    date: "2026-11-05",
    description: "Locked billed entry",
    hoursWorked: 5,
    hourlyRate: 80,
    amount: 400,
    clientName: "Albion Retail",
    incomeSource: "self-employed",
    invoiceId: "33333333-3333-4333-8333-333333333301",
    notes: null,
    createdAt: "2026-11-05T17:00:00.000Z",
    updatedAt: "2026-11-05T17:00:00.000Z",
  },
];

const invoicesFixture: InvoiceDto[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    invoiceNumber: "INV-0001",
    status: "issued",
    clientName: "Albion Retail",
    clientEmail: "finance@albion.example",
    clientAddress: null,
    issueDate: "2026-11-06",
    dueDate: "2026-12-06",
    paidDate: null,
    taxYear: "2026/27",
    lineCount: 1,
    totalHours: 20,
    subtotal: 1250,
    vatRatePct: 20,
    vatAmount: 250,
    total: 1500,
    notes: "Payment within 30 days",
    taxRecordId: null,
    entries: [workLogsFixture[2] as WorkLogEntryDto],
    createdAt: "2026-11-06T09:00:00.000Z",
    updatedAt: "2026-11-06T09:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    invoiceNumber: "INV-0002",
    status: "draft",
    clientName: "Draft Client Co",
    clientEmail: null,
    clientAddress: null,
    issueDate: "2026-11-15",
    dueDate: "2026-12-15",
    paidDate: null,
    taxYear: "2026/27",
    lineCount: 1,
    totalHours: 3.33,
    subtotal: 333.33,
    vatRatePct: null,
    vatAmount: 0,
    total: 333.33,
    notes: null,
    taxRecordId: null,
    entries: [],
    createdAt: "2026-11-15T09:00:00.000Z",
    updatedAt: "2026-11-15T09:00:00.000Z",
  },
];

describe("InvoicingWorkspace (E37 S2)", () => {
  it("renders the 4 KPI strip figures from @repo/finance-engine and the VAT helper line", () => {
    render(
      <InvoicingWorkspace
        settings={settingsFixture}
        settingsEtag='"2026-11-15T10:00:00.000Z"'
        workLogs={workLogsFixture}
        invoices={invoicesFixture}
        todayIso="2026-11-21"
      />,
    );

    // Working:
    // Unbilled hours: 10 + 10 = 20.00 hrs across 2 unbilled entries
    // Unbilled amount: £625 + £625 = £1,250
    // Outstanding issued invoices: INV-0001 total = £1,500 (1 issued)
    expect(screen.getAllByText("20.00 hrs").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 unbilled entries")).toBeTruthy();
    expect(screen.getAllByText("£1,250").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("£1,500").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 issued")).toBeTruthy();

    // Owner-approved helper line beside VAT rate input (never defaulted or suggested)
    expect(screen.getAllByText("Leave empty for no VAT.").length).toBeGreaterThanOrEqual(1);
    const vatInput = screen.getByLabelText("VAT rate (%)") as HTMLInputElement;
    expect(vatInput.value).toBe("");
  });

  it("submits a new work log entry with pre-filled default hourly rate and live line amount", () => {
    const onCreateWorkLog = vi.fn();
    render(
      <InvoicingWorkspace
        settings={settingsFixture}
        settingsEtag='"2026-11-15T10:00:00.000Z"'
        workLogs={workLogsFixture}
        invoices={invoicesFixture}
        todayIso="2026-11-21"
        onCreateWorkLog={onCreateWorkLog}
      />,
    );

    fireEvent.change(screen.getByLabelText("Work description"), {
      target: { value: "Schema migration review" },
    });
    fireEvent.change(screen.getByLabelText("Hours worked"), {
      target: { value: "3.5" },
    });
    // Working: 3.5 hours x £80 default rate = £280
    expect(screen.getByTestId("live-entry-amount").textContent).toContain("Line amount: £280");

    fireEvent.click(screen.getByRole("button", { name: "Add work entry" }));
    expect(onCreateWorkLog).toHaveBeenCalledWith({
      date: "2026-11-21",
      description: "Schema migration review",
      hoursWorked: 3.5,
      hourlyRate: 80,
      clientName: null,
      incomeSource: "self-employed",
    });
  });

  it("builds a draft invoice from selected unbilled entries with optional user-entered VAT rate", () => {
    const onCreateInvoice = vi.fn();
    render(
      <InvoicingWorkspace
        settings={settingsFixture}
        settingsEtag='"2026-11-15T10:00:00.000Z"'
        workLogs={workLogsFixture}
        invoices={invoicesFixture}
        todayIso="2026-11-21"
        onCreateInvoice={onCreateInvoice}
      />,
    );

    fireEvent.click(screen.getByLabelText("Select Frontend accessibility pass for draft invoice"));
    fireEvent.click(screen.getByLabelText("Select Backend contract wiring for draft invoice"));

    fireEvent.change(screen.getByLabelText("Client name"), {
      target: { value: "Britannia Media Ltd" },
    });
    fireEvent.change(screen.getByLabelText("VAT rate (%)"), {
      target: { value: "20" },
    });

    // Section 10 worked example 1: subtotal £1,250, VAT at 20% = £250, total = £1,500, plus VAT number GB123456789
    const totalsBox = screen.getByTestId("draft-invoice-totals");
    expect(totalsBox.textContent).toContain("GB123456789");
    expect(totalsBox.textContent).toContain("VAT (20%)");
    expect(totalsBox.textContent).toContain("£250");
    expect(totalsBox.textContent).toContain("£1,500");

    fireEvent.click(screen.getByRole("button", { name: "Create draft invoice from selected" }));
    expect(onCreateInvoice).toHaveBeenCalledWith({
      workLogEntryIds: [
        "22222222-2222-4222-8222-222222222201",
        "22222222-2222-4222-8222-222222222202",
      ],
      clientName: "Britannia Media Ltd",
      clientEmail: null,
      clientAddress: null,
      issueDate: "2026-11-21",
      vatRatePct: 20,
      notes: null,
    });
  });

  it("issues, marks paid, and voids invoices and updates invoicing settings with If-Match", () => {
    const onIssueInvoice = vi.fn();
    const onMarkInvoicePaid = vi.fn();
    const onVoidInvoice = vi.fn();
    const onUpdateSettings = vi.fn();

    render(
      <InvoicingWorkspace
        settings={settingsFixture}
        settingsEtag='"2026-11-15T10:00:00.000Z"'
        workLogs={workLogsFixture}
        invoices={invoicesFixture}
        todayIso="2026-11-21"
        onIssueInvoice={onIssueInvoice}
        onMarkInvoicePaid={onMarkInvoicePaid}
        onVoidInvoice={onVoidInvoice}
        onUpdateSettings={onUpdateSettings}
      />,
    );

    // Switch to Invoices tab
    const invoicesTab = screen.getByRole("tab", { name: /Invoices/i });
    fireEvent.pointerDown(invoicesTab, { button: 0 });
    fireEvent.keyDown(invoicesTab, { key: "Enter", code: "Enter" });

    // Issue draft invoice INV-0002
    fireEvent.click(screen.getByTestId("issue-invoice-33333333-3333-4333-8333-333333333302"));
    expect(onIssueInvoice).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333302",
      '"2026-11-15T09:00:00.000Z"',
    );

    // Mark issued invoice INV-0001 paid and void it
    fireEvent.click(screen.getByTestId("mark-paid-33333333-3333-4333-8333-333333333301"));
    expect(onMarkInvoicePaid).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333301",
      { paidDate: "2026-11-21" },
      '"2026-11-06T09:00:00.000Z"',
    );

    fireEvent.click(screen.getByTestId("void-invoice-33333333-3333-4333-8333-333333333301"));
    expect(onVoidInvoice).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333301",
      '"2026-11-06T09:00:00.000Z"',
    );

    // Switch to Invoicing settings tab and save
    const settingsTab = screen.getByRole("tab", { name: /Invoicing settings/i });
    fireEvent.pointerDown(settingsTab, { button: 0 });
    fireEvent.keyDown(settingsTab, { key: "Enter", code: "Enter" });

    fireEvent.change(screen.getByLabelText("Default hourly rate (£)"), {
      target: { value: "95" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save invoicing settings" }));
    expect(onUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultHourlyRate: 95,
        vatNumber: "GB123456789",
      }),
      '"2026-11-15T10:00:00.000Z"',
    );
  });
});
