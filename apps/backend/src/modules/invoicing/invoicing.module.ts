import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invoice } from "../../entities/invoice.entity";
import { InvoicingSettings } from "../../entities/invoicing-settings.entity";
import { WorkLogEntry } from "../../entities/work-log-entry.entity";
import { InvoicingController } from "./invoicing.controller";
import { InvoicingService } from "./invoicing.service";

@Module({
  imports: [TypeOrmModule.forFeature([InvoicingSettings, WorkLogEntry, Invoice])],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
