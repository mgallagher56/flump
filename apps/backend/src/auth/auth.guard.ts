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
import { isBetaUserAllowed } from "./beta-access";
import { ALLOW_ERASED, ERASED_ACCOUNT_CHECK, type ErasedAccountCheck } from "./erased-account";
import { accountDeletedException } from "./recent-login";
import { TOKEN_VERIFIER, type TokenVerifier } from "./token-verifier";

@Injectable()
export class AuthGuard implements CanActivate {
  private erasedCheck: ErasedAccountCheck | null | undefined;

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() @Inject(ERASED_ACCOUNT_CHECK) erasedCheck?: ErasedAccountCheck,
  ) {
    this.erasedCheck = erasedCheck;
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
    // Closed beta (E19 A7): a valid sign-in is not enough when an allowlist is configured.
    if (!isBetaUserAllowed(process.env, request.user)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "not_invited",
        message: "This account has not been invited to the Flump beta.",
      });
    }
    // BE-04: an erased account's access token stays cryptographically valid until it expires (and
    // a re-sign-in is possible while the WorkOS step is pending). Refuse it everywhere except the
    // deletion route itself, so no write can recreate data for the erased user. /mcp is not behind
    // this guard: its PATs are deleted with the account, which revokes them.
    const handler = typeof context.getHandler === "function" ? context.getHandler() : undefined;
    const allowErased = handler ? Reflect.getMetadata(ALLOW_ERASED, handler) === true : false;
    const check = allowErased ? null : this.resolveErasedCheck();
    if (check && (await check.isErased(request.user.id))) {
      throw accountDeletedException();
    }
    return true;
  }
}
