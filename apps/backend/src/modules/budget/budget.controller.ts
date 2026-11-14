import type {
  AddBudgetCategoryRequest,
  CreateBudgetEntryRequest,
  UpdateBudgetEntryRequest,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
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
import { resolvePage, sendPage } from "../../contract/pagination";
import type { BudgetEntry } from "../../entities/budget-entry.entity";
import { RateLimit } from "../../security/rate-limit.decorator";
import { BudgetService } from "./budget.service";

@Controller()
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  @Get("budget-entries")
  @HttpCode(200)
  async getBudgetEntries(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<BudgetEntry[]> {
    // Keyset-paginated (BE-09): `?limit=&cursor=`, next cursor in X-Next-Cursor.
    return sendPage(res, await this.budget.listEntries(req.user.id, resolvePage(query, "budget")));
  }

  @Post("budget-entries/seed-defaults")
  @HttpCode(200)
  async seedDefaultBudgetEntries(@Req() req: AuthenticatedRequest): Promise<BudgetEntry[]> {
    return this.budget.seedDefaults(req.user.id);
  }

  @Post("budget-entries/categories")
  @HttpCode(201)
  async addCustomCategory(
    @Req() req: AuthenticatedRequest,
    @Body() body: AddBudgetCategoryRequest,
  ): Promise<{ success: boolean; categories: string[] }> {
    return this.budget.addCustomCategory(req.user.id, body);
  }

  @Post("budget-entries")
  @HttpCode(201)
  async createBudgetEntry(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateBudgetEntryRequest,
  ): Promise<BudgetEntry> {
    return this.budget.createEntry(req.user.id, body);
  }

  @Patch("budget-entries/:id")
  @HttpCode(200)
  async updateBudgetEntry(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateBudgetEntryRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<BudgetEntry> {
    // `If-Match` makes the update conditional (412 when stale, BE-09); the answer carries the ETag.
    const saved = await this.budget.updateEntry(req.user.id, id, body, expectedVersion(ifMatch));
    setEtag(res, saved.updatedAt);
    return saved;
  }

  @Delete("budget-entries/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteBudgetEntry(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    return this.budget.deleteEntry(req.user.id, id);
  }
}
