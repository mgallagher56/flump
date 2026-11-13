import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { TaxRecord } from "./entities/tax-record.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { RateLimit } from "./security/rate-limit.decorator";
import { sniffReceiptMime, validateReceipt } from "./security/receipt-validation";

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

/** Tax record as returned to clients: never carries the receipt bytes. */
export type TaxRecordResponse = Omit<TaxRecord, "receiptData"> & { hasReceipt: boolean };

const toResponse = (record: TaxRecord): TaxRecordResponse => {
  const { receiptData, ...rest } = record;
  // receiptData is `select: false`, so reads carry the metadata only; writes carry the data.
  const hasReceipt =
    (receiptData !== undefined && receiptData !== null) ||
    Boolean(rest.receiptFilename && rest.receiptMimeType);
  return { ...rest, hasReceipt };
};

@Controller("tax-records")
@UseGuards(AuthGuard)
export class TaxController {
  constructor(
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @InjectRepository(UserProfile)
    private readonly _userProfileRepository: Repository<UserProfile>,
  ) {}

  @Get()
  async getTaxRecords(@Req() req: any): Promise<TaxRecordResponse[]> {
    const userId = req.user.id;
    const records = await this.taxRecordRepository.find({
      where: { userId },
      order: { date: "DESC" },
    });
    return records.map(toResponse);
  }

  @Get(":id")
  async getTaxRecord(
    @Req() req: any,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    return toResponse(record);
  }

  /**
   * Streams the receipt bytes. Scoped by `{ id, userId }`; re-validates the stored data, so a
   * legacy row that fails the N14 rules is a 404 rather than served content.
   */
  @Get(":id/receipt")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Security-Policy", "sandbox; default-src 'none'")
  @RateLimit("receiptRead")
  async getReceipt(
    @Req() req: any,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<StreamableFile> {
    const userId = req.user.id;
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
    const encodedName = encodeURIComponent(record.receiptFilename ?? "receipt").replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new StreamableFile(bytes, {
      type,
      length: bytes.length,
      disposition: `attachment; filename*=UTF-8''${encodedName}`,
    });
  }

  @Post("bulk")
  @RateLimit("bank")
  async createBulkTaxRecords(
    @Req() req: any,
    @Body()
    body: {
      records: Partial<TaxRecord>[];
      capPreviousRecordIds?: { id: string; endDate: string }[];
    },
  ): Promise<TaxRecordResponse[]> {
    const userId = req.user.id;

    if (body.capPreviousRecordIds && Array.isArray(body.capPreviousRecordIds)) {
      for (const item of body.capPreviousRecordIds) {
        if (item.id && item.endDate) {
          await this.taxRecordRepository.update({ id: item.id, userId }, { endDate: item.endDate });
        }
      }
    }

    if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
      return [];
    }

    const created = this.taxRecordRepository.create(
      body.records.map((r) => ({
        ...pickTaxRecordFields(r),
        userId,
      })),
    );
    const saved = await this.taxRecordRepository.save(created);
    return saved.map(toResponse);
  }

  @Post()
  async createTaxRecord(@Req() req: any, @Body() body: any): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const record = this.taxRecordRepository.create({
      ...pickTaxRecordFields(body),
      userId,
    });
    return toResponse(await this.taxRecordRepository.save(record));
  }

  @Patch(":id")
  async updateTaxRecord(
    @Req() req: any,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: any,
  ): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    // receiptData is not loaded (select: false), so an omitted field keeps the stored bytes.
    Object.assign(record, pickTaxRecordFields(body));
    return toResponse(await this.taxRecordRepository.save(record));
  }

  @Delete(":id")
  @RateLimit("destructive")
  async deleteTaxRecord(
    @Req() req: any,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    await this.taxRecordRepository.remove(record);
    return { success: true };
  }
}
