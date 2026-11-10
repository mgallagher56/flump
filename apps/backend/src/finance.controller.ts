import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { FinanceService } from "./finance.service";
import { BankProviderRegistry } from "./providers/provider.registry";

@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  private readonly financeService: FinanceService;

  constructor(
    @InjectRepository(Account)
    accountRepositoryOrService: Repository<Account> | FinanceService,
    @InjectRepository(Transaction)
    transactionRepository?: Repository<Transaction>,
    @InjectRepository(AccountDetail)
    accountDetailRepository?: Repository<AccountDetail>,
    @InjectRepository(BankConnection)
    bankConnectionRepository?: Repository<BankConnection>,
    @InjectRepository(UserProfile)
    userProfileRepository?: Repository<UserProfile>,
    providerRegistry?: BankProviderRegistry,
    configService?: ConfigService,
  ) {
    if (accountRepositoryOrService instanceof FinanceService) {
      this.financeService = accountRepositoryOrService;
    } else {
      this.financeService = new FinanceService(
        accountRepositoryOrService as Repository<Account>,
        transactionRepository!,
        accountDetailRepository!,
        bankConnectionRepository!,
        userProfileRepository!,
        providerRegistry!,
        configService!,
      );
    }
  }

  @Get("accounts")
  async getAccounts(@Req() req: any) {
    return this.financeService.getAccounts(req.user.id);
  }

  @Get("accounts/:id")
  async getAccount(@Req() req: any, @Param("id") id: string) {
    return this.financeService.getAccount(req.user.id, id);
  }

  @Post("accounts")
  async createAccount(@Req() req: any, @Body() body: any) {
    return this.financeService.createAccount(req.user.id, body);
  }

  @Put("accounts/:id")
  @Patch("accounts/:id")
  async updateAccount(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.financeService.updateAccount(req.user.id, id, body);
  }

  @Delete("accounts/:id")
  async deleteAccount(@Req() req: any, @Param("id") id: string) {
    return this.financeService.deleteAccount(req.user.id, id);
  }

  @Get("transactions")
  async getTransactions(@Req() req: any, @Query("accountId") accountId?: string) {
    return this.financeService.getTransactions(req.user.id, accountId);
  }

  @Post("transactions")
  async createTransaction(@Req() req: any, @Body() body: any) {
    return this.financeService.createTransaction(req.user.id, body);
  }

  @Get("bank-connections")
  async getBankConnections(@Req() req: any) {
    return this.financeService.getBankConnections(req.user.id);
  }

  @Post("bank-connections")
  async connectBank(@Req() req: any, @Body() body: any) {
    return this.financeService.connectBank(req.user.id, body);
  }

  @Post("bank-connections/:id/sync")
  @Post("bank-connections/:id/refresh")
  async syncBankConnection(@Req() req: any, @Param("id") id: string) {
    return this.financeService.syncBankConnection(req.user.id, id);
  }

  @Delete("bank-connections/:id")
  async deleteBankConnection(@Req() req: any, @Param("id") id: string) {
    return this.financeService.deleteBankConnection(req.user.id, id);
  }
}
