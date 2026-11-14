import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";

/** Budget entries and custom budget categories. Depends on no other domain module. */
@Module({
  imports: [TypeOrmModule.forFeature([BudgetEntry, UserProfile])],
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}
