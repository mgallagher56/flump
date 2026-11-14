import type {
  BulkCreateTaxRecordsRequest,
  CreateTaxRecordRequest,
  TaxRecordCap,
  UpdateTaxRecordRequest,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Response } from "express";
import { Repository } from "typeorm";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag, withVersionClaim } from "../../contract/etag";
import { type KeysetOrder, keysetPage, resolvePage, sendPage } from "../../contract/pagination";
import { TaxRecord } from "../../entities/tax-record.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { RateLimit } from "../../security/rate-limit.decorator";
import { sniffReceiptMime, validateReceipt } from "../../security/receipt-validation";
import {
  pickTaxRecordFields,
  type TaxRecordResponse,
  TaxService,
  toTaxRecordResponse as toResponse,
  withAnnualEndDate,
} from "./tax.service";

export { MAX_BULK_TAX_RECORDS, type TaxRecordResponse } from "./tax.service";

/** GET /tax-records order: newest date first, id as tiebreak (keyset pagination, BE-09). */
const TAX_ORDER: KeysetOrder = {
  keys: [
    { column: '"t"."date"', kind: "date" },
    { column: '"t"."id"', kind: "uuid" },
  ],
  direction: "DESC",
};

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
  @HttpCode(200)
  async getTaxRecords(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<TaxRecordResponse[]> {
    // Keyset-paginated (BE-09): `?limit=&cursor=`, next cursor in X-Next-Cursor.
    const qb = this.taxRecordRepository
      .createQueryBuilder("t")
      .where("t.userId = :userId", { userId: req.user.id });
    return sendPage(res, await keysetPage(qb, TAX_ORDER, resolvePage(query, "tax")), toResponse);
  }

  @Get(":id")
  @HttpCode(200)
  async getTaxRecord(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    setEtag(res, record.updatedAt);
    return toResponse(record);
  }

  /**
   * Streams the receipt bytes. Scoped by `{ id, userId }`; re-validates the stored data, so a
   * legacy row that fails the N14 rules is a 404 rather than served content.
   */
  @Get(":id/receipt")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Security-Policy", "sandbox; default-src 'none'")
  @RateLimit("receiptRead")
  async getReceipt(
    @Req() req: AuthenticatedRequest,
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
  @HttpCode(201)
  @RateLimit("bulkWrite")
  async createBulkTaxRecords(
    @Req() req: AuthenticatedRequest,
    @Body() body: BulkCreateTaxRecordsRequest,
  ): Promise<TaxRecordResponse[]> {
    // Validation and the one-transaction write live in TaxService (audit M3).
    return this.taxService.createBulk(req.user.id, body);
  }

  @Post()
  @HttpCode(201)
  async createTaxRecord(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTaxRecordRequest,
  ): Promise<TaxRecordResponse> {
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
  @HttpCode(200)
  async updateTaxRecord(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTaxRecordRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<TaxRecordResponse> {
    const userId = req.user.id;
    const notFound = () => new NotFoundException("Tax record not found");
    // `If-Match` makes the update conditional (412 when stale, BE-09); the answer carries the ETag.
    const saved = await withVersionClaim(
      this.taxRecordRepository,
      { id, user_id: userId },
      expectedVersion(ifMatch),
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
    setEtag(res, saved.updatedAt);
    return toResponse(saved);
  }

  @Delete(":id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteTaxRecord(
    @Req() req: AuthenticatedRequest,
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
