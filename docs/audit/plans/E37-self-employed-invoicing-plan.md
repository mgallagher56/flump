# E37. Self-employed work tracking and invoice builder

Decisions: accepted on 21 November 2026

> **Status: accepted by the owner on 2026-11-21: D1 (a), D2 (b), D3 (a). See "Owner decisions, 21 November 2026" at the end; where it differs from the text above it, it wins. No code yet.** Written 2026-11-16 against `origin/main`. Not legal or tax advice.

**Summary.** Self-employed users need a lightweight way to log billable work, apply a default hourly rate (overridable per entry), group unbilled work into numbered invoices with client details, export invoices as PDF/print and CSV, and optionally sync paid invoices into their Self Assessment income records. This plan proposes four vertical slices (`S0` data model & pure engine calculations -> `S1` CRUD API -> `S2` Work log & Invoice Builder UI -> `S3` Self Assessment integration & PDF/CSV export), respecting `If-Match` optimistic concurrency, UK GDPR export/deletion and audit rules, and Flump's zero-advice-strings policy.

## 1. Relationship to existing epics

- **E28 (Making Tax Digital for Income Tax):** E28 covers quarterly HMRC MTD discovery/submission. E37 is purely user-owned bookkeeping, work logging, and invoicing; it never claims "MTD-compliant" or HMRC submission.
- **E19 (Account deletion & JSON export):** Every new table introduced by E37 must be included in `exportData` and transactional `deleteAccount` (`apps/backend/src/modules/privacy/account-deletion.service.ts`), with audit rows written on export.
- **E29a (`docs/compliance/advice-boundary-policy.md`):** Rules R1–R8 apply to all copy, labels, and tooltips. E37 contains zero advice strings.
- **E15 / `AGENTS.md` UI laws:** All new web components follow colocated directories, semantic tokens only, `tabular-nums` on all financial/time figures, `<KpiStrip>`, and UK `en-GB` formatting.

## 2. What exists today

| Piece | Where | Note |
| --- | --- | --- |
| Tax records API contract | `packages/api-contract/src/domains/tax.ts` | `TAX_RECORD_SOURCES` includes `"self-employed"`; `TaxRecordDto` supports `type: "income" \| "expense"` |
| Tax records backend | `apps/backend/src/modules/tax/tax.controller.ts`, `tax.service.ts` | CRUD + bulk create on `/tax-records` with keyset pagination |
| Optimistic concurrency | `apps/backend/src/contract/etag.ts` | `expectedVersion`, `setEtag`, `withVersionClaim` (`If-Match` -> `412 precondition_failed`) |
| Profile contract | `packages/api-contract/src/domains/profile.ts` | `UserProfileDto` and `UpdateProfileRequest` (`PATCH /user-profile` with `If-Match`) |
| Self Assessment web route | `apps/web/app/routes/app.self-assessment.tsx` | Loads/mutates `/tax-records` and `/user-profile` with `ifMatchFromForm` and `revalidateOnConflict` |
| GDPR export & deletion | `apps/backend/src/modules/privacy/account-deletion.service.ts`, `user-data.integration.spec.ts` | Transactional account deletion and audited JSON export |
| Advice boundary policy | `docs/compliance/advice-boundary-policy.md` | Approved rules R1–R8; zero personal recommendations or tax-optimisation imperatives |

## 3. Advice boundary, compliance, and UK GDPR rules

- **Zero advice strings (R1–R8):** Copy describes facts and user-entered figures only. Never suggest whether to register for VAT, what rate to charge, what expenses to claim, or how to reduce tax. Never use "you should", "recommended", "optimal", or "MTD-compliant".
- **Explicit user action for Self Assessment sync:** Paying or issuing an invoice never silently writes to `tax_records`. Syncing a paid invoice into Self Assessment income is an explicit user action (button/toggle with clear confirmation of the date and amount written).
- **Optimistic concurrency (`If-Match`):** All `PATCH` and state-transition endpoints (`issue`, `mark-paid`, `void`, `sync-to-tax`) emit `ETag` (`updatedAt`) and validate `If-Match` via `withVersionClaim`, returning `412 precondition_failed` on stale writes.
- **UK GDPR & audit:**
  - All work log entries, invoices, and business/invoicing profile settings are included in JSON data export and deleted inside the `deleteAccount` transaction.
  - Export and state-changing invoice/sync actions write audit records without leaking PII into logs.
  - Client details (name, email, address) are stored solely for the user's own invoice generation and export.

