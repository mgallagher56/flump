import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TERMS_ACCEPTANCE_CHECK } from "../../auth/terms-acceptance";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { ImportBatch } from "../../entities/import-batch.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { SnapshotCheckin } from "../../entities/snapshot-checkin.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { TermsAcceptance } from "../../entities/terms-acceptance.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { IdentityModule } from "../../identity/identity.module";
import { BankingModule } from "../banking/banking.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { TermsAcceptanceService } from "./terms-acceptance.service";
import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

/** The user's profile, onboarding facts, checklist, financial-data reset and terms acceptance. */
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
      TermsAcceptance,
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
    TermsAcceptanceService,
    // The AuthGuard's terms check (terms acceptance), resolved lazily from the whole app.
    { provide: TERMS_ACCEPTANCE_CHECK, useExisting: TermsAcceptanceService },
  ],
  exports: [UserProfileService, TermsAcceptanceService, TERMS_ACCEPTANCE_CHECK],
})
export class ProfileModule {}
