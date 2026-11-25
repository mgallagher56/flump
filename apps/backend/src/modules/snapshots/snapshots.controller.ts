import type {
  AnswerWellbeingQuestionsResponse,
  SnapshotCheckInsResponse,
  SnapshotMonthParams,
  UpsertSnapshotRequest,
  WellbeingQuestionsStatusResponse,
} from "@flump/api-contract";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
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
import { WellbeingQuestionsService } from "./wellbeing-questions.service";

@Controller()
@UseGuards(AuthGuard)
export class SnapshotsController {
  constructor(
    private readonly snapshots: SnapshotsService,
    private readonly wellbeing: WellbeingQuestionsService,
  ) {}

  /**
   * The latest month whose check-in was finished, and the latest one started, for the check-in
   * reminder (slice 4, L70) and its "Continue check-in" label (CH-3).
   */
  @Get("snapshots/check-ins")
  @HttpCode(200)
  async checkIns(@Req() req: AuthenticatedRequest): Promise<SnapshotCheckInsResponse> {
    const { completed, started } = await this.snapshots.latestMonths(req.user.id);
    return { latestCompletedMonth: completed, latestStartedMonth: started };
  }

  /** E35 W5: whether to offer the two optional questions after this check-in. */
  @Get("snapshots/wellbeing-questions")
  @HttpCode(200)
  async wellbeingStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<WellbeingQuestionsStatusResponse> {
    return this.wellbeing.status(req.user.id);
  }

  /**
   * E35 W5: records the answer, or a skip, for the current London quarter. The free text is never
   * logged; the body is handed straight to the service, which validates it.
   */
  @Post("snapshots/wellbeing-questions")
  @HttpCode(200)
  async answerWellbeing(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AnswerWellbeingQuestionsResponse> {
    return this.wellbeing.record(req.user.id, body);
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
