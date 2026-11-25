import { Module } from "@nestjs/common";
import { SnapshotsController } from "./snapshots.controller";
import { SnapshotsService } from "./snapshots.service";
import { WellbeingQuestionsService } from "./wellbeing-questions.service";

/**
 * Monthly account values (E30) and the two optional questions after a check-in (E35 W5). Depends
 * on no other domain module.
 */
@Module({
  controllers: [SnapshotsController],
  providers: [SnapshotsService, WellbeingQuestionsService],
})
export class SnapshotsModule {}
