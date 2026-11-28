import { Module } from "@nestjs/common";
import { SnapshotsController } from "./snapshots.controller";
import { SnapshotsService } from "./snapshots.service";

/** Monthly account values (E30). Depends on no other domain module. */
@Module({
  controllers: [SnapshotsController],
  providers: [SnapshotsService],
})
export class SnapshotsModule {}
