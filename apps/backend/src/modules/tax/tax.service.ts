import { randomUUID } from "node:crypto";
import {
  broughtForwardRuleError,
  MAX_BULK_TAX_RECORDS as CONTRACT_MAX_BULK_TAX_RECORDS,
  type CreateTaxRecordRequest,
  LEGACY_PAYE_SALARY_CATEGORY,
  type TaxRecordCap,
  taxCategoryError,
  type UpdateTaxRecordRequest,
} from "@flump/api-contract";
import { decryptReceiptData, encryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import { getAnnualRecordEndDate } from "@flump/finance-engine";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { withVersionClaim } from "../../contract/etag";
import {
  type KeysetOrder,
  keysetPage,
  type Page,
  type PageRequest,
} from "../../contract/pagination";
import { TaxRecord } from "../../entities/tax-record.entity";
import { sniffReceiptMime, validateReceipt } from "../../security/receipt-validation";

/** GET /tax-records order: newest date first, id as tiebreak (keyset pagination, BE-09). */
const TAX_ORDER: KeysetOrder = {
  keys: [
    { column: '"t"."date"', kind: "date" },
    { column: '"t"."id"', kind: "uuid" },
  ],
  direction: "DESC",
};

/** A stored receipt that passed re-validation, ready to stream. */
export interface ReceiptFile {
  bytes: Buffer;
  type: string;
  filename: string | null;
}

/**
 * Maximum tax records (and capPreviousRecordIds items) accepted by one `POST tax-records/bulk`
 * request. A copied tax year or CSV import is a few dozen rows; 500 leaves ample headroom while
 * bounding the work done per request even though the route accepts an 8mb body. It is the
 * contract's own cap, re-checked here so it holds with CONTRACT_MODE=off.
 */
export const MAX_BULK_TAX_RECORDS = CONTRACT_MAX_BULK_TAX_RECORDS;

/**
 * Allow-list of client-writable tax record fields. `id`, `userId`,
 * `createdAt` and `updatedAt` are never copied from a request body.
 */
const TAX_RECORD_FIELDS = [
  "type",
  "source",
  "category",
  "name",
  "amount",
  "frequency",
  "date",
  "endDate",
  "notes",
  "receiptFilename",
  "receiptMimeType",
  "receiptData",
] as const;

/** Finance costs brought forward are one yearly rental expense (contract rule, also held here). */
const assertBroughtForwardRules = (record: Partial<TaxRecord>): void => {
  const error = broughtForwardRuleError(record);
  if (error) throw new BadRequestException(error.message);
};

/**
 * A record is written only with a category its source lists (the engine's lists, through the
 * contract), so the engine never silently leaves it out. The contract refuses it too; this holds
 * with CONTRACT_MODE off or in shadow mode, and checks an update on the merged record. The 400 has
 * the contract's shape, naming only the category field. Stored rows with other categories are
 * still read and deleted as they are.
 */
const assertKnownCategory = (record: Partial<TaxRecord>): void => {
  const error = taxCategoryError(record);
  if (!error) return;
  throw new BadRequestException({
    code: "validation_failed",
    message: "Request failed validation",
    issues: [{ path: `body.${error.path}`, code: "custom", message: error.message }],
  });
};

const pickTaxRecordFields = (body: Partial<TaxRecord> | undefined): Partial<TaxRecord> => {
  const picked: Record<string, unknown> = {};
  for (const key of TAX_RECORD_FIELDS) {
    if (body?.[key] !== undefined) picked[key] = body[key];
  }
  // The contract trims the category; this holds with CONTRACT_MODE off or in shadow mode, so a
  // padded id is stored as the id the engine reads.
  if (typeof picked.category === "string") picked.category = picked.category.trim();
  // Slice 6: the profile salary is the one salary figure, so no record may be salary. The
  // contract refuses it too; this holds with CONTRACT_MODE off or in shadow mode.
  if (picked.category === LEGACY_PAYE_SALARY_CATEGORY) {
    throw new BadRequestException("Salary is saved on your profile, not as a tax record");
  }
  assertBroughtForwardRules(picked);
  assertKnownCategory(picked);
  const mime = validateReceipt(picked);
  // Receipt metadata only changes together with the data: a bare filename or MIME type from the
  // client is ignored, so metadata can never disagree with the stored bytes.
  if (picked.receiptData === undefined) {
    delete picked.receiptFilename;
    delete picked.receiptMimeType;
  }
  if (mime) picked.receiptMimeType = mime;
  else if (picked.receiptData === null) {
    picked.receiptMimeType = null;
    picked.receiptFilename = null;
  }
  return picked as Partial<TaxRecord>;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in YYYY-MM-DD form (rejects 2024-13-45 before Postgres 500s on it). */
const isIsoCalendarDate = (value: string): boolean => {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};

/** 5 April closing the UK tax year that contains `date` (BE-08, audit M1). */
export const annualRecordEndDate = getAnnualRecordEndDate;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * E23 D16 / D-7-A: an annual record belongs to the tax year containing its `date`, and its stored
 * `end_date` says so (5 April closing that year). The end date of an annual record is always
 * derived from its date; a client value is replaced, so editing the date never leaves a stale one.
 */
const withAnnualEndDate = <T extends Partial<TaxRecord>>(record: T): T => {
  for (const field of ["date", "endDate"] as const) {
    const value = record[field];
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && isIsoCalendarDate(value))
    ) {
      throw new BadRequestException(`${field} must be a date in YYYY-MM-DD form`);
    }
  }
  if (record.frequency === "annual" && typeof record.date === "string") {
    record.endDate = annualRecordEndDate(record.date);
  }
  return record;
};

