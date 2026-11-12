import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { clientKey } from "./client-key";
import { IP_RATE_LIMIT, isExemptPath, RATE_LIMIT_SKIP } from "./rate-limit.decorator";
import { rejectRateLimited } from "./rate-limit.http";
import { RateLimitStore } from "./rate-limit.store";

/**
 * Per-IP ceiling (E20-N13). req.ip honours the single trusted proxy hop set in security.config,
 * so a spoofed X-Forwarded-For cannot change the key.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitStore) private readonly store: RateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    if (
      this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const http = context.switchToHttp();
    const req = http.getRequest();
    if (isExemptPath(req.path ?? req.url)) return true;

    const decision = this.store.hit(`ip:${clientKey(req.ip)}`, IP_RATE_LIMIT);
    if (!decision.allowed) {
      rejectRateLimited(
        http.getResponse(),
        decision,
        `${req.method} ${req.route?.path ?? "unknown"}`,
      );
    }
    return true;
  }
}
