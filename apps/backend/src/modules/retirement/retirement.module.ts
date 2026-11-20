import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BetaModule } from "../../beta/beta.module";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { PrivacyModule } from "../privacy/privacy.module";
import { RetirementController } from "./retirement.controller";
import { RetirementService } from "./retirement.service";

@Module({
  imports: [TypeOrmModule.forFeature([RetirementPlan]), PrivacyModule, BetaModule],
  controllers: [RetirementController],
  providers: [RetirementService],
  exports: [RetirementService],
})
export class RetirementModule {}
