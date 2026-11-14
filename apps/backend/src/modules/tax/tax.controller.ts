import type {
  BulkCreateTaxRecordsRequest,
  CreateTaxRecordRequest,
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
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag } from "../../contract/etag";
import { resolvePage, sendPage } from "../../contract/pagination";
import { RateLimit } from "../../security/rate-limit.decorator";
import {
  type TaxRecordResponse,
  TaxService,
  toTaxRecordResponse as toResponse,
} from "./tax.service";

export { MAX_BULK_TAX_RECORDS, type TaxRecordResponse } from "./tax.service";

@Controller("tax-records")
@UseGuards(AuthGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @HttpCode(200)
  async getTaxRecords(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<TaxRecordResponse[]> {
    // Keyset-paginated (BE-09): `?limit=&cursor=`, next cursor in X-Next-Cursor.
    const page = await this.taxService.listRecords(req.user.id, resolvePage(query, "tax"));
    return sendPage(res, page, toResponse);
  }

  @Get(":id")
  @HttpCode(200)
  async getTaxRecord(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<TaxRecordResponse> {
    const record = await this.taxService.getRecord(req.user.id, id);
    setEtag(res, record.updatedAt);
    return toResponse(record);
  }

  /** Streams the receipt bytes as an attachment; TaxService re-validates them first. */
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
    const { bytes, type, filename } = await this.taxService.readReceipt(req.user.id, id);
    const encodedName = encodeURIComponent(filename ?? "receipt").replace(
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
    return this.taxService.createRecord(req.user.id, body);
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
    // `If-Match` makes the update conditional (412 when stale, BE-09); the answer carries the ETag.
    const saved = await this.taxService.updateRecord(
      req.user.id,
      id,
      body,
      expectedVersion(ifMatch),
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
    return this.taxService.deleteRecord(req.user.id, id);
  }
}
