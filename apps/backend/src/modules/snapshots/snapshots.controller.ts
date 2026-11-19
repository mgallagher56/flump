import type {
  SnapshotCheckInsResponse,
  SnapshotMonthParams,
  UpsertSnapshotRequest,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersions, setEtag } from "../../contract/etag";
import { SnapshotsService } from "./snapshots.service";

@Controller()
@UseGuards(AuthGuard)
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  /** The latest month whose check-in was finished, for the check-in reminder (slice 4, L70). */
  @Get("snapshots/check-ins")
  @HttpCode(200)
  async checkIns(@Req() req: AuthenticatedRequest): Promise<SnapshotCheckInsResponse> {
    return { latestCompletedMonth: await this.snapshots.latestCompletedMonth(req.user.id) };
  }

  /**
   * Batch upsert of account values for one month (E30). The user id comes from the token only.
   * `If-Match` (a list of the row versions the client has read) makes it conditional: 412 when a
   * row it would replace changed since. The answer's ETag is the version of the rows written.
   */
  @Put("snapshots/:month")
  @HttpCode(200)
  async upsert(
    @Req() req: AuthenticatedRequest,
    @Param("month") month: SnapshotMonthParams["month"],
    @Body() body: UpsertSnapshotRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const writtenAt = new Date();
    const result = await this.snapshots.upsertMonth(req.user.id, month, body, writtenAt, {
      expected: expectedVersions(ifMatch),
    });
    setEtag(res, writtenAt);
    return result;
  }
}
