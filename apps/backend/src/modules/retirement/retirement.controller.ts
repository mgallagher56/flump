import type { RetirementPlanResponse, UpsertRetirementPlanRequest } from "@flump/api-contract";
import { Body, Controller, Get, Headers, HttpCode, Put, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag } from "../../contract/etag";
import { RetirementService } from "./retirement.service";

@Controller()
// Open to everyone the beta gate allows (owner, 20 Nov 2026, superseding RD9): AuthGuard only.
@UseGuards(AuthGuard)
export class RetirementController {
  constructor(private readonly retirementService: RetirementService) {}

  @Get("retirement-plan")
  @HttpCode(200)
  async getPlan(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<RetirementPlanResponse> {
    const view = await this.retirementService.getPlan(req.user.id);
    // No saved row, no version: the first PUT is sent without If-Match.
    if (view.updatedAt) setEtag(res, view.updatedAt);
    return { plan: view.plan };
  }

  @Put("retirement-plan")
  @HttpCode(200)
  async upsertPlan(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpsertRetirementPlanRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<RetirementPlanResponse> {
    const view = await this.retirementService.upsertPlan(
      req.user.id,
      body,
      expectedVersion(ifMatch),
    );
    if (view.updatedAt) setEtag(res, view.updatedAt);
    return { plan: view.plan };
  }
}
