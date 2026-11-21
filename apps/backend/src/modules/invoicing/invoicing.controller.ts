import {
  type CreateInvoiceRequest,
  type CreateWorkLogEntryRequest,
  type DeleteInvoiceResponse,
  type DeleteWorkLogEntryResponse,
  type InvoiceListResponse,
  type InvoiceResponse,
  type InvoicingSettingsResponse,
  type MarkInvoicePaidRequest,
  NEXT_CURSOR_HEADER,
  type UpdateInvoiceRequest,
  type UpdateInvoicingSettingsRequest,
  type UpdateWorkLogEntryRequest,
  type WorkLogEntryListResponse,
  type WorkLogEntryResponse,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag } from "../../contract/etag";
import { resolvePage } from "../../contract/pagination";
import { RateLimit } from "../../security/rate-limit.decorator";
import { InvoicingService } from "./invoicing.service";

@Controller()
@UseGuards(AuthGuard)
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get("invoicing/settings")
  @HttpCode(200)
  async getSettings(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoicingSettingsResponse> {
    const view = await this.invoicingService.getSettings(req.user.id);
    if (view.updatedAt) setEtag(res, view.updatedAt);
    return { settings: view.settings };
  }

  @Patch("invoicing/settings")
  @HttpCode(200)
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateInvoicingSettingsRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoicingSettingsResponse> {
    const view = await this.invoicingService.updateSettings(
      req.user.id,
      body,
      expectedVersion(ifMatch),
    );
    if (view.updatedAt) setEtag(res, view.updatedAt);
    return { settings: view.settings };
  }

  @Get("work-logs")
  @HttpCode(200)
  async listWorkLogs(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<WorkLogEntryListResponse> {
    const page = await this.invoicingService.listWorkLogs(
      req.user.id,
      query,
      resolvePage(query, "workLogs"),
    );
    if (page.nextCursor) res?.setHeader(NEXT_CURSOR_HEADER, page.nextCursor);
    return { entries: page.items, nextCursor: page.nextCursor };
  }

  @Post("work-logs")
  @HttpCode(201)
  async createWorkLog(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateWorkLogEntryRequest,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<WorkLogEntryResponse> {
    const view = await this.invoicingService.createWorkLog(req.user.id, body);
    setEtag(res, view.updatedAt);
    return { entry: view.entry };
  }

  @Patch("work-logs/:id")
  @HttpCode(200)
  async updateWorkLog(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateWorkLogEntryRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<WorkLogEntryResponse> {
    const view = await this.invoicingService.updateWorkLog(
      req.user.id,
      id,
      body,
      expectedVersion(ifMatch),
    );
    setEtag(res, view.updatedAt);
    return { entry: view.entry };
  }

  @Delete("work-logs/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteWorkLog(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<DeleteWorkLogEntryResponse> {
    return this.invoicingService.deleteWorkLog(req.user.id, id);
  }

  @Get("invoices")
  @HttpCode(200)
  async listInvoices(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceListResponse> {
    const page = await this.invoicingService.listInvoices(
      req.user.id,
      query,
      resolvePage(query, "invoices"),
    );
    if (page.nextCursor) res?.setHeader(NEXT_CURSOR_HEADER, page.nextCursor);
    return { invoices: page.items, nextCursor: page.nextCursor };
  }

  @Get("invoices/:id")
  @HttpCode(200)
  async getInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.getInvoice(req.user.id, id);
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }

  @Post("invoices")
  @HttpCode(201)
  async createInvoice(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateInvoiceRequest,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.createInvoice(req.user.id, body);
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }

  @Patch("invoices/:id")
  @HttpCode(200)
  async updateInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateInvoiceRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.updateInvoice(
      req.user.id,
      id,
      body,
      expectedVersion(ifMatch),
    );
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }

  @Delete("invoices/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<DeleteInvoiceResponse> {
    return this.invoicingService.deleteInvoice(req.user.id, id);
  }

  @Post("invoices/:id/issue")
  @HttpCode(200)
  async issueInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.issueInvoice(
      req.user.id,
      id,
      expectedVersion(ifMatch),
    );
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }

  @Post("invoices/:id/mark-paid")
  @HttpCode(200)
  async markInvoicePaid(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: MarkInvoicePaidRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.markInvoicePaid(
      req.user.id,
      id,
      body,
      expectedVersion(ifMatch),
    );
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }

  @Post("invoices/:id/void")
  @HttpCode(200)
  async voidInvoice(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<InvoiceResponse> {
    const view = await this.invoicingService.voidInvoice(req.user.id, id, expectedVersion(ifMatch));
    setEtag(res, view.updatedAt);
    return { invoice: view.invoice };
  }
}
