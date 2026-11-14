import type {
  ConnectBankRequest,
  CreateAccountRequest,
  CreateTransactionRequest,
  TransactionListQuery,
  UpdateAccountRequest,
  UpdateBalancesRequest,
} from "@flump/api-contract";
import { MAX_TRANSACTION_OFFSET } from "@flump/api-contract";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
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
import type { Response } from "express";
import { Repository } from "typeorm";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag } from "../../contract/etag";
import { resolveOffset, resolvePage, sendPage } from "../../contract/pagination";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { RateLimit } from "../../security/rate-limit.decorator";
import {
  BankConnectionsEnabledGuard,
  isBankConnectionAllowed,
} from "../banking/bank-connections.access";
import { BankProviderRegistry } from "../banking/providers/provider.registry";
import { toPublicAccount } from "./account-intake.service";
import { FinanceService } from "./finance.service";

/**
 * Bodies, params and query are typed from the contract (`z.infer` of the manifest schemas): the
 * contract interceptor replaces them with the parsed output before a handler runs (BE-09). Every
 * route names its success status, which must match the manifest (test/contract/http-status).
 */
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
    const candidate = financeServiceOrAccountRepo as
      | { getAccounts?: unknown; manager?: unknown }
      | undefined;
    if (
      financeServiceOrAccountRepo instanceof FinanceService ||
      (candidate && typeof candidate.getAccounts === "function" && !candidate.manager)
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

  // Lists are keyset-paginated (BE-09, M-API1): `?limit=&cursor=`, the next cursor in the
  // X-Next-Cursor header. `res` is absent when a unit test calls a handler directly.
  @Get("accounts")
  @HttpCode(200)
  async getAccounts(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const page = await this.financeService.listAccounts(
      req.user.id,
      resolvePage(query, "accounts"),
    );
    return sendPage(res, page, toPublicAccount);
  }

  @Get("account-details")
  @HttpCode(200)
  async getAccountDetails(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const page = await this.financeService.listAccountDetails(
      req.user.id,
      resolvePage(query, "accountDetails"),
    );
    return sendPage(res, page);
  }

  @Get("accounts/:id")
  @HttpCode(200)
  async getAccount(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const account = await this.financeService.getAccount(req.user.id, id);
    setEtag(res, account.updatedAt);
    return toPublicAccount(account);
  }

  @Get("accounts/:id/details")
  @HttpCode(200)
  async getAccountSpecificDetails(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const page = await this.financeService.listAccountDetails(
      req.user.id,
      resolvePage(query, "accountDetails"),
      id,
    );
    return sendPage(res, page);
  }

  @Get("portfolio-snapshot")
  @HttpCode(200)
  async getPortfolioSnapshot(@Req() req: AuthenticatedRequest) {
    return this.financeService.getPortfolioSnapshot(req.user.id);
  }

  @Post("accounts")
  @HttpCode(201)
  async createAccount(@Req() req: AuthenticatedRequest, @Body() body: CreateAccountRequest) {
    return toPublicAccount(await this.financeService.createAccount(req.user.id, body));
  }

  // Registered before "accounts/:id" so "balances" is never read as an account id.
  @Patch("accounts/balances")
  @HttpCode(200)
  async updateBalances(@Req() req: AuthenticatedRequest, @Body() body: UpdateBalancesRequest) {
    return (await this.financeService.updateBalances(req.user.id, body)).map(toPublicAccount);
  }

  // Stacking @Put and @Patch on one handler registers only the top decorator's verb, so each
  // verb gets its own handler. The web app uses PATCH; PUT is a deprecated alias (aliasOf).
  @Put("accounts/:id")
  @HttpCode(200)
  async replaceAccount(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateAccountRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.updateAccountWithVersion(req.user.id, id, body, ifMatch, res);
  }

  @Patch("accounts/:id")
  @HttpCode(200)
  async updateAccount(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateAccountRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.updateAccountWithVersion(req.user.id, id, body, ifMatch, res);
  }

  /** `If-Match` makes the update conditional (412 when stale); the answer carries the new ETag. */
  private async updateAccountWithVersion(
    userId: string,
    id: string,
    body: UpdateAccountRequest,
    ifMatch: string | undefined,
    res: Response | undefined,
  ) {
    const account = await this.financeService.updateAccount(
      userId,
      id,
      body,
      expectedVersion(ifMatch),
    );
    setEtag(res, account.updatedAt);
    return toPublicAccount(account);
  }

  @Delete("accounts/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteAccount(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteAccount(req.user.id, id);
  }

  @Get("transactions")
  @HttpCode(200)
  async getTransactions(
    @Req() req: AuthenticatedRequest,
    @Query() query?: Partial<TransactionListQuery>,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const page = await this.financeService.listTransactions(
      req.user.id,
      { ...resolvePage(query, "transactions"), ...resolveOffset(query, MAX_TRANSACTION_OFFSET) },
      typeof query?.accountId === "string" ? query.accountId : undefined,
    );
    return sendPage(res, page);
  }

  @Post("transactions")
  @HttpCode(201)
  async createTransaction(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTransactionRequest,
  ) {
    return this.financeService.createTransaction(req.user.id, body);
  }

  @Get("bank-connections")
  @HttpCode(200)
  async getBankConnections(
    @Req() req: AuthenticatedRequest,
    @Query() query?: unknown,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const page = await this.financeService.listBankConnections(
      req.user.id,
      resolvePage(query, "bankConnections"),
    );
    return sendPage(res, page);
  }

  // Lets the web app hide the connect entry points for accounts that cannot use them.
  @Get("bank-connections/capability")
  @HttpCode(200)
  getBankConnectionCapability(@Req() req: AuthenticatedRequest) {
    return { enabled: isBankConnectionAllowed(process.env, req.user.id) };
  }

  @Post("bank-connections")
  @HttpCode(201)
  @RateLimit("bank")
  @UseGuards(BankConnectionsEnabledGuard)
  async connectBank(@Req() req: AuthenticatedRequest, @Body() body: ConnectBankRequest) {
    return this.financeService.connectBank(req.user.id, body);
  }

  @Post("bank-connections/:id/refresh")
  @HttpCode(200)
  @RateLimit("bank")
  @UseGuards(BankConnectionsEnabledGuard)
  async refreshBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.syncBankConnection(req.user.id, id);
  }

  @Post("bank-connections/:id/sync")
  @HttpCode(200)
  @RateLimit("bank")
  @UseGuards(BankConnectionsEnabledGuard)
  async syncBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.syncBankConnection(req.user.id, id);
  }

  @Delete("bank-connections/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteBankConnection(req.user.id, id);
  }
}
