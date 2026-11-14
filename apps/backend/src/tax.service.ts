import {
  MAX_BULK_TAX_RECORDS as CONTRACT_MAX_BULK_TAX_RECORDS,
  type TaxRecordCap,
} from "@flump/api-contract";
import { getUkTaxYearForDate } from "@flump/finance-engine";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TaxRecord } from "./entities/tax-record.entity";
import { validateReceipt } from "./security/receipt-validation";

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

export const pickTaxRecordFields = (body: Partial<TaxRecord> | undefined): Partial<TaxRecord> => {
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
export const isIsoCalendarDate = (value: string): boolean => {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};

/**
 * 5 April closing the UK tax year that contains `date` (BE-08, audit M1). Built on
 * getUkTaxYearForDate: the tax year starts on 6 April, so 1 to 5 April belong to the year that
 * ends that 5 April (2026-04-03 is in 2025/26 and ends 2026-04-05).
 */
export const annualRecordEndDate = (date: string): string => {
  const startYear = Number(getUkTaxYearForDate(date).slice(0, 4));
  return `${startYear + 1}-04-05`;
};

/**
 * E23 D16 / D-7-A: an annual record belongs to the tax year containing its `date`, and its stored
 * `end_date` says so (5 April closing that year). The end date of an annual record is always
 * derived from its date; a client value is replaced, so editing the date never leaves a stale one.
 */
export const withAnnualEndDate = <T extends Partial<TaxRecord>>(record: T): T => {
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

  private inTransaction<T>(work: (records: Repository<TaxRecord>) => Promise<T>): Promise<T> {
    const manager = this.taxRecordRepository.manager;
    if (!manager?.transaction) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Tax bulk writes need a TypeORM manager to run transactionally");
      }
      return work(this.taxRecordRepository);
    }
    return manager.transaction((em) => work(em.getRepository(TaxRecord)));
  }
}
