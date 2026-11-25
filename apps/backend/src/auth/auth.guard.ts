import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ALLOW_UNINVITED } from "./allow-uninvited";
import {
  BETA_MEMBERSHIP_CHECK,
  type BetaMembershipCheck,
  isBetaUserAllowedByEnv,
} from "./beta-access";
import { ALLOW_ERASED, ERASED_ACCOUNT_CHECK, type ErasedAccountCheck } from "./erased-account";
import { accountDeletedException } from "./recent-login";
import {
  ALLOW_WITHOUT_TERMS,
  TERMS_ACCEPTANCE_CHECK,
  type TermsAcceptanceCheck,
  termsCheckUnavailableException,
  termsNotAcceptedException,
} from "./terms-acceptance";
import { type AuthenticatedUser, TOKEN_VERIFIER, type TokenVerifier } from "./token-verifier";

@Injectable()
export class AuthGuard implements CanActivate {
  private erasedCheck: ErasedAccountCheck | null | undefined;
  private membershipCheck: BetaMembershipCheck | null | undefined;
  private termsCheck: TermsAcceptanceCheck | null | undefined;

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() @Inject(ERASED_ACCOUNT_CHECK) erasedCheck?: ErasedAccountCheck,
    @Optional() @Inject(BETA_MEMBERSHIP_CHECK) membershipCheck?: BetaMembershipCheck,
    @Optional() @Inject(TERMS_ACCEPTANCE_CHECK) termsCheck?: TermsAcceptanceCheck,
  ) {
    this.erasedCheck = erasedCheck;
    this.membershipCheck = membershipCheck;
    this.termsCheck = termsCheck;
  }

  /**
   * The terms acceptance lookup, resolved lazily from the whole app (the profile module provides
   * it), once. Null when absent, and then every route that needs the terms answers 503: a missing
   * provider must never let a caller through.
   */
  private resolveTermsCheck(): TermsAcceptanceCheck | null {
    if (this.termsCheck !== undefined) return this.termsCheck;
    try {
      this.termsCheck =
        this.moduleRef?.get<TermsAcceptanceCheck>(TERMS_ACCEPTANCE_CHECK, { strict: false }) ??
        null;
    } catch {
      this.termsCheck = null;
    }
    return this.termsCheck;
  }

  /** Fails closed: no provider, or a failed read, is 503; not agreed is 403. */
  private async assertTermsAgreed(userId: string): Promise<void> {
    const check = this.resolveTermsCheck();
    if (!check) throw termsCheckUnavailableException();
    let agreed: boolean;
    try {
      agreed = await check.hasAgreedToTermsInForce(userId);
    } catch {
      throw termsCheckUnavailableException();
    }
    if (!agreed) throw termsNotAcceptedException();
  }

  /**
   * The beta_members lookup, resolved lazily from the whole app (the beta module provides it),
   * once. Null when absent (some unit tests): nobody counts as a member then.
   */
  private resolveMembershipCheck(): BetaMembershipCheck | null {
    if (this.membershipCheck !== undefined) return this.membershipCheck;
    try {
      this.membershipCheck =
        this.moduleRef?.get<BetaMembershipCheck>(BETA_MEMBERSHIP_CHECK, { strict: false }) ?? null;
    } catch {
      this.membershipCheck = null;
    }
    return this.membershipCheck;
  }

  /** Resolved lazily from the whole app (AppModule provides it), once; null when absent. */
  private resolveErasedCheck(): ErasedAccountCheck | null {
    if (this.erasedCheck !== undefined) return this.erasedCheck;
    try {
      this.erasedCheck =
        this.moduleRef?.get<ErasedAccountCheck>(ERASED_ACCOUNT_CHECK, { strict: false }) ?? null;
    } catch {
      this.erasedCheck = null;
    }
    return this.erasedCheck;
  }

  /**
   * Admin, env allowlist or open beta first (no database read); otherwise one primary-key read of
   * beta_members. Never cached, so removing a member refuses their very next request.
   */
  private async isBetaAllowed(user: AuthenticatedUser): Promise<boolean> {
    if (isBetaUserAllowedByEnv(process.env, user)) return true;
    const membership = this.resolveMembershipCheck();
    return membership ? membership.isActiveMember(user.id) : false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: unknown = request.headers?.authorization;

    if (typeof header !== "string") {
      throw new UnauthorizedException("Authentication failed");
    }
    const parts = header.trim().split(/\s+/);
    const [scheme, token] = parts;
    if (parts.length !== 2 || scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedException("Authentication failed");
    }

    try {
      request.user = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException("Authentication failed");
    }
    const handler = typeof context.getHandler === "function" ? context.getHandler() : undefined;
    // BE-04: an erased account's access token stays cryptographically valid until it expires (and
    // a re-sign-in is possible while the WorkOS step is pending). Refuse it everywhere except the
    // deletion route itself, so no write can recreate data for the erased user. /mcp is not behind
    // this guard: its PATs are deleted with the account, which revokes them. Checked before the
    // beta: erasure removes an invited person's membership, and a retried deletion must still get
    // through, and every other route must answer 410 (finish the deletion), not "not invited".
    const allowErased = handler ? Reflect.getMetadata(ALLOW_ERASED, handler) === true : false;
    const check = this.resolveErasedCheck();
    if (check && (await check.isErased(request.user.id))) {
      if (allowErased) return true;
      throw accountDeletedException();
    }
    // Closed beta (E19 A7, invite links): a valid sign-in is not enough while the beta is
    // invite-only. Only the redeem route lets an uninvited caller through, so they can join.
    const allowUninvited = handler ? Reflect.getMetadata(ALLOW_UNINVITED, handler) === true : false;
    if (!allowUninvited && !(await this.isBetaAllowed(request.user))) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "not_invited",
        message: "This account has not been invited to the Flump beta.",
      });
    }
    // Terms acceptance: a caller must have agreed to the terms of use in force (with the privacy
    // notice in force shown). Checked after the beta, so an uninvited person is told they are not
    // invited rather than asked to agree. A route marked @AllowWithoutTerms (reading and recording
    // the agreement, the data export, account deletion, invite redemption) skips it.
    const allowWithoutTerms = handler
      ? typeof Reflect.getMetadata(ALLOW_WITHOUT_TERMS, handler) === "string"
      : false;
    if (!allowWithoutTerms) await this.assertTermsAgreed(request.user.id);
    return true;
  }
}
