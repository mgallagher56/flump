import type {
  CreateInvoiceRequest,
  CreateWorkLogEntryRequest,
  InvoiceDto,
  InvoicingSettingsDto,
  MarkInvoicePaidRequest,
  UpdateInvoiceRequest,
  UpdateInvoicingSettingsRequest,
  UpdateWorkLogEntryRequest,
  WorkLogEntryDto,
} from "@flump/api-contract";
import {
  calculateInvoiceTotals,
  calculateWorkLogAmount,
  formatInvoiceNumber,
  getUkTaxYearForDate,
  summarizeInvoicingKpis,
} from "@flump/finance-engine";
import {
  CollapsibleDrawer,
  formatMoney,
  KpiCard,
  KpiStrip,
  PageBody,
  PageHeader,
  Tabs,
} from "@repo/ui";
import { type FC, type FormEvent, useMemo, useState } from "react";
import {
  actionRow,
  buttonGroup,
  dataTable,
  dataTableWrapper,
  emptyBox,
  fieldGroup,
  fieldHelper,
  fieldLabel,
  filterBar,
  formGrid,
  invoiceCard,
  invoiceCardList,
  numericValue,
  primaryButton,
  secondaryButton,
  sectionCard,
  sectionHeaderRow,
  sectionSubtitle,
  sectionTitle,
  statusPill,
  tableCell,
  tableHeaderCell,
  textInputStyle,
  totalsGrid,
  workspaceStack,
} from "./InvoicingWorkspace.styles";

export interface InvoicingWorkspaceProps {
  settings: InvoicingSettingsDto;
  settingsEtag: string | null;
  workLogs: readonly WorkLogEntryDto[];
  invoices: readonly InvoiceDto[];
  todayIso?: string;
  isSubmitting?: boolean;
  onCreateWorkLog?: (payload: CreateWorkLogEntryRequest) => void;
  onUpdateWorkLog?: (id: string, payload: UpdateWorkLogEntryRequest, ifMatch: string) => void;
  onDeleteWorkLog?: (id: string) => void;
  onCreateInvoice?: (payload: CreateInvoiceRequest) => void;
  onUpdateInvoice?: (id: string, payload: UpdateInvoiceRequest, ifMatch: string) => void;
  onDeleteInvoice?: (id: string) => void;
  onIssueInvoice?: (id: string, ifMatch: string) => void;
  onMarkInvoicePaid?: (id: string, payload: MarkInvoicePaidRequest, ifMatch: string) => void;
  onVoidInvoice?: (id: string, ifMatch: string) => void;
  onUpdateSettings?: (payload: UpdateInvoicingSettingsRequest, ifMatch: string | null) => void;
}

const STATUS_LABELS: Record<InvoiceDto["status"], string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
};

function parseNonNegativeDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function money(value: number): string {
  return formatMoney(value, { fractionDigits: Number.isInteger(value) ? 0 : 2 }).text;
}