## 4. Slice S0 — Data model & pure engine calculations

### 4.1 Domain entities

1. **Invoicing / Business Settings** (per self-employed income source, or on user business profile settings — see Decision D1):
   - `defaultHourlyRate`: `Money` (nullable until set by user, `>= 0`).
   - `businessName`, `businessAddress`, `businessEmail` (optional strings for invoice header).
   - `invoicePrefix`: string (default `"INV-"`), `nextInvoiceSequence`: integer (default `1`), `defaultPaymentTermsDays`: integer (default `30`).
2. **Work Log Entry (`work_log_entries`)**:
   - `id`: UUID, `userId`: string.
   - `incomeSource`: `"self-employed"` (or `incomeSourceId` if multiple self-employed sources are supported; linked to Self Assessment income source).
   - `date`: `IsoDate` (YYYY-MM-DD).
   - `description`: trimmed string (1–500 chars).
   - `hoursWorked`: decimal (`> 0`, up to 2 decimal places).
   - `hourlyRate`: `Money` (`>= 0`, pre-filled in UI from `defaultHourlyRate`, overridable per entry).
   - `amount`: `ResponseMoney` (computed as `roundTo2dp(hoursWorked * hourlyRate)`).
   - `invoiceId`: nullable UUID FK -> `invoices.id` (`ON DELETE SET NULL` only when invoice is draft/deleted; locked once issued/paid).
   - `createdAt`, `updatedAt` (`timestamptz` for `ETag`).
3. **Invoice (`invoices`)**:
   - `id`: UUID, `userId`: string.
   - `invoiceNumber`: string (unique per user, e.g. `INV-0001`).
   - `status`: `"draft" | "issued" | "paid" | "void"`.
   - `issueDate`: `IsoDate`, `dueDate`: `IsoDate`, `paidDate`: nullable `IsoDate`.
   - `clientName`: string (1–120 chars), `clientEmail`: nullable string, `clientAddress`: nullable string.
   - `notes`: nullable `Notes` (payment instructions / bank reference entered by user).
   - `subtotal`: `ResponseMoney`, `total`: `ResponseMoney` (sum of linked work log `amount`s; VAT out of scope for v1, see Decision D2).
   - `taxRecordId`: nullable UUID FK -> `tax_records.id` (`ON DELETE SET NULL`), populated when synced to Self Assessment.
   - `createdAt`, `updatedAt` (`timestamptz` for `ETag`).

### 4.2 Pure engine module (`packages/finance-engine/src/invoicing/`)

- `calculateWorkLogAmount(hoursWorked: number, hourlyRate: number): number` — deterministic 2dp rounding (`Math.round((hoursWorked * hourlyRate + Number.EPSILON) * 100) / 100`).
- `calculateInvoiceTotals(entries: ReadonlyArray<{ hoursWorked: number; amount: number }>): { totalHours: number; subtotal: number; total: number; lineCount: number }`.
- `formatInvoiceNumber(prefix: string, sequence: number, padLength?: number): string`.
- `getUkTaxYearForDate(isoDate: string): string` — reuses `uk-tax-year.ts` (6 April – 5 April) for filtering/grouping work logs and paid invoices by UK tax year.
- Unit tests + deterministic test vectors (`IV1`–`IV6` covering fractional hours, rounding, invoice totals, tax year boundaries around 5/6 April).

## 5. Slice S1 — CRUD API & Contracts

### 5.1 API Contract (`packages/api-contract/src/domains/invoicing.ts`)

Strict Zod schemas (`z.strictObject`):
- `InvoicingSettingsDto` & `UpdateInvoicingSettingsRequest`
- `WorkLogEntryDto`, `CreateWorkLogEntryRequest`, `UpdateWorkLogEntryRequest`, `WorkLogListQuery` (filter by `fromDate`, `toDate`, `billed` boolean, `invoiceId`, `incomeSource`, keyset pagination)
- `InvoiceDto` (includes embedded or summarised line items), `CreateInvoiceRequest` (takes `workLogEntryIds[]` + client details + dates), `UpdateInvoiceRequest` (draft only), `MarkInvoicePaidRequest` (`paidDate`), `SyncInvoiceToTaxResponse`

