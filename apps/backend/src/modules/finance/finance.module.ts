import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { BankingModule } from "../banking/banking.module";
import { AccountIntakeService } from "./account-intake.service";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

/** Accounts, account history, transactions and bank connections. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountDetail, BankConnection, Transaction, UserProfile]),
    BankingModule,
  ],
  controllers: [FinanceController],
  providers: [AccountIntakeService, FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