/** Tax record as returned to clients: never carries the receipt bytes. */
export type TaxRecordResponse = Omit<TaxRecord, "receiptData"> & { hasReceipt: boolean };

export const toTaxRecordResponse = (record: TaxRecord): TaxRecordResponse => {
  const { receiptData, ...rest } = record;
  // receiptData is `select: false`, so reads carry the metadata only; writes carry the data.
  const hasReceipt =
    (receiptData !== undefined && receiptData !== null) ||
    Boolean(rest.receiptFilename && rest.receiptMimeType);
  // An insert leaves unset nullable columns undefined on the saved entity (JSON would drop the
  // key), so they are normalised to null: create, bulk and reads all return the same shape.
  return {
    ...rest,
    endDate: rest.endDate ?? null,
    notes: rest.notes ?? null,
    receiptFilename: rest.receiptFilename ?? null,
    receiptMimeType: rest.receiptMimeType ?? null,
    hasReceipt,
  };
};

export interface BulkTaxRecordsBody {
  records: Partial<TaxRecord>[];
  capPreviousRecordIds?: TaxRecordCap[];
}

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
  ) {}

  /**
   * `POST tax-records/bulk`: caps the previous records and creates the new ones in one
   * transaction (audit M3), so a failure part-way leaves nothing written. Everything is validated
   * before the transaction opens. Caps are scoped by `{ id, userId }`: another user's id matches
   * no row and changes nothing.
   */
  async createBulk(userId: string, body: BulkTaxRecordsBody): Promise<TaxRecordResponse[]> {
    if (Array.isArray(body?.records) && body.records.length > MAX_BULK_TAX_RECORDS) {
      throw new BadRequestException(
        `A bulk request may contain at most ${MAX_BULK_TAX_RECORDS} tax records`,
      );
    }
    if (
      Array.isArray(body?.capPreviousRecordIds) &&
      body.capPreviousRecordIds.length > MAX_BULK_TAX_RECORDS
    ) {
      throw new BadRequestException(
        `A bulk request may cap at most ${MAX_BULK_TAX_RECORDS} previous tax records`,
      );
    }

    const caps = Array.isArray(body?.capPreviousRecordIds) ? body.capPreviousRecordIds : [];
    for (const item of caps) {
      if (item === null || typeof item !== "object") {
        throw new BadRequestException("Each capPreviousRecordIds item must be an object");
      }
      if (typeof item.id !== "string" || !item.id || typeof item.endDate !== "string") {
        throw new BadRequestException("Each capPreviousRecordIds item needs an id and an endDate");
      }
      if (!UUID_PATTERN.test(item.id)) {
        throw new BadRequestException("Each capPreviousRecordIds id must be a uuid");
      }
      if (!isIsoCalendarDate(item.endDate)) {
        throw new BadRequestException(
          "capPreviousRecordIds endDate must be a date in YYYY-MM-DD form",
        );
      }
    }
    const picked = Array.isArray(body?.records)
      ? body.records.map((r) => {
          const item = withAnnualEndDate({ ...pickTaxRecordFields(r), userId });
          if (typeof item.receiptData === "string" && item.receiptData.length > 0) {
            const id = item.id ?? randomUUID();
            item.id = id;
            item.receiptData = encryptReceiptData(item.receiptData, id);
          }
          return item;
        })
      : [];
    if (caps.length === 0 && picked.length === 0) return [];

    return this.inTransaction(async (records) => {
      for (const item of caps) {
        await records.update({ id: item.id, userId }, { endDate: item.endDate });
      }
      if (picked.length === 0) return [];
      const saved = await records.save(records.create(picked));
      return saved.map(toTaxRecordResponse);
    });
  }

  /** One keyset page of the user's records. */
  async listRecords(userId: string, page: PageRequest): Promise<Page<TaxRecord>> {
    const qb = this.taxRecordRepository
      .createQueryBuilder("t")
      .where("t.userId = :userId", { userId });
    return keysetPage(qb, TAX_ORDER, page);
  }

  async getRecord(userId: string, id: string): Promise<TaxRecord> {
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    return record;
  }

  /**
   * The receipt bytes, scoped by `{ id, userId }`. Re-validates the stored data, so a legacy row
   * that fails the N14 rules is a 404 rather than served content. A valid legacy plaintext receipt
   * (one `EncryptTaxReceipts1795200000000` did not reach) is encrypted in place on this first read
   * and then served.
   */
  async readReceipt(userId: string, id: string): Promise<ReceiptFile> {
    const record = await this.taxRecordRepository.findOne({
      where: { id, userId },
      select: { id: true, receiptFilename: true, receiptMimeType: true, receiptData: true },
    });
    const notFound = new NotFoundException("Receipt not found");
    if (!record?.receiptData) throw notFound;
    const legacyPlaintext = !isEncryptedToken(record.receiptData);
    let plaintextReceipt: string;
    let mime: ReturnType<typeof validateReceipt>;
    try {
      plaintextReceipt = legacyPlaintext
        ? record.receiptData
        : decryptReceiptData(record.receiptData, record.id);
      mime = validateReceipt({
        receiptFilename: record.receiptFilename,
        receiptMimeType: record.receiptMimeType,
        receiptData: plaintextReceipt,
      });
    } catch {
      throw notFound;
    }
    const bytes = Buffer.from(plaintextReceipt.slice(plaintextReceipt.indexOf(",") + 1), "base64");
    const type = mime ?? sniffReceiptMime(bytes);
    if (!type) throw notFound;
    if (legacyPlaintext) await this.encryptLegacyReceipt(userId, record.id, plaintextReceipt);
    return { bytes, type, filename: record.receiptFilename ?? null };
  }

  /**
   * Writes back the encrypted form of a legacy plaintext receipt. Only a row still holding that
   * exact plaintext is rewritten (a concurrent upload wins), and `updated_at` is kept so a read
   * does not change the record's ETag. A failure is logged and the read still succeeds: the next
   * read tries again.
   */
  private async encryptLegacyReceipt(userId: string, id: string, plaintext: string): Promise<void> {
    try {
      await this.taxRecordRepository
        .createQueryBuilder()
        .update()
        .set({
          receiptData: encryptReceiptData(plaintext, id),
          updatedAt: () => '"updated_at"',
        } as never)
        .where(`"id" = :id AND "user_id" = :userId AND "receipt_data" = :plaintext`, {
          id,
          userId,
          plaintext,
        })
        .execute();
    } catch (err) {
      this.logger.warn(
        `Could not encrypt a legacy plaintext receipt on read: ${err instanceof Error ? err.name : "unknown error"}`,
      );
    }
  }

  async createRecord(userId: string, body: CreateTaxRecordRequest): Promise<TaxRecordResponse> {
    const picked = withAnnualEndDate({
      ...pickTaxRecordFields(body),
      userId,
    });
    if (typeof picked.receiptData === "string" && picked.receiptData.length > 0) {
      const id = picked.id ?? randomUUID();
      picked.id = id;
      picked.receiptData = encryptReceiptData(picked.receiptData, id);
    }
    const record = this.taxRecordRepository.create(picked);
    return toTaxRecordResponse(await this.taxRecordRepository.save(record));
  }

  /** Conditional on `expected` when given (412 when stale, BE-09). */
  async updateRecord(
    userId: string,
    id: string,
    body: UpdateTaxRecordRequest,
    expected: Date | undefined,
  ): Promise<TaxRecord> {
    const notFound = () => new NotFoundException("Tax record not found");
    return withVersionClaim(
      this.taxRecordRepository,
      { id, user_id: userId },
      expected,
      notFound,
      async (repository) => {
        const record = await repository.findOne({ where: { id, userId } });
        if (!record) throw notFound();
        // receiptData is not loaded (select: false), so an omitted field keeps the stored bytes.
        const picked = pickTaxRecordFields(body);
        if (typeof picked.receiptData === "string" && picked.receiptData.length > 0) {
          picked.receiptData = encryptReceiptData(picked.receiptData, record.id);
        }
        Object.assign(record, picked);
        // Checked on the merged record: a change to one field can break the rules on its own.
        assertBroughtForwardRules(record);
        if (picked.category !== undefined || picked.source !== undefined) {
          assertKnownCategory(record);
        }
        withAnnualEndDate(record);
        return repository.save(record);
      },
    );
  }

  async deleteRecord(userId: string, id: string): Promise<{ success: boolean }> {
    const record = await this.getRecord(userId, id);
    await this.taxRecordRepository.remove(record);
    return { success: true };
  }

  private inTransaction<T>(work: (records: Repository<TaxRecord>) => Promise<T>): Promise<T> {
    const manager = this.taxRecordRepository.manager;
    if (!manager?.transaction) {
      throw new Error("Tax bulk writes need a TypeORM manager to run transactionally");
    }
    return manager.transaction((em) => work(em.getRepository(TaxRecord)));
  }
}
