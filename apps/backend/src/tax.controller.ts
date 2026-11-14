import type { TaxRecordCap } from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Optional,
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
import {
  pickTaxRecordFields,
  type TaxRecordResponse,
  TaxService,
  toTaxRecordResponse as toResponse,
  withAnnualEndDate,
} from "./tax.service";

export { MAX_BULK_TAX_RECORDS, type TaxRecordResponse } from "./tax.service";

@Controller("tax-records")
@UseGuards(AuthGuard)
export class TaxController {
  private readonly taxService: TaxService;

  constructor(
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @InjectRepository(UserProfile)
    private readonly _userProfileRepository: Repository<UserProfile>,
    @Optional()
    taxService?: TaxService,
  ) {
    this.taxService = taxService ?? new TaxService(taxRecordRepository);
  }

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
  @RateLimit("bulkWrite")
  async createBulkTaxRecords(
    @Req() req: any,
    @Body()
    body: {
      records: Partial<TaxRecord>[];
      capPreviousRecordIds?: TaxRecordCap[];
    },
  ): Promise<TaxRecordResponse[]> {
    // Validation and the one-transaction write live in TaxService (audit M3).
    return this.taxService.createBulk(req.user.id, body);
  }

  @Post()
  async createTaxRecord(@Req() req: any, @Body() body: any): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const record = this.taxRecordRepository.create(
      withAnnualEndDate({
        ...pickTaxRecordFields(body),
        userId,
      }),
    );
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
    withAnnualEndDate(record);
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