### 5.2 Backend module (`apps/backend/src/modules/invoicing/`)

- TypeORM entities + migration with foreign keys, `(user_id, invoice_number)` unique index, and `(user_id, date)` / `(user_id, invoice_id)` indexes.
- Endpoints under `AuthGuard` with `setEtag` and `If-Match` (`withVersionClaim`):
  - `GET /invoicing/settings`, `PATCH /invoicing/settings`
  - `GET /work-logs`, `POST /work-logs`, `PATCH /work-logs/:id`, `DELETE /work-logs/:id`
  - `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, `PATCH /invoices/:id`, `DELETE /invoices/:id`
  - `POST /invoices/:id/issue` (`draft -> issued`, locks linked `work_log_entries` against edit/delete)
  - `POST /invoices/:id/mark-paid` (`issued -> paid`, records `paidDate`)
  - `POST /invoices/:id/void` (`draft | issued -> void`, unlinks `work_log_entries` so they become unbilled again)
- **Invariants enforced in transactions:**
  - Creating a draft invoice verifies every `workLogEntryId` belongs to `req.user.id` and has `invoiceId IS NULL` (prevents double-invoicing).
  - `PATCH` / `DELETE` on a `work_log_entries` row linked to an `issued` or `paid` invoice returns `409 Conflict`.
  - `DELETE /invoices/:id` is permitted only in `"draft"` status (unlinks entries); `"issued"` / `"paid"` invoices cannot be deleted, only voided.
- **GDPR wiring:** Update `account-deletion.service.ts` and `user-data.integration.spec.ts` to export and delete `work_log_entries`, `invoices`, and invoicing settings.

## 6. Slice S2 — Work log & Invoice Builder UI

- **Route & feature directory:** `apps/web/app/routes/app.invoicing.tsx` (or `/app/work-log` + `/app/invoicing`, linked from Self Assessment and navigation) and `apps/web/app/features/invoicing/components/` with colocated 4/5-file component directories per `AGENTS.md`.
- **Visual & layout compliance:**
  - `<PageBody>` with `<KpiStrip>` (single row, max 4 items: Unbilled hours, Unbilled amount, Outstanding issued invoices, Paid in current UK tax year).
  - **Work Log tab/panel:**
    - Quick-add entry form: `date` (defaults to today), `description`, `hoursWorked`, `hourlyRate` (pre-filled from `defaultHourlyRate`, editable per entry), live `amount` (`tabular-nums`, `en-GB` GBP), linked SA income source.
    - Filter bar: date range / UK tax year selector, billed vs unbilled filter, text search.
    - Multi-select checkboxes on unbilled entries with a primary action: "Create draft invoice from selected".
  - **Invoice Builder & List tab/panel:**
    - Draft/issued/paid/void status badges using `status.*` semantic tokens only.
    - Draft editor: edit client details (`clientName`, `clientEmail`, `clientAddress`), invoice number, `issueDate`, `dueDate`, `notes`, add/remove unbilled work items, then "Issue invoice".
    - Conflict handling: sends `If-Match` from loader `etag` and uses `revalidateOnConflict` on `412`.
  - **Settings drawer/modal:** configure `defaultHourlyRate`, business details, invoice prefix, and default payment terms.
- **Verification:** Light + Dark Storybook stories with zero `@storybook/addon-a11y` violations, plus Vitest unit tests.

## 7. Slice S3 — Self Assessment integration & PDF/CSV export

- **Optional Self Assessment sync:**
  - `POST /invoices/:id/sync-to-tax` (requires `status === "paid"`, `If-Match` header, idempotent if `taxRecordId` already set).
  - Creates a `tax_records` row (`type: "income"`, `source: "self-employed"`, `category: "Freelance / Invoice"`, `name: "Invoice <invoiceNumber> — <clientName>"`, `amount: invoice.total`, `frequency: "one-off"`, `date: invoice.paidDate ?? invoice.issueDate`) inside a single DB transaction and stores `taxRecordId` on the invoice.
  - UI shows a clear "Synced to Self Assessment" link/badge and never auto-syncs without user click.
- **PDF / Print export:**
  - Dedicated print-ready invoice view (`@media print` stylesheet + "Print / Save as PDF" action, or server-generated PDF stream) showing business header, client details, invoice number, issue/due/paid dates, itemised work log table (`date`, `description`, `hoursWorked`, `hourlyRate`, `amount` in `tabular-nums`), and total.
- **CSV export:**
  - Export filtered work log entries or invoices as RFC 4180 CSV (`date`, `description`, `hoursWorked`, `hourlyRate`, `amount`, `invoiceNumber`, `status`, `clientName`), sanitising leading `=`, `+`, `-`, `@`, `\t`, `\r` characters to prevent spreadsheet formula injection.

## 8. Slice breakdown

| Slice | Contents | Depends on |
| --- | --- | --- |
| **S0** | Owner decisions D1–D3; data model design; `packages/finance-engine/src/invoicing/` pure calculations & test vectors `IV1`–`IV6` | None |
| **S1** | `packages/api-contract/src/domains/invoicing.ts`; TypeORM migration; `apps/backend/src/modules/invoicing/` CRUD + state transitions + `If-Match` + GDPR export/delete | S0 |
| **S2** | `apps/web` Work Log & Invoice Builder UI (`features/invoicing`), `<KpiStrip>`, settings drawer, Storybook stories (light/dark + a11y), Vitest tests | S1 |
| **S3** | `POST /invoices/:id/sync-to-tax` SA integration, PDF/print invoice view, formula-safe CSV export | S2 |

## 9. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Where `defaultHourlyRate` lives | (a) Single invoicing settings record per user (with optional per-source override later). (b) Per-SA-income-source table from day one. | **(a)** — `tax_records` currently models `source` as an enum (`"self-employed"`), not a separate sources table. |
| D2 | VAT on invoices | (a) Out of scope for v1 (no VAT fields; total = subtotal). (b) Optional `vatRate` / `vatNumber` fields on invoice. | **(a)** for v1 to avoid VAT registration/threshold advice-boundary complexity; add in a follow-up if needed. |
| D3 | PDF generation mechanism | (a) Clean `@media print` invoice route (`Print / Save as PDF`). (b) Server-side PDF renderer (`pdfkit` / headless). | **(a)** for S3 — zero new server dependencies and deterministic layout; upgrade to server PDF later if email attachment is added. |

## 10. Owner decisions, 21 November 2026

Owner's words: "D2. Allow adding VAT to invoices." "Accept the other decisions".

- **D1 (a):** one invoicing settings record per user.
- **D2 (b), changed from the recommendation:** an invoice can carry VAT.
  - Settings gain an optional `vatNumber`. An invoice gains an optional `vatRatePct` (empty means no VAT) and stores `vatAmount`; `total` = `subtotal` + `vatAmount`, with `vatAmount` = `subtotal` x `vatRatePct` / 100 rounded to the penny. Worked example for the tests: £1,250.00 at 20% is £250.00 VAT, total £1,500.00; £333.33 at 20% is £66.67 (66.666 rounded), total £400.00.
  - The rate is typed by the user and never defaulted or suggested. The invoice shows the VAT number, the rate, the VAT amount and the total when a rate is set.
  - Flump does not say whether someone should register for VAT, which rate applies, or what a valid VAT invoice needs: that is the advice boundary (policy R1, R2). One plain line beside the field: "Add VAT only if you are registered for VAT."
  - The Self Assessment sync (S3) sends the amount without VAT as income. Whether that is right for every VAT scheme is not verified; the sync says which figure it uses.
  - New stored fields go in the value map and the privacy registry in the same PR (AGENTS.md section 16).
- **D3 (a):** a print page ("Print / Save as PDF"), no server-side renderer.

One home per value (AGENTS.md section 16): invoice totals are computed by the engine module in section 4.2 and read from there by the backend, web and export; no page sums line items itself.

