import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TaxRecord } from "../../entities/tax-record.entity";
import { TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";

/** Tax records and receipts. Depends on no other domain module. */
@Module({
  imports: [TypeOrmModule.forFeature([TaxRecord])],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}
