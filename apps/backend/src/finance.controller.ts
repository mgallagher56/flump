import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Optional,
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
import { type CreateAccountDto, type UpdateAccountDto } from "./account-intake.service";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { FinanceService } from "./finance.service";
import { BankProviderRegistry } from "./providers/provider.registry";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

export interface CreateTransactionDto {
  accountId: string;
  amount: number;
  description: string;
  category: string;
  timestamp?: string | Date;
}

export interface ConnectBankDto {
  institutionId: string;
  token?: string;
  code?: string;
}

@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  private readonly financeService: FinanceService;

  constructor(
    @Optional()
    @Inject(FinanceService)
    financeServiceOrAccountRepo?: FinanceService | Repository<Account>,
    @Optional()
    @InjectRepository(Transaction)
    transactionRepository?: Repository<Transaction>,
    @Optional()
    @InjectRepository(AccountDetail)
    accountDetailRepository?: Repository<AccountDetail>,
    @Optional()
    @InjectRepository(BankConnection)
    bankConnectionRepository?: Repository<BankConnection>,
    @Optional()
    @InjectRepository(UserProfile)
    userProfileRepository?: Repository<UserProfile>,
    @Optional() providerRegistry?: BankProviderRegistry,
    @Optional() configService?: ConfigService,
  ) {
    if (
      financeServiceOrAccountRepo instanceof FinanceService ||
      (financeServiceOrAccountRepo &&
        typeof (financeServiceOrAccountRepo as any).getAccounts === "function" &&
        !(financeServiceOrAccountRepo as any).manager)
    ) {
      this.financeService = financeServiceOrAccountRepo as FinanceService;
    } else {
      this.financeService = new FinanceService(
        financeServiceOrAccountRepo as Repository<Account>,
        transactionRepository as Repository<Transaction>,
        accountDetailRepository as Repository<AccountDetail>,
        bankConnectionRepository as Repository<BankConnection>,
        userProfileRepository as Repository<UserProfile>,
        providerRegistry as BankProviderRegistry,
        configService as ConfigService,
      );
    }
  }

  @Get("accounts")
  async getAccounts(@Req() req: AuthenticatedRequest) {
    return this.financeService.getAccounts(req.user.id);
  }

  @Get("account-details")
  async getAccountDetails(@Req() req: AuthenticatedRequest) {
    return this.financeService.getAccountDetails(req.user.id);
  }

  @Get("accounts/:id")
  async getAccount(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.getAccount(req.user.id, id);
  }

  @Get("accounts/:id/details")
  async getAccountSpecificDetails(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.getAccountDetails(req.user.id, id);
  }

  @Get("portfolio-snapshot")
  async getPortfolioSnapshot(@Req() req: AuthenticatedRequest) {
    return this.financeService.getPortfolioSnapshot(req.user.id);
  }

  @Post("accounts")
  async createAccount(@Req() req: AuthenticatedRequest, @Body() body: CreateAccountDto) {
    return this.financeService.createAccount(req.user.id, body);
  }

  // Stacking @Put and @Patch on one handler registers only the top decorator's verb, so each
  // verb gets its own handler. The web app uses PATCH; PUT stays for existing clients.
  @Put("accounts/:id")
  async replaceAccount(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateAccountDto,
  ) {
    return this.financeService.updateAccount(req.user.id, id, body);
  }

  @Patch("accounts/:id")
  async updateAccount(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateAccountDto,
  ) {
    return this.financeService.updateAccount(req.user.id, id, body);
  }

  @Delete("accounts/:id")
  async deleteAccount(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteAccount(req.user.id, id);
  }

  @Get("transactions")
  async getTransactions(@Req() req: AuthenticatedRequest, @Query("accountId") accountId?: string) {
    return this.financeService.getTransactions(req.user.id, accountId);
  }

  @Post("transactions")
  async createTransaction(@Req() req: AuthenticatedRequest, @Body() body: CreateTransactionDto) {
    return this.financeService.createTransaction(req.user.id, body);
  }

  @Get("bank-connections")
  async getBankConnections(@Req() req: AuthenticatedRequest) {
    return this.financeService.getBankConnections(req.user.id);
  }

  @Post("bank-connections")
  async connectBank(@Req() req: AuthenticatedRequest, @Body() body: ConnectBankDto) {
    return this.financeService.connectBank(req.user.id, body);
  }

  @Post("bank-connections/:id/refresh")
  async refreshBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.syncBankConnection(req.user.id, id);
  }

  @Post("bank-connections/:id/sync")
  async syncBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.syncBankConnection(req.user.id, id);
  }

  @Delete("bank-connections/:id")
  async deleteBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteBankConnection(req.user.id, id);
  }
}
