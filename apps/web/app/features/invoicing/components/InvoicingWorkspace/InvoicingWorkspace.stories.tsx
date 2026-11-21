import type { InvoiceDto, InvoicingSettingsDto, WorkLogEntryDto } from "@flump/api-contract";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { InvoicingWorkspace } from "./InvoicingWorkspace";

const meta: Meta<typeof InvoicingWorkspace> = {
  title: "3. Patterns/Invoicing/InvoicingWorkspace",
  component: InvoicingWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof InvoicingWorkspace>;

const settingsFixture: InvoicingSettingsDto = {
  id: "11111111-1111-4111-8111-111111111111",
  defaultHourlyRate: 75,
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
    description: "Design system token audit",
    hoursWorked: 6.5,
    hourlyRate: 75,
    amount: 487.5,
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
    description: "API contract validation",
    hoursWorked: 4,
    hourlyRate: 75,
    amount: 300,
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
    description: "Platform architecture review",
    hoursWorked: 20,
    hourlyRate: 62.5,
    amount: 1250,
    clientName: "Albion Retail Group",
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
    clientName: "Albion Retail Group",
    clientEmail: "finance@albion.example",
    clientAddress: "100 Deansgate, Manchester",
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
    notes: "BACS reference INV-0001",
    taxRecordId: null,
    entries: [workLogsFixture[2] as WorkLogEntryDto],
    createdAt: "2026-11-06T09:00:00.000Z",
    updatedAt: "2026-11-06T09:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    invoiceNumber: "INV-0002",
    status: "paid",
    clientName: "Northumbrian Water Digital",
    clientEmail: null,
    clientAddress: null,
    issueDate: "2026-10-10",
    dueDate: "2026-11-09",
    paidDate: "2026-10-25",
    taxYear: "2026/27",
    lineCount: 1,
    totalHours: 3.33,
    subtotal: 333.33,
    vatRatePct: 20,
    vatAmount: 66.67,
    total: 400,
    notes: null,
    taxRecordId: null,
    entries: [],
    createdAt: "2026-10-10T09:00:00.000Z",
    updatedAt: "2026-10-25T14:00:00.000Z",
  },
];

const baseArgs = {
  settings: settingsFixture,
  settingsEtag: '"2026-11-15T10:00:00.000Z"',
  workLogs: workLogsFixture,
  invoices: invoicesFixture,
  todayIso: "2026-11-21",
  onCreateWorkLog: fn(),
  onUpdateWorkLog: fn(),
  onDeleteWorkLog: fn(),
  onCreateInvoice: fn(),
  onUpdateInvoice: fn(),
  onDeleteInvoice: fn(),
  onIssueInvoice: fn(),
  onMarkInvoicePaid: fn(),
  onVoidInvoice: fn(),
  onUpdateSettings: fn(),
};

export const Light: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Work log and invoicing")).toBeInTheDocument();
    await expect(canvas.getByText("Leave empty for no VAT.")).toBeInTheDocument();

    // Select an unbilled work entry and preview VAT
    const checkbox = canvas.getByLabelText("Select Design system token audit for draft invoice");
    await userEvent.click(checkbox);
    const vatInput = canvas.getByLabelText("VAT rate (%)");
    await userEvent.type(vatInput, "20");
    await expect(canvas.getByText("VAT (20%)")).toBeInTheDocument();
  },
};

export const Dark: Story = {
  args: baseArgs,
  parameters: {
    themes: { themeOverride: "dark" },
  },
};
