import { ResetFinancialDataRequest } from "@flump/api-contract";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // <-- Fixed: Removed 'type'
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { RateLimit } from "./security/rate-limit.decorator";
import { UserProfileService } from "./user-profile.service";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
  private readonly userProfileService: UserProfileService;

  constructor(
    @Inject(UserProfileService)
    userProfileRepositoryOrService: UserProfileService | Repository<UserProfile>,
    @Optional() @InjectRepository(Account) accountRepository?: Repository<Account>,
    @Optional() @InjectRepository(Transaction) transactionRepository?: Repository<Transaction>,
    @Optional()
    @InjectRepository(AccountDetail)
    accountDetailRepository?: Repository<AccountDetail>,
    @Optional()
    @InjectRepository(BankConnection)
    bankConnectionRepository?: Repository<BankConnection>,
    @Optional() @InjectRepository(BudgetEntry) budgetEntryRepository?: Repository<BudgetEntry>,
    @Optional() @InjectRepository(TaxRecord) taxRecordRepository?: Repository<TaxRecord>,
    @Optional() @Inject(ConfigService) _configService?: ConfigService,
  ) {
    if (userProfileRepositoryOrService instanceof UserProfileService) {
      this.userProfileService = userProfileRepositoryOrService;
    } else {
      this.userProfileService = new UserProfileService(
        userProfileRepositoryOrService as Repository<UserProfile>,
        accountRepository!,
        transactionRepository!,
        accountDetailRepository!,
        bankConnectionRepository!,
        budgetEntryRepository!,
        taxRecordRepository!,
      );
    }
  }

  @Get("user-profile")
  async getUserProfile(@Req() req: any): Promise<any> {
    return this.userProfileService.getProfile(req.user.id, req.user?.email);
  }

  @Patch("user-profile")
  async updateUserProfile(@Req() req: any, @Body() updateData: any): Promise<any> {
    return this.userProfileService.updateProfile(req.user.id, updateData, req.user?.email);
  }

  /** Body is intentionally ignored: the reset goes to the caller's own email. */
  @Post("user-profile/send-password-reset")
  @RateLimit("credential")
  async sendPasswordReset(@Req() req: any): Promise<{ success: true }> {
    return this.userProfileService.sendPasswordReset(req.user.id);
  }

  /**
   * Destructive: the body must carry the typed confirmation phrase. Checked here as well as by
   * the contract interceptor, so the reset stays guarded even when contract enforcement is off.
   */
  @Post("user-profile/reset-financial-data")
  @RateLimit("destructive")
  async resetFinancialData(@Req() req: any, @Body() body: unknown): Promise<any> {
    // Only the phrase is checked: unknown keys are stripped, not rejected, as by the interceptor.
    const confirmation = (body as { confirmation?: unknown } | null)?.confirmation;
    if (!ResetFinancialDataRequest.shape.confirmation.safeParse(confirmation).success) {
      throw new BadRequestException("Type the confirmation phrase to reset your financial data.");
    }
    return this.userProfileService.resetFinancialData(req.user.id, req.user?.email);
  }

  @Patch("user-profile/checklist")
  async updateChecklist(
    @Req() req: any,
    @Body() body: { step: string; completed: boolean },
  ): Promise<any> {
    return this.userProfileService.updateChecklist(
      req.user.id,
      body.step,
      body.completed,
      req.user?.email,
    );
  }
}
