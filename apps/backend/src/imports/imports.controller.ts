import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../finance.controller";
import { RateLimit } from "../security/rate-limit.decorator";
import {
  type CommitImportInput,
  ImportsService,
  type PreviewImportInput,
  type StageImportInput,
} from "./imports.service";
import { ImportsAccessGuard } from "./imports-access.guard";

/**
 * The import primitive under session auth (E17 re-plan PR C). Owner-only during rollout
 * (ImportsAccessGuard). The user id comes from the token only.
 */
@Controller()
@UseGuards(AuthGuard, ImportsAccessGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post("imports")
  @RateLimit("importStage")
  async stage(@Req() req: AuthenticatedRequest, @Body() body: StageImportInput) {
    return this.imports.stage(req.user.id, body);
  }

  @Get("imports")
  async list(@Req() req: AuthenticatedRequest) {
    return this.imports.list(req.user.id);
  }

  @Get("imports/:id")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.imports.get(req.user.id, id);
  }

  /** Dry run of a commit for the review page. Writes nothing. */
  @Post("imports/:id/preview")
  @HttpCode(200)
  async preview(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: PreviewImportInput,
  ) {
    return this.imports.preview(req.user.id, id, body ?? {});
  }

  @Post("imports/:id/commit")
  async commit(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: CommitImportInput,
  ) {
    return this.imports.commit(req.user.id, id, body ?? {});
  }

  @Post("imports/:id/revert")
  async revert(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.imports.revert(req.user.id, id);
  }
}
