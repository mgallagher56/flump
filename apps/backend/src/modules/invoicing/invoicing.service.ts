import type {
  CreateInvoiceRequest,
  CreateWorkLogEntryRequest,
  InvoiceDto,
  InvoiceListQuery,
  InvoicingSettingsDto,
  MarkInvoicePaidRequest,
  UpdateInvoiceRequest,
  UpdateInvoicingSettingsRequest,
  UpdateWorkLogEntryRequest,
  WorkLogEntryDto,
  WorkLogListQuery,
} from "@flump/api-contract";
import {
  calculateInvoiceTotals,
  calculateWorkLogAmount,
  formatInvoiceNumber,
  getUkTaxYearForDate,
} from "@flump/finance-engine";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { claimVersion, preconditionFailed } from "../../contract/etag";
import { keysetPage, type Page, type PageRequest } from "../../contract/pagination";
import { Invoice } from "../../entities/invoice.entity";
import { InvoicingSettings } from "../../entities/invoicing-settings.entity";
import { WorkLogEntry } from "../../entities/work-log-entry.entity";

const DEFAULT_INVOICE_PREFIX = "INV-";
const DEFAULT_NEXT_SEQUENCE = 1;
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

interface InvoicingSettingsView {
  settings: InvoicingSettingsDto;
  updatedAt?: Date;
}

interface WorkLogEntryView {
  entry: WorkLogEntryDto;
  updatedAt: Date;
}

interface InvoiceView {
  invoice: InvoiceDto;
  updatedAt: Date;
}

const workLogNotFound = () =>
  new NotFoundException({
    code: "not_found",
    message: "Work log entry not found.",
  });

const invoiceNotFound = () =>
  new NotFoundException({
    code: "not_found",
    message: "Invoice not found.",
  });

const workLogLockedConflict = (message: string) =>
  new ConflictException({
    code: "conflict",
    message,
  });

const invoiceStateConflict = (message: string) =>
  new ConflictException({
    code: "conflict",
    message,
  });

