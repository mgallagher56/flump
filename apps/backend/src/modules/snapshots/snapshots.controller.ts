import type { SnapshotMonthParams, UpsertSnapshotRequest } from "@flump/api-contract";
import { Body, Controller, HttpCode, Param, Put, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { SnapshotsService } from "./snapshots.service";

@Controller()
@UseGuards(AuthGuard)
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  /** Batch upsert of account values for one month (E30). The user id comes from the token only. */
  @Put("snapshots/:month")
  @HttpCode(200)
  async upsert(
    @Req() req: AuthenticatedRequest,
    @Param("month") month: SnapshotMonthParams["month"],
    @Body() body: UpsertSnapshotRequest,
  ) {
    return this.snapshots.upsertMonth(req.user.id, month, body);
  }
}