export const InvoicingWorkspace: FC<InvoicingWorkspaceProps> = ({
  settings,
  settingsEtag,
  workLogs,
  invoices,
  todayIso = "2026-11-21",
  isSubmitting = false,
  onCreateWorkLog,
  onUpdateWorkLog,
  onDeleteWorkLog,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onIssueInvoice,
  onMarkInvoicePaid,
  onVoidInvoice,
  onUpdateSettings,
}) => {
  const currentTaxYear = useMemo(() => getUkTaxYearForDate(todayIso), [todayIso]);
  const [activeTab, setActiveTab] = useState<string>("work-log");

  // Work log add form state
  const [entryDate, setEntryDate] = useState<string>(todayIso);
  const [entryDescription, setEntryDescription] = useState<string>("");
  const [entryHours, setEntryHours] = useState<string>("1");
  const [entryRate, setEntryRate] = useState<string>(
    settings.defaultHourlyRate !== null ? String(settings.defaultHourlyRate) : "65",
  );
  const [entryClientName, setEntryClientName] = useState<string>("");

  // Work log edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");
  const [editRate, setEditRate] = useState<string>("");

  // Work log filters & multi-select
  const [billedFilter, setBilledFilter] = useState<"all" | "unbilled" | "billed">("all");
  const [searchText, setSearchText] = useState<string>("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  // New draft invoice builder state (never defaults or suggests a VAT rate)
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientEmail, setNewClientEmail] = useState<string>("");
  const [newClientAddress, setNewClientAddress] = useState<string>("");
  const [newIssueDate, setNewIssueDate] = useState<string>(todayIso);
  const [newVatRateText, setNewVatRateText] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");

  // Draft invoice edit state
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInvoiceClientName, setEditInvoiceClientName] = useState<string>("");
  const [editInvoiceVatRateText, setEditInvoiceVatRateText] = useState<string>("");
  const [editInvoiceNotes, setEditInvoiceNotes] = useState<string>("");

  // Settings form state
  const [settingsRateText, setSettingsRateText] = useState<string>(
    settings.defaultHourlyRate !== null ? String(settings.defaultHourlyRate) : "",
  );
  const [settingsBusinessName, setSettingsBusinessName] = useState<string>(
    settings.businessName ?? "",
  );
  const [settingsBusinessAddress, setSettingsBusinessAddress] = useState<string>(
    settings.businessAddress ?? "",
  );
  const [settingsBusinessEmail, setSettingsBusinessEmail] = useState<string>(
    settings.businessEmail ?? "",
  );
  const [settingsVatNumber, setSettingsVatNumber] = useState<string>(settings.vatNumber ?? "");
  const [settingsPrefix, setSettingsPrefix] = useState<string>(settings.invoicePrefix);
  const [settingsSequenceText, setSettingsSequenceText] = useState<string>(
    String(settings.nextInvoiceSequence),
  );
  const [settingsTermsText, setSettingsTermsText] = useState<string>(
    String(settings.defaultPaymentTermsDays),
  );

  const kpis = useMemo(
    () => summarizeInvoicingKpis(workLogs, invoices, currentTaxYear),
    [workLogs, invoices, currentTaxYear],
  );

  const liveEntryAmount = useMemo(() => {
    const hours = parseNonNegativeDecimal(entryHours);
    const rate = parseNonNegativeDecimal(entryRate);
    if (hours === null || rate === null) return 0;
    return calculateWorkLogAmount(hours, rate);
  }, [entryHours, entryRate]);

  const filteredWorkLogs = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return workLogs.filter((entry) => {
      if (billedFilter === "unbilled" && entry.invoiceId !== null) return false;
      if (billedFilter === "billed" && entry.invoiceId === null) return false;
      if (needle !== "") {
        const hay = `${entry.description} ${entry.clientName ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [workLogs, billedFilter, searchText]);

  const selectedUnbilledEntries = useMemo(
    () =>
      workLogs.filter((entry) => entry.invoiceId === null && selectedEntryIds.includes(entry.id)),
    [workLogs, selectedEntryIds],
  );

  const draftPreviewTotals = useMemo(() => {
    const vatRate = parseNonNegativeDecimal(newVatRateText);
    const boundedVat = vatRate !== null && vatRate <= 100 ? vatRate : null;
    return calculateInvoiceTotals(
      selectedUnbilledEntries.map((entry) => ({
        hoursWorked: entry.hoursWorked,
        amount: entry.amount,
      })),
      boundedVat,
    );
  }, [selectedUnbilledEntries, newVatRateText]);

  const nextInvoiceNumberPreview = useMemo(
    () => formatInvoiceNumber(settings.invoicePrefix, settings.nextInvoiceSequence),
    [settings.invoicePrefix, settings.nextInvoiceSequence],
  );

  const handleToggleSelectEntry = (entryId: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId],
    );
  };

  const handleAddWorkLogSubmit = (event: FormEvent) => {
    event.preventDefault();
    const hours = parseNonNegativeDecimal(entryHours);
    const rate = parseNonNegativeDecimal(entryRate);
    if (!entryDescription.trim() || hours === null || rate === null) return;
    onCreateWorkLog?.({
      date: entryDate,
      description: entryDescription.trim(),
      hoursWorked: hours,
      hourlyRate: rate,
      clientName: entryClientName.trim() || null,
      incomeSource: "self-employed",
    });
    setEntryDescription("");
  };

  const handleStartEditWorkLog = (entry: WorkLogEntryDto) => {
    setEditingEntryId(entry.id);
    setEditDescription(entry.description);
    setEditHours(String(entry.hoursWorked));
    setEditRate(String(entry.hourlyRate));
  };

  const handleSaveEditWorkLog = (entry: WorkLogEntryDto) => {
    const hours = parseNonNegativeDecimal(editHours);
    const rate = parseNonNegativeDecimal(editRate);
    if (!editDescription.trim() || hours === null || rate === null) return;
    onUpdateWorkLog?.(
      entry.id,
      {
        description: editDescription.trim(),
        hoursWorked: hours,
        hourlyRate: rate,
      },
      `"${entry.updatedAt}"`,
    );
    setEditingEntryId(null);
  };

  const handleCreateInvoiceSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedUnbilledEntries.length === 0 || !newClientName.trim()) return;
    const vatRate = parseNonNegativeDecimal(newVatRateText);
    onCreateInvoice?.({
      workLogEntryIds: selectedUnbilledEntries.map((entry) => entry.id),
      clientName: newClientName.trim(),
      clientEmail: newClientEmail.trim() || null,
      clientAddress: newClientAddress.trim() || null,
      issueDate: newIssueDate,
      vatRatePct: vatRate !== null && vatRate <= 100 ? vatRate : null,
      notes: newNotes.trim() || null,
    });
    setSelectedEntryIds([]);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientAddress("");
    setNewVatRateText("");
    setNewNotes("");
    setActiveTab("invoices");
  };

  const handleStartEditInvoice = (invoice: InvoiceDto) => {
    setEditingInvoiceId(invoice.id);
    setEditInvoiceClientName(invoice.clientName);
    setEditInvoiceVatRateText(invoice.vatRatePct !== null ? String(invoice.vatRatePct) : "");
    setEditInvoiceNotes(invoice.notes ?? "");
  };

  const handleSaveEditInvoice = (invoice: InvoiceDto) => {
    if (!editInvoiceClientName.trim()) return;
    const vatRate = parseNonNegativeDecimal(editInvoiceVatRateText);
    onUpdateInvoice?.(
      invoice.id,
      {
        clientName: editInvoiceClientName.trim(),
        vatRatePct: vatRate !== null && vatRate <= 100 ? vatRate : null,
        notes: editInvoiceNotes.trim() || null,
      },
      `"${invoice.updatedAt}"`,
    );
    setEditingInvoiceId(null);
  };

  const handleSettingsSubmit = (event: FormEvent) => {
    event.preventDefault();
    const rate = parseNonNegativeDecimal(settingsRateText);
    const seq = Number.parseInt(settingsSequenceText, 10);
    const terms = Number.parseInt(settingsTermsText, 10);
    onUpdateSettings?.(
      {
        defaultHourlyRate: rate,
        businessName: settingsBusinessName.trim() || null,
        businessAddress: settingsBusinessAddress.trim() || null,
        businessEmail: settingsBusinessEmail.trim() || null,
        vatNumber: settingsVatNumber.trim() || null,
        invoicePrefix: settingsPrefix.trim() || "INV-",
        nextInvoiceSequence: Number.isInteger(seq) && seq >= 1 ? seq : 1,
        defaultPaymentTermsDays: Number.isInteger(terms) && terms >= 0 ? terms : 30,
      },
      settingsEtag,
    );
  };

  const renderWorkLogRows = (entries: readonly WorkLogEntryDto[]) => (
    <div className={dataTableWrapper()}>
      <table className={dataTable()}>
        <thead>
          <tr>
            <th className={tableHeaderCell()} scope="col">
              Select
            </th>
            <th className={tableHeaderCell()} scope="col">
              Date
            </th>
            <th className={tableHeaderCell()} scope="col">
              Description
            </th>
            <th className={tableHeaderCell()} scope="col">
              Client
            </th>
            <th className={tableHeaderCell()} scope="col">
              Hours
            </th>
            <th className={tableHeaderCell()} scope="col">
              Hourly rate
            </th>
            <th className={tableHeaderCell()} scope="col">
              Amount
            </th>
            <th className={tableHeaderCell()} scope="col">
              Status
            </th>
            <th className={tableHeaderCell()} scope="col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isBilled = entry.invoiceId !== null;
            const isEditing = editingEntryId === entry.id;
            const isSelected = selectedEntryIds.includes(entry.id);
            return (
              <tr
                key={entry.id}
                id={`work-log-row-${entry.id}`}
                data-testid={`work-log-row-${entry.id}`}
              >
                <td className={tableCell()}>
                  {isBilled ? (
                    <span className={fieldHelper()}>Billed</span>
                  ) : (
                    <input
                      type="checkbox"
                      id={`select-work-log-${entry.id}`}
                      data-testid={`select-work-log-${entry.id}`}
                      aria-label={`Select ${entry.description} for draft invoice`}
                      checked={isSelected}
                      onChange={() => handleToggleSelectEntry(entry.id)}
                    />
                  )}
                </td>
                <td className={tableCell()}>{entry.date}</td>
                <td className={tableCell()}>
                  {isEditing ? (
                    <input
                      type="text"
                      aria-label="Edit work description"
                      className={textInputStyle()}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  ) : (
                    entry.description
                  )}
                </td>
                <td className={tableCell()}>{entry.clientName ?? "Not set"}</td>
                <td className={tableCell()}>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Edit hours worked"
                      className={textInputStyle()}
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                    />
                  ) : (
                    `${entry.hoursWorked.toFixed(2)} hrs`
                  )}
                </td>
                <td className={tableCell()}>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Edit hourly rate"
                      className={textInputStyle()}
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                    />
                  ) : (
                    money(entry.hourlyRate)
                  )}
                </td>
                <td className={tableCell()}>
                  <span className={numericValue()}>{money(entry.amount)}</span>
                </td>
                <td className={tableCell()}>
                  <span className={statusPill({ tone: isBilled ? "issued" : "draft" })}>
                    {isBilled ? "Billed" : "Unbilled"}
                  </span>
                </td>
                <td className={tableCell()}>
                  {isBilled ? (
                    <span className={fieldHelper()}>Locked on invoice</span>
                  ) : isEditing ? (
                    <div className={buttonGroup()}>
                      <button
                        type="button"
                        className={primaryButton()}
                        onClick={() => handleSaveEditWorkLog(entry)}
                      >
                        Save entry
                      </button>
                      <button
                        type="button"
                        className={secondaryButton()}
                        onClick={() => setEditingEntryId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className={buttonGroup()}>
                      <button
                        type="button"
                        className={secondaryButton()}
                        onClick={() => handleStartEditWorkLog(entry)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={secondaryButton()}
                        onClick={() => onDeleteWorkLog?.(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const workLogPanel = (
    <div className={workspaceStack()}>
      <form
        className={sectionCard()}
        id="add-work-log-form"
        data-testid="add-work-log-form"
        onSubmit={handleAddWorkLogSubmit}
      >
        <div className={sectionHeaderRow()}>
          <div>
            <h2 className={sectionTitle()}>Log billable work</h2>
            <p className={sectionSubtitle()}>
              Record self-employed hours and calculate the line amount at your hourly rate.
            </p>
          </div>
          <div className={numericValue()} id="live-entry-amount" data-testid="live-entry-amount">
            Line amount: {money(liveEntryAmount)}
          </div>
        </div>

        <div className={formGrid()}>
          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-date">
              Date worked
            </label>
            <input
              id="work-log-date"
              data-testid="work-log-date"
              type="date"
              className={textInputStyle()}
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-description">
              Work description
            </label>
            <input
              id="work-log-description"
              data-testid="work-log-description"
              type="text"
              className={textInputStyle()}
              placeholder="Design review or development sprint"
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              required
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-client">
              Client name (optional)
            </label>
            <input
              id="work-log-client"
              data-testid="work-log-client"
              type="text"
              className={textInputStyle()}
              placeholder="Client company name"
              value={entryClientName}
              onChange={(e) => setEntryClientName(e.target.value)}
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-hours">
              Hours worked
            </label>
            <input
              id="work-log-hours"
              data-testid="work-log-hours"
              type="text"
              inputMode="decimal"
              className={textInputStyle()}
              value={entryHours}
              onChange={(e) => setEntryHours(e.target.value)}
              required
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-rate">
              Hourly rate (£)
            </label>
            <input
              id="work-log-rate"
              data-testid="work-log-rate"
              type="text"
              inputMode="decimal"
              className={textInputStyle()}
              value={entryRate}
              onChange={(e) => setEntryRate(e.target.value)}
              required
            />
            <span className={fieldHelper()}>
              {settings.defaultHourlyRate !== null
                ? `Default rate: ${money(settings.defaultHourlyRate)} per hour.`
                : "Default rate: Not set."}
            </span>
          </div>
        </div>

        <div className={actionRow()}>
          <span className={fieldHelper()}>Income source: Self-employed</span>
          <button
            type="submit"
            id="submit-work-log-btn"
            data-testid="submit-work-log-btn"
            className={primaryButton()}
            disabled={isSubmitting}
          >
            Add work entry
          </button>
        </div>
      </form>

      <section className={sectionCard()} aria-label="Recorded work log entries">
        <div className={filterBar()}>
          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-filter-status">
              Filter entries
            </label>
            <select
              id="work-log-filter-status"
              data-testid="work-log-filter-status"
              className={textInputStyle()}
              value={billedFilter}
              onChange={(e) => setBilledFilter(e.target.value as "all" | "unbilled" | "billed")}
            >
              <option value="all">All entries</option>
              <option value="unbilled">Unbilled entries</option>
              <option value="billed">Billed entries</option>
            </select>
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="work-log-search">
              Search description or client
            </label>
            <input
              id="work-log-search"
              data-testid="work-log-search"
              type="text"
              className={textInputStyle()}
              placeholder="Filter by keyword"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        {filteredWorkLogs.length === 0 ? (
          <div className={emptyBox()}>
            No work log entries match this view. Add a billable entry above to get started.
          </div>
        ) : filteredWorkLogs.length > 8 ? (
          <>
            {renderWorkLogRows(filteredWorkLogs.slice(0, 8))}
            <CollapsibleDrawer
              title={`Show all ${filteredWorkLogs.length} work log entries`}
              defaultOpen={false}
            >
              {renderWorkLogRows(filteredWorkLogs.slice(8))}
            </CollapsibleDrawer>
          </>
        ) : (
          renderWorkLogRows(filteredWorkLogs)
        )}
      </section>

      <form
        className={sectionCard()}
        id="create-draft-invoice-form"
        data-testid="create-draft-invoice-form"
        onSubmit={handleCreateInvoiceSubmit}
      >
        <div className={sectionHeaderRow()}>
          <div>
            <h2 className={sectionTitle()}>Create draft invoice ({nextInvoiceNumberPreview})</h2>
            <p className={sectionSubtitle()}>
              Select unbilled work log entries above and enter the client details for this invoice.
            </p>
          </div>
          <span className={statusPill({ tone: "draft" })}>
            {selectedUnbilledEntries.length} selected ({draftPreviewTotals.totalHours.toFixed(2)}{" "}
            hrs)
          </span>
        </div>

        <div className={formGrid()}>
          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-client-name">
              Client name
            </label>
            <input
              id="invoice-client-name"
              data-testid="invoice-client-name"
              type="text"
              className={textInputStyle()}
              placeholder="Client company name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-client-email">
              Client email (optional)
            </label>
            <input
              id="invoice-client-email"
              data-testid="invoice-client-email"
              type="email"
              className={textInputStyle()}
              placeholder="accounts@client.example"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-issue-date">
              Issue date
            </label>
            <input
              id="invoice-issue-date"
              data-testid="invoice-issue-date"
              type="date"
              className={textInputStyle()}
              value={newIssueDate}
              onChange={(e) => setNewIssueDate(e.target.value)}
              required
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-client-address">
              Client address (optional)
            </label>
            <input
              id="invoice-client-address"
              data-testid="invoice-client-address"
              type="text"
              className={textInputStyle()}
              placeholder="Client street address and postcode"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
            />
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-vat-rate">
              VAT rate (%)
            </label>
            <input
              id="invoice-vat-rate"
              data-testid="invoice-vat-rate"
              type="text"
              inputMode="decimal"
              className={textInputStyle()}
              value={newVatRateText}
              onChange={(e) => setNewVatRateText(e.target.value)}
            />
            <span className={fieldHelper()}>Leave empty for no VAT.</span>
          </div>

          <div className={fieldGroup()}>
            <label className={fieldLabel()} htmlFor="invoice-notes">
              Payment notes (optional)
            </label>
            <input
              id="invoice-notes"
              data-testid="invoice-notes"
              type="text"
              className={textInputStyle()}
              placeholder="Payment terms and bank reference"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
        </div>

        <div className={totalsGrid()} id="draft-invoice-totals" data-testid="draft-invoice-totals">
          <div>
            <div className={fieldHelper()}>Subtotal</div>
            <div className={numericValue()}>{money(draftPreviewTotals.subtotal)}</div>
          </div>
          {draftPreviewTotals.vatRatePct !== null ? (
            <>
              <div>
                <div className={fieldHelper()}>VAT number</div>
                <div className={numericValue()}>{settings.vatNumber ?? "Not set"}</div>
              </div>
              <div>
                <div className={fieldHelper()}>VAT ({draftPreviewTotals.vatRatePct}%)</div>
                <div className={numericValue()}>{money(draftPreviewTotals.vatAmount)}</div>
              </div>
            </>
          ) : null}
          <div>
            <div className={fieldHelper()}>Total</div>
            <div className={numericValue()}>{money(draftPreviewTotals.total)}</div>
          </div>
        </div>

        <div className={actionRow()}>
          <span className={fieldHelper()}>
            Payment terms: {settings.defaultPaymentTermsDays} days
          </span>
          <button
            type="submit"
            id="create-draft-invoice-btn"
            data-testid="create-draft-invoice-btn"
            className={primaryButton()}
            disabled={selectedUnbilledEntries.length === 0 || isSubmitting}
          >
            Create draft invoice from selected
          </button>
        </div>
      </form>
    </div>
  );

  const invoicesPanel = (
    <div className={sectionCard()}>
      <div className={sectionHeaderRow()}>
        <div>
          <h2 className={sectionTitle()}>Invoices</h2>
          <p className={sectionSubtitle()}>
            Manage draft invoices, issue finalized bills, and record client payments.
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className={emptyBox()}>
          No invoices created yet. Select unbilled work entries in the Work log tab to build a draft
          invoice.
        </div>
      ) : (
        <div className={invoiceCardList()}>
          {invoices.map((invoice) => {
            const isEditing = editingInvoiceId === invoice.id;
            return (
              <article
                key={invoice.id}
                className={invoiceCard()}
                id={`invoice-card-${invoice.id}`}
                data-testid={`invoice-card-${invoice.id}`}
              >
                <div className={sectionHeaderRow()}>
                  <div>
                    <div className={sectionTitle()}>
                      {invoice.invoiceNumber}: {invoice.clientName}
                    </div>
                    <div className={fieldHelper()}>
                      Issued {invoice.issueDate} · Due {invoice.dueDate} · Tax year{" "}
                      {invoice.taxYear}
                      {invoice.paidDate ? ` · Paid ${invoice.paidDate}` : ""}
                    </div>
                  </div>
                  <span className={statusPill({ tone: invoice.status })}>
                    {STATUS_LABELS[invoice.status]}
                  </span>
                </div>

                <div className={totalsGrid()}>
                  <div>
                    <div className={fieldHelper()}>Hours ({invoice.lineCount} items)</div>
                    <div className={numericValue()}>{invoice.totalHours.toFixed(2)} hrs</div>
                  </div>
                  <div>
                    <div className={fieldHelper()}>Subtotal</div>
                    <div className={numericValue()}>{money(invoice.subtotal)}</div>
                  </div>
                  {invoice.vatRatePct !== null ? (
                    <>
                      <div>
                        <div className={fieldHelper()}>
                          VAT ({invoice.vatRatePct}%)
                          {settings.vatNumber ? ` · ${settings.vatNumber}` : ""}
                        </div>
                        <div className={numericValue()}>{money(invoice.vatAmount)}</div>
                      </div>
                      <div>
                        <div className={fieldHelper()}>Total with VAT</div>
                        <div className={numericValue()}>{money(invoice.total)}</div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className={fieldHelper()}>Total</div>
                      <div className={numericValue()}>{money(invoice.total)}</div>
                    </div>
                  )}
                </div>

                {isEditing && invoice.status === "draft" ? (
                  <div className={formGrid()}>
                    <div className={fieldGroup()}>
                      <label className={fieldLabel()} htmlFor={`edit-invoice-client-${invoice.id}`}>
                        Client name
                      </label>
                      <input
                        id={`edit-invoice-client-${invoice.id}`}
                        data-testid={`edit-invoice-client-${invoice.id}`}
                        type="text"
                        className={textInputStyle()}
                        value={editInvoiceClientName}
                        onChange={(e) => setEditInvoiceClientName(e.target.value)}
                      />
                    </div>
                    <div className={fieldGroup()}>
                      <label className={fieldLabel()} htmlFor={`edit-invoice-vat-${invoice.id}`}>
                        VAT rate (%)
                      </label>
                      <input
                        id={`edit-invoice-vat-${invoice.id}`}
                        data-testid={`edit-invoice-vat-${invoice.id}`}
                        type="text"
                        inputMode="decimal"
                        className={textInputStyle()}
                        value={editInvoiceVatRateText}
                        onChange={(e) => setEditInvoiceVatRateText(e.target.value)}
                      />
                      <span className={fieldHelper()}>Leave empty for no VAT.</span>
                    </div>
                    <div className={fieldGroup()}>
                      <label className={fieldLabel()} htmlFor={`edit-invoice-notes-${invoice.id}`}>
                        Notes
                      </label>
                      <input
                        id={`edit-invoice-notes-${invoice.id}`}
                        data-testid={`edit-invoice-notes-${invoice.id}`}
                        type="text"
                        className={textInputStyle()}
                        value={editInvoiceNotes}
                        onChange={(e) => setEditInvoiceNotes(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                <div className={actionRow()}>
                  <span className={fieldHelper()}>
                    {invoice.notes ? `Notes: ${invoice.notes}` : "No payment notes added."}
                  </span>
                  <div className={buttonGroup()}>
                    {invoice.status === "draft" ? (
                      <>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className={primaryButton()}
                              onClick={() => handleSaveEditInvoice(invoice)}
                            >
                              Save draft changes
                            </button>
                            <button
                              type="button"
                              className={secondaryButton()}
                              onClick={() => setEditingInvoiceId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={secondaryButton()}
                            onClick={() => handleStartEditInvoice(invoice)}
                          >
                            Edit draft
                          </button>
                        )}
                        <button
                          type="button"
                          id={`issue-invoice-${invoice.id}`}
                          data-testid={`issue-invoice-${invoice.id}`}
                          className={primaryButton()}
                          onClick={() => onIssueInvoice?.(invoice.id, `"${invoice.updatedAt}"`)}
                        >
                          Issue invoice
                        </button>
                        <button
                          type="button"
                          className={secondaryButton()}
                          onClick={() => onVoidInvoice?.(invoice.id, `"${invoice.updatedAt}"`)}
                        >
                          Void invoice
                        </button>
                        <button
                          type="button"
                          className={secondaryButton()}
                          onClick={() => onDeleteInvoice?.(invoice.id)}
                        >
                          Delete draft
                        </button>
                      </>
                    ) : null}

                    {invoice.status === "issued" ? (
                      <>
                        <button
                          type="button"
                          id={`mark-paid-${invoice.id}`}
                          data-testid={`mark-paid-${invoice.id}`}
                          className={primaryButton()}
                          onClick={() =>
                            onMarkInvoicePaid?.(
                              invoice.id,
                              { paidDate: todayIso },
                              `"${invoice.updatedAt}"`,
                            )
                          }
                        >
                          Mark as paid
                        </button>
                        <button
                          type="button"
                          id={`void-invoice-${invoice.id}`}
                          data-testid={`void-invoice-${invoice.id}`}
                          className={secondaryButton()}
                          onClick={() => onVoidInvoice?.(invoice.id, `"${invoice.updatedAt}"`)}
                        >
                          Void invoice
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const settingsPanel = (
    <form
      className={sectionCard()}
      id="invoicing-settings-form"
      data-testid="invoicing-settings-form"
      onSubmit={handleSettingsSubmit}
    >
      <div className={sectionHeaderRow()}>
        <div>
          <h2 className={sectionTitle()}>Invoicing settings</h2>
          <p className={sectionSubtitle()}>
            Set your default hourly rate, business details, VAT number, and invoice numbering.
          </p>
        </div>
      </div>

      <div className={formGrid()}>
        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-default-rate">
            Default hourly rate (£)
          </label>
          <input
            id="settings-default-rate"
            data-testid="settings-default-rate"
            type="text"
            inputMode="decimal"
            className={textInputStyle()}
            value={settingsRateText}
            onChange={(e) => setSettingsRateText(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-business-name">
            Business name
          </label>
          <input
            id="settings-business-name"
            data-testid="settings-business-name"
            type="text"
            className={textInputStyle()}
            value={settingsBusinessName}
            onChange={(e) => setSettingsBusinessName(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-business-email">
            Business email
          </label>
          <input
            id="settings-business-email"
            data-testid="settings-business-email"
            type="email"
            className={textInputStyle()}
            value={settingsBusinessEmail}
            onChange={(e) => setSettingsBusinessEmail(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-business-address">
            Business address
          </label>
          <input
            id="settings-business-address"
            data-testid="settings-business-address"
            type="text"
            className={textInputStyle()}
            value={settingsBusinessAddress}
            onChange={(e) => setSettingsBusinessAddress(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-vat-number">
            VAT number (optional)
          </label>
          <input
            id="settings-vat-number"
            data-testid="settings-vat-number"
            type="text"
            className={textInputStyle()}
            value={settingsVatNumber}
            onChange={(e) => setSettingsVatNumber(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-invoice-prefix">
            Invoice prefix
          </label>
          <input
            id="settings-invoice-prefix"
            data-testid="settings-invoice-prefix"
            type="text"
            className={textInputStyle()}
            value={settingsPrefix}
            onChange={(e) => setSettingsPrefix(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-next-sequence">
            Next invoice number
          </label>
          <input
            id="settings-next-sequence"
            data-testid="settings-next-sequence"
            type="text"
            inputMode="numeric"
            className={textInputStyle()}
            value={settingsSequenceText}
            onChange={(e) => setSettingsSequenceText(e.target.value)}
          />
        </div>

        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="settings-payment-terms">
            Default payment terms (days)
          </label>
          <input
            id="settings-payment-terms"
            data-testid="settings-payment-terms"
            type="text"
            inputMode="numeric"
            className={textInputStyle()}
            value={settingsTermsText}
            onChange={(e) => setSettingsTermsText(e.target.value)}
          />
        </div>
      </div>

      <div className={actionRow()}>
        <span className={fieldHelper()}>
          Next invoice will be formatted as {nextInvoiceNumberPreview}.
        </span>
        <button
          type="submit"
          id="save-invoicing-settings-btn"
          data-testid="save-invoicing-settings-btn"
          className={primaryButton()}
          disabled={isSubmitting}
        >
          Save invoicing settings
        </button>
      </div>
    </form>
  );

  return (
    <PageBody>
      <div className={workspaceStack()} id="invoicing-workspace" data-testid="invoicing-workspace">
        <PageHeader
          title="Work log and invoicing"
          subtitle="Log self-employed hours, build numbered invoices, and track payments by UK tax year."
        />

        <KpiStrip columns={4}>
          <KpiCard
            label="Unbilled hours"
            value={`${kpis.unbilledHours.toFixed(2)} hrs`}
            subtext={`${kpis.unbilledEntryCount} unbilled entries`}
          />
          <KpiCard
            label="Unbilled amount"
            value={money(kpis.unbilledAmount)}
            subtext="Ready to add to a draft invoice"
          />
          <KpiCard
            label="Outstanding invoices"
            value={money(kpis.outstandingAmount)}
            subtext={`${kpis.outstandingInvoiceCount} issued`}
          />
          <KpiCard
            label={`Paid in ${kpis.taxYear}`}
            value={money(kpis.paidInTaxYearAmount)}
            subtext={`${money(kpis.paidInTaxYearSubtotal)} before VAT across ${kpis.paidInTaxYearCount} paid`}
          />
        </KpiStrip>

        <Tabs
          aria-label="Invoicing sections"
          items={[
            { value: "work-log", label: "Work log" },
            { value: "invoices", label: `Invoices (${invoices.length})` },
            { value: "settings", label: "Invoicing settings" },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
          panels={{
            "work-log": workLogPanel,
            invoices: invoicesPanel,
            settings: settingsPanel,
          }}
        />
      </div>
    </PageBody>
  );
};
