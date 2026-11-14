import {
  DeleteUserRequest,
  type DeleteUserResponse,
  ResetFinancialDataRequest,
  type UpdateChecklistRequest,
  type UpdateProfileRequest,
} from "@flump/api-contract";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Optional,
  Patch,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type { Response } from "express";
import { Repository } from "typeorm";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { AllowErasedAccount } from "../../auth/erased-account";
import { assertRecentLogin } from "../../auth/recent-login";
import { safeErrorSummary } from "../../common/log-safe";
import { expectedVersion, setEtag } from "../../contract/etag";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { RateLimit } from "../../security/rate-limit.decorator";
import {
  ACCOUNT_DELETION_UNAVAILABLE,
  AccountDeletionService,
} from "../privacy/account-deletion.service";
import { AccountExportService, exportFileName } from "../privacy/account-export.service";
import {
  type ProfileView,
  type ResetFinancialDataResult,
  UserProfileService,
} from "./user-profile.service";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);
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
    @Optional() private readonly accountDeletion?: AccountDeletionService,
    @Optional() private readonly accountExport?: AccountExportService,
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
  @HttpCode(200)
  async getUserProfile(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<ProfileView> {
    const profile = await this.userProfileService.getProfile(req.user.id, req.user?.email);
    setEtag(res, profile.updatedAt);
    return profile;
  }

  @Patch("user-profile")
  @HttpCode(200)
  async updateUserProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileRequest,
    @Headers("if-match") ifMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<ProfileView> {
    // `If-Match` makes the update conditional (412 when stale, BE-09); the answer carries the ETag.
    const profile = await this.userProfileService.updateProfile(
      req.user.id,
      updateData,
      req.user?.email,
      expectedVersion(ifMatch),
    );
    setEtag(res, profile.updatedAt);
    return profile;
  }

  /** Takes no body: the reset goes to the caller's own email. */
  @Post("user-profile/send-password-reset")
  @HttpCode(200)
  @RateLimit("credential")
  async sendPasswordReset(@Req() req: AuthenticatedRequest): Promise<{ success: true }> {
    return this.userProfileService.sendPasswordReset(req.user.id);
  }

  /**
   * Destructive: the body must carry the typed confirmation phrase. Checked here as well as by
   * the contract interceptor, so the reset stays guarded even when contract enforcement is off
   * (allowed outside production only).
   */
  @Post("user-profile/reset-financial-data")
  @HttpCode(200)
  @RateLimit("destructive")
  async resetFinancialData(
    @Req() req: AuthenticatedRequest,
    @Body() body: ResetFinancialDataRequest,
  ): Promise<ResetFinancialDataResult> {
    const confirmation = (body as { confirmation?: unknown } | null)?.confirmation;
    if (!ResetFinancialDataRequest.shape.confirmation.safeParse(confirmation).success) {
      throw new BadRequestException("Type RESET to confirm.");
    }
    assertRecentLogin(req.user);
    return this.userProfileService.resetFinancialData(req.user.id, req.user?.email);
  }

  /**
   * Erases the account (BE-04): every stored row, then the WorkOS login. The typed phrase is
   * checked here as well as by the contract interceptor, then the recent-login check.
   *
   * Answers 200 in both outcomes. `identity_pending` means the data is gone but removing the login
   * failed: it is not an error the person must act on differently, and the same request repeated
   * later is idempotent (nothing left to delete, the tombstone is found, WorkOS is retried). A 5xx
   * would invite clients to treat the erasure as not having happened.
   *
   * Deleting the WorkOS user ends its WorkOS sessions; the web app clears its own session cookie.
   */
  @Delete("user-profile")
  @AllowErasedAccount()
  @HttpCode(200)
  @RateLimit("destructive")
  async deleteUser(
    @Req() req: AuthenticatedRequest,
    @Body() body: DeleteUserRequest,
  ): Promise<DeleteUserResponse> {
    const confirmation = (body as { confirmation?: unknown } | null)?.confirmation;
    if (!DeleteUserRequest.shape.confirmation.safeParse(confirmation).success) {
      throw new BadRequestException("Type DELETE to confirm.");
    }
    assertRecentLogin(req.user);
    if (!this.accountDeletion) throw new ServiceUnavailableException(ACCOUNT_DELETION_UNAVAILABLE);
    return this.accountDeletion.deleteAccount(req.user.id);
  }

  /**
   * The caller's data export (BE-04, H9): one JSON document, streamed as a download. Never cached.
   * Once the first byte is sent the status is 200; a failure after that ends the response early,
   * so the client gets a truncated (invalid) JSON document rather than a partial one that parses.
   */
  @Get("user-profile/export")
  @RateLimit("dataExport")
  @HttpCode(200)
  async exportData(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
    if (!this.accountExport)
      throw new ServiceUnavailableException(
        "Downloading your data is not available right now. Try again later.",
      );
    const now = new Date();
    res.status(200);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exportFileName(now)}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const write = (chunk: string) =>
      new Promise<void>((resolve, reject) => {
        if (res.destroyed) return reject(new Error("client closed the export"));
        if (res.write(chunk, "utf8")) return resolve();
        const onDrain = () => {
          res.off("close", onClose);
          resolve();
        };
        const onClose = () => {
          res.off("drain", onDrain);
          reject(new Error("client closed the export"));
        };
        res.once("drain", onDrain);
        res.once("close", onClose);
      });
    try {
      await this.accountExport.writeExport(req.user.id, write, now);
      res.end();
    } catch (err) {
      this.logger.warn(`Export failed: ${safeErrorSummary(err)}`);
      if (!res.headersSent) {
        res.removeHeader("Content-Disposition");
        // Thrown so the exception filter answers in the shared error envelope (BE-09).
        throw new ServiceUnavailableException("We could not prepare your download. Try again.");
      } else {
        res.destroy();
      }
    }
  }

  @Patch("user-profile/checklist")
  @HttpCode(200)
  async updateChecklist(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateChecklistRequest,
  ): Promise<ProfileView> {
    return this.userProfileService.updateChecklist(
      req.user.id,
      body.step,
      body.completed,
      req.user?.email,
    );
  }
}
