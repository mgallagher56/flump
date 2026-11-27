import {
  AcceptTermsRequest,
  type AcceptTermsResponse,
  type AccountExportKey,
  DeleteUserRequest,
  type DeleteUserResponse,
  ResetFinancialDataRequest,
  type TermsStatusResponse,
  type UpdateChecklistRequest,
  type UpdateProfileRequest,
  type UserEmailResponse,
} from "@flump/api-contract";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Logger,
  Patch,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AllowUninvited } from "../../auth/allow-uninvited";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { AllowErasedAccount } from "../../auth/erased-account";
import { assertRecentLogin } from "../../auth/recent-login";
import { AllowWithoutTerms } from "../../auth/terms-acceptance";
import { safeErrorSummary } from "../../common/log-safe";
import { expectedVersion, setEtag } from "../../contract/etag";
import { RateLimit } from "../../security/rate-limit.decorator";
import { AccountDeletionService } from "../privacy/account-deletion.service";
import {
  AccountExportService,
  csvExportFileName,
  exportFileName,
  isAccountExportKey,
} from "../privacy/account-export.service";
import { newestPair, TermsAcceptanceService } from "./terms-acceptance.service";
import {
  type ProfileView,
  type ResetFinancialDataResult,
  UserProfileService,
} from "./user-profile.service";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);
  /** Plain, required injection (BE-13, audit M19): Nest fails at boot when a provider is missing. */
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly accountDeletion: AccountDeletionService,
    private readonly accountExport: AccountExportService,
    private readonly termsAcceptance: TermsAcceptanceService,
  ) {}

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

  /**
   * Resolves the caller's sign-in email for Settings > Security (claim first, then WorkOS).
   * Always answers 200 with `{ email: string | null }`.
   */
  @Get("user-profile/email")
  @HttpCode(200)
  @RateLimit("read")
  async getUserEmail(@Req() req: AuthenticatedRequest): Promise<UserEmailResponse> {
    const email = await this.userProfileService.getEmail(req.user.id, req.user?.email);
    return { email };
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
  @AllowUninvited()
  @AllowWithoutTerms(
    "a person who does not agree to the terms must be able to delete their account",
  )
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
    return this.accountDeletion.deleteAccount(req.user.id);
  }

  /**
   * The caller's data export (BE-04, H9): one JSON document, streamed as a download. Never cached.
   * Once the first byte is sent the status is 200; a failure after that ends the response early,
   * so the client gets a truncated (invalid) JSON document rather than a partial one that parses.
   * The `user.exported` audit row is written before the first byte: if that write fails the
   * request fails with the standard error before streaming starts, so no export is delivered
   * without a record. A record may exist for an export that then failed mid-stream; never the
   * reverse.
   */
  @Get("user-profile/export")
  @AllowUninvited()
  @AllowWithoutTerms(
    "a person who does not agree to the terms must be able to get a copy of their data",
  )
  @RateLimit("dataExport")
  @HttpCode(200)
  async exportData(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
    const now = new Date();
    await this.streamExport(res, "application/json; charset=utf-8", exportFileName(now), (write) =>
      this.accountExport.writeExport(req.user.id, write, now),
    );
  }

  /**
   * The caller's data export as RFC 4180 CSV with formula-injection protection (E19 portability).
   * Streams all sections by default, or a single section when `?section=<key>` is provided.
   * Writes the `user.exported` audit row before the first byte.
   */
  @Get("user-profile/export/csv")
  @AllowUninvited()
  @AllowWithoutTerms(
    "a person who does not agree to the terms must be able to get a copy of their data",
  )
  @RateLimit("dataExport")
  @HttpCode(200)
  async exportCsv(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query("section") section?: string,
  ): Promise<void> {
    let validatedSection: AccountExportKey | undefined;
    if (section !== undefined && section !== "") {
      if (!isAccountExportKey(section)) {
        throw new BadRequestException("Unknown export section.");
      }
      validatedSection = section;
    }
    const now = new Date();
    await this.streamExport(
      res,
      "text/csv; charset=utf-8",
      csvExportFileName(now, validatedSection),
      (write) =>
        this.accountExport.writeCsvExport(req.user.id, write, { section: validatedSection }),
    );
  }

  private async streamExport(
    res: Response,
    contentType: string,
    filename: string,
    run: (write: (chunk: string) => Promise<void>) => Promise<void>,
  ): Promise<void> {
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
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
      await run(write);
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

  /**
   * Whether the caller must agree to the terms of use before using Flump, and the newest versions
   * of the terms and the privacy notice to show (terms acceptance). Reachable without agreeing, as
   * it is how the web and mobile apps learn what to show.
   */
  @Get("user-profile/terms-acceptance")
  @AllowWithoutTerms("the acceptance screen reads what to show before the person has agreed")
  @HttpCode(200)
  async termsStatus(@Req() req: AuthenticatedRequest): Promise<TermsStatusResponse> {
    return this.termsAcceptance.status(req.user.id);
  }

  /**
   * Records that the caller agreed to the newest terms of use, with the newest privacy notice
   * shown (information, not consent). The versions sent must be the newest: 409
   * `terms_version_mismatch` otherwise, so a client showing older pages re-reads them rather than
   * recording what it did not show. 200 either way it records (idempotent per pair; `recorded`
   * says whether this call wrote the row). Default write rate limit, as for the other profile
   * writes.
   */
  @Post("user-profile/terms-acceptance")
  @AllowWithoutTerms("this is how a person who has not agreed records their agreement")
  @HttpCode(200)
  async acceptTerms(
    @Req() req: AuthenticatedRequest,
    @Body() body: AcceptTermsRequest,
  ): Promise<AcceptTermsResponse> {
    // Checked here as well as by the contract interceptor, so a malformed body is still refused
    // when contract enforcement is off (allowed outside production only).
    const parsed = AcceptTermsRequest.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Send the versions of the terms and privacy notice you read.");
    }
    const newest = newestPair(this.termsAcceptance.pages);
    if (
      parsed.data.termsVersion !== newest.termsVersion ||
      parsed.data.privacyNoticeVersion !== newest.privacyNoticeVersion
    ) {
      throw new ConflictException({
        code: "terms_version_mismatch",
        message: "The terms or privacy notice have changed. Reload to read the current versions.",
      });
    }
    const { recorded } = await this.termsAcceptance.accept(req.user.id, newest);
    return { ...newest, recorded };
  }

  @Patch("user-profile/checklist")
  @HttpCode(200)
  async updateChecklist(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateChecklistRequest,
  ): Promise<ProfileView> {
    return this.userProfileService.updateChecklist(req.user.id, body, req.user?.email);
  }
}