function addDaysToIsoDate(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function toInvoicingSettingsDto(row: InvoicingSettings | null): InvoicingSettingsDto {
  if (!row) {
    return {
      id: null,
      defaultHourlyRate: null,
      businessName: null,
      businessAddress: null,
      businessEmail: null,
      vatNumber: null,
      invoicePrefix: DEFAULT_INVOICE_PREFIX,
      nextInvoiceSequence: DEFAULT_NEXT_SEQUENCE,
      defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
      createdAt: null,
      updatedAt: null,
    };
  }
  return {
    id: row.id,
    defaultHourlyRate: row.defaultHourlyRate === null ? null : Number(row.defaultHourlyRate),
    businessName: row.businessName ?? null,
    businessAddress: row.businessAddress ?? null,
    businessEmail: row.businessEmail ?? null,
    vatNumber: row.vatNumber ?? null,
    invoicePrefix: row.invoicePrefix,
    nextInvoiceSequence: Number(row.nextInvoiceSequence),
    defaultPaymentTermsDays: Number(row.defaultPaymentTermsDays),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWorkLogEntryDto(row: WorkLogEntry): WorkLogEntryDto {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    hoursWorked: Number(row.hoursWorked),
    hourlyRate: Number(row.hourlyRate),
    amount: Number(row.amount),
    clientName: row.clientName ?? null,
    incomeSource: row.incomeSource,
    invoiceId: row.invoiceId ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toInvoiceDto(row: Invoice, entries: WorkLogEntry[]): InvoiceDto {
  const sortedEntries = [...entries].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
  );
  const vatRatePct = row.vatRatePct === null ? null : Number(row.vatRatePct);
  const totals = calculateInvoiceTotals(
    sortedEntries.map((entry) => ({
      hoursWorked: Number(entry.hoursWorked),
      amount: Number(entry.amount),
    })),
    vatRatePct,
  );
  // Voided invoices have unlinked entries (sortedEntries is empty), so they retain their stored figures.
  const useStoredFigures = sortedEntries.length === 0;
  const effectiveDate = row.paidDate ?? row.issueDate;

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    clientName: row.clientName,
    clientEmail: row.clientEmail ?? null,
    clientAddress: row.clientAddress ?? null,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    paidDate: row.paidDate ?? null,
    taxYear: getUkTaxYearForDate(effectiveDate),
    lineCount: sortedEntries.length,
    totalHours: totals.totalHours,
    subtotal: useStoredFigures ? Number(row.subtotal) : totals.subtotal,
    vatRatePct,
    vatAmount: useStoredFigures ? Number(row.vatAmount) : totals.vatAmount,
    total: useStoredFigures ? Number(row.total) : totals.total,
    notes: row.notes ?? null,
    taxRecordId: row.taxRecordId ?? null,
    entries: sortedEntries.map(toWorkLogEntryDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class InvoicingService {
  constructor(
    @InjectRepository(InvoicingSettings)
    private readonly settingsRepository: Repository<InvoicingSettings>,
    @InjectRepository(WorkLogEntry)
    private readonly workLogRepository: Repository<WorkLogEntry>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getSettings(userId: string): Promise<InvoicingSettingsView> {
    const row = await this.settingsRepository.findOne({ where: { userId } });
    return {
      settings: toInvoicingSettingsDto(row),
      ...(row ? { updatedAt: row.updatedAt } : {}),
    };
  }

  async updateSettings(
    userId: string,
    input: UpdateInvoicingSettingsRequest,
    expected?: Date,
  ): Promise<InvoicingSettingsView> {
    return this.settingsRepository.manager.transaction(async (em) => {
      const repo = em.getRepository(InvoicingSettings);
      const existing = await repo.findOne({ where: { userId } });

      if (expected) {
        if (!existing) throw preconditionFailed();
        const claim = await claimVersion(repo, { id: existing.id, userId }, expected);
        if (claim !== "updated") throw preconditionFailed();
      }

      const target =
        existing ??
        repo.create({
          userId,
          defaultHourlyRate: null,
          businessName: null,
          businessAddress: null,
          businessEmail: null,
          vatNumber: null,
          invoicePrefix: DEFAULT_INVOICE_PREFIX,
          nextInvoiceSequence: DEFAULT_NEXT_SEQUENCE,
          defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
        });

      if (input.defaultHourlyRate !== undefined) {
        target.defaultHourlyRate = input.defaultHourlyRate;
      }
      if (input.businessName !== undefined) {
        target.businessName = input.businessName?.trim() || null;
      }
      if (input.businessAddress !== undefined) {
        target.businessAddress = input.businessAddress?.trim() || null;
      }
      if (input.businessEmail !== undefined) {
        target.businessEmail = input.businessEmail?.trim() || null;
      }
      if (input.vatNumber !== undefined) {
        target.vatNumber = input.vatNumber?.trim() || null;
      }
      if (input.invoicePrefix !== undefined) {
        target.invoicePrefix = input.invoicePrefix.trim();
      }
      if (input.nextInvoiceSequence !== undefined) {
        target.nextInvoiceSequence = input.nextInvoiceSequence;
      }
      if (input.defaultPaymentTermsDays !== undefined) {
        target.defaultPaymentTermsDays = input.defaultPaymentTermsDays;
      }

      const saved = await repo.save(target);
      return {
        settings: toInvoicingSettingsDto(saved),
        updatedAt: saved.updatedAt,
      };
    });
  }

  async listWorkLogs(
    userId: string,
    rawQuery: unknown,
    page: PageRequest,
  ): Promise<Page<WorkLogEntryDto>> {
    const query = (rawQuery ?? {}) as Partial<WorkLogListQuery>;
    if (typeof this.workLogRepository.createQueryBuilder === "function") {
      const qb = this.workLogRepository
        .createQueryBuilder("w")
        .where(`"w"."user_id" = :userId`, { userId });
      if (query.fromDate) {
        qb.andWhere(`"w"."date" >= :fromDate`, { fromDate: query.fromDate });
      }
      if (query.toDate) {
        qb.andWhere(`"w"."date" <= :toDate`, { toDate: query.toDate });
      }
      if (query.billed === "true") {
        qb.andWhere(`"w"."invoice_id" IS NOT NULL`);
      } else if (query.billed === "false") {
        qb.andWhere(`"w"."invoice_id" IS NULL`);
      }
      if (query.invoiceId) {
        qb.andWhere(`"w"."invoice_id" = :invoiceId`, { invoiceId: query.invoiceId });
      }
      if (query.incomeSource) {
        qb.andWhere(`"w"."income_source" = :incomeSource`, { incomeSource: query.incomeSource });
      }
      const paged = await keysetPage(
        qb,
        {
          keys: [
            { column: `"w"."date"`, kind: "date" },
            { column: `"w"."id"`, kind: "uuid" },
          ],
          direction: "DESC",
        },
        page,
      );
      return {
        items: paged.items.map(toWorkLogEntryDto),
        nextCursor: paged.nextCursor,
      };
    }

    const rows = await this.workLogRepository.find({ where: { userId } });
    const filtered = rows
      .filter((row) => {
        if (query.fromDate && row.date < query.fromDate) return false;
        if (query.toDate && row.date > query.toDate) return false;
        if (query.billed === "true" && row.invoiceId === null) return false;
        if (query.billed === "false" && row.invoiceId !== null) return false;
        if (query.invoiceId && row.invoiceId !== query.invoiceId) return false;
        if (query.incomeSource && row.incomeSource !== query.incomeSource) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
      .slice(0, page.limit);

    return {
      items: filtered.map(toWorkLogEntryDto),
      nextCursor: null,
    };
  }

  async createWorkLog(userId: string, input: CreateWorkLogEntryRequest): Promise<WorkLogEntryView> {
    const amount = calculateWorkLogAmount(input.hoursWorked, input.hourlyRate);
    const created = this.workLogRepository.create({
      userId,
      date: input.date,
      description: input.description.trim(),
      hoursWorked: input.hoursWorked,
      hourlyRate: input.hourlyRate,
      amount,
      clientName: input.clientName?.trim() || null,
      incomeSource: input.incomeSource ?? "self-employed",
      invoiceId: null,
      notes: input.notes?.trim() || null,
    });
    const saved = await this.workLogRepository.save(created);
    return {
      entry: toWorkLogEntryDto(saved),
      updatedAt: saved.updatedAt,
    };
  }

  async updateWorkLog(
    userId: string,
    id: string,
    input: UpdateWorkLogEntryRequest,
    expected?: Date,
  ): Promise<WorkLogEntryView> {
    return this.workLogRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      if (expected) {
        const claim = await claimVersion(workLogRepo, { id, userId }, expected);
        if (claim === "missing") throw workLogNotFound();
        if (claim === "stale") throw preconditionFailed();
      }

      const existing = await workLogRepo.findOne({ where: { id, userId } });
      if (!existing) throw workLogNotFound();

      if (existing.invoiceId !== null) {
        const linkedInvoice = await invoiceRepo.findOne({
          where: { id: existing.invoiceId, userId },
        });
        if (linkedInvoice?.status !== "void") {
          throw workLogLockedConflict(
            "This work log entry is attached to an invoice and cannot be edited.",
          );
        }
      }

      if (input.date !== undefined) existing.date = input.date;
      if (input.description !== undefined) existing.description = input.description.trim();
      if (input.hoursWorked !== undefined) existing.hoursWorked = input.hoursWorked;
      if (input.hourlyRate !== undefined) existing.hourlyRate = input.hourlyRate;
      if (input.clientName !== undefined) existing.clientName = input.clientName?.trim() || null;
      if (input.incomeSource !== undefined) existing.incomeSource = input.incomeSource;
      if (input.notes !== undefined) existing.notes = input.notes?.trim() || null;

      existing.amount = calculateWorkLogAmount(
        Number(existing.hoursWorked),
        Number(existing.hourlyRate),
      );

      const saved = await workLogRepo.save(existing);
      return {
        entry: toWorkLogEntryDto(saved),
        updatedAt: saved.updatedAt,
      };
    });
  }

  async deleteWorkLog(userId: string, id: string): Promise<{ id: string }> {
    return this.workLogRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      const existing = await workLogRepo.findOne({ where: { id, userId } });
      if (!existing) throw workLogNotFound();

      if (existing.invoiceId !== null) {
        const linkedInvoice = await invoiceRepo.findOne({
          where: { id: existing.invoiceId, userId },
        });
        if (linkedInvoice?.status !== "void") {
          throw workLogLockedConflict(
            "This work log entry is attached to an invoice and cannot be deleted.",
          );
        }
      }

      await workLogRepo.delete({ id, userId });
      return { id };
    });
  }

  async listInvoices(
    userId: string,
    rawQuery: unknown,
    page: PageRequest,
  ): Promise<Page<InvoiceDto>> {
    const query = (rawQuery ?? {}) as Partial<InvoiceListQuery>;
    let invoices: Invoice[];
    let nextCursor: string | null = null;

    if (typeof this.invoiceRepository.createQueryBuilder === "function") {
      const qb = this.invoiceRepository
        .createQueryBuilder("i")
        .where(`"i"."user_id" = :userId`, { userId });
      if (query.status) {
        qb.andWhere(`"i"."status" = :status`, { status: query.status });
      }
      if (query.fromDate) {
        qb.andWhere(`"i"."issue_date" >= :fromDate`, { fromDate: query.fromDate });
      }
      if (query.toDate) {
        qb.andWhere(`"i"."issue_date" <= :toDate`, { toDate: query.toDate });
      }
      const paged = await keysetPage(
        qb,
        {
          keys: [
            { column: `"i"."issue_date"`, kind: "date" },
            { column: `"i"."id"`, kind: "uuid" },
          ],
          direction: "DESC",
        },
        page,
      );
      invoices = paged.items;
      nextCursor = paged.nextCursor;
    } else {
      const all = await this.invoiceRepository.find({ where: { userId } });
      invoices = all
        .filter((inv) => {
          if (query.status && inv.status !== query.status) return false;
          if (query.fromDate && inv.issueDate < query.fromDate) return false;
          if (query.toDate && inv.issueDate > query.toDate) return false;
          return true;
        })
        .sort((a, b) =>
          a.issueDate === b.issueDate
            ? b.id.localeCompare(a.id)
            : b.issueDate.localeCompare(a.issueDate),
        )
        .slice(0, page.limit);
    }

    if (invoices.length === 0) {
      return { items: [], nextCursor: null };
    }

    const invoiceIds = invoices.map((inv) => inv.id);
    const entries = await this.workLogRepository.find({
      where: { userId, invoiceId: In(invoiceIds) },
    });
    const entriesByInvoiceId = new Map<string, WorkLogEntry[]>();
    for (const entry of entries) {
      if (!entry.invoiceId) continue;
      const list = entriesByInvoiceId.get(entry.invoiceId) ?? [];
      list.push(entry);
      entriesByInvoiceId.set(entry.invoiceId, list);
    }

    return {
      items: invoices.map((inv) => toInvoiceDto(inv, entriesByInvoiceId.get(inv.id) ?? [])),
      nextCursor,
    };
  }

  async getInvoice(userId: string, id: string): Promise<InvoiceView> {
    const invoice = await this.invoiceRepository.findOne({ where: { id, userId } });
    if (!invoice) throw invoiceNotFound();
    const entries = await this.workLogRepository.find({
      where: { userId, invoiceId: invoice.id },
    });
    return {
      invoice: toInvoiceDto(invoice, entries),
      updatedAt: invoice.updatedAt,
    };
  }

  async createInvoice(userId: string, input: CreateInvoiceRequest): Promise<InvoiceView> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const settingsRepo = em.getRepository(InvoicingSettings);
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      const uniqueEntryIds = [...new Set(input.workLogEntryIds)];
      if (uniqueEntryIds.length === 0) {
        throw new BadRequestException({
          code: "validation_failed",
          message: "Select at least one work log entry.",
        });
      }

      const entries = await workLogRepo.find({
        where: { userId, id: In(uniqueEntryIds) },
      });
      if (entries.length !== uniqueEntryIds.length) {
        throw new BadRequestException({
          code: "validation_failed",
          message: "One or more selected work log entries could not be found.",
        });
      }

      if (entries.some((entry) => entry.invoiceId !== null)) {
        throw workLogLockedConflict(
          "One or more selected work log entries are already linked to an invoice.",
        );
      }

      let settings = await settingsRepo.findOne({ where: { userId } });
      if (!settings) {
        settings = await settingsRepo.save(
          settingsRepo.create({
            userId,
            defaultHourlyRate: null,
            businessName: null,
            businessAddress: null,
            businessEmail: null,
            vatNumber: null,
            invoicePrefix: DEFAULT_INVOICE_PREFIX,
            nextInvoiceSequence: DEFAULT_NEXT_SEQUENCE,
            defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
          }),
        );
      }

      const invoiceNumber = formatInvoiceNumber(
        settings.invoicePrefix,
        Number(settings.nextInvoiceSequence),
      );
      settings.nextInvoiceSequence = Number(settings.nextInvoiceSequence) + 1;
      await settingsRepo.save(settings);

      const dueDate =
        input.dueDate ??
        addDaysToIsoDate(input.issueDate, Number(settings.defaultPaymentTermsDays));

      const totals = calculateInvoiceTotals(
        entries.map((entry) => ({
          hoursWorked: Number(entry.hoursWorked),
          amount: Number(entry.amount),
        })),
        input.vatRatePct ?? null,
      );

      const createdInvoice = await invoiceRepo.save(
        invoiceRepo.create({
          userId,
          invoiceNumber,
          status: "draft",
          clientName: input.clientName.trim(),
          clientEmail: input.clientEmail?.trim() || null,
          clientAddress: input.clientAddress?.trim() || null,
          issueDate: input.issueDate,
          dueDate,
          paidDate: null,
          subtotal: totals.subtotal,
          vatRatePct: totals.vatRatePct,
          vatAmount: totals.vatAmount,
          total: totals.total,
          notes: input.notes?.trim() || null,
          taxRecordId: null,
        }),
      );

      const updatedEntries: WorkLogEntry[] = [];
      for (const entry of entries) {
        entry.invoiceId = createdInvoice.id;
        updatedEntries.push(await workLogRepo.save(entry));
      }

      return {
        invoice: toInvoiceDto(createdInvoice, updatedEntries),
        updatedAt: createdInvoice.updatedAt,
      };
    });
  }

  async updateInvoice(
    userId: string,
    id: string,
    input: UpdateInvoiceRequest,
    expected?: Date,
  ): Promise<InvoiceView> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      if (expected) {
        const claim = await claimVersion(invoiceRepo, { id, userId }, expected);
        if (claim === "missing") throw invoiceNotFound();
        if (claim === "stale") throw preconditionFailed();
      }

      const invoice = await invoiceRepo.findOne({ where: { id, userId } });
      if (!invoice) throw invoiceNotFound();

      if (invoice.status !== "draft") {
        throw invoiceStateConflict("Only draft invoices can be edited.");
      }

      let entries = await workLogRepo.find({ where: { userId, invoiceId: invoice.id } });

      if (input.workLogEntryIds !== undefined) {
        const uniqueEntryIds = [...new Set(input.workLogEntryIds)];
        if (uniqueEntryIds.length === 0) {
          throw new BadRequestException({
            code: "validation_failed",
            message: "An invoice must contain at least one work log entry.",
          });
        }
        const requestedEntries = await workLogRepo.find({
          where: { userId, id: In(uniqueEntryIds) },
        });
        if (requestedEntries.length !== uniqueEntryIds.length) {
          throw new BadRequestException({
            code: "validation_failed",
            message: "One or more selected work log entries could not be found.",
          });
        }
        if (
          requestedEntries.some(
            (entry) => entry.invoiceId !== null && entry.invoiceId !== invoice.id,
          )
        ) {
          throw workLogLockedConflict(
            "One or more selected work log entries belong to another invoice.",
          );
        }

        const requestedIdSet = new Set(uniqueEntryIds);
        for (const oldEntry of entries) {
          if (!requestedIdSet.has(oldEntry.id)) {
            oldEntry.invoiceId = null;
            await workLogRepo.save(oldEntry);
          }
        }
        const nextEntries: WorkLogEntry[] = [];
        for (const reqEntry of requestedEntries) {
          if (reqEntry.invoiceId !== invoice.id) {
            reqEntry.invoiceId = invoice.id;
            nextEntries.push(await workLogRepo.save(reqEntry));
          } else {
            nextEntries.push(reqEntry);
          }
        }
        entries = nextEntries;
      }

      if (input.clientName !== undefined) invoice.clientName = input.clientName.trim();
      if (input.clientEmail !== undefined) {
        invoice.clientEmail = input.clientEmail?.trim() || null;
      }
      if (input.clientAddress !== undefined) {
        invoice.clientAddress = input.clientAddress?.trim() || null;
      }
      if (input.issueDate !== undefined) invoice.issueDate = input.issueDate;
      if (input.dueDate !== undefined) invoice.dueDate = input.dueDate;
      if (input.vatRatePct !== undefined) invoice.vatRatePct = input.vatRatePct;
      if (input.notes !== undefined) invoice.notes = input.notes?.trim() || null;

      const totals = calculateInvoiceTotals(
        entries.map((entry) => ({
          hoursWorked: Number(entry.hoursWorked),
          amount: Number(entry.amount),
        })),
        invoice.vatRatePct === null ? null : Number(invoice.vatRatePct),
      );

      invoice.subtotal = totals.subtotal;
      invoice.vatRatePct = totals.vatRatePct;
      invoice.vatAmount = totals.vatAmount;
      invoice.total = totals.total;

      const saved = await invoiceRepo.save(invoice);
      return {
        invoice: toInvoiceDto(saved, entries),
        updatedAt: saved.updatedAt,
      };
    });
  }

  async deleteInvoice(userId: string, id: string): Promise<{ id: string }> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      const invoice = await invoiceRepo.findOne({ where: { id, userId } });
      if (!invoice) throw invoiceNotFound();

      if (invoice.status !== "draft") {
        throw invoiceStateConflict(
          "Only draft invoices can be deleted. Void issued or paid invoices instead.",
        );
      }

      const entries = await workLogRepo.find({ where: { userId, invoiceId: invoice.id } });
      for (const entry of entries) {
        entry.invoiceId = null;
        await workLogRepo.save(entry);
      }

      await invoiceRepo.delete({ id, userId });
      return { id };
    });
  }

  async issueInvoice(userId: string, id: string, expected?: Date): Promise<InvoiceView> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      if (expected) {
        const claim = await claimVersion(invoiceRepo, { id, userId }, expected);
        if (claim === "missing") throw invoiceNotFound();
        if (claim === "stale") throw preconditionFailed();
      }

      const invoice = await invoiceRepo.findOne({ where: { id, userId } });
      if (!invoice) throw invoiceNotFound();

      if (invoice.status !== "draft") {
        throw invoiceStateConflict("Only draft invoices can be issued.");
      }

      const entries = await workLogRepo.find({ where: { userId, invoiceId: invoice.id } });
      if (entries.length === 0) {
        throw invoiceStateConflict("Cannot issue an invoice with no work log entries.");
      }

      const totals = calculateInvoiceTotals(
        entries.map((entry) => ({
          hoursWorked: Number(entry.hoursWorked),
          amount: Number(entry.amount),
        })),
        invoice.vatRatePct === null ? null : Number(invoice.vatRatePct),
      );

      invoice.status = "issued";
      invoice.subtotal = totals.subtotal;
      invoice.vatRatePct = totals.vatRatePct;
      invoice.vatAmount = totals.vatAmount;
      invoice.total = totals.total;

      const saved = await invoiceRepo.save(invoice);
      return {
        invoice: toInvoiceDto(saved, entries),
        updatedAt: saved.updatedAt,
      };
    });
  }

  async markInvoicePaid(
    userId: string,
    id: string,
    input: MarkInvoicePaidRequest,
    expected?: Date,
  ): Promise<InvoiceView> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      if (expected) {
        const claim = await claimVersion(invoiceRepo, { id, userId }, expected);
        if (claim === "missing") throw invoiceNotFound();
        if (claim === "stale") throw preconditionFailed();
      }

      const invoice = await invoiceRepo.findOne({ where: { id, userId } });
      if (!invoice) throw invoiceNotFound();

      if (invoice.status !== "issued") {
        throw invoiceStateConflict("Only issued invoices can be marked as paid.");
      }

      invoice.status = "paid";
      invoice.paidDate = input.paidDate;

      const saved = await invoiceRepo.save(invoice);
      const entries = await workLogRepo.find({ where: { userId, invoiceId: invoice.id } });
      return {
        invoice: toInvoiceDto(saved, entries),
        updatedAt: saved.updatedAt,
      };
    });
  }

  async voidInvoice(userId: string, id: string, expected?: Date): Promise<InvoiceView> {
    return this.invoiceRepository.manager.transaction(async (em) => {
      const workLogRepo = em.getRepository(WorkLogEntry);
      const invoiceRepo = em.getRepository(Invoice);

      if (expected) {
        const claim = await claimVersion(invoiceRepo, { id, userId }, expected);
        if (claim === "missing") throw invoiceNotFound();
        if (claim === "stale") throw preconditionFailed();
      }

      const invoice = await invoiceRepo.findOne({ where: { id, userId } });
      if (!invoice) throw invoiceNotFound();

      if (invoice.status !== "draft" && invoice.status !== "issued") {
        throw invoiceStateConflict("Only draft or issued invoices can be voided.");
      }

      const entries = await workLogRepo.find({ where: { userId, invoiceId: invoice.id } });
      for (const entry of entries) {
        entry.invoiceId = null;
        await workLogRepo.save(entry);
      }

      invoice.status = "void";
      const saved = await invoiceRepo.save(invoice);
      return {
        invoice: toInvoiceDto(saved, []),
        updatedAt: saved.updatedAt,
      };
    });
  }
}
