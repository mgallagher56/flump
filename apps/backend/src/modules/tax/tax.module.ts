import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Account } from "../../entities/account.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";

/**
 * Tax records and receipts. Depends on no other domain module; it reads the Account table only to
 * check that a record's linked account is the caller's own and fits its source (slice 7).
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaxRecord, Account])],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}
