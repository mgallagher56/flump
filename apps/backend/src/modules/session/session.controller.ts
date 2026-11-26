import {
  Controller,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { recordAuditEvent } from "../../audit/audit-events";
import { AllowUninvited } from "../../auth/allow-uninvited";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedRequest } from "../../auth/authenticated-request";
import { AllowWithoutTerms } from "../../auth/terms-acceptance";
import { safeErrorSummary } from "../../common/log-safe";
import { USER_IDENTITY_ADAPTER, type UserIdentityAdapter } from "../../identity/identity.adapter";
import { RateLimit } from "../../security/rate-limit.decorator";

/** 503 in the standard error envelope when the session could not be ended or recorded. */
const signOutUnavailableException = () =>
  new ServiceUnavailableException({
    code: "service_unavailable",
    message: "We could not sign you out everywhere. Please try again shortly.",
  });

/**
 * The mobile app's own sign-out (E12 S2b): ends the caller's WorkOS session with no browser. The
 * session id comes only from the verified token (`req.user.sessionId`, the `sid` claim), never from
 * the body or query, so a caller can end only their own session.
 */
@Controller()
@UseGuards(AuthGuard)
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    @Inject(USER_IDENTITY_ADAPTER) private readonly identity: UserIdentityAdapter,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Takes no body. 204 when the session is ended, already gone, or the token names none. An ended
   * session writes one `session.signed_out` audit row holding the user id only (no session id, no
   * token material); if that row cannot be written the answer is 503, and a retry is safe because
   * ending a session that is already gone counts as done.
   */
  @Post("session/sign-out")
  @HttpCode(204)
  @RateLimit("sessionSignOut")
  @AllowUninvited()
  @AllowWithoutTerms(
    "the Not invited and Terms screens in the mobile app offer Sign out, which must end the session",
  )
  async signOut(@Req() req: AuthenticatedRequest): Promise<void> {
    const sessionId = req.user.sessionId;
    if (!sessionId) return;
    try {
      await this.identity.revokeSession(sessionId);
    } catch (err: unknown) {
      // The error class and leading phrase only: never the session id or the provider's body.
      this.logger.warn(`session sign-out failed: ${safeErrorSummary(err)}`);
      throw signOutUnavailableException();
    }
    try {
      // In a transaction of its own, so a signed-in request's insert takes the write fence.
      await this.dataSource.transaction((manager) =>
        recordAuditEvent(manager, { userId: req.user.id, action: "session.signed_out" }),
      );
    } catch (err: unknown) {
      this.logger.warn(`session sign-out audit failed: ${safeErrorSummary(err)}`);
      throw signOutUnavailableException();
    }
  }
}
