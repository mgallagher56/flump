import type {
  ConnectBankRequest,
  CreateAccountRequest,
  CreateMortgageWithPropertyRequest,
  UpdateAccountRequest,
  UpsertAccountGoalRequest,
} from "@flump/api-contract";
import { AccountDetailsOption } from "@flump/api-contract";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { expectedVersion, setEtag } from "../../contract/etag";
import { resolvePage, sendPage } from "../../contract/pagination";
import { RateLimit } from "../../security/rate-limit.decorator";
import {
  BankConnectionsEnabledGuard,
  isBankConnectionAllowed,
} from "../banking/bank-connections.access";
import { toPublicAccount } from "./account-intake.service";
import { FinanceService } from "./finance.service";

/**
 * The `details` option of `GET /accounts` (system audit slice 9): `none`, `latest` or `all`, and
 * `all` when it is left out. The contract interceptor has already checked it in enforce mode; it
 * is checked again here so the rule holds in shadow or off mode, with the same 400.
 */
function resolveDetailsOption(query: unknown): AccountDetailsOption {
  const raw = (query ?? {}) as Record<string, unknown>;
  if (raw.details === undefined) return "all";
  const parsed = AccountDetailsOption.safeParse(raw.details);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({
    code: "validation_failed",
    message: "Request failed validation",
    issues: [
      {
        path: "query.details",
        code: "invalid_details",
        message: "must be one of none, latest, all",
      },
    ],
  });
}

/**
 * Bodies, params and query are typed from the contract (`z.infer` of the manifest schemas): the
 * contract interceptor replaces them with the parsed output before a handler runs (BE-09). Every
 * route names its success status, which must match the manifest (test/contract/http-status).
 */
@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

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
      resolveDetailsOption(query),
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

  @Post("accounts")
  @HttpCode(201)
  async createAccount(@Req() req: AuthenticatedRequest, @Body() body: CreateAccountRequest) {
    return toPublicAccount(await this.financeService.createAccount(req.user.id, body));
  }

  /** A mortgage and the property it is on, created and linked in one transaction (slice 4). */
  @Post("accounts/mortgage-with-property")
  @HttpCode(201)
  async createMortgageWithProperty(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateMortgageWithPropertyRequest,
  ) {
    const { mortgage, property } = await this.financeService.createMortgageWithProperty(
      req.user.id,
      body,
    );
    return { mortgage: toPublicAccount(mortgage), property: toPublicAccount(property) };
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
    // `If-Match` makes the update conditional (412 when stale); the answer carries the new ETag.
    const account = await this.financeService.updateAccount(
      req.user.id,
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

  @Get("accounts/:id/goal")
  @HttpCode(200)
  async getAccountGoal(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const view = await this.financeService.getAccountGoal(req.user.id, id);
    if (view.updatedAt) setEtag(res, view.updatedAt);
    return { goal: view.goal };
  }

  @Put("accounts/:id/goal")
  @HttpCode(200)
  async upsertAccountGoal(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpsertAccountGoalRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const view = await this.financeService.upsertAccountGoal(
      req.user.id,
      id,
      body,
      expectedVersion(ifMatch),
    );
    setEtag(res, view.updatedAt);
    return { goal: view.goal };
  }

  @Delete("accounts/:id/goal")
  @HttpCode(200)
  async deleteAccountGoal(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteAccountGoal(req.user.id, id);
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

  @Delete("bank-connections/:id")
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteBankConnection(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.financeService.deleteBankConnection(req.user.id, id);
  }
}
