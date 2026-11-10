import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { UserProfileService } from "./user-profile.service";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
  private readonly userProfileService: UserProfileService;

  constructor(
    @InjectRepository(UserProfile)
    userProfileRepositoryOrService: Repository<UserProfile> | UserProfileService,
    @InjectRepository(Account)
    accountRepository?: Repository<Account>,
    @InjectRepository(Transaction)
    transactionRepository?: Repository<Transaction>,
    @InjectRepository(AccountDetail)
    accountDetailRepository?: Repository<AccountDetail>,
    @InjectRepository(BankConnection)
    bankConnectionRepository?: Repository<BankConnection>,
    @InjectRepository(BudgetEntry)
    budgetEntryRepository?: Repository<BudgetEntry>,
    @InjectRepository(TaxRecord)
    taxRecordRepository?: Repository<TaxRecord>,
    configService?: ConfigService,
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
        configService!,
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

  @Post("user-profile/change-password")
  @Post("user-profile/update-password")
  async changePassword(
    @Req() req: any,
    @Body() body: { newPassword?: string; password?: string },
  ): Promise<any> {
    const password = body?.newPassword || body?.password || "";
    return this.userProfileService.updatePassword(req.user.id, password);
  }

  @Post("user-profile/send-password-reset")
  async sendPasswordReset(@Req() req: any, @Body() body?: { email?: string }): Promise<any> {
    const email = body?.email || req.user?.email;
    return this.userProfileService.sendPasswordReset(email);
  }

  @Post("user-profile/reset-financial-data")
  async resetFinancialData(@Req() req: any): Promise<any> {
    return this.userProfileService.resetFinancialData(req.user.id, req.user?.email);
  }

  @Patch("user-profile/checklist")
  async updateChecklist(
    @Req() req: any,
    @Body() body: { step: string; completed: boolean },
  ): Promise<any> {
    return this.userProfileService.updateChecklist(req.user.id, body.step, body.completed);
  }
}
