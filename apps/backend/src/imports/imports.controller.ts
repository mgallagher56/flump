import type {
  CommitImportRequest,
  PreviewImportRequest,
  StageImportRequest,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { resolvePage, sendPage } from "../contract/pagination";
import { RateLimit } from "../security/rate-limit.decorator";
import { ImportsService } from "./imports.service";
import { ImportsAccessGuard } from "./imports-access.guard";

/**
 * The import primitive under session auth (E17 re-plan PR C). Owner-only during rollout
 * (ImportsAccessGuard). The user id comes from the token only. Bodies are the parsed contract
 * output (BE-09).
 */
@Controller()
@UseGuards(AuthGuard, ImportsAccessGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post("imports")
  @HttpCode(201)
  @RateLimit("importStage")
  async stage(@Req() req: AuthenticatedRequest, @Body() body: StageImportRequest) {
    return this.imports.stage(req.user.id, body);
  }

  @Get("imports")
  @HttpCode(200)
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    // Keyset-paginated (BE-09): `?limit=&cursor=`, next cursor in X-Next-Cursor.
    return sendPage(res, await this.imports.listPage(req.user.id, resolvePage(query, "imports")));
  }

  @Get("imports/:id")
  @HttpCode(200)
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.imports.get(req.user.id, id);
  }

  /** Dry run of a commit for the review page. Writes nothing. */
  @Post("imports/:id/preview")
  @HttpCode(200)
  async preview(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: PreviewImportRequest,
  ) {
    return this.imports.preview(req.user.id, id, body ?? {});
  }

  @Post("imports/:id/commit")
  @HttpCode(200)
  async commit(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: CommitImportRequest,
  ) {
    return this.imports.commit(req.user.id, id, body ?? {});
  }

  @Post("imports/:id/revert")
  @HttpCode(200)
  async revert(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.imports.revert(req.user.id, id);
  }
}
