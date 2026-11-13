import { Body, Controller, Param, Put, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../finance.controller";
import { SnapshotsService, type UpsertSnapshotInput } from "./snapshots.service";

@Controller()
@UseGuards(AuthGuard)
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  /** Batch upsert of account values for one month (E30). The user id comes from the token only. */
  @Put("snapshots/:month")
  async upsert(
    @Req() req: AuthenticatedRequest,
    @Param("month") month: string,
    @Body() body: UpsertSnapshotInput,
  ) {
    return this.snapshots.upsertMonth(req.user.id, month, body);
  }
}
