import {
  MAX_BULK_TAX_RECORDS as CONTRACT_MAX_BULK_TAX_RECORDS,
  type CreateTaxRecordRequest,
  type TaxRecordCap,
  type UpdateTaxRecordRequest,
} from "@flump/api-contract";
import { getAnnualRecordEndDate } from "@flump/finance-engine";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

const pickTaxRecordFields = (body: Partial<TaxRecord> | undefined): Partial<TaxRecord> => {
  const picked: Record<string, unknown> = {};
  for (const key of TAX_RECORD_FIELDS) {
    if (body?.[key] !== undefined) picked[key] = body[key];
  }
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
      ? body.records.map((r) => withAnnualEndDate({ ...pickTaxRecordFields(r), userId }))
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
   * that fails the N14 rules is a 404 rather than served content.
   */
  async readReceipt(userId: string, id: string): Promise<ReceiptFile> {
    const record = await this.taxRecordRepository.findOne({
      where: { id, userId },
      select: { id: true, receiptFilename: true, receiptMimeType: true, receiptData: true },
    });
    const notFound = new NotFoundException("Receipt not found");
    if (!record?.receiptData) throw notFound;
    let mime: ReturnType<typeof validateReceipt>;
    try {
      mime = validateReceipt({
        receiptFilename: record.receiptFilename,
        receiptMimeType: record.receiptMimeType,
        receiptData: record.receiptData,
      });
    } catch {
      throw notFound;
    }
    const bytes = Buffer.from(
      record.receiptData.slice(record.receiptData.indexOf(",") + 1),
      "base64",
    );
    const type = mime ?? sniffReceiptMime(bytes);
    if (!type) throw notFound;
    return { bytes, type, filename: record.receiptFilename ?? null };
  }

  async createRecord(userId: string, body: CreateTaxRecordRequest): Promise<TaxRecordResponse> {
    const record = this.taxRecordRepository.create(
      withAnnualEndDate({
        ...pickTaxRecordFields(body),
        userId,
      }),
    );
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
        Object.assign(record, pickTaxRecordFields(body));
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
