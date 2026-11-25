import { Module } from "@nestjs/common";
import { RetentionScheduler } from "./retention.scheduler";

/** The backend's own daily retention purge (D5 revised, 25 Nov 2026). */
@Module({ providers: [RetentionScheduler] })
export class RetentionModule {}
