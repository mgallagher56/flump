import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { TOKEN_VERIFIER, type TokenVerifier } from "./token-verifier";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: unknown = request.headers?.authorization;

    if (typeof header !== "string") {
      throw new UnauthorizedException("Authentication failed");
    }
    const parts = header.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || parts[1].length === 0) {
      throw new UnauthorizedException("Authentication failed");
    }

    try {
      request.user = await this.verifier.verify(parts[1]);
    } catch {
      throw new UnauthorizedException("Authentication failed");
    }
    return true;
  }
}
