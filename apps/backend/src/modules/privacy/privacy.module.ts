import { Module } from "@nestjs/common";
import { ERASED_ACCOUNT_CHECK } from "../../auth/erased-account";
import { IdentityModule } from "../../identity/identity.module";
import { BankingModule } from "../banking/banking.module";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountExportService } from "./account-export.service";

/** Account deletion and the account export (BE-04). */
@Module({
  imports: [BankingModule, IdentityModule],
  providers: [
    AccountDeletionService,
    // The AuthGuard refuses tokens of erased accounts through this port (BE-04).
    { provide: ERASED_ACCOUNT_CHECK, useExisting: AccountDeletionService },
    AccountExportService,
  ],
  exports: [AccountDeletionService, AccountExportService, ERASED_ACCOUNT_CHECK],
})
export class PrivacyModule {}
