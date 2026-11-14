import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { resolveTermsVersion, TERMS_VERSION_CONFIG } from "../../config/privacy.config";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { ImportBatch } from "../../entities/import-batch.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { SnapshotCheckin } from "../../entities/snapshot-checkin.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { IdentityModule } from "../../identity/identity.module";
import { BankingModule } from "../banking/banking.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

/** The user's profile, onboarding facts, checklist and financial-data reset. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      AccountDetail,
      BankConnection,
      BudgetEntry,
      ImportBatch,
      McpToken,
      SnapshotCheckin,
      TaxRecord,
      Transaction,
      UserProfile,
    ]),
    BankingModule,
    IdentityModule,
    PrivacyModule,
  ],
  controllers: [UserProfileController],
  providers: [
    UserProfileService,
    // BE-15 (M-PRIV3): the terms version, read once at boot; null while TERMS_VERSION is unset.
    { provide: TERMS_VERSION_CONFIG, useFactory: () => resolveTermsVersion(process.env) },
  ],
  exports: [UserProfileService],
})
export class ProfileModule {}
