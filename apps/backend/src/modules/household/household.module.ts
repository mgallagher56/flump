import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { PrivacyModule } from "../privacy/privacy.module";
import { HouseholdController } from "./household.controller";
import { HouseholdService } from "./household.service";
import { HouseholdGateMiddleware } from "./household-gate.middleware";

/**
 * Households for couples (E34 C3), behind the household switch (config/household-gate.ts). The
 * routes are always registered; HouseholdGateMiddleware makes them answer like unknown routes while
 * the switch is off. Erasure and export of household rows live in the privacy module.
 */
@Module({
  imports: [PrivacyModule],
  controllers: [HouseholdController],
  providers: [HouseholdService],
})
export class HouseholdModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HouseholdGateMiddleware).forRoutes(HouseholdController);
  }
}
